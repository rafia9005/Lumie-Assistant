import { ref } from 'vue'
import Fetch from '../lib/fetch'

export const useChatToSpeech = () => {
  const isLoading = ref(false)
  const isSpeaking = ref(false)
  const characterState = ref<'idle' | 'speaking'>('idle')
  const currentAudio = ref<HTMLAudioElement | null>(null)
  
  /**
   * Send message to chat API
   */
  const sendChatMessage = async (input: string, sessionId = 'default') => {
    try {
      isLoading.value = true
      
      const response = await Fetch.post('/chat', {
        sessionId,
        input
      })
      
      return response.data
    } catch (error) {
      console.error('Chat error:', error)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Send text to text-to-speech
   */
  const sendTextToSpeech = async (text: string) => {
    try {
      isSpeaking.value = true
      characterState.value = 'speaking'

      const response = await Fetch.post('/speaker', {
        text
      }, {
        responseType: 'blob'
      })

      return response.data as Blob
    } catch (error) {
      console.error('Speech error:', error)
      return null
    } finally {
      isSpeaking.value = false
    }
  }

  /**
   * Play audio blob
   */
  const playAudio = (audioBlob: Blob) => {
    // Stop current audio if playing
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value = null
    }

    const audioUrl = URL.createObjectURL(audioBlob)
    const audio = new Audio(audioUrl)

    currentAudio.value = audio

    // Switch to idle when finished
    audio.onended = () => {
      characterState.value = 'idle'
      currentAudio.value = null
      URL.revokeObjectURL(audioUrl)
    }

    audio.play().catch(err => console.error('Audio playback error:', err))
  }

  /**
   * Full pipeline: Chat → Speech → Animation
   */
  const speakWithCharacter = async (userInput: string, sessionId = 'default') => {
    // Step 1: Send to chat API
    const chatResponse = await sendChatMessage(userInput, sessionId)
    if (!chatResponse?.text) return

    // Step 2: Convert AI response to speech
    const audioBlob = await sendTextToSpeech(chatResponse.text)
    if (!audioBlob) return

    // Step 3: Play audio with character animation
    playAudio(audioBlob)
  }

  /**
   * Stop current speech
   */
  const stopSpeaking = () => {
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value = null
    }
    characterState.value = 'idle'
    isSpeaking.value = false
  }

  return {
    // State
    isLoading,
    isSpeaking,
    characterState,
    // Methods
    sendChatMessage,
    sendTextToSpeech,
    playAudio,
    speakWithCharacter,
    stopSpeaking
  }
}
