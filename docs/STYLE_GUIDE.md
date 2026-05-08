# Appilico Intelligence Suite — Style Guide

## Brand Palette

### Primary Colours
| Name | Hex | Usage |
|------|-----|-------|
| Navy | `#0A2540` | Headers, primary text, chart axes |
| Cyan | `#00D4FF` | Accents, highlights, trend lines |

### Secondary Colours
| Name | Hex | Usage |
|------|-----|-------|
| Ochre | `#E07A1F` | Warning status, Scope 2 emissions |
| Green | `#00B050` | Positive variance, on-target KPIs |
| Red | `#C00000` | Negative variance, critical alerts, Scope 1 |
| Purple | `#7B61FF` | AI features, Scope 3 emissions |

### Neutrals
| Name | Hex | Usage |
|------|-----|-------|
| Light Grey | `#F4F6F8` | Page background |
| Grey | `#5A6978` | Secondary text, labels |
| White | `#FFFFFF` | Card backgrounds |

## Typography
- **Primary**: Segoe UI Variable
- **Fallback**: Inter, -apple-system, sans-serif
- **Heading**: 15–18px, weight 700–800
- **Subheading**: 11–13px, weight 600–700
- **Body**: 10–11px, weight 400
- **Micro**: 8–9px, uppercase, letter-spacing 0.5–2px

## Card Design
- Background: White `#FFFFFF`
- Border radius: 8–10px
- Shadow: `0 2px 8px rgba(0,0,0,0.06)`
- Left border accent: 3–4px, colour indicates status
- Padding: 12–16px

## KPI Card Pattern
```
┌─────────────────────────┐
│ ▌ KPI LABEL (micro)     │
│ ▌ 12.4M  unit           │
│ ▌ ▲ 3.2% vs Target      │
│ ▌ ▲ 1.8% vs LY          │
└─────────────────────────┘
```

## Status Colours
- Good / On-target: Green `#00B050`
- Warning: Ochre `#E07A1F`
- Critical / Off-target: Red `#C00000`

## Chart Conventions
- Grid lines: `#f0f0f0`, dashed `3 3`
- Axis text: 8–9px, Grey
- Tooltips: White background, subtle shadow
- Trend lines: 2.5px stroke, dashed for secondary metrics
- Bar corner radius: 2–4px

## Animation (React components)
- Entry: `opacity: 0 → 1`, `y: 20 → 0`
- Stagger: 60–80ms delay between items
- Duration: 300–400ms
- Easing: default (ease-out)
