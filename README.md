# 🛡️ SafeShift — AI-Powered Parametric Insurance for India's Bike Delivery Partners

> *"When it rains in Mumbai, thousands of bike delivery partners stop earning — not by choice, but because the roads flood and the orders stop. SafeShift fixes that. Automatically. Instantly. Fairly."*

**Team Code Mavens**

---

## 🧑‍💼 Persona Deep Dive

### Who Are We Building For?

**SafeShift is built exclusively for two-wheeler bike delivery partners operating across India's major gig platforms — Swiggy, Zomato, Blinkit, Zepto, and Dunzo.**

These riders power India's last-mile food, grocery, and quick commerce delivery — covering millions of orders daily on bikes and scooters across every major city.

### Income Profile

| Metric | Value |
|---|---|
| Average deliveries/day | 15–25 orders |
| Daily earnings | ₹700 – ₹1,200 |
| **Weekly earnings** | ₹4,900 – ₹8,400 |
| Monthly earnings | ₹21,000 – ₹36,000 |
| Fixed monthly costs (fuel + maintenance + EMI) | ₹5,000 – ₹12,000 |

### Why Bike Delivery Riders?

| Factor | Bike Delivery (Swiggy/Zomato/Blinkit/Zepto) |
|---|---|
| Active gig riders in India | 3M+ and growing |
| Revenue per delivery | ₹30–₹80 |
| Financial risk of 1 lost day | Moderate–High (no earnings buffer) |
| Vulnerability to weather/road restrictions | **Extreme** (bikes are first grounded in heavy rain) |
| Existing income protection | **Almost none** |

> **Key Insight:** Bike delivery riders are the largest and fastest-growing gig segment in India — yet they have zero income protection when weather, platform outages, or civic disruptions wipe out their earnings.

---

## 🔴 Critical Pain Points

1. **Income Loss with Zero Buffer** — One rain-out day wipes ₹700–₹1,200 while fuel EMIs and household expenses remain fixed.
2. **Weather Halts Operations** — Heavy rainfall (>65mm/day) makes two-wheeler delivery unsafe and impossible; Mumbai monsoon sees 20–30 such days annually.
3. **Platform Dependency** — 100% of earnings depend on platform uptime; a 3-hour Swiggy or Zomato outage means zero income with no recourse.
4. **Air Pollution Advisories** — Severe air quality events (AQI >300) force advisories against outdoor work, directly reducing rider hours and earnings.
5. **No Platform Protection** — Swiggy, Zomato, and Blinkit provide zero income protection during disruptions or outages.

---

## 📊 Market Context & Opportunity

| Metric | Value |
|---|---|
| Active platform-based bike delivery riders in India | 3,000,000+ |
| Annual growth of quick commerce & food delivery | 35–40% YoY |
| Avg annual income loss per rider (disruption days) | ₹36,000 – ₹60,000 |
| **Total addressable market** | **₹10,000 – ₹18,000 crore/year** |

**Why underserved?** No formal employer-employee relationship, claims too small for traditional processing, no standardised disruption data, and parametric insurance is still nascent in India.

---

## 🔬 Research Basis

| Research Type | Source | Key Insight |
|---|---|---|
| **Government Data** | CPCB AQI records (2019–2025) | Delhi-NCR: 15–25 days of AQI >300 per winter |
| **Weather Data** | IMD, OpenWeatherMap | Mumbai/Bangalore/Chennai: 20–30 days >65mm rainfall annually |
| **Industry Reports** | RedSeer, BCG | 3M+ active delivery riders; gig economy growing 35% YoY |
| **Platform Research** | Swiggy/Zomato forums, Reddit, YouTube | 5–8 forced non-working days/month during monsoon/winter |
| **Policy Research** | NDMA guidelines, state pollution boards | Outdoor workers formally advised against prolonged exposure at AQI >300 |
| **Secondary Analysis** | TeamLease, NITI Aayog | 7.7M gig workers; <5% have any income protection |
| **Analogous Models** | PMFBY, Lemonade, Etherisc | Parametric models cut claims processing cost by 85–90% |

---

## ⚡ Disruptions Addressed

| # | Disruption | Trigger | Data Source |
|---|---|---|---|
| 1 | **Severe Air Pollution** | AQI > 300 (Very Poor / Severe) | CPCB / AQI India API |
| 2 | **Heavy Rainfall / Flood** | >65mm/day | OpenWeatherMap + IMD |
| 3 | **Cyclones** | Wind >70 km/h | Open-Meteo + IMD |
| 4 | **Platform Outages** | >3 hrs downtime | StatusGator / Platform API |
| 5 | **Curfew / Bandh** | Mobility halt >4 hrs | NewsData.io + Llama 3.1 NLP classifier |

> **Combined weekly trigger probability ≈ 4%**

---

## 💰 Premium Model & Pricing

**Formula:** `Premium_base = P(trigger) × Payout` → 0.04 × ₹2,000 = **₹80/week**

| Tier | Premium (Weekly) | Max Weekly Payout | Target Users |
|---|---|---|---|
| 🟢 **Basic** | **₹40** | ₹1,000 | Occasional / part-time riders |
| 🟡 **Standard** | **₹60** | ₹1,500 | Regular riders |
| 🔴 **Premium** | **₹80** | ₹2,000 | Full-time riders |

Coverage of 15–25% of weekly income ensures **fixed costs (fuel, EMI, household expenses)** are covered during disruptions.

---

## 📤 Payout Structure

| Disruptor | Trigger | 🟢 Basic | 🟡 Standard | 🔴 Premium |
|---|---|---|---|---|
| **Heavy Rainfall** | >65mm/day | ₹500 | ₹750 | ₹1,000 |
| **Severe Air Pollution** | AQI >300 | ₹400 | ₹600 | ₹800 |
| **Cyclone** | Wind >70 km/h | ₹600 | ₹900 | ₹1,200 |
| **Curfew / Bandh** | Halt >4 hrs | ₹450 | ₹675 | ₹900 |
| **App Outage** | >3 hrs | ₹250 | ₹375 | ₹500 |

**Rules:** One payout per event · Max one claim/day · Weekly cap enforced · Zero-touch auto-filing · Instant UPI payout (<10 min).

---

## 🏦 Financial Viability

| Metric | Value |
|---|---|
| Target riders | 3,000,000 |
| Weekly premium revenue (avg tier) | ₹18 crore |
| Annual premium revenue | ₹864 crore |

| Scenario | % Claiming | Weekly Payout | Result |
|---|---|---|---|
| Normal week | 5% | ₹7.5 crore | ✅ Profit |
| Moderate disruption | 10% | ₹18 crore | ⚠️ Covered by reserves |
| Severe disruption | 15% | ₹33.75 crore | ❌ Catastrophic reserve |
| Extreme (rare) | 20% | ₹54 crore | ❌ Reinsurance trigger |

Geographic diversification, seasonal balancing, weekly caps, and daily single-claim rules ensure long-term solvency.

---

## 🤖 Dynamic Premium Adjustments (AI Layer)
- **WeatherRisk:** AI-predicted disruption probability. Capped at +₹5 to +₹10.
- **UBI (Usage-Based Insurance):** GPS history scores rider's exposure to high-risk zones. Adjustment: ₹0 to +₹8.
- **Floor:** Minimum price = Base Premium (never decreases below base).

**Example:** ₹40 base + ₹5 weather + ₹5 UBI = **₹50/week**.

---

## ✅ Dual-Gate Claim Verification

**Gate 1 — Environmental Trigger:** Confirms disruption is actively occurring in the rider's zone (CPCB, OpenWeatherMap, IMD, StatusGator, news scrapers).

**Gate 2 — Activity Validation:** Confirms rider was actively working — app online ≥45 min during disruption, GPS within affected zone.

| Gate 1 | Gate 2 | Result |
|---|---|---|
| ✅ Pass | ✅ Pass | 💰 **Payout fires automatically** |
| ✅ Pass | ❌ Fail | ❌ No payout (rider not active) |
| ❌ Fail | ✅ Pass | ❌ No action (no disruption) |
| ❌ Fail | ❌ Fail | ❌ No action |

Max one claim per day, even if multiple disruptions trigger.

---

## 🛡️ Intelligent Fraud Detection

SafeShift employs a multi-layered verification engine to ensure payouts are only triggered for legitimate income losses.

### 1. Intent-to-Work Validation
Pings platform API to verify rider status. Payouts only trigger if status is `Online`, `Searching`, or `On_Trip`. Offline = suppressed.

### 2. Location Integrity
Cross-verifies GPS coordinates against IP-based geolocation. Mismatch beyond defined radius → "Location Anomaly" → transaction halted.

### 3. Temporal Asset Locking
**24-hour Lifecycle Lock** on Unique Vehicle Hash (RC + Chassis). Once `CLAIM_PROCESSED`, all subsequent triggers that day are ignored.

---

## Adversarial Defense & Anti-Spoofing Strategy

### 🔴 Threat Scenario: Coordinated Fraud

A fraud ring can simulate fake delivery partners using GPS spoofing tools, fake activity signals, and automated scripts to drain the insurance liquidity pool.

### Multi-Signal Verification

Beyond GPS, the system cross-validates:
- **Device motion sensors (IMU)** — Must show vehicular vibration. A phone at home produces a flat-line signature.
- **Cell tower triangulation** — Network-level location independent of GPS chip.
- **IP geolocation & network latency** — Catches VPN/proxy usage.
- **Ambient environment signals** — Wi-Fi/BLE landscape must match outdoor operations.

### Cluster-Level Fraud Detection

- **Claim timing clustering** — 500 claims in 5 minutes is statistically impossible organically.
- **Shared network infrastructure** — Multiple "dispersed" riders on same Wi-Fi/IP = co-located.
- **Device fingerprint similarity** — Identical models, OS builds = shared spoofing toolkit.
- **GPS trajectory entropy** — Spoofed paths show low entropy (straight lines, perfect circles).
- **Payout destination clustering** — Hundreds of accounts funneling to few UPI IDs = money mule network.

Streaming cluster analysis runs **every 5 minutes** during active disruptions.

### Protecting Honest Riders

- **Risk-based payout control** — Dynamic fraud score (0→1). Low = instant payout. Medium = delayed. High = manual review.
- **Soft flagging, never punishment** — Flagged riders are never accused. UX frames it as: *"Heavy weather affecting verification. Share a quick photo to speed up payout."*
- **Guaranteed appeal** — Every rejection appealable with single tap. Human review within 24 hours.
- **Transparent communication** — Every decision explained in rider's chosen language.

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

**Redemption:** 100 coins = ₹5 off premium · 500 coins = 1 free week (Basic tier).

---

## 🚀 Feature Set

| # | Feature | Description |
|---|---|---|
| 1 | **Zero-Touch Claims** | Auto-filed when trigger + both gates pass. No manual action. |
| 2 | **Instant UPI Payout** | Under **10 minutes** via Razorpay. |
| 3 | **AI Dynamic Pricing** | Weekly adjustment via weather, zone risk, rider history. |
| 4 | **Predictive Alerts** | Sunday forecast of upcoming risk + premium. |
| 5 | **Zone Risk Map** | Live pincode-level disruption heatmap. |
| 6 | **Vernacular Support** | Hindi, Marathi, Tamil, Telugu, English. |
| 7 | **Rewards System** | Coins for consistent, honest engagement. |

---

## 📱 Platform Choice

**Mobile-first (Next.js PWA)** — Bike delivery riders operate entirely from phones. All critical features (GPS, push notifications, UPI deep links, camera for eKYC, offline caching) are PWA-capable and optimised for low-end Android devices.

---

## 🔄 Application Workflow
<img width="1536" height="1024" alt="2aea31c2-2b50-4bd0-8ab2-05c1f1449c3b" src="https://github.com/user-attachments/assets/ce42573b-1336-463b-b9b4-8095a5a7d24b" />
---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS, Leaflet.js, Framer Motion, GSAP, Recharts |
| **Backend** | Next.js API Routes (serverless), FastAPI ML microservice |
| **Database** | Supabase (PostgreSQL + Auth + Realtime), Row-Level Security |
| **AI/ML** | XGBoost — rainfall and wind/cyclone prediction models, scikit-learn |
| **APIs** | CPCB, OpenWeatherMap, Open-Meteo, IMD, NewsData.io, OpenRouter (Llama 3.1 8B), StatusGator |
| **DevOps** | Vercel (frontend), Hugging Face Spaces (ML service), GitHub Actions (cron adjudicator) |
| **Payments** | Razorpay — premium collection + instant UPI payouts |

---

## 📚 References

1. **CPCB** — Historical AQI data (2019–2025)
2. **IMD** — Rainfall, cyclone data, weather warnings
3. **RedSeer / BCG** — Food delivery and quick commerce market reports
4. **TeamLease / NITI Aayog** — Gig economy workforce reports
5. **NDMA / State Pollution Control Boards** — Air quality advisories and outdoor work guidelines
6. **Swiggy / Zomato Forums** — Rider earnings, operational patterns
7. **OpenWeatherMap, Open-Meteo** — Weather API docs
8. **PMFBY** — Parametric insurance reference (agriculture)

---

<p align="center">
  <b>SafeShift</b> — Because no rider should lose their livelihood to the weather.<br/>
  <i>Team Code Mavens</i>
</p>
