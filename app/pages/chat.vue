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
        <!-- Listening Indicator -->
        <div v-if="isListening" class="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full animate-ping"></div>
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

    <!-- Input Section with Mic -->
    <div class="w-full max-w-2xl">
      <div class="flex gap-2">
        <!-- Microphone Toggle Button -->
        <button
          @click="toggleMicrophone"
          :class="[
            'px-4 py-3 rounded-lg font-bold transition-all',
            isListening 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
          ]"
          :disabled="isLoading || isSpeaking"
        >
          {{ isListening ? '🎤' : '🎙️' }}
        </button>

        <input
          v-model="userInput"
          type="text"
          :placeholder="isListening ? 'Listening...' : 'Type or speak in English...'"
          @keyup.enter="handleSend"
          :disabled="isLoading || isSpeaking || isListening"
          class="flex-1 px-4 py-3 rounded-lg border-2 border-yellow-400 focus:outline-none focus:border-orange-500 disabled:bg-gray-100"
        />
        <button
          @click="handleSend"
          :disabled="isLoading || isSpeaking || !userInput.trim() || isListening"
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
        <span v-if="isListening" class="text-red-600 font-semibold">🔴 Listening...</span>
        <span v-else-if="isLoading" class="text-yellow-600 font-semibold">🟡 Yuzu is thinking...</span>
        <span v-else-if="isSpeaking" class="text-orange-600 font-semibold">🟠 Yuzu is speaking...</span>
        <span v-else class="text-green-600 font-semibold">🟢 Ready to chat</span>
      </p>
      <p v-if="isListening" class="text-xs text-gray-500 mt-1">
        {{ interimTranscript || 'Say something...' }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { ChatMessage } from '~/types/chat'
import { useChatToSpeech } from '~/composables/useChatToSpeech'

const userInput = ref('')
const messages = ref<ChatMessage[]>([])
const isListening = ref(false)
const interimTranscript = ref('')
const recognition = ref<any>(null)

const { isLoading, isSpeaking, characterState, speakWithCharacter, stopSpeaking } = useChatToSpeech()

// Initialize Speech Recognition
onMounted(() => {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  
  if (!SpeechRecognition) {
    console.error('Speech Recognition API not supported in this browser')
    return
  }

  recognition.value = new SpeechRecognition()
  recognition.value.continuous = true // Always listen
  recognition.value.interimResults = true // Show partial results
  recognition.value.language = 'en-US'

  recognition.value.onresult = (event: any) => {
    console.log('🎤 Speech recognition result:', event)
    let finalTranscript = ''
    let interim = ''

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' '
        console.log('✅ Final transcript:', transcript)
      } else {
        interim += transcript
        console.log('⏳ Interim transcript:', transcript)
      }
    }

    interimTranscript.value = interim

    if (finalTranscript.trim()) {
      // User finished speaking - send to AI
      handleVoiceInput(finalTranscript.trim())
    }
  }

  recognition.value.onerror = (event: any) => {
    console.error('❌ Speech recognition error:', event.error)
    if (event.error === 'no-speech') {
      console.log('⚠️ No speech detected, continuing to listen...')
    } else {
      isListening.value = false
    }
  }

  recognition.value.onend = () => {
    console.log('🔚 Speech recognition ended')
    if (isListening.value) {
      // Restart if still in listening mode
      console.log('🔄 Restarting speech recognition...')
      recognition.value.start()
    }
  }
})

onUnmounted(() => {
  if (recognition.value && isListening.value) {
    recognition.value.stop()
  }
})

const toggleMicrophone = () => {
  if (!recognition.value) {
    alert('Speech recognition not supported in your browser')
    return
  }

  if (isListening.value) {
    console.log('⏹️ Stopping microphone...')
    recognition.value.stop()
    isListening.value = false
    interimTranscript.value = ''
  } else {
    console.log('🎤 Starting microphone...')
    recognition.value.start()
    isListening.value = true
  }
}

const handleVoiceInput = async (text: string) => {
  console.log('💬 Voice input received:', text)
  
  // Add user message to display
  messages.value.push({
    role: 'user',
    text
  })

  interimTranscript.value = ''

  // Send to chat API and get speech
  await speakWithCharacter(text)
  
  // Add AI response to messages
  // Note: speakWithCharacter already handles TTS
}

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

@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}

.animate-bounce {
  animation: bounce 2s infinite;
}

.animate-ping {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style>
