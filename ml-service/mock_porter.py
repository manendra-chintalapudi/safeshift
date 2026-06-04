"""
Mock Porter API — Simulates driver route/zone data from Porter platform.

In production, this would call Porter's actual API to get:
- Driver's frequent delivery zones
- Trip history with GPS coordinates
- Hours spent per zone

For demo, we generate realistic zone distributions per driver.
"""

import random
from zones import CITY_ZONES


def get_driver_zones(city: str, driver_id=None) -> dict:
    """
    Mock Porter API: Returns zones the driver frequently operates in.

    Returns:
        {
            "driver_id": str,
            "city": str,
            "total_trips_last_30_days": int,
            "zone_distribution": [
                {
                    "zone_id": str,
                    "zone_name": str,
                    "trips": int,
                    "percentage": float,
                    "avg_hours_per_day": float,
                    "risk_score": float,
                }
            ]
        }
    """
    zones = CITY_ZONES.get(city, [])
    if not zones:
        return {"driver_id": driver_id, "city": city, "total_trips_last_30_days": 0, "zone_distribution": []}

    # Seed with driver_id for consistent results per driver
    if driver_id:
        random.seed(hash(driver_id) % 2**32)

    # Driver typically operates in 3-5 zones within a city
    num_zones = random.randint(3, min(5, len(zones)))
    selected_zones = random.sample(zones, num_zones)

    # Generate trip distribution (follows power law — driver has 1-2 primary zones)
    weights = sorted([random.random() ** 0.5 for _ in range(num_zones)], reverse=True)
    total_weight = sum(weights)
    weights = [w / total_weight for w in weights]

    total_trips = random.randint(80, 150)

    zone_distribution = []
    for zone, weight in zip(selected_zones, weights):
        trips = max(1, int(total_trips * weight))
        zone_distribution.append({
            "zone_id": zone["zone_id"],
            "zone_name": zone["name"],
            "lat": zone["lat"],
            "lng": zone["lng"],
            "trips": trips,
            "percentage": round(weight * 100, 1),
            "avg_hours_per_day": round(random.uniform(1.5, 6.0) * weight + 0.5, 1),
            "risk_score": zone["risk_score"],
            "risk_factors": zone["risk_factors"],
        })

    # Reset random seed
    random.seed()

    return {
        "driver_id": driver_id or "demo_driver",
        "city": city,
        "total_trips_last_30_days": total_trips,
        "zone_distribution": sorted(zone_distribution, key=lambda x: x["trips"], reverse=True),
    }


def calculate_ubi_from_zones(zone_distribution: list) -> dict:
    """
    Calculate UBI addon based on driver's zone exposure.

    Formula:
        weighted_risk = sum(zone_risk * zone_percentage) for each zone
        ubi_addon = weighted_risk * 15  (capped at ₹0-15)

    A driver who operates mostly in high-risk zones (waterlogging areas,
    flood-prone low-lying regions) pays more than one in safe zones.
    """
    if not zone_distribution:
        return {
            "ubi_addon": 0,
            "weighted_risk_score": 0,
            "risk_level": "unknown",
            "zone_contributions": [],
        }

    total_pct = sum(z["percentage"] for z in zone_distribution)
    if total_pct == 0:
        total_pct = 1

    # Calculate weighted risk score
    zone_contributions = []
    weighted_risk = 0
    for zone in zone_distribution:
        normalized_pct = zone["percentage"] / total_pct
        contribution = zone["risk_score"] * normalized_pct
        weighted_risk += contribution
        zone_contributions.append({
            "zone_id": zone["zone_id"],
            "zone_name": zone["zone_name"],
            "risk_score": zone["risk_score"],
            "time_percentage": round(zone["percentage"], 1),
            "risk_contribution": round(contribution, 4),
        })

    # UBI addon: weighted_risk (0-1) * 15 = ₹0-15
    ubi_addon = round(weighted_risk * 15, 2)
    ubi_addon = max(0, min(15, ubi_addon))

    if weighted_risk < 0.4:
        risk_level = "low"
    elif weighted_risk < 0.65:
        risk_level = "medium"
    else:
        risk_level = "high"

    return {
        "ubi_addon": ubi_addon,
        "weighted_risk_score": round(weighted_risk, 4),
        "risk_level": risk_level,
        "zone_contributions": sorted(zone_contributions, key=lambda x: x["risk_contribution"], reverse=True),
    }
