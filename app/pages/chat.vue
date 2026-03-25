<template>
  <div class="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex flex-col items-center justify-center p-4">
    <!-- Character Section -->
    <div class="mb-12">
      <div class="relative w-48 h-48">
        <!-- Character Image with state switching -->
        <img 
          :src="characterState === 'speaking' ? '/speak.png' : '/idle.png'"
          alt="Yuzu Character"
          class="w-full h-full object-contain animate-bounce"
          :class="{ 'animate-pulse': isSpeaking }"
        />
      </div>
    </div>

    <!-- Chat Display -->
    <div class="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 mb-8 max-h-96 overflow-y-auto">
      <div v-if="messages.length === 0" class="text-center text-gray-400">
        <p>Start a conversation with Yuzu!</p>
      </div>
      
      <div v-else class="space-y-4">
        <div 
          v-for="(msg, idx) in messages" 
          :key="idx"
          :class="msg.role === 'user' ? 'text-right' : 'text-left'"
        >
          <div 
            :class="[
              'inline-block max-w-xs px-4 py-2 rounded-lg',
              msg.role === 'user' 
                ? 'bg-yellow-400 text-gray-800' 
                : 'bg-orange-200 text-gray-800'
            ]"
          >
            <p>{{ msg.text }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Section -->
    <div class="w-full max-w-2xl">
      <div class="flex gap-2">
        <input
          v-model="userInput"
          type="text"
          placeholder="Type your message in English..."
          @keyup.enter="handleSend"
          :disabled="isLoading || isSpeaking"
          class="flex-1 px-4 py-3 rounded-lg border-2 border-yellow-400 focus:outline-none focus:border-orange-500 disabled:bg-gray-100"
        />
        <button
          @click="handleSend"
          :disabled="isLoading || isSpeaking || !userInput.trim()"
          class="px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors"
        >
          {{ isLoading ? 'Thinking...' : isSpeaking ? 'Speaking...' : 'Send' }}
        </button>
      </div>

      <!-- Stop Button (visible when speaking) -->
      <button
        v-if="isSpeaking"
        @click="stopSpeaking"
        class="w-full mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
      >
        Stop Speaking
      </button>
    </div>

    <!-- Status Indicator -->
    <div class="mt-6 text-center">
      <p class="text-sm text-gray-600">
        <span v-if="isLoading" class="text-yellow-600 font-semibold">🟡 Yuzu is thinking...</span>
        <span v-else-if="isSpeaking" class="text-orange-600 font-semibold">🟠 Yuzu is speaking...</span>
        <span v-else class="text-green-600 font-semibold">🟢 Ready to chat</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ChatMessage } from '~/types/chat'
import { useChatToSpeech } from '~/composables/useChatToSpeech'

const userInput = ref('')
const messages = ref<ChatMessage[]>([])
const { isLoading, isSpeaking, characterState, speakWithCharacter, stopSpeaking } = useChatToSpeech()

const handleSend = async () => {
  if (!userInput.value.trim()) return

  // Add user message to display
  messages.value.push({
    role: 'user',
    text: userInput.value
  })

  const input = userInput.value
  userInput.value = ''

  // Send to chat API and get speech
  await speakWithCharacter(input)
}

// Watch for chat updates and sync messages
watch(() => characterState.value, () => {
  // Re-render when character state changes
}, { immediate: true })
</script>

<style scoped>
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.animate-bounce {
  animation: bounce 2s infinite;
}
</style>
