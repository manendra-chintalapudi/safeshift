---
title: SafeShift ML Service
emoji: 🛡️
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
---

# SafeShift ML Prediction Service

AI-powered disruption prediction for parametric insurance premium calculation.

## Endpoints

- `POST /predict/rainfall` — P(precipitation > 65mm in 7 days)
- `POST /predict/wind` — P(wind > 70km/h in 7 days)
- `POST /predict/aqi` — GRAP-IV probability (via AQICN forecast)
- `POST /predict/premium` — Full dynamic premium calculation
- `GET /health` — Health check

## Models

- **Rainfall**: XGBoost (ROC-AUC: 0.90) trained on 5yr data across 10 Indian cities
- **Wind/Cyclone**: XGBoost (ROC-AUC: 0.89) with proxy threshold scaling
- **AQI**: Direct AQICN API forecast (no ML needed)
