# SafeShift — Presentation Slides (10-15 slides)
## Team Code Mavens | Guidewire DEVTrails 2026

---

## SLIDE 1: Title Slide

**SafeShift**
AI-Powered Parametric Insurance for India's LCV Delivery Partners

Team Code Mavens | Guidewire DEVTrails 2026

*"When it rains in Pune, thousands of Porter delivery partners stop earning — not by choice, but because the roads flood and the orders stop. SafeShift fixes that. Automatically. Instantly. Fairly."*

---

## SLIDE 2: The Persona — Who We're Building For

**Light Commercial Vehicle (LCV) Delivery Partners on Porter**

| Metric | Value |
|--------|-------|
| Average daily earnings | ₹1,400 – ₹2,000 |
| Monthly EMI burden | ₹8,000 – ₹15,000 |
| Vehicle investment | ₹4L – ₹10L |
| Annual income loss to disruptions | ₹84,000 – ₹108,000 |
| Existing insurance coverage | Almost none |

**Why LCV drivers, not food delivery?**
- Highest financial exposure per disruption day
- Vehicle loans don't pause during floods
- First to be restricted during GRAP-IV / floods
- No platform protection from Porter

**Key Insight:** One disrupted week wipes ₹7,000–₹9,000 while EMIs of ₹8,000–₹15,000 remain due.

---

## SLIDE 3: The Solution — Zero-Touch Parametric Insurance

**How SafeShift Works:**

```
Driver registers → Selects plan → Pays weekly premium via UPI
         ↓
Every 15 minutes: AI monitors weather, AQI, cyclones, outages, curfews
         ↓
Disruption detected → Trigger verified by API data
         ↓
Matching drivers identified → Fraud checks run (6 signals)
         ↓
Payout sent via UPI in <10 minutes
         ↓
NO manual claim filing. NO paperwork. ZERO human intervention.
```

**5 Disruption Types Covered:**
1. Heavy Rainfall (>65mm/day)
2. AQI GRAP-IV (>450)
3. Cyclone (wind >70 km/h)
4. Platform Outage (>3 hours)
5. Curfew/Bandh (mobility halt >4 hours)

---

## SLIDE 4: AI/ML Architecture

**Dynamic Premium Calculation Pipeline:**

```
┌─────────────────────────────────────────────────────────┐
│                 ML PREDICTION SERVICE                     │
│                 (FastAPI + Python)                         │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  XGBoost      │  │  XGBoost      │  │  AQICN       │   │
│  │  Rainfall     │  │  Wind/Cyclone │  │  Forecast    │   │
│  │  Model        │  │  Model        │  │  API         │   │
│  │  (42 features)│  │  (51 features)│  │              │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                  │                  │           │
│         ▼                  ▼                  ▼           │
│  ┌─────────────────────────────────────────────────┐     │
│  │         CITY-SPECIFIC RISK WEIGHTS               │     │
│  │  Mumbai: Rain 50% | Wind 20% | AQI 30%          │     │
│  │  Delhi:  Rain 20% | Wind 10% | AQI 70%          │     │
│  └────────────────────┬────────────────────────────┘     │
│                       │                                   │
│                       ▼                                   │
│  ┌─────────────────────────────────────────────────┐     │
│  │              PREMIUM FORMULA                      │     │
│  │                                                   │     │
│  │  Final = Base + WeatherRisk + UBI + Seasonal      │     │
│  │                                                   │     │
│  │  Base:     ₹80/₹120/₹160 (by tier)              │     │
│  │  Weather:  ₹10-₹30 (ML disruption probability)   │     │
│  │  UBI:      ₹0-₹15 (zone-based risk exposure)     │     │
│  │  Seasonal: 0.85x-1.4x (monsoon multiplier)       │     │
│  └─────────────────────────────────────────────────┘     │
│                                                           │
│  DATA SOURCES:                                            │
│  • Open-Meteo (35-day weather history + 7-day forecast)  │
│  • AQICN / Open-Meteo AQI (air quality forecast)        │
│  • NewsData.io + OpenRouter LLM (curfew/bandh detection) │
│  • Mock Porter API (driver zone distribution for UBI)    │
└─────────────────────────────────────────────────────────┘
```

**Feature Engineering (42-51 features per model):**
- Lag features: 1, 2, 3, 5, 7, 14, 30 day lags
- Rolling statistics: 3, 7, 14, 30 day mean/max/std
- Temporal: month, day_of_year, is_monsoon, is_winter, is_cyclone_season
- Pressure changes: 1-day and 3-day deltas
- City one-hot encoding (10 cities)

---

## SLIDE 5: Fraud Detection Architecture

**6-Signal Multi-Layer Fraud Detection:**

```
┌─────────────────────────────────────────────────────────┐
│                    CLAIM CREATED                          │
│                        │                                  │
│              ┌─────────▼─────────┐                       │
│              │    GATE 1          │                       │
│              │  Environmental     │                       │
│              │  Trigger Verified  │                       │
│              │  (API data match)  │                       │
│              └─────────┬─────────┘                       │
│                        │                                  │
│              ┌─────────▼─────────┐                       │
│              │    GATE 2          │                       │
│              │  Driver in Zone?   │                       │
│              │  • GPS within      │                       │
│              │    geofence        │                       │
│              │  • 45min+ online   │                       │
│              │    in past 4hrs    │                       │
│              └─────────┬─────────┘                       │
│                        │                                  │
│     ┌──────────────────▼──────────────────┐              │
│     │         FRAUD DETECTION ENGINE       │              │
│     │                                      │              │
│     │  Signal 1: Duplicate Claim    (30%)  │              │
│     │  Signal 2: Rapid Claims       (20%)  │              │
│     │  Signal 3: Location Anomaly   (25%)  │              │
│     │    ├─ GPS vs IP mismatch (>50km)     │              │
│     │    └─ Impossible travel detection     │              │
│     │  Signal 4: Weather Mismatch   (15%)  │              │
│     │  Signal 5: Cluster/Syndicate  (10%)  │              │
│     │    ├─ 10+ claims in 10min            │              │
│     │    ├─ Shared devices/IPs             │              │
│     │    └─ Low GPS entropy                │              │
│     │  Signal 6: Trust Score Penalty       │              │
│     │    └─ Low history = higher score     │              │
│     └──────────────────┬──────────────────┘              │
│                        │                                  │
│     ┌──────────────────▼──────────────────┐              │
│     │          ROUTING (Zero-Touch)        │              │
│     │                                      │              │
│     │  Score < 30%  → AUTO-APPROVE + PAY   │              │
│     │  Score 30-70% → APPROVE + FLAG       │              │
│     │  Score ≥ 70%  → AUTO-REJECT          │              │
│     │                                      │              │
│     │  Trust Score Updated:                │              │
│     │  Clean claim → +0.05                 │              │
│     │  Fraud reject → -0.20               │              │
│     └─────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────┘
```

**Key Innovation:** No manual review queue. Parametric = trigger IS the proof. High fraud = auto-reject, not "pending review."

---

## SLIDE 6: Weekly Pricing Model — Business Viability

**Premium Structure:**

| Tier | Premium/week | Max Payout/week | Target Driver |
|------|-------------|-----------------|---------------|
| Normal | ₹80 | ₹2,000 | Part-time |
| Medium | ₹120 | ₹3,000 | Regular |
| High | ₹160 | ₹4,000 | Full-time |

**Dynamic Pricing Formula:**
```
FinalPremium = BasePremium × SeasonalMultiplier + WeatherRiskAddon + UBIAddon
```

**Seasonal Multipliers (India-specific):**
- Jan-Feb: 0.85x (low risk, cheaper)
- Jun-Aug: 1.40x (peak monsoon, expensive)
- Oct: 1.20x (cyclone season)
- Nov: 1.15x (GRAP-IV season, Delhi)

**Financial Projections (500K drivers):**

| Scenario | % Claiming | Weekly Payout | Result |
|----------|-----------|---------------|--------|
| Normal week | 5% | ₹2.5 Cr | Profit |
| Moderate disruption | 10% | ₹6 Cr | Covered by reserves |
| Severe disruption | 15% | ₹11.25 Cr | Catastrophic reserve |
| Extreme (rare) | 20% | ₹18 Cr | Reinsurance trigger |

**Annual Premium Revenue (projected):** ₹192 Crore
**Combined trigger probability:** ~4%/week
**Burning Cost Rate target:** 0.55 - 0.70

---

## SLIDE 7: Payment Flow — Weekly Cycle

```
SATURDAY NIGHT
└─ Cron job calculates dynamic premium for every driver
   └─ ML models predict next week's risk per city

SUNDAY 6:00 AM ─────── PAYMENT WINDOW OPENS ──────
│
├─ AUTO-PAY drivers: UPI auto-deducted
├─ MANUAL drivers: Push notification "Pay ₹X now"
│   └─ Open app → Policy tab → "Pay Now" → Razorpay
│
MONDAY 6:00 AM ─────── PAYMENT WINDOW CLOSES ─────
│
├─ PAID: Policy activates (Mon-Sun coverage)
└─ UNPAID: No coverage, wait until next Sunday

FIRST-TIME REGISTRATION:
└─ 7-13 day waiting period (prevents adverse selection)
└─ Register Tuesday → Policy starts next-to-next Monday
```

**Key Design Decisions:**
- Weekly (not monthly) = lower barrier to entry for gig workers
- Sunday window = drivers know exactly when to pay
- Auto-pay consent-based = driver controls their UPI
- Dynamic premium = fair pricing based on actual risk

---

## SLIDE 8: Dual-Gate Claim Verification

**Gate 1 — Environmental Trigger (Automated):**

| Disruption | Trigger | Data Source | Geofence |
|-----------|---------|-------------|----------|
| Heavy Rainfall | >65mm/day | Open-Meteo + IMD | 15 km |
| AQI GRAP-IV | AQI >450 | AQICN + Open-Meteo | 20 km |
| Cyclone | Wind >70 km/h | Open-Meteo | 25 km |
| Platform Outage | >3 hrs down | StatusGator | City-wide |
| Curfew/Bandh | Halt >4 hrs | NewsData.io + LLM | 20 km |

**Gate 2 — Driver Activity Verification:**
- Driver GPS within disruption geofence
- 45+ minutes online in past 4 hours
- Registered zone matches affected area

**Payout:**
- UPI instant transfer (<10 minutes)
- Max 1 claim per day
- Weekly payout cap enforced
- 24-hour vehicle asset lock

---

## SLIDE 9: Tech Stack & Architecture

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND                                                │
│  Next.js 16 (React, App Router) + Tailwind CSS          │
│  TypeScript + Leaflet.js (maps) + Recharts              │
│  Mobile-first driver dashboard + Admin analytics         │
├─────────────────────────────────────────────────────────┤
│  BACKEND                                                 │
│  Next.js API Routes (serverless functions)               │
│  Supabase (PostgreSQL + Auth + Realtime + RLS)          │
│  Row-Level Security for multi-tenant data               │
├─────────────────────────────────────────────────────────┤
│  AI/ML SERVICE                                           │
│  FastAPI (Python) on Hugging Face Spaces (Docker)        │
│  XGBoost models (rainfall + wind prediction)             │
│  scikit-learn preprocessing + feature engineering        │
├─────────────────────────────────────────────────────────┤
│  EXTERNAL APIs                                           │
│  Open-Meteo (weather + AQI) | AQICN (air quality)      │
│  NewsData.io (curfew scraping) | OpenRouter LLM         │
│  Razorpay (payments) | ip-api.com (fraud detection)     │
├─────────────────────────────────────────────────────────┤
│  DEVOPS                                                  │
│  Vercel (frontend + API) | HF Spaces (ML service)       │
│  Supabase Cloud (database) | GitHub Actions (cron)      │
└─────────────────────────────────────────────────────────┘
```

---

## SLIDE 10: Features & Innovation

**Driver-Facing Features:**
- Zero-touch parametric claims (no filing, no paperwork)
- Instant UPI payouts (<10 minutes)
- AI chatbot for policy queries
- 5-language support (English, Hindi, Telugu, Tamil, Malayalam)
- Real-time zone risk map
- GigPoints rewards system
- Weekly streak bonuses
- Premium forecast with sparkline charts

**Admin Features:**
- Real-time dashboard with live weather data
- Interactive zone risk heatmap (Leaflet)
- Fraud detection center with 6-signal scoring
- Dynamic premium calculator (ML-powered)
- Billing analytics (BCR, loss ratio, revenue breakdown)
- System logs + API health monitoring
- Demo trigger panel for testing
- Search + notification system

**Key Innovations:**
1. **Parametric model** — trigger = payout, no traditional underwriting
2. **AI dynamic pricing** — XGBoost + seasonal + zone-based premiums
3. **Zero-touch fraud** — auto-approve or auto-reject, no manual queue
4. **Curfew detection via NLP** — NewsData.io + LLM classification
5. **Trust score feedback loop** — clean claims boost trust, fraud decays it
6. **Weekly micro-insurance** — ₹80/week barrier vs ₹thousands annually

---

## SLIDE 11: Curfew/Bandh Detection — NLP Pipeline

```
NewsData.io API
│
├─ Query: "curfew OR bandh OR strike OR lockdown" + city
├─ Filter: India, English + Hindi, last 24 hours
│
▼
Top 5 headlines fetched
│
▼
OpenRouter LLM (GPT)
│
├─ Input: headline + target city
├─ Prompt: "Is this an active mobility restriction?"
├─ Output (JSON):
│   {
│     "is_disruption": true,
│     "severity": 8,
│     "estimated_hours": 6,
│     "affected_city": "Mumbai"
│   }
│
▼
If severity ≥ 6 AND hours ≥ 4 AND city matches
│
▼
TRIGGER CREATED → Claims processed → Payouts sent
```

**Why this matters:** Curfews/bandhs are uniquely Indian disruptions with no standard API. Our NLP pipeline detects them from news in real-time.

---

## SLIDE 12: UBI (Usage-Based Insurance) — Zone Risk Scoring

**How UBI personalizes premiums:**

```
Driver's Zone Distribution (from Porter API):
├─ Kurla (flood-prone):     23.7% of trips → Risk: 0.85
├─ Goregaon (moderate):     30.5% of trips → Risk: 0.55
├─ Bandra (mixed):          26.2% of trips → Risk: 0.50
├─ Sion (waterlogging):     17.0% of trips → Risk: 0.80
└─ Andheri (elevated):       2.7% of trips → Risk: 0.35

Weighted Risk Score = Σ(zone_risk × trip_percentage) = 0.65

UBI Addon = weighted_risk × ₹15 = ₹9.79/week
```

**10 cities × 5-8 zones each = 70+ risk-scored zones**

Risk factors per zone: waterlogging, coastal flooding, traffic congestion, industrial area, elevation, drainage quality

---

## SLIDE 13: Live Demo Highlights

**What we'll show:**
1. Landing page with real driver testimonial
2. End-to-end onboarding with mock Razorpay payment
3. Active driver dashboard with live weather data
4. Language switch (English → Telugu → Hindi)
5. AI chatbot answering policy questions
6. Admin dashboard with real-time analytics
7. Firing a live disruption trigger → seeing claims auto-process
8. Fraud simulator → rapid triggers → fraud score increasing
9. Dynamic premium calculation hitting live ML models
10. Zone risk heatmap with Leaflet interactive map

**All data is LIVE:**
- Weather from Open-Meteo APIs
- AQI from air quality APIs
- ML predictions from XGBoost models on Hugging Face
- Database on Supabase Cloud
- Deployed on Vercel

---

## SLIDE 14: Market Opportunity & Roadmap

**Total Addressable Market:**
- 500,000+ platform-based LCV drivers (Porter, Rivigo, BlackBuck)
- 25-30% YoY growth in platform logistics
- ₹4,200 – ₹5,400 Crore/year opportunity
- <5% of gig workers have any income protection

**Roadmap:**

| Phase | Timeline | Goal |
|-------|----------|------|
| Seed | Hackathon | Working prototype with all features |
| Pilot | Q3 2026 | 1,000 drivers in Mumbai + Delhi |
| Scale | Q1 2027 | 10 cities, real Porter API integration |
| Growth | Q3 2027 | Expand to 2-wheeler delivery (Zomato/Swiggy) |

**Competitive Advantage:**
- First parametric micro-insurance for Indian gig workers
- Real-time AI pricing (not static actuarial tables)
- Zero-touch claims (competitors require manual filing)
- Weekly payments (₹80 vs annual ₹5,000+ premiums)

---

## SLIDE 15: Thank You

**SafeShift — Because no driver should lose their livelihood to the weather.**

Team Code Mavens | Guidewire DEVTrails 2026

**Try it live:**
- App: [Vercel deployment URL]
- ML Service: https://manogna0528-safeshift.hf.space
- GitHub: github.com/Manogna21-prog/Safe-Shift

**Contact:**
[Team member names and emails]

https://docs.google.com/presentation/d/1U15S4zKos0tjaoWISsSvmxr3tVVnE4XE/edit?usp=sharing&ouid=111603720095835270884&rtpof=true&sd=true
