import { speaker } from '~~/context/character'
import type { AuraInput, Speaker } from '../../../types/speaker'

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed'
    })
  }

  const config = useRuntimeConfig()
  const WORKER_TOKEN = config.workerToken
  const AURA_2_ENDPOINT = config.aura2Endpoint

  if (!WORKER_TOKEN) {
    throw createError({
      statusCode: 500,
      statusMessage: 'WORKER_TOKEN not configured'
    })
  }

  if (!AURA_2_ENDPOINT) {
    throw createError({
      statusCode: 500,
      statusMessage: 'AURA_2_ENDPOINT not configured'
    })
  }

  const body = await readBody<AuraInput>(event)

  if (!body.text || typeof body.text !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: "Parameter 'text' is required and must be a string"
    })
  }

  const payload: AuraInput = {
    text: body.text,
    speaker: speaker as Speaker
  }

  if (body.speaker) payload.speaker = body.speaker
  if (body.encoding) payload.encoding = body.encoding
  if (body.container) payload.container = body.container
  if (body.sample_rate) payload.sample_rate = body.sample_rate
  if (body.bit_rate) payload.bit_rate = body.bit_rate

  try {
    const response = await fetch(AURA_2_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WORKER_TOKEN}`
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      setResponseHeader(event, 'Content-Type', 'application/json')
      setResponseStatus(event, response.status)
      return errorData
    }

    const contentType = response.headers.get('Content-Type') || 'audio/mpeg'
    setResponseHeader(event, 'Content-Type', contentType)
    setResponseHeader(event, 'Cache-Control', 'no-cache')

    return response.body
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    const message = error instanceof Error ? error.message : 'Unknown error'
    setResponseHeader(event, 'Content-Type', 'application/json')
    setResponseStatus(event, 502)
    return { error: 'Bad Gateway', details: message }
  }
})
