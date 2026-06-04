# SafeShift Fraud Detection

**How it works, why it exists, and what it will never do.**

---

## 1. Why fraud detection matters here

SafeShift is **parametric insurance for gig drivers in India**. A driver pays
~₹80 – ₹160 a week and, when a qualifying disruption (heavy rain, GRAP-IV
pollution, cyclone, platform outage, curfew) hits their city, the system pays
them automatically — usually within **10 minutes of verification**.

That speed is the product. It is also the attack surface.

Three things make this domain genuinely different from traditional insurance
fraud:

| Classic insurance | SafeShift |
|---|---|
| Driver submits a claim | Adjudicator **creates** claims from live weather/AQI/outage APIs |
| Claim is an accusation against a loss | Claim is a payout triggered by environmental data |
| Payouts take weeks; adjusters negotiate | Payouts hit the UPI in minutes |
| One liar, one fake claim | Rings of 20+ "drivers" can scrape a city together |

Because the driver does not initiate the claim, most signals that feel like
fraud in a traditional system are actually **noise about our own backend**.
The fraud model has to be ruthless about that distinction. More on this in
section §5.

---

## 2. The pipeline at a glance

```
Disruption trigger ─► Gate 1 ─► Gate 2 ─► Fraud scoring ─► Routing ─► Payout
   (every 15 min)    (env)    (activity)  (3 signals)     (3 paths)
```

A claim can only reach the fraud-scoring step if:

1. **Gate 1** — the adjudicator confirmed the disruption against at least
   one external API (OpenWeather / WAQI / StatusGator / etc.) and the
   reading crossed the configured threshold.
   *Code:* `lib/adjudicator/claims.ts:33` ✨
2. **Gate 2** — the driver's `driver_activity_logs` show at least
   `CLAIM_RULES.MIN_ACTIVITY_MINUTES` (45) of non-offline heartbeats within
   the last 4 hours, with GPS inside the disruption geofence.
   *Code:* `lib/claims/engine.ts:41`

Fraud scoring runs **after** both gates pass. Its job is to answer one
question: *"Given that something real happened and the driver was plausibly
there, is the driver or a coordinated ring gaming us?"*

---

## 3. The three signals

All weights are in `FRAUD.WEIGHTS` (`lib/config/constants.ts:197`). They sum
to **1.0**. Each signal is evaluated as a `severity ∈ [0,1]`, and its
contribution to the total fraud score is `severity × weight`.

### 3.1 Prior history & trust — 40%

**What it asks:** has this driver earned the benefit of the doubt?

**Inputs** (`lib/fraud/trust-history.ts`):
- `trustScore` — a 0.0 – 1.0 value on `profiles.trust_score`, default 0.50.
  Adjusted by `updateTrustScore()` each time a claim resolves: +0.05 for
  a clean approval, −0.20 for a confirmed-fraud rejection.
- `priorFlaggedCount` — past claims where `is_flagged = true`.
- `confirmedFraudCount` — past claims that an admin rejected in manual review.
- `tenureMonths` — months since `profiles.created_at`.

**Scoring** (`lib/fraud/scoring.ts`, `evalTrustHistory`):

```
severity = (1 - trustScore)                 // start from inverse of trust
         + min(0.5, 0.15 × confirmedFraudCount)   // each confirmed fraud: +0.15, cap +0.50
         + min(0.25, 0.05 × priorFlaggedCount)    // each flag: +0.05, cap +0.25
         - min(0.3, 0.03 × tenureMonths)    // clean months discount: up to -0.30
```

Severity is clamped to `[0,1]` and then multiplied by 0.40.

**Why 40%.** For *any* repeat-offender domain, the single strongest
predictor of future fraud is past fraud. A first-time offender can get
lucky; a second-time offender almost always escalates. Anchoring the
biggest chunk of the score on history means a driver with a clean
14-month record has to do something egregious on *three* axes before they
get flagged — and a brand-new account with a confirmed-fraud history is
flagged even when today's claim looks fine on the surface.

**Example A — Clean driver.**
`trustScore=0.85, confirmed=0, flagged=0, tenure=14mo`

```
severity = 0.15 + 0 + 0 - 0.3 = 0 (clamped)
contribution = 0 × 0.40 = +0  →  "Clean history"
```

**Example B — Confirmed fraud in past.**
`trustScore=0.30, confirmed=2, flagged=3, tenure=3mo`

```
severity = 0.70 + 0.30 + 0.15 - 0.09 = 1.06 → 1.0 (clamped)
contribution = 1.0 × 0.40 = +0.40  →  maxes out trust contribution alone
```

Even if this driver's location and cluster signals are zero, they land at
0.40 total — right on the **flag** threshold.

---

### 3.2 Location integrity — 35%

**What it asks:** is the phone claiming to be somewhere it probably isn't?

**Inputs** (`lib/fraud/location-integrity.ts`, `lib/fraud/detector.ts`):
- `gpsToIpDistanceKm` — haversine distance between the GPS the phone
  reported and the location returned by looking up the request's source
  IP against `ip-api.com`. **These are independent data sources** — GPS
  comes from the phone's satellite chip (in the request body); IP is
  observed server-side from the TCP connection.
- `impossibleTravel` — `true` if the driver's `driver_activity_logs`
  show a >50 km delta between heartbeats that are <30 min apart
  (`FRAUD.IMPOSSIBLE_TRAVEL_KM / _MINUTES`).

**Scoring:**

```
if impossibleTravel:
    severity = 1.0
elif gpsToIpDistanceKm > 50:
    severity = min(1.0, gpsToIpDistanceKm / 200)   // 50km → 0.25, 200km+ → 1.0
else:
    severity = 0
```

**Why 35%.** GPS spoofing apps are the most common single-driver attack.
They are also the easiest to catch: a fake GPS chip can put the phone
"in" Mumbai, but the 4G modem is still talking to a tower owned by a
Delhi ISP. Real-world local Wi-Fi is rarely >50 km off from the phone's
real position; a 200 km mismatch is a near-certain spoof. Weighting this
at 35% ensures one strong signal plus even modest prior history is
enough to push a claim above the flag line.

**Example C — Honest driver, minor IP drift.**
`gpsToIpDistanceKm = 6 (carrier gateway in neighbouring city)`

```
6 < 50  →  severity = 0  →  contribution = +0  ("No anomaly")
```

**Example D — GPS spoof.**
`gpsToIpDistanceKm = 180, impossibleTravel = false`

```
severity = min(1.0, 180/200) = 0.90
contribution = 0.90 × 0.35 = +0.315  →  alone, about half-way to "flag"
```

**Example E — Impossible travel.**
`driver_activity_logs` shows (Pune, 14:02) then (Mumbai, 14:18).
Haversine = ~150 km in 16 min.

```
severity = 1.0  (capped)
contribution = 1.0 × 0.35 = +0.35
```

---

### 3.3 Ring / cluster — 25%

**What it asks:** is this one of 20 claims that all look suspiciously
similar?

**Inputs** (`lib/fraud/cluster-analysis.ts`):

For a given `disruption_event_id`, look at all claims created in the
last `FRAUD.CLUSTER_WINDOW_MINUTES` (10 min). If fewer than
`FRAUD.CLUSTER_THRESHOLD` (10), no further work — severity stays 0.

If ≥ 10, count how many of these three *ring dimensions* are suspicious:

1. **Shared devices** — fewer unique `device_fingerprint`s than claims,
   below `FRAUD.CLUSTER_SHARED_DEVICE_RATIO` (50%). Real cohorts of
   drivers have one device each; a ring running 20 accounts on 6 phones
   does not.
2. **Shared IPs across profiles** — any IP in the 10-minute window that
   appears against more than one `profile_id`. Two drivers on the same
   Wi-Fi is possible; this is a soft signal that becomes hard in combination.
3. **Low GPS entropy** — standard deviation of `latitude` and
   `longitude` across heartbeats is below `FRAUD.CLUSTER_GPS_ENTROPY_STD`
   (0.001). In practice, every "driver" is sitting in a single building.

**Scoring:**

```
if claimCountInWindow < 10:
    severity = 0
else:
    severity = num_ring_dimensions / 3
    triggered = num_ring_dimensions >= 2
```

**Side effect:** when cluster is triggered, we upsert a row into
`fraud_cluster_signals` so the Fraud Center has an audit trail of
syndicate attempts even if individual claims pass.

**Why 25%.** Ring attacks scale. One clever attacker with 30 burner
accounts can gross ~₹54 000 off a single cyclone event under the "High"
tier. Any single dimension on its own (shared IP, shared device) has
benign explanations (a village office, a family of drivers). Two or
three dimensions together are almost never innocent — which is why the
threshold is *combined* dimensions, not individual ones.

**Example F — Legitimate burst.**
25 drivers in Pune submit claims during the Malad monsoon event. Each
is on a distinct phone, each is at their own GPS, no shared IPs.

```
dimensions = 0  →  severity = 0  →  contribution = +0
```

**Example G — Obvious ring.**
25 claims on one event. 6 unique devices. 3 IPs shared across profiles.
GPS spread std-dev 0.0001 (all sitting in one room).

```
dimensions = {shared_devices, shared_ips, low_gps_entropy} = 3
severity = 3/3 = 1.0
contribution = 1.0 × 0.25 = +0.25
```

This alone is mid-flag range; combined with the ring's typically-new
accounts, trust_history pushes it straight into manual review.

---

## 4. Scoring and routing

The three contributions are summed and clamped to `[0,1]`:

```
fraudScore = clamp( contributions.sum() , 0, 1 )
```

Routing uses two fixed thresholds
(`FRAUD.AUTO_APPROVE_THRESHOLD = 0.30`,
`FRAUD.MANUAL_REVIEW_THRESHOLD = 0.70`):

| Score | Route | What happens |
|---|---|---|
| `< 0.30` | `auto_approve` | Payout hits UPI immediately. `updateTrustScore(profileId, true)` → +0.05 trust |
| `0.30 – 0.69` | `flag` | Paid, but `is_flagged = true` with `flag_reason` populated. Appears in Fraud Center for post-hoc review |
| `≥ 0.70` | `manual_review` | Not paid. Status becomes `pending_review`. An admin must approve or reject in Fraud Center |

Code: `lib/claims/engine.ts:208 (processClaimVerification)`.

---

## 5. What we deliberately do NOT count as fraud

The previous version of this model weighted five signals: duplicate
claim (30%), rapid claims (20%), location (25%), weather mismatch (15%),
cluster (10%). Three of those are gone. They are real problems — just
not *driver* fraud problems.

| Old signal | Why it was in | Why it's out |
|---|---|---|
| Duplicate claim (same policy + same event) | Two payouts for one event would be wrong | The adjudicator creates claims, not drivers. A duplicate means our idempotency key leaked — a **backend bug**. Flagging the driver for it is punishment for our mistake. |
| Rapid claims (≥3 claims in 24h from one profile) | Looked like gaming | The adjudicator fires claims when events fire. If three disruption events hit Pune in a day, every active driver gets three claims. Flagging them is flagging the weather. |
| Weather mismatch (API trigger value below threshold) | "Maybe the claim was fraudulent" | If Gate 1 accepted an event whose trigger value doesn't actually cross the threshold, that's a **data-pipeline bug** or a flaky API. The driver has no visibility into either. |

These three still run as **system-health checks** elsewhere (and the
legacy weight keys stay at `0` in `FRAUD.WEIGHTS` so older UI code
compiles). When they fire, the right audience is the on-call engineer,
not the driver.

This is the single most important rule of the design: *every signal we
weight must be something the driver or ring can actually control.*

---

## 6. Trust score evolution

`profiles.trust_score` starts at **0.50** for every new driver and drifts
over time:

```
after a clean paid claim      trust += 0.05   (cap 1.0)
after a confirmed fraud       trust -= 0.20   (cap 0.0)
```

(`lib/fraud/detector.ts::updateTrustScore`, called from
`lib/claims/engine.ts` and `lib/adjudicator/claims.ts`.)

Two implications:

- A new driver needs ~10 clean claims to reach 1.0 (which reduces their
  trust_history severity to zero).
- One confirmed fraud costs 4 clean claims' worth of goodwill. This is
  intentional: fraud is a stronger signal than honesty.

The constants `TRUST_SCORE_BOUND_DOWN` (−0.40) and `TRUST_SCORE_BOUND_UP`
(+0.40) are reserved for future widening of the severity adjustment but
are not yet consumed by the scoring function.

---

## 7. Audit trail: `fraud_cluster_signals`

When the cluster signal triggers on a claim, we upsert into
`fraud_cluster_signals` (schema: `supabase/migrations/009_system_logs.sql`
or similar). One row per disruption event, tracking:

- `claim_count` in the detection window
- `unique_devices` seen
- `first_claim_at` / `last_claim_at` / `window_seconds`
- `flag_rate`

The **Cluster Signals** tab in Fraud Center reads from this table so an
admin can see syndicate patterns even when individual scores didn't
cross the manual-review line.

---

## 8. The admin simulator

Inside `/admin/fraud-center`, the **Fraud Simulator** tab runs the
*exact same* scoring function the live detector uses
(`lib/fraud/scoring.ts::computeFraudScore`). It's pure math — no DB, no
network — so the admin can drag sliders and watch the decision flip
from "auto-approve" to "flag" to "manual review" in real time.

Four preset scenarios seed the inputs with realistic patterns:

- **Honest driver** — tenure 14 mo, trust 0.85, GPS/IP match, small
  event cohort → score 0%, auto-approve.
- **GPS spoof** — trust 0.45, GPS 180 km off from IP, impossible
  travel → score ~57%, flag.
- **Fraud ring** — 25 claims / 10 min, 6 devices, shared IPs,
  clustered GPS → score ~44%, flag.
- **Mixed signals** — concerns on all three axes → score ~58%, flag.

Every input is exposed. An operator or auditor can reproduce any
production score by punching the numbers in.

---

## 9. How this plays with honest drivers

Several choices protect legitimate claimants:

- **Soft flagging, not rejection.** A score in 0.30–0.69 still pays out.
  The flag only matters if a human investigates later.
- **Gradual trust.** No single claim can tank a driver's trust score by
  more than 0.20, and it takes admin confirmation, not an automated flag.
- **Tenure discount.** 6 months of clean record removes 0.18 from
  trust-history severity — enough to make a moderate location anomaly
  not push you over the flag line.
- **Appeal pathway.** Any `pending_review` claim can be contested;
  `appeal_submitted_at`, `appeal_evidence_url`, and `appeal_resolved_at`
  columns exist on `parametric_claims` for that flow.

---

## 10. Appendix: thresholds

All in `lib/config/constants.ts`:

| Constant | Value | Purpose |
|---|---|---|
| `FRAUD.WEIGHTS.trust_history` | 0.40 | Weight of prior-history signal |
| `FRAUD.WEIGHTS.location_anomaly` | 0.35 | Weight of GPS/IP + impossible-travel signal |
| `FRAUD.WEIGHTS.cluster` | 0.25 | Weight of ring-detection signal |
| `FRAUD.AUTO_APPROVE_THRESHOLD` | 0.30 | Below this → auto-pay |
| `FRAUD.MANUAL_REVIEW_THRESHOLD` | 0.70 | At or above this → manual review |
| `FRAUD.LOCATION_MISMATCH_KM` | 50 | Minimum GPS↔IP distance to start scoring |
| `FRAUD.IMPOSSIBLE_TRAVEL_KM / _MINUTES` | 50 / 30 | >50 km in <30 min = spoof |
| `FRAUD.CLUSTER_THRESHOLD` | 10 | Minimum claims in window to check dimensions |
| `FRAUD.CLUSTER_WINDOW_MINUTES` | 10 | Detection window for cluster |
| `FRAUD.CLUSTER_SHARED_DEVICE_RATIO` | 0.5 | <50% unique devices = suspicious |
| `FRAUD.CLUSTER_GPS_ENTROPY_STD` | 0.001 | lat/lng std-dev below this = everyone at same spot |
| `FRAUD.TRUST_SCORE_DEFAULT` | 0.50 | New driver baseline |
| `FRAUD.TRUST_SCORE_CLEAN_CLAIM` | +0.05 | Adjustment per clean paid claim |
| `FRAUD.TRUST_SCORE_FRAUD_CONFIRMED` | −0.20 | Adjustment per confirmed fraud |
| `CLAIM_RULES.MIN_ACTIVITY_MINUTES` | 45 | Gate 2: minimum online-in-zone heartbeats |
| `CLAIM_RULES.MAX_CLAIMS_PER_DAY` | 5 | Cap (not fraud) — enforced in `enforceCapChecks` |

---

## 11. File map

```
lib/config/constants.ts        # all thresholds
lib/fraud/scoring.ts           # pure computeFraudScore (no DB)
lib/fraud/trust-history.ts     # SELECTs for trust signal
lib/fraud/location-integrity.ts# GPS↔IP + impossible-travel helpers
lib/fraud/cluster-analysis.ts  # ring detection
lib/fraud/detector.ts          # runAllFraudChecks orchestrator + updateTrustScore
lib/fraud/asset-lock.ts        # 24h vehicle lock (payout-side, not fraud scoring)
lib/claims/engine.ts           # Gate 2 + routing (auto/flag/review)
lib/adjudicator/claims.ts      # claim creation + trust updates on auto-payout
app/(admin)/admin/fraud-center # Fraud Center UI (simulator lives here)
supabase/migrations/006*       # parametric_claims + fraud_* columns
supabase/migrations/007*       # driver_activity_logs, vehicle_asset_locks
```

See also: `docs/fraud-detection-architecture.svg` for the visual overview.
