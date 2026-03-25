export interface ChatMessage {
  role: 'user' | 'model'
  text: string
  timestamp?: number
}

export interface ChatResponse {
  ok: boolean
  sessionId: string
  text: string
  history: ChatMessage[]
}

export interface SpeechRequest {
  text: string
  speaker?: string
  encoding?: string
  container?: string
  sample_rate?: number
  bit_rate?: number
}
