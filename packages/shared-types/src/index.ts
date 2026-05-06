// ══════════════════════════════════════════════════════════════════════════════
// @appilico/shared-types
// Shared TypeScript interfaces for Appilico mining operations visuals
// ══════════════════════════════════════════════════════════════════════════════

// ── Mining Domain Types ──────────────────────────────────────────────────────

/**
 * Represents a single shift's production data
 */
export interface ShiftDataPoint {
  /** Unique identifier for this shift record */
  id: string
  /** Date of the shift */
  date: Date
  /** Type of shift */
  shiftType: 'AM' | 'PM' | 'Night'
  /** Human-readable shift label (e.g., "12 May AM") */
  shiftLabel: string
  /** Actual tonnes moved during this shift */
  actualTonnes: number
  /** Target tonnes for this shift (optional) */
  targetTonnes: number | undefined
  /** Name of the crew working this shift (optional) */
  crewName: string | undefined
  /** Number of equipment units deployed (optional) */
  equipmentCount: number | undefined
  /** Location/pit name (optional) */
  location: string | undefined
  /** Variance percentage: (actual - target) / target * 100 (optional) */
  variance: number | undefined
}

/**
 * Equipment unit with hourly status breakdown
 */
export interface EquipmentUnit {
  /** Unique equipment ID (e.g., "D11-001") */
  id: string
  /** Display name of the equipment */
  name: string
  /** Equipment type category */
  type: 'Dozer' | 'Truck' | 'Excavator' | 'Grader' | 'Other'
  /** Array of 24 items representing hourly status */
  hourlyStatus: HourlyStatus[]
  /** Overall Equipment Effectiveness percentage */
  oeePercent: number
}

/**
 * Status of equipment for a specific hour
 */
export interface HourlyStatus {
  /** Hour of day (0-23) */
  hour: number
  /** Current status */
  status: EquipmentStatus
  /** Fraction of hour spent in this status (0-1) */
  durationHours: number
  /** Reason code for non-operating status (optional) */
  reasonCode: string | undefined
}

/**
 * Equipment operational status types
 */
export type EquipmentStatus = 'Operating' | 'Standby' | 'UnplannedDown' | 'Maintenance'

/**
 * Safety Key Performance Indicator
 */
export interface SafetyKPI {
  /** Unique identifier */
  id: string
  /** Internal name (e.g., "trifr") */
  name: string
  /** Display name (e.g., "TRIFR") */
  displayName: string
  /** Current measured value */
  currentValue: number
  /** Target value (optional) */
  targetValue: number | undefined
  /** Previous period value for trend calculation (optional) */
  previousValue: number | undefined
  /** Historical trend data points */
  trendHistory: TrendPoint[]
  /** Unit of measurement (e.g., "%", "days", "count") */
  unit: string
  /** Whether this is a leading indicator */
  isLeading: boolean
  /** Whether lower values are better (e.g., TRIFR - lower is better) */
  isLowerBetter: boolean
  /** Current status based on target comparison */
  status: KPIStatus
  /** Direction of recent trend */
  trendDirection: 'up' | 'down' | 'flat'
  /** Percentage change from previous value */
  trendPercent: number
}

/**
 * Historical trend data point
 */
export interface TrendPoint {
  /** Period label (e.g., "Jan 2026") */
  period: string
  /** Value for this period */
  value: number
}

/**
 * KPI status classification
 */
export type KPIStatus = 'good' | 'warning' | 'bad' | 'neutral'

/**
 * Processing stage for ore grade tracking
 */
export interface GradeStage {
  /** Unique identifier */
  id: string
  /** Stage name (e.g., "Bench Sample", "ROM Stockpile") */
  name: string
  /** Order in the processing chain (1, 2, 3, 4, 5) */
  order: number
  /** Actual measured grade (Fe%) */
  actualGrade: number
  /** Target grade (optional) */
  targetGrade: number | undefined
  /** Material type being processed (optional) */
  material: string | undefined
  /** Variance from target as percentage (optional) */
  variance: number | undefined
  /** Change from previous stage (optional) */
  deltaFromPrevious: number | undefined
}

/**
 * Cost per tonne data for a specific period
 */
export interface CostDataPoint {
  /** Period label (e.g., "Jan 2026") */
  period: string
  /** Month label (alias for period) */
  month?: string
  /** Actual cost for this period */
  actualAmount: number
  /** Budget cost for this period */
  budgetAmount: number
  /** Actual cost per tonne moved */
  costPerTonne: number
  /** Budget cost per tonne (optional) */
  budgetCostPerTonne: number | undefined
  /** Tonnes moved in this period (optional) */
  tonnesMoved: number | undefined
  /** Whether this period is flagged as anomalous */
  isAnomaly: boolean
  /** Explanation for anomaly (optional) */
  anomalyReason: string | undefined
  /** Cost breakdown by category */
  categories: CostCategory[]
  /** 3-period moving average (optional) */
  movingAverage: number | undefined
}

/**
 * Cost breakdown category
 */
export interface CostCategory {
  /** Category name (e.g., "Labour", "Fuel", "Maintenance", "Other") */
  name: string
  /** Cost per tonne for this category */
  amount: number
  /** Hex colour for chart rendering */
  colour: string
}

// ── AI Query Types ────────────────────────────────────────────────────────────

/**
 * Types of user query intents
 */
export type IntentType =
  | 'Production'
  | 'Equipment'
  | 'Safety'
  | 'Cost'
  | 'Comparison'
  | 'General'

/**
 * Suggested chart types for AI responses
 */
export type ChartType = 'bar' | 'line' | 'heatmap' | 'none'

/**
 * Confidence level of AI response
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low'

/**
 * Request to the AI query service
 */
export interface AIQueryRequest {
  /** User's natural language question */
  question: string
  /** Identifier of the user making the request */
  userId?: string
  /** Session ID for conversation continuity (optional) */
  sessionId?: string
  /** Site/location context (optional) */
  siteId?: string
  /** Additional context for the query (optional) */
  context?: string
  /** Previous conversation history (optional) */
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}

/**
 * Response from the AI query service
 */
export interface AIQueryResponse {
  /** Unique response identifier */
  id: string
  /** Original question from request */
  question: string
  /** Session identifier */
  sessionId?: string
  /** Unique message identifier */
  messageId?: string
  /** Main answer text */
  answer: string
  /** Single most important insight (optional) */
  keyInsight?: string
  /** Actionable recommendation (optional) */
  recommendation?: string
  /** Supporting data points */
  dataPoints?: DataPoint[]
  /** Suggested chart type for visualisation */
  suggestedChart?: ChartType
  /** Confidence level of the response (0-1) */
  confidence: number
  /** Detected query intent */
  intentDetected?: IntentType
  /** Time taken to process in milliseconds */
  processingTimeMs?: number
  /** Number of tokens used */
  tokensUsed: number
  /** ISO date string of data freshness */
  dataFreshness?: string
  /** Whether this is demo mode data */
  isDemo?: boolean
  /** ISO timestamp of the response */
  timestamp: string
  /** Sources used for the response */
  sources?: string[]
}

/**
 * Supporting data point for AI responses
 */
export interface DataPoint {
  /** Label for the data point */
  label: string
  /** Numeric value */
  value: number
  /** Unit of measurement */
  unit: string
  /** Whether this represents a positive outcome (optional) */
  isPositive: boolean | undefined
}

/**
 * Message in a conversation history
 */
export interface ConversationMessage {
  /** Unique message identifier */
  id: string
  /** Role of the message sender */
  role: 'user' | 'assistant'
  /** Message content */
  content: string
  /** Full AI response details (only on assistant messages) */
  aiResponse: AIQueryResponse | undefined
  /** When the message was sent */
  timestamp: Date
}

// ── Chart Colour Palettes ─────────────────────────────────────────────────────

/**
 * Appilico brand colours
 */
export const APPILICO_COLOURS = {
  navy: '#1F3864',
  blue: '#0070C0',
  green: '#00B050',
  amber: '#ED7D31',
  red: '#C00000',
  grey: '#BFBFBF',
  lightGrey: '#F2F2F2',
  white: '#FFFFFF',
  purple: '#7030A0',
} as const

/**
 * Category-specific colours
 */
export const CATEGORY_COLOURS: Record<string, string> = {
  Production: APPILICO_COLOURS.navy,
  Equipment: APPILICO_COLOURS.blue,
  Safety: APPILICO_COLOURS.red,
  Quality: APPILICO_COLOURS.amber,
  Finance: APPILICO_COLOURS.green,
  AI: APPILICO_COLOURS.purple,
}

/**
 * Equipment status colours
 */
export const STATUS_COLOURS: Record<EquipmentStatus, string> = {
  Operating: APPILICO_COLOURS.green,
  Standby: APPILICO_COLOURS.amber,
  UnplannedDown: APPILICO_COLOURS.red,
  Maintenance: APPILICO_COLOURS.grey,
}

/**
 * KPI status colours
 */
export const KPI_STATUS_COLOURS: Record<KPIStatus, string> = {
  good: APPILICO_COLOURS.green,
  warning: APPILICO_COLOURS.amber,
  bad: APPILICO_COLOURS.red,
  neutral: APPILICO_COLOURS.grey,
}

/**
 * Cost category colours for stacked charts
 */
export const COST_CATEGORY_COLOURS: Record<string, string> = {
  Labour: '#1F3864',
  Fuel: '#0070C0',
  Maintenance: '#ED7D31',
  Other: '#BFBFBF',
}

// ── Utility Types ─────────────────────────────────────────────────────────────

/**
 * Plan tiers for the SaaS product
 */
export type PlanTier = 'Free' | 'Starter' | 'Professional' | 'Enterprise'

/**
 * Plan colours for badges
 */
export const PLAN_COLOURS: Record<PlanTier, string> = {
  Free: APPILICO_COLOURS.grey,
  Starter: APPILICO_COLOURS.blue,
  Professional: APPILICO_COLOURS.purple,
  Enterprise: '#D4AF37', // Gold
}
