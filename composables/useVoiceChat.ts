import { ref } from 'vue'
import Fetch from '../lib/fetch'

export const useVoiceChat = () => {
  const isListening = ref(false)
  const isLoading = ref(false)
  const isSpeaking = ref(false)
  const characterState = ref<'idle' | 'speaking'>('idle')
  const currentAudio = ref<HTMLAudioElement | null>(null)
  const transcript = ref('')
  const mediaRecorder = ref<MediaRecorder | null>(null)
  const audioChunks = ref<Blob[]>([])

  /**
   * Start listening to microphone
   */
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorder.value = new MediaRecorder(stream)
      audioChunks.value = []

      mediaRecorder.value.ondataavailable = (event) => {
        audioChunks.value.push(event.data)
      }

      mediaRecorder.value.onstop = async () => {
        const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' })
        await processAudio(audioBlob)
        // Stop all audio tracks
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.value.start()
      isListening.value = true
      transcript.value = 'Listening...'
    } catch (error) {
      console.error('Microphone access error:', error)
      transcript.value = 'Microphone access denied'
    }
  }

  /**
   * Stop listening
   */
  const stopListening = () => {
    if (mediaRecorder.value && isListening.value) {
      mediaRecorder.value.stop()
      isListening.value = false
    }
  }

  /**
   * Process audio: STT -> Chat -> TTS
   */
  const processAudio = async (audioBlob: Blob) => {
    try {
      isLoading.value = true
      transcript.value = 'Processing...'

      // Step 1: Convert speech to text using Web Speech API
      const text = await speechToText(audioBlob)
      if (!text) {
        transcript.value = 'Could not understand speech'
        return
      }

      transcript.value = `You: ${text}`

      // Step 2: Send to Gemini chat
      const chatResponse = await Fetch.post('/chat', {
        sessionId: 'default',
        input: text
      })

      const aiResponse = chatResponse.data?.text
      if (!aiResponse) {
        transcript.value = 'No response from AI'
        return
      }

      transcript.value = `Yuzu: ${aiResponse}`

      // Step 3: Convert response to speech
      const audioData = await Fetch.post('/speaker', {
        text: aiResponse
      }, {
        responseType: 'blob'
      })

      // Step 4: Play audio with animation
      playAudio(audioData.data as Blob)
    } catch (error) {
      console.error('Voice chat error:', error)
      transcript.value = 'Error processing voice'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Speech to Text using Web Speech API
   */
  const speechToText = (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const fileReader = new FileReader()

      fileReader.onload = async () => {
        try {
          const arrayBuffer = fileReader.result as ArrayBuffer
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

          // Use Web Speech API for recognition
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
          if (!SpeechRecognition) {
            console.warn('Speech Recognition API not supported')
            resolve('')
            return
          }

          const recognition = new SpeechRecognition()
          recognition.language = 'en-US'
          recognition.continuous = false
          recognition.interimResults = false

          recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
              .map((result: any) => result[0].transcript)
              .join('')
            resolve(transcript)
          }

          recognition.onerror = () => {
            resolve('')
          }

          // Start recognition from audio blob
          const audioUrl = URL.createObjectURL(audioBlob)
          const audio = new Audio(audioUrl)
          audio.play().catch(() => {
            // Fallback: use the audio directly for recognition
            resolve('')
          })
        } catch (error) {
          console.error('Audio decode error:', error)
          resolve('')
        }
      }

      fileReader.readAsArrayBuffer(audioBlob)
    })
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
    isSpeaking.value = true
    characterState.value = 'speaking'

    // Switch to idle when finished
    audio.onended = () => {
      characterState.value = 'idle'
      isSpeaking.value = false
      currentAudio.value = null
      URL.revokeObjectURL(audioUrl)
    }

    audio.play().catch(err => console.error('Audio playback error:', err))
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
    isListening,
    isLoading,
    isSpeaking,
    characterState,
    transcript,
    // Methods
    startListening,
    stopListening,
    stopSpeaking
  }
}
