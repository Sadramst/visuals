// AI Query Panel - Natural Language Interface for Mining Data
// SWITCHING PROVIDERS IS JUST AN ENV VARIABLE

export { AIQueryPanel, type AIQueryPanelProps } from './components/AIQueryPanel'
export {
  createAIProvider,
  getDefaultProvider,
  type AIProvider,
  type AIProviderConfig,
  type AIProviderType,
} from './providers/AIProvider'
