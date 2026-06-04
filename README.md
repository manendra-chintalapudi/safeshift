# 🛡️ SafeShift — AI-Powered Parametric Insurance for India's LCV Delivery Partners

> *"When it rains in Pune, thousands of Porter delivery partners stop earning — not by choice, but because the roads flood and the orders stop. SafeShift fixes that. Automatically. Instantly. Fairly."*

**Team Code Mavens | Guidewire DEVTrails 2026 Hackathon**

---
## 📊 Pitch Deck
You can find the presentation [here](https://docs.google.com/presentation/d/1U15S4zKos0tjaoWISsSvmxr3tVVnE4XE/edit?usp=sharing&ouid=111603720095835270884&rtpof=true&sd=true).



## 🧑‍💼 Persona Deep Dive

### Who Are We Building For?

**SafeShift is built exclusively for Light Commercial Vehicle (LCV) delivery partners operating on India's logistics platform — [Porter](https://porter.in).**

These drivers power India's intra-city and last-mile logistics — moving goods, parcels, and freight across cities in Tata Aces, Mahindra Bolero Pickups, Ashok Leyland Dosts, and similar LCVs.

### Income Profile

| Metric | Value |
|---|---|
| Average trips/day | 4–5 trips |
| Daily earnings | ₹1,400 – ₹2,000 |
| **Weekly earnings** | **₹9,900 – ₹13,800** |
| Monthly earnings | ₹40,000 – ₹55,000 |
| Fixed monthly costs (EMI + fuel + maintenance) | ₹18,000 – ₹25,000 |

### Why LCVs on Porter — Not Food/Grocery Delivery?

| Factor | Two-Wheeler (Zomato/Swiggy/Zepto) | LCV on Porter |
|---|---|---|
| Vehicle investment | ₹70K–₹1.5L | ₹4L–₹10L (with EMI obligations) |
| Revenue per trip | ₹30–₹80 | ₹300–₹800+ |
| Financial risk of 1 lost day | Low–Moderate | **Very High** (EMI still due) |
| Vulnerability to weather/road restrictions | Moderate | **Extreme** (LCVs restricted first) |
| Existing insurance options | Some platforms offer basic covers | **Almost none** |

> **Key Insight:** LCV drivers on Porter have the highest financial exposure per disruption day of any gig delivery segment — vehicle loans, no ability to switch vehicles, and **first to be restricted** during GRAP-IV and flood advisories.

---

## 🔴 Critical Pain Points

1. **Income Loss with Zero Buffer** — One restricted week wipes ₹7,000–₹9,000 while EMIs of ₹8,000–₹15,000 remain due.
2. **Weather Halts Operations** — Heavy rainfall (>65mm/day) grounds LCVs entirely; Mumbai 2023 monsoon saw 60–70% drop in LCV ops.
3. **Vehicle Loan Trap** — ~70% finance their vehicles; EMIs don't pause during disruptions, creating debt spirals.
4. **Government Restrictions** — Delhi GRAP-IV (Nov–Dec 2024) banned commercial vehicles 11+ days, costing ₹22,000–₹30,000/month.
5. **No Platform Protection** — Porter provides zero income protection during disruptions or outages.

---

## 📊 Market Context & Opportunity

| Metric | Value |
|---|---|
| Platform-based LCV drivers (Porter, Rivigo, BlackBuck) | 500,000+ active |
| Annual growth of platform logistics | 25–30% YoY |
| Avg annual income loss per LCV driver | ₹84,000 – ₹108,000 |
| **Total addressable market** | **₹4,200 – ₹5,400 crore/year** |

**Why underserved?** No formal employer-employee relationship, claims too small for traditional processing, no standardised disruption data, and parametric insurance is new in India.

---

## 🔬 Research Basis

| Research Type | Source | Key Insight |
|---|---|---|
| **Government Data** | CPCB AQI records (2019–2025) | Delhi-NCR: 15–25 days of AQI >450 per winter |
| **Weather Data** | IMD, OpenWeatherMap | Mumbai/Bangalore/Chennai: 20–30 days >65mm rainfall annually |
| **Industry Reports** | ICRA, SIAM | 70% of LCV drivers carry EMIs ₹8K–₹15K/month |
| **Platform Research** | Porter forums, Reddit, YouTube | 5–8 forced non-working days/month during monsoon/winter |
| **Policy Research** | GRAP framework, NDMA guidelines | LCVs restricted first in all pollution/disaster protocols |
| **Secondary Analysis** | TeamLease, NITI Aayog | 7.7M gig workers; <5% have income protection |
| **Analogous Models** | PMFBY, Lemonade, Etherisc | Parametric models cut claims processing cost by 85–90% |

---

## ⚡ Disruptions Addressed

| # | Disruption | Trigger | Data Source |
|---|---|---|---|
| 1 | **GRAP-IV Restriction** | AQI > 450 | CPCB / AQI India API |
| 2 | **Heavy Rainfall / Flood** | >65mm/day | OpenWeatherMap + IMD |
| 3 | **Cyclones** | Wind >70 km/h | Open-Meteo + IMD |
| 4 | **Platform Outages** | >3 hrs downtime | StatusGator / Platform API |
| 5 | **Curfew / Bandh** | Mobility halt >4 hrs | News/Social Media Scraper |

> **Combined weekly trigger probability ≈ 4%**

---

## 💰 Premium Model & Pricing

**Formula:** `Premium_base = P(trigger) × Payout` → 0.04 × ₹2,000 = **₹80/week**

| Tier | Premium (Weekly) | Max Weekly Payout | Target Users |
|---|---|---|---|
| 🟢 **Normal** | **₹80** | ₹2,000 | Part-time drivers |
| 🟡 **Medium** | **₹120** | ₹3,000 | Regular drivers |
| 🔴 **High** | **₹160** | ₹4,000 | Full-time drivers |

Coverage of 20–30% of weekly income ensures **fixed costs (EMI, fuel, maintenance)** are covered during disruptions.

---

## 📤 Payout Structure

| Disruptor | Trigger | 🟢 Normal | 🟡 Medium | 🔴 High |
|---|---|---|---|---|
| **Heavy Rainfall** | >65mm/day | ₹1,000 | ₹1,500 | ₹2,000 |
| **AQI GRAP-IV** | AQI >450 | ₹1,000 | ₹1,500 | ₹2,000 |
| **Cyclone** | Wind >70 km/h | ₹1,200 | ₹1,800 | ₹2,400 |
| **Curfew / Bandh** | Halt >4 hrs | ₹900 | ₹1,350 | ₹1,800 |
| **App Outage** | >3 hrs | ₹500 | ₹750 | ₹1,000 |

**Rules:** One payout per event · Max one claim/day · Weekly cap enforced · Zero-touch auto-filing · Instant UPI payout (<10 min).

---

## 🏦 Financial Viability

| Metric | Value |
|---|---|
| Target drivers | 500,000 |
| Weekly premium revenue | ₹4 crore |
| Annual premium revenue | ₹192 crore |

| Scenario | % Claiming | Weekly Payout | Result |
|---|---|---|---|
| Normal week | 5% | ₹2.5 crore | ✅ Profit |
| Moderate disruption | 10% | ₹6 crore | ⚠️ Covered by reserves |
| Severe disruption | 15% | ₹11.25 crore | ❌ Catastrophic reserve |
| Extreme (rare) | 20% | ₹18 crore | ❌ Reinsurance trigger |

Geographic diversification, seasonal balancing, weekly caps, and daily single-claim rules ensure long-term solvency.

---

## 🤖 Dynamic Premium Adjustments (AI Layer)

```
FinalPremium = BasePremium + WeatherRisk + UBI
```

- **WeatherRisk:** AI-predicted disruption probability. Capped at +₹10 to +₹20.
- **UBI (Usage-Based Insurance):** GPS history scores driver's exposure to high-risk zones. Adjustment: ₹0 to +₹15.
- **Floor:** Minimum price = Base Premium (never decreases below base).

**Example:** ₹80 base + ₹10 weather + ₹10 UBI = **₹100/week**.

---

## ✅ Dual-Gate Claim Verification

**Gate 1 — Environmental Trigger:** Confirms disruption is actively occurring in the rider's zone (CPCB, OpenWeatherMap, IMD, StatusGator, news scrapers).

**Gate 2 — Activity Validation:** Confirms driver was actively working — app online ≥45 min during disruption, GPS within affected zone.

| Gate 1 | Gate 2 | Result |
|---|---|---|
| ✅ Pass | ✅ Pass | 💰 **Payout fires automatically** |
| ✅ Pass | ❌ Fail | ❌ No payout (driver not active) |
| ❌ Fail | ✅ Pass | ❌ No action (no disruption) |
| ❌ Fail | ❌ Fail | ❌ No action |

Max one claim per day, even if multiple disruptions trigger.

---

## 🛡️ Intelligent Fraud Detection

SafeShift employs a multi-layered verification engine to ensure payouts are only triggered for legitimate income losses.

### 1. Intent-to-Work Validation
Pings Porter/Platform API to verify driver status. Payouts only trigger if status is `Online`, `Searching`, or `On_Trip`. Offline = suppressed.

### 2. Location Integrity
Cross-verifies GPS coordinates against IP-based geolocation. Mismatch beyond defined radius → "Location Anomaly" → transaction halted.

### 3. Temporal Asset Locking
**24-hour Lifecycle Lock** on Unique Vehicle Hash (RC + Chassis). Once `CLAIM_PROCESSED`, all subsequent triggers that day are ignored.

---

## Adversarial Defense & Anti-Spoofing Strategy

### 🔴 Threat Scenario: Market Crash

A coordinated fraud ring can simulate hundreds of fake delivery partners using GPS spoofing tools, fake activity signals, and automated scripts to trigger payouts. Such an attack can rapidly drain the insurance liquidity pool, making it critical to move beyond basic verification mechanisms.

### 1. The Differentiation: Genuine vs. Spoofed

Our AI/ML architecture differentiates genuinely stranded partners from bad actors through **multi-signal verification** — no single data point is trusted alone.

Beyond GPS, the system cross-validates:
- **Device motion sensors (IMU)** — Must show vehicular vibration. A phone at home produces a flat-line signature.
- **Cell tower triangulation** — Network-level location independent of GPS chip. Cannot be spoofed by apps.
- **IP geolocation & network latency** — Catches VPN/proxy usage; detects network fingerprint contradictions.
- **Ambient environment signals** — Wi-Fi/BLE landscape and battery drain must match outdoor field operations, not residential setting.

A genuine driver stranded in rain organically produces all these signals. A spoofer cannot fake vehicular motion, cell tower proximity, and ambient environment simultaneously — making fraud **economically irrational**.

### 2. The Data: Detecting Coordinated Fraud Rings

The system analyzes the **entire claim population as a graph** to catch syndicate-level attacks:

- **Claim timing clustering** — 500 claims in 5 minutes is statistically impossible organically.
- **Shared network infrastructure** — Multiple "dispersed" drivers on same Wi-Fi/IP = co-located.
- **Device fingerprint similarity** — Identical models, OS builds, app configs = shared spoofing toolkit.
- **GPS trajectory entropy** — Spoofed paths show low entropy (straight lines, perfect circles).
- **Payout destination clustering** — Hundreds of accounts funneling to few UPI IDs = money mule network.
- **Claim-to-premium ratio** — Syndicate accounts: minimum coverage, maximum claims.
- **Social graph analysis** — Referral chain bursts, synchronized onboarding, shared payment endpoints.

Streaming cluster analysis runs **every 5 minutes** during active disruptions. 10+ accounts converging on ≥3 dimensions → Syndicate Alert → all payouts frozen pending review.

### 3. The UX Balance: Protecting Honest Workers

Bad weather degrades the very signals used for verification. A genuine driver in a downpour may lose 1–2 signal layers through no fault of their own.

**Our approach: soft flagging, never punishment.**

- **Risk-based payout control** — Dynamic fraud score (0→1). Low = instant payout. Medium = delayed verification. High = manual review.
- **Gradual trust scoring** — Clean history = maximum benefit of the doubt. New accounts = appropriate (not punitive) scrutiny.
- **Lightweight verification** — Flagged drivers are never accused. UX frames it as a network issue: *"Heavy weather affecting verification. Share a quick photo to speed up payout."* One tap, 15 seconds.
- **Guaranteed appeal** — Every rejection appealable with single tap. Human review within 24 hours. Upheld = trust score restored, zero penalty.
- **Transparent communication** — Every decision (approved/flagged/rejected) explained in driver's chosen language. No black-box rejections.

---

## 🪙 Rewards & Coins System

| Activity | Coins |
|---|---|
| Weekly login | 10 |
| 4 consecutive weeks active | 50 (bonus) |
| Active during verified disruption | 25 |
| Referral | 100 |
| Complete profile | 20 |
| Clean claims (6 months) | 75 |

**Redemption:** 100 coins = ₹5 off premium · 500 coins = 1 free week (Normal).

---

## 🚀 Feature Set

| # | Feature | Description |
|---|---|---|
| 1 | **Zero-Touch Claims** | Auto-filed when trigger + both gates pass. No manual action. |
| 2 | **Instant UPI Payout** | Under **10 minutes** via Razorpay. |
| 3 | **AI Dynamic Pricing** | Weekly adjustment via weather, zone risk, driver history. |
| 4 | **Predictive Alerts** | Sunday forecast of upcoming risk + premium. |
| 5 | **Zone Risk Map** | Live pincode-level disruption heatmap. |
| 6 | **Vernacular Support** | Hindi, Marathi, Tamil, Telugu, English. |
| 7 | **Rewards System** | Coins for consistent, honest engagement. |

---

## 📱 Platform Choice

**Mobile-first (React Native)** — LCV drivers operate entirely from phones. All critical features (GPS, push notifications, UPI deep links, camera for eKYC, offline caching) work better natively.

---

## 🔄 Application Workflow

```
ONBOARDING: Download → Language → Aadhaar eKYC → Upload DL/RC
→ UPI Verification → Select City → Choose Tier → Pay Premium

WEEKLY CYCLE (Sunday): AI forecasts → Premium adjusted
→ Alert sent → Auto-deduct via UPI on Monday

REAL-TIME MONITORING (24/7):
Weather/AQI/Platform APIs → Threshold breached?
→ Gate 1 (Environmental) → Gate 2 (Driver Active)
→ Auto-approve claim → Instant UPI payout (< 10 min)

FEEDBACK LOOP: Update claim history → Retrain pricing model
→ Update zone risk scores → Generate admin dashboards

```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Tailwind css, Next.js 16 (React, App Router), leaflet.js / React Native Maps, Typescript,CSS - only charts |
| **Backend** | Python (FastAPI) — AI/ML microservice,Next.js API Routes (serverless functions),REST APIs with Swagger/OpenAPI (FastAPI auto-generated docs) |
| **Database** | Supabase (PostgreSQL + Auth + Realtime) Row-Level Security policies |
| **AI/ML** | XGBoost — rainfall and wind/cyclone prediction models,scikit-learn — preprocessing and feature engineering,|
| **APIs** | CPCB, OpenWeatherMap, Open-Meteo, IMD, StatusGator, News Scrapers |
| **DevOps** | Vercel — frontend + API routes, Hugging Face Spaces (Docker) — ML prediction service, Supabase Cloud — database hosting,GitHub Actions — cron-based adjudicator|
| **Payments** | Razorpay (Test Mode) — premium collection + instant UPI payouts |

---

## 📅 Roadmap

| Phase | Period | Goal |
|---|---|---|
| Seed (Phase 1) | Mar 4 – Mar 20 | Problem research, solution design, README, 2-min video |
| Scale (Phase 2) | Mar 21 – Apr 4 | Working prototype — onboarding, premium calculation, trigger demo |
| Soar (Phase 3) | Apr 5 – Apr 17 | Payout simulation, dashboards, fraud checks, final pitch |

---

## 📚 References

1. **CPCB** — Historical AQI data (2019–2025)
2. **IMD** — Rainfall, cyclone data, weather warnings
3. **SIAM** — LCV fleet data, vehicle registration
4. **ICRA** — LCV financing trends, EMI data
5. **TeamLease / NITI Aayog** — Gig economy workforce reports
6. **CAQM** — GRAP framework, restriction protocols
7. **Porter Forums** — Driver earnings, operational patterns
8. **RedSeer Consulting** — Logistics market growth
9. **OpenWeatherMap, Open-Meteo** — Weather API docs
10. **PMFBY** — Parametric insurance reference (agriculture)

---

<p align="center">
  <b>SafeShift</b> — Because no driver should lose their livelihood to the weather.<br/>
  <i>Team Code Mavens | Guidewire DEVTrails 2026</i>
</p>
