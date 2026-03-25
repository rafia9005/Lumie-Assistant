import { readMultipartFormData } from 'h3'

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed'
    })
  }

  const config = useRuntimeConfig()
  const WORKER_TOKEN = config.workerToken
  const WHISPER_ENDPOINT = config.whisperEndpoint

  if (!WHISPER_ENDPOINT) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OPENAI_WHISPER_ENDPOINT not configured in .env'
    })
  }

  if (!WORKER_TOKEN) {
    throw createError({
      statusCode: 500,
      statusMessage: 'WORKER_TOKEN not configured in .env'
    })
  }

  try {
    const formData = await readMultipartFormData(event)
    
    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No audio file provided'
      })
    }

    const audioFile = formData.find(item => item.name === 'audio' || item.type?.startsWith('audio/'))
    
    if (!audioFile || !audioFile.data) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid audio data'
      })
    }

    console.log(`📤 Sending ${audioFile.data.length} bytes to Whisper Worker...`)

    const workerFormData = new FormData()
    const audioBlob = new Blob([new Uint8Array(audioFile.data)], { type: audioFile.type || 'audio/webm' })
    workerFormData.append('audio', audioBlob, audioFile.filename || 'recording.webm')

    const response = await fetch(WHISPER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WORKER_TOKEN}`
      },
      body: workerFormData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('Whisper Worker error:', errorData)
      throw createError({
        statusCode: response.status,
        statusMessage: `Transcription failed: ${errorData.message || errorData.error}`
      })
    }

    const result = await response.json()
    
    console.log('✅ Transcription successful:', result.text)
    
    return {
      text: result.text || '',
      language: result.language || 'en',
      success: true
    }
  } catch (error: any) {
    console.error('Transcription error:', error)
    
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Transcription failed'
    })
  }
})
