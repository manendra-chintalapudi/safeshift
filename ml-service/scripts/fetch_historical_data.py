"""
Fetch historical weather, AQI, and wind data for all SafeShift cities
from Open-Meteo APIs (free, no key required).

Data fetched:
- Daily precipitation (rainfall) — past 5 years
- Daily max wind speed & gusts — past 5 years
- Hourly AQI (US EPA) — past 2 years (API limit)
"""

import os
import time
import json
import requests
import pandas as pd
from datetime import datetime, timedelta

# Cities from SafeShift config
CITIES = [
    {"slug": "mumbai", "lat": 19.076, "lng": 72.8777, "state": "Maharashtra"},
    {"slug": "delhi", "lat": 28.6139, "lng": 77.209, "state": "Delhi"},
    {"slug": "bangalore", "lat": 12.9716, "lng": 77.5946, "state": "Karnataka"},
    {"slug": "chennai", "lat": 13.0827, "lng": 80.2707, "state": "Tamil Nadu"},
    {"slug": "pune", "lat": 18.5204, "lng": 73.8567, "state": "Maharashtra"},
    {"slug": "hyderabad", "lat": 17.385, "lng": 78.4867, "state": "Telangana"},
    {"slug": "kolkata", "lat": 22.5726, "lng": 88.3639, "state": "West Bengal"},
    {"slug": "ahmedabad", "lat": 23.0225, "lng": 72.5714, "state": "Gujarat"},
    {"slug": "jaipur", "lat": 26.9124, "lng": 75.7873, "state": "Rajasthan"},
    {"slug": "lucknow", "lat": 26.8467, "lng": 80.9462, "state": "Uttar Pradesh"},
]

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)


def fetch_weather_history(city: dict, start_date: str, end_date: str) -> pd.DataFrame:
    """Fetch daily weather data from Open-Meteo Historical API"""
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = {
        "latitude": city["lat"],
        "longitude": city["lng"],
        "start_date": start_date,
        "end_date": end_date,
        "daily": ",".join([
            "precipitation_sum",
            "rain_sum",
            "wind_speed_10m_max",
            "wind_gusts_10m_max",
            "temperature_2m_max",
            "temperature_2m_min",
            "temperature_2m_mean",
            "relative_humidity_2m_mean",
            "surface_pressure_mean",
            "cloud_cover_mean",
        ]),
        "timezone": "Asia/Kolkata",
    }

    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    df = pd.DataFrame({
        "date": data["daily"]["time"],
        "precipitation_mm": data["daily"]["precipitation_sum"],
        "rain_mm": data["daily"]["rain_sum"],
        "wind_speed_max_kmh": data["daily"]["wind_speed_10m_max"],
        "wind_gusts_max_kmh": data["daily"]["wind_gusts_10m_max"],
        "temp_max_c": data["daily"]["temperature_2m_max"],
        "temp_min_c": data["daily"]["temperature_2m_min"],
        "temp_mean_c": data["daily"]["temperature_2m_mean"],
        "humidity_mean": data["daily"]["relative_humidity_2m_mean"],
        "pressure_mean_hpa": data["daily"]["surface_pressure_mean"],
        "cloud_cover_mean": data["daily"]["cloud_cover_mean"],
    })
    df["city"] = city["slug"]
    df["date"] = pd.to_datetime(df["date"])
    return df


def fetch_aqi_history(city: dict, start_date: str, end_date: str) -> pd.DataFrame:
    """Fetch daily AQI data from Open-Meteo Air Quality Historical API"""
    url = "https://air-quality-api.open-meteo.com/v1/air-quality"
    params = {
        "latitude": city["lat"],
        "longitude": city["lng"],
        "start_date": start_date,
        "end_date": end_date,
        "hourly": "us_aqi,pm2_5,pm10",
        "timezone": "Asia/Kolkata",
    }

    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    df = pd.DataFrame({
        "datetime": data["hourly"]["time"],
        "us_aqi": data["hourly"]["us_aqi"],
        "pm25": data["hourly"]["pm2_5"],
        "pm10": data["hourly"]["pm10"],
    })
    df["datetime"] = pd.to_datetime(df["datetime"])
    df["date"] = df["datetime"].dt.date
    df["city"] = city["slug"]

    # Aggregate to daily max/mean
    daily = df.groupby(["city", "date"]).agg(
        aqi_max=("us_aqi", "max"),
        aqi_mean=("us_aqi", "mean"),
        pm25_max=("pm25", "max"),
        pm25_mean=("pm25", "mean"),
        pm10_max=("pm10", "max"),
        pm10_mean=("pm10", "mean"),
    ).reset_index()
    daily["date"] = pd.to_datetime(daily["date"])
    return daily


def main():
    today = datetime.now()

    # Weather: 5 years of history
    weather_start = (today - timedelta(days=5 * 365)).strftime("%Y-%m-%d")
    weather_end = (today - timedelta(days=1)).strftime("%Y-%m-%d")

    # AQI: 2 years (Open-Meteo air quality historical limit)
    aqi_start = (today - timedelta(days=2 * 365)).strftime("%Y-%m-%d")
    aqi_end = (today - timedelta(days=1)).strftime("%Y-%m-%d")

    all_weather = []
    all_aqi = []

    for city in CITIES:
        print(f"\n{'='*60}")
        print(f"Fetching data for {city['slug']} ({city['state']})")
        print(f"{'='*60}")

        # Weather data
        print(f"  Weather: {weather_start} to {weather_end}...")
        try:
            weather_df = fetch_weather_history(city, weather_start, weather_end)
            all_weather.append(weather_df)
            print(f"  ✓ {len(weather_df)} days of weather data")
        except Exception as e:
            print(f"  ✗ Weather fetch failed: {e}")

        time.sleep(0.5)  # Be nice to the API

        # AQI data
        print(f"  AQI: {aqi_start} to {aqi_end}...")
        try:
            aqi_df = fetch_aqi_history(city, aqi_start, aqi_end)
            all_aqi.append(aqi_df)
            print(f"  ✓ {len(aqi_df)} days of AQI data")
        except Exception as e:
            print(f"  ✗ AQI fetch failed: {e}")

        time.sleep(0.5)

    # Combine and save
    if all_weather:
        weather_combined = pd.concat(all_weather, ignore_index=True)
        weather_path = os.path.join(DATA_DIR, "weather_history.csv")
        weather_combined.to_csv(weather_path, index=False)
        print(f"\n✓ Weather data saved: {weather_path} ({len(weather_combined)} rows)")

        # Print summary stats
        print("\nWeather Summary:")
        for city_slug in weather_combined["city"].unique():
            city_data = weather_combined[weather_combined["city"] == city_slug]
            heavy_rain_days = (city_data["precipitation_mm"] > 65).sum()
            high_wind_days = (city_data["wind_speed_max_kmh"] > 70).sum()
            print(f"  {city_slug}: {len(city_data)} days, "
                  f"heavy rain (>65mm): {heavy_rain_days} days, "
                  f"high wind (>70km/h): {high_wind_days} days")

    if all_aqi:
        aqi_combined = pd.concat(all_aqi, ignore_index=True)
        aqi_path = os.path.join(DATA_DIR, "aqi_history.csv")
        aqi_combined.to_csv(aqi_path, index=False)
        print(f"\n✓ AQI data saved: {aqi_path} ({len(aqi_combined)} rows)")

        # Print summary stats
        print("\nAQI Summary:")
        for city_slug in aqi_combined["city"].unique():
            city_data = aqi_combined[aqi_combined["city"] == city_slug]
            grap_iv_days = (city_data["aqi_max"] > 450).sum()
            print(f"  {city_slug}: {len(city_data)} days, GRAP-IV (AQI>450): {grap_iv_days} days")

    print("\n✓ Data collection complete!")


if __name__ == "__main__":
    main()
