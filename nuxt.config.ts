// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    // Server-side only (not exposed to client)
    aura2Token: process.env.AURA_2_TOKEN
  }
})
