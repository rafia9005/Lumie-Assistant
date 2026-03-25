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
  const CLOUDFLARE_ACCOUNT_ID = config.cloudflareAccountId
  const CLOUDFLARE_API_TOKEN = config.cloudflareApiToken

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Cloudflare credentials not configured'
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

    // Convert Buffer to Uint8Array for fetch body
    const audioArray = new Uint8Array(audioFile.data)

    // Send to Cloudflare Workers AI Whisper model
    // Using @cf/openai/whisper (free tier available)
    const whisperUrl = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/openai/whisper`
    
    const response = await fetch(whisperUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': audioFile.type || 'audio/webm',
      },
      body: audioArray
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      console.error('Cloudflare AI error:', errorData)
      throw createError({
        statusCode: response.status,
        statusMessage: `Cloudflare AI error: ${JSON.stringify(errorData)}`
      })
    }

    const result = await response.json()
    
    // Cloudflare Whisper returns: { result: { text: "transcription" } }
    return {
      text: result.result?.text || '',
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
