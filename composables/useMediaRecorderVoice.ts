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
       return true
    } catch (err: any) {
      console.error('Failed to start recording:', err)
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
         return response.data.text
       }
      return null
    } catch (error) {
      console.error('Transcription error:', error)
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

  const recordUntilSilence = async (): Promise<Blob | null> => {
    const started = await startRecording()
    if (!started) return null

    return new Promise((resolve) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const stream = (mediaRecorder.value as any)?.stream
      if (!stream) {
        stopRecording().then(resolve)
        return
      }

      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)

      const buffer = new Uint8Array(analyser.fftSize)
      let hasSpoken = false
      let silenceStart = 0
      const SILENCE_THRESHOLD = 0.015
      const SILENCE_DURATION_MS = 1200

      const monitor = async () => {
        if (!isRecording.value) {
          const audioBlob = await stopRecording()
          resolve(audioBlob)
          return
        }

        analyser.getByteTimeDomainData(buffer)

        let sumSquares = 0
        for (let i = 0; i < buffer.length; i++) {
          const normalized = (buffer[i] - 128) / 128
          sumSquares += normalized * normalized
        }

        const volume = Math.sqrt(sumSquares / buffer.length)
        const now = performance.now()

        if (volume > SILENCE_THRESHOLD) {
          hasSpoken = true
          silenceStart = 0
        } else if (hasSpoken) {
          if (silenceStart === 0) {
            silenceStart = now
          } else if (now - silenceStart >= SILENCE_DURATION_MS) {
            const audioBlob = await stopRecording()
            resolve(audioBlob)
            return
          }
        }

        requestAnimationFrame(() => {
          monitor().catch(() => resolve(null))
        })
      }

      monitor().catch(() => resolve(null))
    })
  }

  const recordUntilSilenceAndTranscribe = async (): Promise<string | null> => {
    const audioBlob = await recordUntilSilence()
    if (!audioBlob) return null
    return transcribeAudio(audioBlob)
  }

  return {
    isRecording,
    errorMessage,
    startRecording,
    stopRecording,
    transcribeAudio,
    recordAndTranscribe,
    recordUntilSilence,
    recordUntilSilenceAndTranscribe
  }
}
