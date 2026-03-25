import { ref, computed, reactive } from 'vue'

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
  timestamp?: number
}

export interface ChatSession {
  sessionId: string
  messages: ChatMessage[]
  systemPrompt?: string
  createdAt: number
  updatedAt: number
}

// Global chat state (persisted across components)
const chatState = reactive<{
  currentSessionId: string
  sessions: Record<string, ChatSession>
}>({
  currentSessionId: 'default',
  sessions: {}
})

export const useChatStore = () => {
  // Initialize default session
  const initSession = (sessionId: string = 'default', systemPrompt?: string) => {
    if (!chatState.sessions[sessionId]) {
      chatState.sessions[sessionId] = {
        sessionId,
        messages: [],
        systemPrompt,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    }
  }

  // Get current session
  const currentSession = computed(() => {
    if (!chatState.sessions[chatState.currentSessionId]) {
      initSession(chatState.currentSessionId)
    }
    return chatState.sessions[chatState.currentSessionId]
  })

  // Add message to current session
  const addMessage = (message: ChatMessage) => {
    currentSession.value.messages.push({
      ...message,
      timestamp: message.timestamp || Date.now()
    })
    currentSession.value.updatedAt = Date.now()
  }

  // Set system prompt for current session
  const setSystemPrompt = (prompt: string) => {
    currentSession.value.systemPrompt = prompt
    currentSession.value.updatedAt = Date.now()
  }

  // Switch to different session
  const switchSession = (sessionId: string) => {
    chatState.currentSessionId = sessionId
    initSession(sessionId)
  }

  // Get all sessions list
  const sessionsList = computed(() => {
    return Object.values(chatState.sessions).sort((a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt)
  })

  // Clear current session
  const clearSession = (sessionId?: string) => {
    const id = sessionId || chatState.currentSessionId
    if (chatState.sessions[id]) {
      chatState.sessions[id].messages = []
      chatState.sessions[id].updatedAt = Date.now()
    }
  }

  // Delete session
  const deleteSession = (sessionId: string) => {
    delete chatState.sessions[sessionId]
    if (chatState.currentSessionId === sessionId) {
      chatState.currentSessionId = 'default'
      initSession('default')
    }
  }

  // Load session from API (after chat response)
  const loadSessionFromAPI = (apiResponse: any) => {
    if (apiResponse.sessionId && apiResponse.history) {
      const session = chatState.sessions[apiResponse.sessionId] || {
        sessionId: apiResponse.sessionId,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      // Update from API response
      session.messages = apiResponse.history.map((m: any) => ({
        role: m.role as 'user' | 'model',
        text: m.text,
        timestamp: m.timestamp || Date.now()
      }))
      session.updatedAt = Date.now()

      chatState.sessions[apiResponse.sessionId] = session
    }
  }

  // Export session to JSON
  const exportSession = (sessionId?: string) => {
    const id = sessionId || chatState.currentSessionId
    const session = chatState.sessions[id]
    if (!session) return null
    return JSON.stringify(session, null, 2)
  }

  // Initialize with default session on first load
  initSession('default')

  return {
    // State
    currentSessionId: computed(() => chatState.currentSessionId),
    currentSession,
    sessions: computed(() => chatState.sessions),
    sessionsList,
    // Methods
    initSession,
    addMessage,
    setSystemPrompt,
    switchSession,
    clearSession,
    deleteSession,
    loadSessionFromAPI,
    exportSession
  }
}
