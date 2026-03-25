import type { AuraInput } from '../../../types/speaker'

export default defineEventHandler(async (event) => {
  // Only allow POST method
  if (event.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed'
    })
  }

  const config = useRuntimeConfig()
  const AURA_2_TOKEN = config.workerToken

  if (!AURA_2_TOKEN) {
    throw createError({
      statusCode: 500,
      statusMessage: 'AURA_2_TOKEN not configured'
    })
  }

  // Parse request body
  const body = await readBody<AuraInput>(event)

  if (!body.text || typeof body.text !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: "Parameter 'text' is required and must be a string"
    })
  }

  // Build request payload
  const payload: AuraInput = {
    text: body.text
  }

  if (body.speaker) payload.speaker = body.speaker
  if (body.encoding) payload.encoding = body.encoding
  if (body.container) payload.container = body.container
  if (body.sample_rate) payload.sample_rate = body.sample_rate
  if (body.bit_rate) payload.bit_rate = body.bit_rate

  try {
    const response = await fetch('https://lumie.rafiidev01.workers.dev/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AURA_2_TOKEN}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      // Return error directly from worker
      setResponseHeader(event, 'Content-Type', 'application/json')
      setResponseStatus(event, response.status)
      return errorData
    }

    // Get content type from worker response
    const contentType = response.headers.get('Content-Type') || 'audio/mpeg'

    // Set response headers
    setResponseHeader(event, 'Content-Type', contentType)
    setResponseHeader(event, 'Cache-Control', 'no-cache')

    // Return audio stream
    return response.body
  } catch (error: unknown) {
    // Re-throw if already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    const message = error instanceof Error ? error.message : 'Unknown error'
    setResponseHeader(event, 'Content-Type', 'application/json')
    setResponseStatus(event, 502)
    return { error: 'Bad Gateway', details: message }
  }
})
