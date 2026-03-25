import tailwindcss from "@tailwindcss/vite"

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['./app/app.css'],
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ["a046-103-88-169-131.ngrok-free.app"]
    }
  },

  runtimeConfig: {
    // Server-side only (not exposed to client)
    workerToken: process.env.WORKER_TOKEN,
    geminiToken: process.env.GEMINI_API_KEY,
    aura2Endpoint: process.env.AURA_2_ENDPOINT,
    whisperEndpoint: process.env.OPENAI_WHISPER_ENDPOINT,
  },
})
