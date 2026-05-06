// AI Query Panel - Natural Language Interface for Mining Data
// Chat-style UI with suggested queries and conversation history

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AIQueryRequest, AIQueryResponse } from '@appilico/shared-types'
import { AIProvider, createAIProvider, getDefaultProvider, AIProviderConfig } from '../providers/AIProvider'

// ── Props Interface ──────────────────────────────────────────────────────────

export interface AIQueryPanelProps {
  /** AI provider configuration (defaults to env-based provider) */
  providerConfig?: AIProviderConfig
  /** Additional context to include with queries (e.g., current dashboard state) */
  context?: string
  /** Suggested queries to display */
  suggestions?: string[]
  /** Maximum messages to keep in history */
  maxHistory?: number
  /** Panel height */
  height?: number
  /** Callback when a response is received */
  onResponse?: (response: AIQueryResponse) => void
  /** Additional CSS classes */
  className?: string
}

// ── Message Type ─────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  confidence?: number
  tokensUsed?: number
}

// ── Default Suggestions ──────────────────────────────────────────────────────

const DEFAULT_SUGGESTIONS = [
  'How is today\'s production tracking against target?',
  'What equipment is currently offline?',
  'Summarise our safety KPIs this month',
  'Are there any cost anomalies I should know about?',
  'Which shift had the best performance this week?',
]

// ── Message Bubble Component ─────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-4 py-2.5 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {/* Message content with markdown-like formatting */}
        <div className="text-sm whitespace-pre-wrap">
          {message.content.split('\n').map((line, i) => {
            // Bold: **text**
            const boldParsed = line.replace(
              /\*\*([^*]+)\*\*/g,
              '<strong>$1</strong>'
            )
            return (
              <p
                key={i}
                className={i > 0 ? 'mt-1' : ''}
                dangerouslySetInnerHTML={{ __html: boldParsed }}
              />
            )
          })}
        </div>

        {/* Metadata for assistant messages */}
        {!isUser && message.confidence !== undefined && (
          <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-3 text-xs text-gray-500">
            <span>
              Confidence: {(message.confidence * 100).toFixed(0)}%
            </span>
            {message.tokensUsed !== undefined && (
              <span>{message.tokensUsed} tokens</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Suggestion Chips Component ───────────────────────────────────────────────

interface SuggestionChipsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
  disabled?: boolean
}

function SuggestionChips({ suggestions, onSelect, disabled }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSelect(suggestion)}
          disabled={disabled}
          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
            disabled
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
          }`}
        >
          {suggestion}
        </button>
      ))}
    </div>
  )
}

// ── Input Component ──────────────────────────────────────────────────────────

interface QueryInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  isLoading: boolean
  placeholder?: string
}

function QueryInput({ value, onChange, onSubmit, isLoading, placeholder }: QueryInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (value.trim() && !isLoading) {
        onSubmit()
      }
    }
  }

  return (
    <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Ask about your mining operations...'}
        disabled={isLoading}
        className="flex-1 text-sm outline-none bg-transparent text-gray-900 placeholder-gray-400 disabled:text-gray-500"
      />
      <button
        onClick={onSubmit}
        disabled={!value.trim() || isLoading}
        className={`p-2 rounded-md transition-colors ${
          !value.trim() || isLoading
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-blue-600 hover:bg-blue-50'
        }`}
      >
        {isLoading ? (
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        )}
      </button>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function AIQueryPanel({
  providerConfig,
  context,
  suggestions = DEFAULT_SUGGESTIONS,
  maxHistory = 50,
  height = 500,
  onResponse,
  className,
}: AIQueryPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize provider
  const providerRef = useRef<AIProvider>(
    providerConfig ? createAIProvider(providerConfig) : getDefaultProvider()
  )

  // Update provider if config changes
  useEffect(() => {
    if (providerConfig) {
      providerRef.current = createAIProvider(providerConfig)
    }
  }, [providerConfig])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async () => {
    const question = inputValue.trim()
    if (!question || isLoading) return

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev.slice(-(maxHistory - 1)), userMessage])
    setInputValue('')
    setIsLoading(true)
    setError(null)

    try {
      const request: AIQueryRequest = {
        question,
        context,
        conversationHistory: messages.slice(-10).map(m => ({
          role: m.role,
          content: m.content,
        })),
      }

      const response = await providerRef.current.query(request)

      // Add assistant message
      const assistantMessage: Message = {
        id: response.id,
        role: 'assistant',
        content: response.answer,
        timestamp: response.timestamp,
        confidence: response.confidence,
        tokensUsed: response.tokensUsed,
      }

      setMessages(prev => [...prev.slice(-(maxHistory - 1)), assistantMessage])
      onResponse?.(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionSelect = (suggestion: string) => {
    setInputValue(suggestion)
  }

  return (
    <div
      className={`flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden ${className || ''}`}
      style={{ height }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          AI Query Panel
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Ask questions about your mining operations in natural language
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Start a conversation or try one of the suggestions below
            </p>
            <SuggestionChips
              suggestions={suggestions}
              onSelect={handleSuggestionSelect}
              disabled={isLoading}
            />
          </div>
        ) : (
          <>
            <AnimatePresence>
              {messages.map(message => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </AnimatePresence>

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start mb-3"
              >
                <div className="bg-gray-100 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-gray-400 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.1,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-3">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-xs text-red-600 underline mt-1"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        {messages.length > 0 && (
          <SuggestionChips
            suggestions={suggestions.slice(0, 3)}
            onSelect={handleSuggestionSelect}
            disabled={isLoading}
          />
        )}
        <QueryInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}

export default AIQueryPanel
