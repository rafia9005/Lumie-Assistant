import { ref } from 'vue'
import Fetch from '../lib/fetch'

export const useMediaRecorderVoice = () => {
  const isRecording = ref(false)
  const mediaRecorder = ref<MediaRecorder | null>(null)
  const audioChunks = ref<Blob[]>([])
  const errorMessage = ref('')

  const startRecording = async (): Promise<boolean> => {
    try {
      errorMessage.value = ''
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      audioChunks.value = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.value.push(event.data)
        }
      }
      recorder.start()
      mediaRecorder.value = recorder
      isRecording.value = true
      console.log('🎤 Recording started')
      return true
    } catch (err: any) {
      console.error('❌ Failed to start recording:', err)
      errorMessage.value = `Microphone error: ${err.message}`
      return false
    }
  }

  const stopRecording = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorder.value || !isRecording.value) {
        resolve(null)
        return
      }

      mediaRecorder.value.onstop = () => {
        const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' })
        if (mediaRecorder.value?.stream) {
          mediaRecorder.value.stream.getTracks().forEach(track => track.stop())
        }
        mediaRecorder.value = null
        isRecording.value = false
        audioChunks.value = []
        console.log('⏹️ Recording stopped, blob size:', audioBlob.size)
        resolve(audioBlob)
      }

      mediaRecorder.value.stop()
    })
  }

  const transcribeAudio = async (audioBlob: Blob): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      const response = await Fetch.post('/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      if (response.data?.text) {
        console.log('✅ Transcription:', response.data.text)
        return response.data.text
      }
      return null
    } catch (error) {
      console.error('❌ Transcription error:', error)
      errorMessage.value = 'Transcription failed'
      return null
    }
  }

  const recordAndTranscribe = async (durationMs: number = 5000): Promise<string | null> => {
    const started = await startRecording()
    if (!started) return null
    await new Promise(resolve => setTimeout(resolve, durationMs))
    const audioBlob = await stopRecording()
    if (!audioBlob) return null
    return await transcribeAudio(audioBlob)
  }

  return {
    isRecording,
    errorMessage,
    startRecording,
    stopRecording,
    transcribeAudio,
    recordAndTranscribe
  }
}
