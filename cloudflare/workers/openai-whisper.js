/**
 * Cloudflare Worker for Speech-to-Text using Whisper AI
 * 
 * This worker receives audio files and transcribes them using
 * Cloudflare Workers AI (@cf/openai/whisper model)
 * 
 * Deploy: wrangler deploy
 * Endpoint: https://your-worker.workers.dev/
 */

export default {
  async fetch(request, env) {
    // CORS headers for browser requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Method not allowed',
        message: 'Only POST requests are accepted'
      }), {
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      });
    }

    try {
      // Verify authorization token
      const API_KEY = env.API_KEY;
      const auth = request.headers.get("Authorization");

      if (auth !== `Bearer ${API_KEY}`) {
        return new Response(JSON.stringify({ 
          error: 'Unauthorized'
        }), {
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        });
      }

      // Get audio data from request body
      const contentType = request.headers.get('content-type') || '';
      let audioData;

      if (contentType.includes('multipart/form-data')) {
        // Parse FormData
        const formData = await request.formData();
        const audioFile = formData.get('audio');
        
        if (!audioFile) {
          return new Response(JSON.stringify({ 
            error: 'Bad Request',
            message: 'No audio file found in form data'
          }), {
            status: 400,
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders 
            }
          });
        }

        audioData = await audioFile.arrayBuffer();
      } else {
        // Direct binary audio data
        audioData = await request.arrayBuffer();
      }

      if (!audioData || audioData.byteLength === 0) {
        return new Response(JSON.stringify({ 
          error: 'Bad Request',
          message: 'Empty audio data received'
        }), {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        });
      }

      // Run Whisper AI model
      const response = await env.Lumine.run(
        '@cf/openai/whisper',
        {
          audio: [...new Uint8Array(audioData)]
        }
      );

      // Extract transcription text
      const transcription = response?.text || '';

      if (!transcription) {
        return new Response(JSON.stringify({ 
          error: 'Transcription Failed',
          message: 'No transcription text returned from Whisper model'
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          }
        });
      }

      // Return successful transcription
      return new Response(JSON.stringify({
        success: true,
        text: transcription,
        language: response?.language || 'en',
        duration: response?.duration || 0
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message || 'Failed to process audio'
      }), {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        }
      });
    }
  }
};
