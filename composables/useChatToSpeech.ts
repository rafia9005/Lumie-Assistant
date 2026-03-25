import { ref } from 'vue'
import Fetch from '../lib/fetch'

export const useChatToSpeech = () => {
  const isLoading = ref(false)
  const isSpeaking = ref(false)
  const characterState = ref<'idle' | 'speaking'>('idle')
  const currentAudio = ref<HTMLAudioElement | null>(null)

  const sendChatMessage = async (input: string, sessionId = 'default') => {
    try {
      isLoading.value = true
      const response = await Fetch.post('/chat', {
        sessionId,
        input
      })
      return response.data
    } catch (error) {
      return null
    } finally {
      isLoading.value = false
    }
  }

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
      return null
    } finally {
      isSpeaking.value = false
    }
  }

  const playAudio = (audioBlob: Blob) => {
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value = null
    }

    const audioUrl = URL.createObjectURL(audioBlob)
    const audio = new Audio(audioUrl)
    currentAudio.value = audio

    audio.onended = () => {
      characterState.value = 'idle'
      currentAudio.value = null
      URL.revokeObjectURL(audioUrl)
    }

    audio.play().catch(() => {})
  }

  const speakWithCharacter = async (userInput: string, sessionId = 'default') => {
    const chatResponse = await sendChatMessage(userInput, sessionId)
    if (!chatResponse?.text) return null

    const audioBlob = await sendTextToSpeech(chatResponse.text)
    if (!audioBlob) return chatResponse

    playAudio(audioBlob)
    return chatResponse
  }

  const stopSpeaking = () => {
    if (currentAudio.value) {
      currentAudio.value.pause()
      currentAudio.value = null
    }
    characterState.value = 'idle'
    isSpeaking.value = false
  }

  return {
    isLoading,
    isSpeaking,
    characterState,
    sendChatMessage,
    sendTextToSpeech,
    playAudio,
    speakWithCharacter,
    stopSpeaking
  }
}
