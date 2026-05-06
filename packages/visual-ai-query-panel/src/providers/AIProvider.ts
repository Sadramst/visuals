// AI Provider Abstraction Layer
// Switching providers is just an env variable - Google Gemini (free), Azure OpenAI (paid)

import { AIQueryRequest, AIQueryResponse } from '@appilico/shared-types'

// ── Provider Types ───────────────────────────────────────────────────────────

export type AIProviderType = 'gemini' | 'azure-openai' | 'mock'

export interface AIProviderConfig {
  type: AIProviderType
  apiKey?: string
  endpoint?: string
  model?: string
}

export interface AIProvider {
  name: string
  query(request: AIQueryRequest): Promise<AIQueryResponse>
  isAvailable(): Promise<boolean>
}

// ── Mock Provider (for testing/demo) ─────────────────────────────────────────

const MOCK_RESPONSES: Record<string, string> = {
  production: `Based on the production data:
- **Today's output**: 45,230 tonnes (8% above target)
- **Best performing shift**: Night shift at Pit 3 (12,500t)
- **Equipment utilisation**: 94% average OEE
- **Key insight**: Tuesday underperformance pattern detected - consider crew rotation adjustments`,
  safety: `Safety KPI Summary:
- **TRIFR**: 2.1 (target: 2.5) ✓ Leading indicator GREEN
- **Critical control verifications**: 98% completion rate
- **Near miss reports**: 23 this month (up 15% - positive reporting culture)
- **Recommendation**: Focus on vehicle-pedestrian interaction controls`,
  equipment: `Fleet Status Overview:
- **Active units**: 42/45 (93%)
- **In maintenance**: D11-001 (hydraulic fault), CAT793-002 (scheduled)
- **Average OEE**: 87.3%
- **Alert**: Haul truck fleet showing 5% efficiency drop - check tyre pressure program`,
  cost: `Cost Analysis - YTD:
- **Total spend**: $124.5M (3.2% under budget)
- **Anomaly detected**: April wet season costs 21% over budget
- **Cost per tonne**: $4.23 (target: $4.50)
- **Savings opportunity**: Fuel consumption trending 8% above benchmark`,
}

function findMockResponse(question: string): string {
  const lower = question.toLowerCase()
  if (lower.includes('production') || lower.includes('tonnes') || lower.includes('shift')) {
    return MOCK_RESPONSES.production
  }
  if (lower.includes('safety') || lower.includes('incident') || lower.includes('trifr')) {
    return MOCK_RESPONSES.safety
  }
  if (lower.includes('equipment') || lower.includes('fleet') || lower.includes('oee')) {
    return MOCK_RESPONSES.equipment
  }
  if (lower.includes('cost') || lower.includes('budget') || lower.includes('spend')) {
    return MOCK_RESPONSES.cost
  }
  return `I can help you analyse mining operations data. Try asking about:
- Production performance and shift analysis
- Safety KPIs and incident trends
- Equipment fleet status and OEE
- Cost tracking and budget variance`
}

class MockProvider implements AIProvider {
  name = 'Mock Provider'

  async query(request: AIQueryRequest): Promise<AIQueryResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400))
    
    return {
      id: `mock-${Date.now()}`,
      question: request.question,
      answer: findMockResponse(request.question),
      confidence: 0.85 + Math.random() * 0.1,
      sources: ['production_data', 'equipment_status', 'safety_kpis'],
      timestamp: new Date().toISOString(),
      tokensUsed: Math.floor(100 + Math.random() * 200),
    }
  }

  async isAvailable(): Promise<boolean> {
    return true
  }
}

// ── Google Gemini Provider ───────────────────────────────────────────────────

class GeminiProvider implements AIProvider {
  name = 'Google Gemini'
  private apiKey: string
  private model: string

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey || ''
    this.model = config.model || 'gemini-1.5-flash'
  }

  async query(request: AIQueryRequest): Promise<AIQueryResponse> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `You are an AI assistant for mining operations analysis. 
Context: Western Australian iron ore mine operations data.
Question: ${request.question}
${request.context ? `Additional context: ${request.context}` : ''}

Provide a concise, data-driven response with specific metrics where available.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated'

    return {
      id: `gemini-${Date.now()}`,
      question: request.question,
      answer,
      confidence: 0.8,
      sources: request.context ? ['context_provided'] : [],
      timestamp: new Date().toISOString(),
      tokensUsed: data.usageMetadata?.totalTokenCount || 0,
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey
  }
}

// ── Azure OpenAI Provider ────────────────────────────────────────────────────

class AzureOpenAIProvider implements AIProvider {
  name = 'Azure OpenAI'
  private apiKey: string
  private endpoint: string
  private model: string

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey || ''
    this.endpoint = config.endpoint || ''
    this.model = config.model || 'gpt-4o'
  }

  async query(request: AIQueryRequest): Promise<AIQueryResponse> {
    const response = await fetch(
      `${this.endpoint}/openai/deployments/${this.model}/chat/completions?api-version=2024-02-01`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You are an AI assistant for mining operations analysis. 
Context: Western Australian iron ore mine operations data.
Provide concise, data-driven responses with specific metrics where available.`,
            },
            {
              role: 'user',
              content: request.context
                ? `${request.question}\n\nContext: ${request.context}`
                : request.question,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Azure OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const answer = data.choices?.[0]?.message?.content || 'No response generated'

    return {
      id: `azure-${Date.now()}`,
      question: request.question,
      answer,
      confidence: 0.85,
      sources: request.context ? ['context_provided'] : [],
      timestamp: new Date().toISOString(),
      tokensUsed: data.usage?.total_tokens || 0,
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!(this.apiKey && this.endpoint)
  }
}

// ── Provider Factory ─────────────────────────────────────────────────────────

export function createAIProvider(config: AIProviderConfig): AIProvider {
  switch (config.type) {
    case 'gemini':
      return new GeminiProvider(config)
    case 'azure-openai':
      return new AzureOpenAIProvider(config)
    case 'mock':
    default:
      return new MockProvider()
  }
}

// ── Environment-based Provider ───────────────────────────────────────────────

export function getDefaultProvider(): AIProvider {
  // Check environment variables for provider configuration
  // SWITCHING PROVIDERS IS JUST AN ENV VARIABLE
  const providerType = (typeof process !== 'undefined' && process.env?.AI_PROVIDER) as AIProviderType || 'mock'
  const apiKey = typeof process !== 'undefined' ? process.env?.AI_API_KEY : undefined
  const endpoint = typeof process !== 'undefined' ? process.env?.AI_ENDPOINT : undefined
  const model = typeof process !== 'undefined' ? process.env?.AI_MODEL : undefined

  return createAIProvider({
    type: providerType,
    apiKey,
    endpoint,
    model,
  })
}

export { MockProvider, GeminiProvider, AzureOpenAIProvider }
