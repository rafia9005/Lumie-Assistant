import tailwindcss from "@tailwindcss/vite"

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['./app/app.css'],
  vite: {
    plugins: [tailwindcss()]
  },

  runtimeConfig: {
    // Server-side only (not exposed to client)
    aura2Token: process.env.AURA_2_TOKEN,
    geminiToken: process.env.GEMINI_API_KEY
  }
})
