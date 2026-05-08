# Appilico Intelligence Suite — Data Dictionary

## Star Schema Overview
All tables use surrogate keys suffixed `_key` or `_id`.
Date grain: daily for production/roster/haulage, monthly for cost/safety/emissions/ore-grade.
Equipment status: hourly grain.

---

## Dimension Tables

### dim_date
| Column | Type | Description |
|--------|------|-------------|
| date_key | INT | YYYYMMDD surrogate key |
| full_date | DATE | Calendar date |
| year | INT | Calendar year |
| month | INT | Month number (1-12) |
| month_name | STRING | Full month name |
| quarter | INT | Calendar quarter (1-4) |
| day_of_week | INT | 0=Mon, 6=Sun |
| day_name | STRING | Full day name |
| week_of_year | INT | ISO week number |
| fiscal_year | INT | Australian FY (Jul-Jun) |
| fiscal_quarter | INT | FY quarter |
| is_weekend | BOOL | Saturday or Sunday |
| is_shutdown | BOOL | Christmas/Easter shutdown |

### dim_equipment
| Column | Type | Description |
|--------|------|-------------|
| equipment_id | STRING | e.g. "HAU-001" |
| equipment_type | STRING | Haul Truck / Excavator / Drill / Loader / Crusher |
| model | STRING | Manufacturer model |
| capacity_tonnes | FLOAT | Rated capacity |
| engine_power_kw | FLOAT | Engine power |
| commissioned_date | DATE | Put into service |
| site_id | STRING | Home site |

### dim_crew
| Column | Type | Description |
|--------|------|-------------|
| crew_id | STRING | e.g. "CREW-A" |
| crew_name | STRING | Display name |
| rotation_type | STRING | 2/1 FIFO, 8/6 FIFO, etc. |
| base_location | STRING | Home city |

### dim_location
| Column | Type | Description |
|--------|------|-------------|
| location_id | STRING | Site identifier |
| site_name | STRING | Display name |
| state | STRING | Australian state |
| latitude | FLOAT | GPS latitude |
| longitude | FLOAT | GPS longitude |
| ore_type | STRING | Primary ore mined |

### dim_material
| Column | Type | Description |
|--------|------|-------------|
| material_id | STRING | Material code |
| material_name | STRING | Display name |
| material_type | STRING | Ore / Waste / Overburden |
| sg | FLOAT | Specific gravity |
| hardness | STRING | Hard / Medium / Soft |

### dim_cost_category
| Column | Type | Description |
|--------|------|-------------|
| category_id | STRING | Cost category code |
| category_name | STRING | e.g. "Diesel Fuel", "Labour" |
| cost_type | STRING | OPEX / CAPEX |
| is_controllable | BOOL | Controllable by site management |

### dim_kpi
| Column | Type | Description |
|--------|------|-------------|
| kpi_id | STRING | KPI identifier |
| kpi_name | STRING | e.g. "TRIFR", "LTIFR" |
| domain | STRING | Safety / Environment / Quality |
| unit | STRING | e.g. "per Mhrs", "count" |
| direction | STRING | lower_is_better / higher_is_better |

---

## Fact Tables

### fact_production
| Column | Type | Description |
|--------|------|-------------|
| date_key | INT | FK → dim_date |
| location_id | STRING | FK → dim_location |
| tonnes_mined | FLOAT | Total material moved |
| tonnes_ore | FLOAT | Ore tonnes |
| waste_tonnes | FLOAT | Waste tonnes |
| strip_ratio | FLOAT | Waste:Ore ratio |
| target_tonnes | FLOAT | Plan target |
| downtime_hours | FLOAT | Unplanned downtime |
| operating_hours | FLOAT | Productive hours |

### fact_equipment_status
| Column | Type | Description |
|--------|------|-------------|
| date_key | INT | FK → dim_date |
| equipment_id | STRING | FK → dim_equipment |
| hour | INT | Hour of day (0-23) |
| status | STRING | Operating / Idle / Maintenance / Breakdown |
| utilisation_pct | FLOAT | Hour utilisation 0-100 |
| availability_pct | FLOAT | Hour availability 0-100 |
| temperature_c | FLOAT | Engine temperature |
| vibration_mm_s | FLOAT | Vibration reading |
| fuel_litres | FLOAT | Fuel consumed |

### fact_ore_grade
| Column | Type | Description |
|--------|------|-------------|
| date_key | INT | FK → dim_date (month start) |
| location_id | STRING | FK → dim_location |
| stage | STRING | Blast → Crush → Grind → Float → Leach → Smelt → Refine |
| feed_grade_pct | FLOAT | Input grade |
| product_grade_pct | FLOAT | Output grade |
| recovery_pct | FLOAT | Stage recovery rate |
| tonnes_processed | FLOAT | Throughput tonnes |
| contamination_ppm | FLOAT | Contaminant level |

### fact_cost
| Column | Type | Description |
|--------|------|-------------|
| date_key | INT | FK → dim_date (month start) |
| location_id | STRING | FK → dim_location |
| category_id | STRING | FK → dim_cost_category |
| actual_aud | FLOAT | Actual spend AUD |
| budget_aud | FLOAT | Budget AUD |
| variance_aud | FLOAT | Actual − Budget |
| unit_cost_per_tonne | FLOAT | $/tonne |

### fact_safety
| Column | Type | Description |
|--------|------|-------------|
| date_key | INT | FK → dim_date (month start) |
| location_id | STRING | FK → dim_location |
| kpi_id | STRING | FK → dim_kpi |
| actual_value | FLOAT | Observed value |
| target_value | FLOAT | Target/threshold |
| incident_count | INT | Number of incidents |

### fact_emissions
| Column | Type | Description |
|--------|------|-------------|
| date_key | INT | FK → dim_date (month start) |
| location_id | STRING | FK → dim_location |
| emission_source | STRING | Diesel / Electricity / Blasting / etc. |
| scope | INT | GHG scope (1/2/3) |
| co2e_tonnes | FLOAT | CO₂ equivalent tonnes |
| energy_gj | FLOAT | Energy gigajoules |
| intensity_kg_per_tonne | FLOAT | kgCO₂/tonne ore |
| renewable_pct | FLOAT | Renewable share % |

### fact_roster
| Column | Type | Description |
|--------|------|-------------|
| date_key | INT | FK → dim_date |
| crew_id | STRING | FK → dim_crew |
| location_id | STRING | FK → dim_location |
| shift_type | STRING | Day / Night / Off / Travel |
| headcount | INT | Workers on shift |
| hours_worked | FLOAT | Total hours |
| fatigue_score | FLOAT | Risk score 0-100 |
| absent_pct | FLOAT | Absence rate |
| utilisation_pct | FLOAT | Productive utilisation |

### fact_haulage
| Column | Type | Description |
|--------|------|-------------|
| date_key | INT | FK → dim_date |
| location_id | STRING | FK → dim_location |
| route_name | STRING | Named haulage route |
| truck_id | STRING | FK → dim_equipment |
| cycle_time_min | FLOAT | Full cycle minutes |
| payload_tonnes | FLOAT | Actual payload |
| target_payload | FLOAT | Rated payload |
| queue_time_min | FLOAT | Queuing time |
| load_time_min | FLOAT | Loading time |
| haul_time_min | FLOAT | Hauling time |
| dump_time_min | FLOAT | Dumping time |
| return_time_min | FLOAT | Return time |
| trips | INT | Number of complete trips |
