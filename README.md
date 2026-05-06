# Appilico Visuals Monorepo

Production-grade Power BI custom visuals and React components for mining operations analytics.

## 🎯 Six Real Products

| Visual | Description | Power BI | React |
|--------|-------------|:--------:|:-----:|
| **Production Gantt** | Shift-by-shift tonnage performance with plan vs actual | ✅ | ✅ |
| **Equipment Heatmap** | 24-hour fleet OEE matrix with status colour coding | ✅ | ✅ |
| **Safety KPI Panel** | Leading/lagging indicators with trend sparklines | ✅ | ✅ |
| **Ore Grade Waterfall** | Grade progression through processing stages | ✅ | ✅ |
| **Cost Tracker** | Budget vs actual with anomaly detection | ✅ | ✅ |
| **AI Query Panel** | Natural language interface for data queries | - | ✅ |

## 🏗️ Architecture

```
visuals/
├── packages/
│   ├── shared-types/        # TypeScript interfaces & colour constants
│   ├── shared-mock-data/    # Deterministic WA iron ore mine data
│   ├── shared-ui/           # Reusable React components
│   ├── visual-production-gantt/
│   │   ├── pbiviz/          # Power BI visual (D3.js)
│   │   └── react/           # React component (Recharts)
│   ├── visual-equipment-heatmap/
│   ├── visual-safety-kpi/
│   ├── visual-ore-grade-waterfall/
│   ├── visual-cost-tracker/
│   └── visual-ai-query-panel/  # React only
├── apps/
│   └── ai-query-api/        # .NET 8 AI microservice
└── .github/workflows/       # CI/CD pipelines
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test

# Start dev server (individual package)
cd packages/visual-production-gantt/react
npm run dev
```

## 📦 Packages

### Shared Packages

- **@appilico/shared-types** - TypeScript interfaces for mining domain
- **@appilico/shared-mock-data** - Deterministic test data generators
- **@appilico/shared-ui** - Reusable React UI components

### Visual Packages

Each visual package contains:
- `pbiviz/` - Power BI custom visual implementation
- `react/` - React component for web applications

## 🤖 AI Query Panel

The AI Query Panel supports multiple providers. **Switching providers is just an env variable:**

```bash
# Google Gemini (FREE tier available)
AI_PROVIDER=gemini
AI_API_KEY=your-gemini-key

# Azure OpenAI (enterprise)
AI_PROVIDER=azure-openai
AI_API_KEY=your-azure-key
AI_ENDPOINT=https://your-resource.openai.azure.com
AI_MODEL=gpt-4o

# Mock (for development)
AI_PROVIDER=mock
```

## 🧪 Testing

All packages maintain >80% test coverage:

```bash
# Run all tests with coverage
npm run test -- --coverage

# Run specific package tests
npm run test --workspace=@appilico/shared-mock-data
```

## 🎨 Design System

Consistent colour palette across all visuals:

| Colour | Hex | Usage |
|--------|-----|-------|
| Navy | `#1B365D` | Primary brand |
| Blue | `#0078D4` | Accent, links |
| Green | `#107C10` | Positive, on-target |
| Amber | `#FFB900` | Warning, attention |
| Red | `#D13438` | Negative, off-target |

## 📊 Mock Data Scenarios

Built-in scenarios for testing and demos:

- **Tuesday underperformance**: 28% below target
- **D11-001 hydraulic fault**: Hours 8-14 offline
- **CAT793-002 scheduled maintenance**: Hours 6-8
- **April wet season**: 21% cost overrun

## 🔧 Development

### Prerequisites

- Node.js 20+
- npm 10+
- .NET 8 SDK (for AI API)
- Power BI Desktop (for visual testing)

### Power BI Visual Development

```bash
cd packages/visual-production-gantt/pbiviz

# Start dev server with hot reload
npm run start

# Package for distribution
npm run package
```

### .NET API Development

```bash
cd apps/ai-query-api

# Run in development
dotnet run

# Build for production
dotnet publish -c Release
```

## 📝 License

MIT © Appilico

---

Built with ❤️ for Western Australian mining operations
