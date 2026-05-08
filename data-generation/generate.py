"""
Appilico Intelligence Suite — Star Schema Synthetic Data Generator
=================================================================
Generates 24 months of realistic Australian mining operational data
across 5 sites, multiple commodities, and 8 fact tables + 7 dimensions.

Usage:
    python generate.py [--months 24] [--output-dir ../test-data/star-schema]
"""

import argparse
import os
import random
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Tuple

import numpy as np
import pandas as pd

# ─── SEED FOR REPRODUCIBILITY ────────────────────────────────────────────────
SEED = 42
random.seed(SEED)
np.random.seed(SEED)

# ─── CONSTANTS ────────────────────────────────────────────────────────────────

SITES = [
    {"id": "PIL-01", "name": "Pilbara Iron Hub",     "state": "WA",  "lat": -22.30, "lon": 118.82, "commodity": "Iron Ore",  "unit": "Fe%"},
    {"id": "BOW-01", "name": "Bowen Basin Coal",     "state": "QLD", "lat": -22.08, "lon": 148.05, "commodity": "Coal",      "unit": "CV MJ/kg"},
    {"id": "KAL-01", "name": "Kalgoorlie Gold",      "state": "WA",  "lat": -30.75, "lon": 121.47, "commodity": "Gold",      "unit": "Au g/t"},
    {"id": "MIS-01", "name": "Mt Isa Copper",        "state": "QLD", "lat": -20.73, "lon": 139.49, "commodity": "Copper",    "unit": "Cu%"},
    {"id": "HUN-01", "name": "Hunter Valley Coal",   "state": "NSW", "lat": -32.28, "lon": 150.89, "commodity": "Coal",      "unit": "CV MJ/kg"},
]

EQUIPMENT_FLEET = [
    # Haul Trucks
    {"id": "CAT793-001", "name": "CAT 793F #1",       "type": "Haul Truck",  "make": "Caterpillar", "model": "793F",    "capacity_t": 227},
    {"id": "CAT793-002", "name": "CAT 793F #2",       "type": "Haul Truck",  "make": "Caterpillar", "model": "793F",    "capacity_t": 227},
    {"id": "CAT793-003", "name": "CAT 793F #3",       "type": "Haul Truck",  "make": "Caterpillar", "model": "793F",    "capacity_t": 227},
    {"id": "CAT793-004", "name": "CAT 793F #4",       "type": "Haul Truck",  "make": "Caterpillar", "model": "793F",    "capacity_t": 227},
    {"id": "KOM930-001", "name": "Komatsu 930E #1",   "type": "Haul Truck",  "make": "Komatsu",     "model": "930E-5",  "capacity_t": 290},
    {"id": "KOM930-002", "name": "Komatsu 930E #2",   "type": "Haul Truck",  "make": "Komatsu",     "model": "930E-5",  "capacity_t": 290},
    # Excavators
    {"id": "LIE996-001", "name": "Liebherr R996B #1", "type": "Excavator",   "make": "Liebherr",    "model": "R996B",   "capacity_t": 36},
    {"id": "EX5600-001", "name": "Hitachi EX5600 #1", "type": "Excavator",   "make": "Hitachi",     "model": "EX5600-7","capacity_t": 34},
    {"id": "EX5600-002", "name": "Hitachi EX5600 #2", "type": "Excavator",   "make": "Hitachi",     "model": "EX5600-7","capacity_t": 34},
    # Dozers
    {"id": "D11-001",    "name": "CAT D11T #1",       "type": "Dozer",       "make": "Caterpillar", "model": "D11T",    "capacity_t": 0},
    {"id": "D11-002",    "name": "CAT D11T #2",       "type": "Dozer",       "make": "Caterpillar", "model": "D11T",    "capacity_t": 0},
    {"id": "D11-003",    "name": "CAT D11T #3",       "type": "Dozer",       "make": "Caterpillar", "model": "D11T",    "capacity_t": 0},
    # Drills
    {"id": "DR24-001",   "name": "Atlas DR24 #1",     "type": "Drill",       "make": "Epiroc",      "model": "DM-M3",   "capacity_t": 0},
    {"id": "DR24-002",   "name": "Atlas DR24 #2",     "type": "Drill",       "make": "Epiroc",      "model": "DM-M3",   "capacity_t": 0},
    # Graders
    {"id": "GD16-001",   "name": "CAT 16M3 #1",      "type": "Grader",      "make": "Caterpillar", "model": "16M3",    "capacity_t": 0},
    # Water Trucks
    {"id": "WT773-001",  "name": "CAT 773G Water #1", "type": "Water Truck", "make": "Caterpillar", "model": "773G",    "capacity_t": 0},
    # Crushers
    {"id": "CRUSH-001",  "name": "Metso HP800 #1",    "type": "Crusher",     "make": "Metso",       "model": "HP800",   "capacity_t": 0},
    {"id": "CRUSH-002",  "name": "Sandvik CG820 #1",  "type": "Crusher",     "make": "Sandvik",     "model": "CG820i",  "capacity_t": 0},
    # Screen Plants
    {"id": "SCRN-001",   "name": "Metso CVB Screen",  "type": "Screen",      "make": "Metso",       "model": "CVB2060", "capacity_t": 0},
]

CREWS = [
    {"id": "CREW-A", "name": "Alpha",   "supervisor": "James Mitchell"},
    {"id": "CREW-B", "name": "Bravo",   "supervisor": "Sarah Thompson"},
    {"id": "CREW-C", "name": "Charlie", "supervisor": "Michael Chen"},
    {"id": "CREW-D", "name": "Delta",   "supervisor": "Emma Williams"},
]

LOCATIONS = [
    {"id": "NP", "name": "North Pit",   "bench_start": 380, "bench_end": 420},
    {"id": "SP", "name": "South Pit",   "bench_start": 340, "bench_end": 390},
    {"id": "EP", "name": "East Pit",    "bench_start": 360, "bench_end": 400},
    {"id": "WP", "name": "West Pit",    "bench_start": 350, "bench_end": 380},
    {"id": "ROM","name": "ROM Pad",     "bench_start": 0,   "bench_end": 0},
]

COST_CATEGORIES = [
    {"id": "CC-OPS",   "name": "Mining Operations",  "gl_prefix": "5100"},
    {"id": "CC-MAINT", "name": "Maintenance",         "gl_prefix": "5200"},
    {"id": "CC-FUEL",  "name": "Diesel & Fuel",       "gl_prefix": "5300"},
    {"id": "CC-LAB",   "name": "Labour & Wages",      "gl_prefix": "5400"},
    {"id": "CC-CONS",  "name": "Consumables",         "gl_prefix": "5500"},
    {"id": "CC-DRILL", "name": "Drill & Blast",       "gl_prefix": "5600"},
    {"id": "CC-HAUL",  "name": "Haulage & Transport", "gl_prefix": "5700"},
    {"id": "CC-PROC",  "name": "Processing",          "gl_prefix": "5800"},
    {"id": "CC-OVER",  "name": "Overhead & Admin",    "gl_prefix": "6100"},
]

SAFETY_KPIS = [
    {"id": "KPI-TRIFR",  "name": "TRIFR",                       "is_leading": False, "unit": "per Mhrs", "target": 3.0,  "range": (1.5, 8.0)},
    {"id": "KPI-LTIFR",  "name": "LTIFR",                       "is_leading": False, "unit": "per Mhrs", "target": 1.0,  "range": (0.0, 3.0)},
    {"id": "KPI-DSLTI",  "name": "Days Since Last LTI",         "is_leading": False, "unit": "days",     "target": 365,  "range": (30, 500)},
    {"id": "KPI-NMREP",  "name": "Near Miss Reports",           "is_leading": True,  "unit": "count",    "target": 15,   "range": (5, 25)},
    {"id": "KPI-SAOBS",  "name": "Safety Observations",         "is_leading": True,  "unit": "%",        "target": 95,   "range": (75, 100)},
    {"id": "KPI-HPINC",  "name": "High Potential Incidents",    "is_leading": False, "unit": "count",    "target": 0,    "range": (0, 3)},
    {"id": "KPI-TRAIN",  "name": "Training Completion",         "is_leading": True,  "unit": "%",        "target": 100,  "range": (80, 100)},
    {"id": "KPI-HZARD",  "name": "Hazard Close-out Rate",       "is_leading": True,  "unit": "%",        "target": 90,   "range": (65, 100)},
    {"id": "KPI-EMRTM",  "name": "Emergency Response Time",     "is_leading": True,  "unit": "min",      "target": 5,    "range": (3, 12)},
    {"id": "KPI-RSKSC",  "name": "Risk Assessment Compliance",  "is_leading": True,  "unit": "%",        "target": 100,  "range": (70, 100)},
    {"id": "KPI-INVRR",  "name": "Incident Investigation Rate", "is_leading": False, "unit": "%",        "target": 100,  "range": (80, 100)},
    {"id": "KPI-FATSC",  "name": "Fatigue Score Average",       "is_leading": True,  "unit": "score",    "target": 85,   "range": (60, 95)},
]

ORE_STAGES = [
    {"order": 1, "name": "In-Situ Resource"},
    {"order": 2, "name": "ROM Stockpile"},
    {"order": 3, "name": "Primary Crush"},
    {"order": 4, "name": "Secondary Crush"},
    {"order": 5, "name": "Screening"},
    {"order": 6, "name": "Beneficiation"},
    {"order": 7, "name": "Final Product"},
]

EQUIPMENT_STATUSES = ["Operating", "Idle", "Standby", "Maintenance", "Breakdown"]
EQUIPMENT_REASON_CODES = {
    "Operating":   ["Production", "Rehandle", "Dozing", "Tramming"],
    "Idle":        ["No Operator", "Awaiting Load", "Shift Change", "Crib Break"],
    "Standby":     ["Weather", "Blast Clearance", "Road Blocked", "Queue at Crusher"],
    "Maintenance": ["Scheduled Service", "PM500", "PM1000", "Component Change"],
    "Breakdown":   ["Engine Fault", "Hydraulic Leak", "Tyre", "Electrical", "Structural"],
}

SHIFTS = ["Day", "Night"]
EMISSION_SOURCES = ["Diesel - Haul Trucks", "Diesel - Excavators", "Diesel - Dozers", "Electricity - Processing", "Electricity - Admin", "Explosives", "Fugitive Dust"]

HAULAGE_ROUTES = [
    {"id": "RT-01", "from": "North Pit",  "to": "ROM Pad",      "distance_km": 3.2},
    {"id": "RT-02", "from": "South Pit",  "to": "ROM Pad",      "distance_km": 4.8},
    {"id": "RT-03", "from": "East Pit",   "to": "ROM Pad",      "distance_km": 2.7},
    {"id": "RT-04", "from": "ROM Pad",    "to": "Primary Crush", "distance_km": 1.1},
    {"id": "RT-05", "from": "North Pit",  "to": "Waste Dump",   "distance_km": 5.5},
    {"id": "RT-06", "from": "South Pit",  "to": "Waste Dump",   "distance_km": 6.2},
]


def generate_dim_date(start: date, end: date) -> pd.DataFrame:
    """Mining calendar dimension with FY July-June, shifts."""
    dates = pd.date_range(start, end, freq="D")
    rows = []
    for d in dates:
        fy = d.year if d.month >= 7 else d.year - 1
        fy_label = f"FY{fy + 1}"
        q = ((d.month - 7) % 12) // 3 + 1
        rows.append({
            "date_key": d.strftime("%Y-%m-%d"),
            "year": d.year,
            "month": d.month,
            "month_name": d.strftime("%B"),
            "month_short": d.strftime("%b"),
            "day": d.day,
            "day_of_week": d.strftime("%A"),
            "day_of_week_num": d.weekday(),
            "week_of_year": d.isocalendar()[1],
            "fiscal_year": fy_label,
            "fiscal_quarter": f"Q{q}",
            "fiscal_month": ((d.month - 7) % 12) + 1,
            "is_weekend": d.weekday() >= 5,
            "is_public_holiday": False,
        })
    return pd.DataFrame(rows)


def generate_dim_equipment() -> pd.DataFrame:
    return pd.DataFrame(EQUIPMENT_FLEET)


def generate_dim_crew() -> pd.DataFrame:
    return pd.DataFrame(CREWS)


def generate_dim_location() -> pd.DataFrame:
    return pd.DataFrame(LOCATIONS)


def generate_dim_material() -> pd.DataFrame:
    materials = []
    for s in SITES:
        materials.append({
            "material_id": f"MAT-{s['id']}",
            "material_name": s["commodity"],
            "site_id": s["id"],
            "site_name": s["name"],
            "state": s["state"],
            "latitude": s["lat"],
            "longitude": s["lon"],
            "grade_unit": s["unit"],
        })
    return pd.DataFrame(materials)


def generate_dim_cost_category() -> pd.DataFrame:
    return pd.DataFrame(COST_CATEGORIES)


def generate_dim_kpi() -> pd.DataFrame:
    return pd.DataFrame(SAFETY_KPIS)


# ─── FACT TABLE GENERATORS ───────────────────────────────────────────────────

def generate_fact_production(dates: pd.DatetimeIndex, site: dict) -> pd.DataFrame:
    """Generate shift-level production data with realistic variance."""
    rows = []
    base_target = {"Iron Ore": 12000, "Coal": 8000, "Gold": 3500, "Copper": 5500}
    target = base_target.get(site["commodity"], 8000)

    for d in dates:
        for shift_idx, shift in enumerate(SHIFTS):
            crew = CREWS[((d.day_of_year + shift_idx) % len(CREWS))]
            loc = LOCATIONS[d.day_of_year % (len(LOCATIONS) - 1)]  # exclude ROM

            # Seasonal variance (wet season Dec-Mar for WA/QLD)
            seasonal = 1.0
            if site["state"] in ("WA", "QLD") and d.month in (12, 1, 2, 3):
                seasonal = np.random.uniform(0.82, 0.95)

            # Night shift penalty
            night_factor = 0.92 if shift == "Night" else 1.0

            # Random daily variance ±15%
            daily_var = np.random.uniform(0.85, 1.15)

            # Occasional breakdowns (5% chance of major production loss)
            breakdown = np.random.uniform(0.3, 0.6) if np.random.random() < 0.05 else 1.0

            actual = target * seasonal * night_factor * daily_var * breakdown
            equip_count = np.random.randint(4, 8)

            rows.append({
                "date_key": d.strftime("%Y-%m-%d"),
                "shift": shift,
                "site_id": site["id"],
                "crew_id": crew["id"],
                "crew_name": crew["name"],
                "location_id": loc["id"],
                "location_name": loc["name"],
                "tonnes_actual": round(actual, 1),
                "tonnes_target": target,
                "tonnes_variance": round(actual - target, 1),
                "variance_pct": round((actual - target) / target * 100, 1),
                "equipment_count": equip_count,
                "bcm_actual": round(actual / 2.4, 1),  # bank cubic metres
                "bcm_target": round(target / 2.4, 1),
                "loading_rate_tph": round(actual / 12 * np.random.uniform(0.9, 1.1), 0),
            })
    return pd.DataFrame(rows)


def generate_fact_equipment_status(dates: pd.DatetimeIndex, site: dict) -> pd.DataFrame:
    """24-hour equipment status with reason codes and OEE."""
    rows = []
    # Assign subset of fleet to each site
    fleet_per_site = EQUIPMENT_FLEET[:8] if site["commodity"] == "Iron Ore" else EQUIPMENT_FLEET[:6]

    for d in dates:
        # Sample every 4th day to keep data manageable
        if d.day % 4 != 0:
            continue
        for equip in fleet_per_site:
            for hour in range(24):
                # Status probabilities based on time
                is_shift_change = hour in (6, 18)
                is_crib = hour in (10, 22)
                is_night = 18 <= hour or hour < 6

                r = np.random.random()
                if is_shift_change:
                    status = "Idle" if r < 0.7 else "Operating"
                elif is_crib:
                    status = "Idle" if r < 0.5 else "Operating"
                elif np.random.random() < 0.03:
                    status = "Breakdown"
                elif np.random.random() < 0.08:
                    status = "Maintenance"
                elif np.random.random() < 0.10:
                    status = "Standby"
                elif np.random.random() < 0.05:
                    status = "Idle"
                else:
                    status = "Operating"

                reason_options = EQUIPMENT_REASON_CODES[status]
                reason = random.choice(reason_options)

                oee = 0.0
                if status == "Operating":
                    oee = np.random.uniform(0.65, 0.92)
                elif status == "Standby":
                    oee = np.random.uniform(0.3, 0.5)

                rows.append({
                    "date_key": d.strftime("%Y-%m-%d"),
                    "hour": hour,
                    "site_id": site["id"],
                    "equipment_id": equip["id"],
                    "equipment_name": equip["name"],
                    "equipment_type": equip["type"],
                    "status": status,
                    "reason_code": reason,
                    "duration_min": 60,
                    "oee_pct": round(oee * 100, 1),
                    "availability_pct": round(100 if status != "Breakdown" else np.random.uniform(0, 40), 1),
                    "performance_pct": round(np.random.uniform(80, 100) if status == "Operating" else 0, 1),
                    "quality_pct": round(np.random.uniform(95, 100) if status == "Operating" else 0, 1),
                })
    return pd.DataFrame(rows)


def generate_fact_ore_grade(dates: pd.DatetimeIndex, site: dict) -> pd.DataFrame:
    """Ore grade through processing stages with realistic degradation."""
    rows = []
    grade_profiles = {
        "Iron Ore":  {"base": 62.5, "degradation": [0, -0.8, -1.2, -0.5, -0.3, -0.4, -0.2]},
        "Coal":      {"base": 28.5, "degradation": [0, -0.3, -0.5, -0.2, -0.1, -0.3, -0.1]},
        "Gold":      {"base": 4.8,  "degradation": [0, -0.2, -0.3, -0.15, -0.1, -0.2, -0.1]},
        "Copper":    {"base": 2.8,  "degradation": [0, -0.1, -0.2, -0.08, -0.05, -0.12, -0.05]},
    }
    profile = grade_profiles.get(site["commodity"], grade_profiles["Iron Ore"])

    # Monthly granularity for grade data
    months = pd.date_range(dates.min(), dates.max(), freq="MS")
    for m in months:
        cumulative = 0.0
        for stage in ORE_STAGES:
            idx = stage["order"] - 1
            cumulative += profile["degradation"][idx]
            actual = profile["base"] + cumulative + np.random.uniform(-0.5, 0.5)
            target = profile["base"] + cumulative * 0.8  # target allows 20% less degradation
            recovery = max(0, min(100, 100 + cumulative / profile["base"] * 100 + np.random.uniform(-2, 2)))

            rows.append({
                "date_key": m.strftime("%Y-%m-%d"),
                "site_id": site["id"],
                "material": site["commodity"],
                "grade_unit": site["unit"],
                "stage_order": stage["order"],
                "stage_name": stage["name"],
                "actual_grade": round(actual, 2),
                "target_grade": round(target, 2),
                "grade_variance": round(actual - target, 2),
                "recovery_pct": round(recovery, 1),
                "tonnes_processed": round(np.random.uniform(200000, 350000), 0),
            })
    return pd.DataFrame(rows)


def generate_fact_cost(dates: pd.DatetimeIndex, site: dict) -> pd.DataFrame:
    """Monthly cost by category with budget variance."""
    rows = []
    budget_profiles = {
        "Mining Operations":  {"base": 4500000, "var": 0.12},
        "Maintenance":        {"base": 2200000, "var": 0.15},
        "Diesel & Fuel":      {"base": 3100000, "var": 0.20},
        "Labour & Wages":     {"base": 5800000, "var": 0.05},
        "Consumables":        {"base": 1200000, "var": 0.18},
        "Drill & Blast":      {"base": 1800000, "var": 0.10},
        "Haulage & Transport":{"base": 2600000, "var": 0.14},
        "Processing":         {"base": 3400000, "var": 0.08},
        "Overhead & Admin":   {"base": 1100000, "var": 0.04},
    }

    months = pd.date_range(dates.min(), dates.max(), freq="MS")
    tonnes_per_month = {"Iron Ore": 720000, "Coal": 480000, "Gold": 210000, "Copper": 330000}
    base_tonnes = tonnes_per_month.get(site["commodity"], 400000)

    for m in months:
        total_actual = 0
        total_budget = 0
        for cat in COST_CATEGORIES:
            bp = budget_profiles.get(cat["name"], {"base": 1000000, "var": 0.10})
            budget = bp["base"] * np.random.uniform(0.95, 1.05)
            actual = budget * np.random.uniform(1 - bp["var"], 1 + bp["var"])

            # Diesel price shocks
            if cat["name"] == "Diesel & Fuel" and m.month in (6, 7, 8):
                actual *= np.random.uniform(1.05, 1.20)

            tonnage = base_tonnes * np.random.uniform(0.85, 1.15)
            cpt = actual / tonnage

            total_actual += actual
            total_budget += budget

            rows.append({
                "date_key": m.strftime("%Y-%m-%d"),
                "site_id": site["id"],
                "category_id": cat["id"],
                "category_name": cat["name"],
                "gl_account": f"{cat['gl_prefix']}-{site['id'][:3]}",
                "actual_amount": round(actual, 2),
                "budget_amount": round(budget, 2),
                "variance_amount": round(actual - budget, 2),
                "variance_pct": round((actual - budget) / budget * 100, 1),
                "cost_per_tonne": round(cpt, 2),
                "tonnes_produced": round(tonnage, 0),
            })
    return pd.DataFrame(rows)


def generate_fact_safety(dates: pd.DatetimeIndex, site: dict) -> pd.DataFrame:
    """Monthly safety KPI snapshots."""
    rows = []
    months = pd.date_range(dates.min(), dates.max(), freq="MS")

    for m in months:
        for kpi in SAFETY_KPIS:
            lo, hi = kpi["range"]
            current = np.random.uniform(lo, hi)
            previous = current * np.random.uniform(0.85, 1.15)
            previous = max(lo, min(hi, previous))

            rows.append({
                "date_key": m.strftime("%Y-%m-%d"),
                "site_id": site["id"],
                "kpi_id": kpi["id"],
                "kpi_name": kpi["name"],
                "is_leading": kpi["is_leading"],
                "unit": kpi["unit"],
                "current_value": round(current, 2),
                "target_value": kpi["target"],
                "previous_value": round(previous, 2),
                "trend": "improving" if (
                    (kpi["name"] in ("TRIFR", "LTIFR", "High Potential Incidents", "Emergency Response Time") and current < previous) or
                    (kpi["name"] not in ("TRIFR", "LTIFR", "High Potential Incidents", "Emergency Response Time") and current > previous)
                ) else "declining",
            })
    return pd.DataFrame(rows)


def generate_fact_emissions(dates: pd.DatetimeIndex, site: dict) -> pd.DataFrame:
    """Monthly emissions by source for NGER reporting."""
    rows = []
    months = pd.date_range(dates.min(), dates.max(), freq="MS")

    emission_profiles = {
        "Diesel - Haul Trucks":     {"co2e": 8500, "energy": 120000, "scope": 1},
        "Diesel - Excavators":      {"co2e": 4200, "energy": 60000,  "scope": 1},
        "Diesel - Dozers":          {"co2e": 3100, "energy": 44000,  "scope": 1},
        "Electricity - Processing": {"co2e": 6800, "energy": 85000,  "scope": 2},
        "Electricity - Admin":      {"co2e": 350,  "energy": 4500,   "scope": 2},
        "Explosives":               {"co2e": 1200, "energy": 0,      "scope": 1},
        "Fugitive Dust":            {"co2e": 180,  "energy": 0,      "scope": 1},
    }

    for m in months:
        tonnes_produced = np.random.uniform(300000, 500000)
        for source in EMISSION_SOURCES:
            prof = emission_profiles[source]
            co2e = prof["co2e"] * np.random.uniform(0.85, 1.15)
            energy = prof["energy"] * np.random.uniform(0.90, 1.10)

            # Decarbonization trend: ~2% reduction per year
            years_from_start = (m - dates.min()).days / 365
            decarbonization_factor = max(0.85, 1.0 - 0.02 * years_from_start)
            if "Electricity" in source:
                decarbonization_factor *= 0.95  # faster for electricity

            rows.append({
                "date_key": m.strftime("%Y-%m-%d"),
                "site_id": site["id"],
                "source": source,
                "scope": prof["scope"],
                "co2e_tonnes": round(co2e * decarbonization_factor, 1),
                "energy_gj": round(energy * decarbonization_factor / 1000, 1),
                "intensity_co2e_per_kt": round(co2e * decarbonization_factor / (tonnes_produced / 1000), 2),
                "target_co2e": round(co2e * 0.80, 1),  # 20% reduction target
                "tonnes_produced": round(tonnes_produced, 0),
            })
    return pd.DataFrame(rows)


def generate_fact_roster(dates: pd.DatetimeIndex, site: dict) -> pd.DataFrame:
    """Daily roster with fatigue scores for FIFO workforce."""
    rows = []
    employees = []
    for crew in CREWS:
        for i in range(15):  # 15 workers per crew
            role = random.choice(["Operator", "Operator", "Operator", "Maintainer", "Supervisor"])
            employees.append({
                "employee_id": f"EMP-{crew['id'][-1]}{i+1:02d}",
                "crew_id": crew["id"],
                "crew_name": crew["name"],
                "role": role,
            })

    # Weekly sample to keep data manageable
    for d in dates:
        if d.weekday() != 0:  # Monday only
            continue
        for emp in employees:
            swing_week = (d.isocalendar()[1] % 4)
            is_on_swing = swing_week < 2  # 2 weeks on, 2 weeks off FIFO

            if not is_on_swing:
                continue

            shift = SHIFTS[(d.day + hash(emp["employee_id"])) % 2]
            hours = np.random.uniform(10.5, 13.0) if shift == "Day" else np.random.uniform(11.0, 13.5)

            # Fatigue increases toward end of swing
            days_into_swing = swing_week * 7 + d.weekday()
            base_fatigue = 85 - days_into_swing * 1.5
            fatigue = max(40, min(100, base_fatigue + np.random.uniform(-8, 8)))

            rows.append({
                "date_key": d.strftime("%Y-%m-%d"),
                "site_id": site["id"],
                "employee_id": emp["employee_id"],
                "crew_id": emp["crew_id"],
                "crew_name": emp["crew_name"],
                "role": emp["role"],
                "shift": shift,
                "hours_worked": round(hours, 1),
                "overtime_hours": round(max(0, hours - 12), 1),
                "fatigue_score": round(fatigue, 0),
                "is_fifo": True,
                "swing_day": days_into_swing + 1,
            })
    return pd.DataFrame(rows)


def generate_fact_haulage(dates: pd.DatetimeIndex, site: dict) -> pd.DataFrame:
    """Daily haulage cycle data per truck per route."""
    rows = []
    trucks = [e for e in EQUIPMENT_FLEET if e["type"] == "Haul Truck"]

    for d in dates:
        # Sample every 3rd day
        if d.day % 3 != 0:
            continue
        for truck in trucks:
            route = random.choice(HAULAGE_ROUTES)
            cycles_per_shift = np.random.randint(18, 30)

            for shift in SHIFTS:
                base_cycle_min = route["distance_km"] * 2 / 30 * 60  # round trip at 30km/h
                cycle_time = base_cycle_min * np.random.uniform(0.85, 1.30)

                # Queue time spikes at shift change
                queue_time = np.random.exponential(3) if shift == "Day" else np.random.exponential(5)

                payload = truck["capacity_t"] * np.random.uniform(0.88, 1.05)

                rows.append({
                    "date_key": d.strftime("%Y-%m-%d"),
                    "shift": shift,
                    "site_id": site["id"],
                    "truck_id": truck["id"],
                    "truck_name": truck["name"],
                    "route_id": route["id"],
                    "route_from": route["from"],
                    "route_to": route["to"],
                    "distance_km": route["distance_km"],
                    "cycles": cycles_per_shift,
                    "avg_cycle_time_min": round(cycle_time, 1),
                    "avg_queue_time_min": round(queue_time, 1),
                    "avg_payload_t": round(payload, 1),
                    "total_tonnes": round(payload * cycles_per_shift, 0),
                    "fuel_litres": round(cycles_per_shift * route["distance_km"] * 2 * np.random.uniform(1.5, 2.5), 0),
                })
    return pd.DataFrame(rows)


def main():
    parser = argparse.ArgumentParser(description="Generate Appilico star schema data")
    parser.add_argument("--months", type=int, default=24, help="Months of history")
    parser.add_argument("--output-dir", type=str, default="../test-data/star-schema", help="Output directory")
    parser.add_argument("--format", choices=["csv", "parquet", "both"], default="both")
    args = parser.parse_args()

    end_date = date(2026, 4, 30)
    start_date = end_date - timedelta(days=args.months * 30)
    dates = pd.date_range(start_date, end_date, freq="D")

    os.makedirs(args.output_dir, exist_ok=True)
    dim_dir = os.path.join(args.output_dir, "dimensions")
    fact_dir = os.path.join(args.output_dir, "facts")
    os.makedirs(dim_dir, exist_ok=True)
    os.makedirs(fact_dir, exist_ok=True)

    print(f"╔══════════════════════════════════════════════════════════════╗")
    print(f"║  Appilico Intelligence Suite — Data Generator               ║")
    print(f"║  Period: {start_date} → {end_date} ({args.months} months)             ║")
    print(f"║  Sites:  {len(SITES)} | Equipment: {len(EQUIPMENT_FLEET)} | Crews: {len(CREWS)}             ║")
    print(f"╚══════════════════════════════════════════════════════════════╝")

    # ── Dimensions ──
    dims = {
        "dim_date":          generate_dim_date(start_date, end_date),
        "dim_equipment":     generate_dim_equipment(),
        "dim_crew":          generate_dim_crew(),
        "dim_location":      generate_dim_location(),
        "dim_material":      generate_dim_material(),
        "dim_cost_category": generate_dim_cost_category(),
        "dim_kpi":           generate_dim_kpi(),
    }

    for name, df in dims.items():
        print(f"  ✓ {name}: {len(df):,} rows")
        save(df, os.path.join(dim_dir, name), args.format)

    # ── Fact Tables (per site) ──
    fact_generators = {
        "fact_production":       generate_fact_production,
        "fact_equipment_status": generate_fact_equipment_status,
        "fact_ore_grade":        generate_fact_ore_grade,
        "fact_cost":             generate_fact_cost,
        "fact_safety":           generate_fact_safety,
        "fact_emissions":        generate_fact_emissions,
        "fact_roster":           generate_fact_roster,
        "fact_haulage":          generate_fact_haulage,
    }

    for fact_name, gen_func in fact_generators.items():
        frames = []
        for site in SITES:
            df = gen_func(dates, site)
            frames.append(df)
        combined = pd.concat(frames, ignore_index=True)
        print(f"  ✓ {fact_name}: {len(combined):,} rows")
        save(combined, os.path.join(fact_dir, fact_name), args.format)

    print(f"\n✅ Done! Data written to: {os.path.abspath(args.output_dir)}")


def save(df: pd.DataFrame, path: str, fmt: str):
    if fmt in ("csv", "both"):
        df.to_csv(f"{path}.csv", index=False)
    if fmt in ("parquet", "both"):
        df.to_parquet(f"{path}.parquet", index=False, engine="pyarrow")


if __name__ == "__main__":
    main()
