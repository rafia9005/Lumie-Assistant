<template>
  <div class="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex flex-col items-center justify-center p-4">
    <!-- Character Section -->
    <div class="mb-12">
      <div class="relative w-48 h-48">
        <!-- Character Image with state switching -->
        <img 
          :src="characterState === 'speaking' ? '/speak.png' : '/idle.png'"
          alt="Yuzu Character"
          class="w-full h-full object-contain"
          :class="{ 'animate-pulse': isSpeaking }"
        />
        
        <!-- Listening Indicator -->
        <div v-if="isListening" class="absolute top-0 right-0 w-6 h-6 bg-red-500 rounded-full animate-pulse"></div>
      </div>
    </div>

    <!-- Transcript Display -->
    <div class="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 mb-8 min-h-24 flex items-center justify-center">
      <p class="text-lg text-center" :class="[
        isListening ? 'text-red-500 font-bold' : 'text-gray-700'
      ]">
        {{ transcript || 'Click the microphone button to start speaking...' }}
      </p>
    </div>

    <!-- Microphone Control -->
    <div class="flex gap-4 mb-8">
      <!-- Start/Stop Listening Button -->
      <button
        @click="isListening ? stopListening() : startListening()"
        :disabled="isLoading || isSpeaking"
        :class="[
          'px-8 py-4 rounded-full font-bold text-white text-lg transition-all transform',
          isListening 
            ? 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse' 
            : 'bg-orange-500 hover:bg-orange-600',
          'disabled:bg-gray-400 disabled:cursor-not-allowed'
        ]"
      >
        <span v-if="isListening">🎤 Stop Listening</span>
        <span v-else>🎤 Start Speaking</span>
      </button>

      <!-- Stop Speaking Button -->
      <button
        v-if="isSpeaking"
        @click="stopSpeaking"
        class="px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full text-lg transition-colors"
      >
        ⏹️ Stop
      </button>
    </div>

    <!-- Status Indicators -->
    <div class="text-center space-y-2">
      <p class="text-sm font-semibold" :class="[
        isListening ? 'text-red-600' : 
        isLoading ? 'text-yellow-600' :
        isSpeaking ? 'text-orange-600' : 'text-green-600'
      ]">
        <span v-if="isListening">🔴 Listening...</span>
        <span v-else-if="isLoading">🟡 Processing...</span>
        <span v-else-if="isSpeaking">🟠 Speaking...</span>
        <span v-else>🟢 Ready</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useVoiceChat } from '~/composables/useVoiceChat'

const { 
  isListening, 
  isLoading, 
  isSpeaking, 
  characterState, 
  transcript,
  startListening, 
  stopListening, 
  stopSpeaking 
} = useVoiceChat()
</script>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
