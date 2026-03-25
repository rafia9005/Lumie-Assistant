import { readMultipartFormData } from 'h3'

export default defineEventHandler(async (event) => {
  // Only allow POST method
  if (event.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed'
    })
  }

  const config = useRuntimeConfig()
  const CLOUDFLARE_WORKER_URL = process.env.CLOUDFLARE_WORKER_URL || config.cloudflareWorkerUrl
  const CLOUDFLARE_AUTH_TOKEN = process.env.CLOUDFLARE_AUTH_TOKEN || config.cloudflareAuthToken

  if (!CLOUDFLARE_WORKER_URL) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Cloudflare Worker URL not configured. Please deploy the worker and set CLOUDFLARE_WORKER_URL in .env'
    })
  }

  try {
    // Parse multipart form data (audio file)
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

    console.log(`📤 Sending ${audioFile.data.length} bytes to Cloudflare Worker...`)

    // Create FormData for worker
    const workerFormData = new FormData()
    const audioBlob = new Blob([new Uint8Array(audioFile.data)], { type: audioFile.type || 'audio/webm' })
    workerFormData.append('audio', audioBlob, audioFile.filename || 'recording.webm')

    // Send to Cloudflare Worker
    const headers: Record<string, string> = {}
    if (CLOUDFLARE_AUTH_TOKEN) {
      headers['Authorization'] = `Bearer ${CLOUDFLARE_AUTH_TOKEN}`
    }

    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: 'POST',
      headers,
      body: workerFormData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('Cloudflare Worker error:', errorData)
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
    
    // Re-throw if already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Transcription failed'
    })
  }
})
