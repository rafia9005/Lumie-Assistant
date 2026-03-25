<template>
  <div class="min-h-screen bg-white text-neutral-900 flex flex-col items-center selection:bg-black selection:text-white font-sans">
    
    <main class="flex-1 w-full max-w-5xl px-6 py-8 flex flex-col md:flex-row gap-8 md:gap-12 z-10 overflow-hidden">
      
      <section class="flex flex-col items-center justify-center md:w-1/3 lg:w-1/4 space-y-8">
        <div class="relative w-48 h-48 md:w-64 md:h-64 flex items-center justify-center bg-white rounded-full border border-neutral-100 shadow-sm">
          <div v-if="isListening || isSpeaking" class="absolute inset-0 border border-neutral-200 rounded-full animate-ping-slow"></div>
          <div v-if="isListening || isSpeaking" class="absolute inset-4 border border-neutral-100 rounded-full animate-ping-slow-delayed"></div>
          
          <img 
            :src="characterState === 'speaking' ? '/speak.png' : '/idle.png'"
            alt="Yuzu Character"
            class="w-full h-full object-contain transform transition-transform duration-500 z-10"
            :class="{ 
              'scale-[1.02]': !isSpeaking && !isListening,
              'scale-[1.05]': isSpeaking,
              'scale-100': isListening
            }"
          />

          <div v-if="isListening" class="absolute bottom-4 right-4 flex gap-1 items-center justify-center bg-white p-2 rounded-full border border-neutral-200 shadow-sm z-20">
            <div class="w-1 h-3 bg-black rounded-full animate-music-1"></div>
            <div class="w-1 h-5 bg-black rounded-full animate-music-2"></div>
            <div class="w-1 h-2 bg-black rounded-full animate-music-3"></div>
          </div>
        </div>

        <div class="text-center space-y-1">
          <h2 class="text-xl font-bold text-black tracking-tight">Yuzu</h2>
          <p class="text-sm text-neutral-500">How can I help you today?</p>
        </div>

        <div class="hidden md:flex flex-col w-full gap-3 pt-4 border-t border-neutral-100">
          <button
            @click="toggleMicrophone"
            :disabled="isLoading || isSpeaking"
            class="w-full py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            :class="isListening ? 'bg-black text-white shadow-md' : 'bg-white border-2 border-black text-black hover:bg-neutral-50'"
          >
            <span v-if="isListening" class="flex h-2.5 w-2.5 relative">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
            </span>
            <span class="font-bold tracking-wide uppercase text-xs">
              {{ isListening ? 'Stop Listening' : 'Voice Command' }}
            </span>
          </button>
          
          <button
            v-if="isSpeaking"
            @click="stopSpeaking"
            class="w-full py-3 px-6 rounded-xl border border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-black transition-all text-xs font-bold uppercase tracking-widest"
          >
            Stop Speaking
          </button>
        </div>
      </section>

      <section class="flex-1 flex flex-col bg-white border border-neutral-200 rounded-[2rem] overflow-hidden shadow-sm">
        
        <div 
          ref="chatContainer"
          class="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-neutral-200 scrollbar-track-transparent"
        >
          <div v-if="messages.length === 0" class="h-full flex flex-col items-center justify-center text-center space-y-4 text-neutral-400">
            <div class="w-12 h-12 bg-neutral-50 border border-neutral-100 rounded-full flex items-center justify-center text-xl">💬</div>
            <div class="max-w-xs">
              <p class="text-base font-semibold text-neutral-900">Start a conversation</p>
              <p class="text-sm mt-1">Type a message or use voice commands.</p>
            </div>
          </div>
          
          <TransitionGroup name="message">
            <div 
              v-for="(msg, idx) in messages" 
              :key="idx"
              :class="['flex w-full', msg.role === 'user' ? 'justify-end' : 'justify-start']"
            >
              <div :class="['max-w-[85%] md:max-w-[75%] flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start']">
                <div class="flex items-center gap-2 mb-1.5 px-1">
                  <span class="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    {{ msg.role === 'user' ? 'You' : 'Yuzu' }}
                  </span>
                </div>
                
                <div 
                  :class="[
                    'px-5 py-3.5 rounded-2xl text-sm md:text-base leading-relaxed',
                    msg.role === 'user' 
                      ? 'bg-black text-white rounded-tr-sm' 
                      : 'bg-neutral-100 border border-neutral-200 text-black rounded-tl-sm'
                  ]"
                >
                  <p>{{ msg.text }}</p>
                </div>
              </div>
            </div>
          </TransitionGroup>

          <div v-if="isLoading" class="flex justify-start">
            <div class="bg-neutral-50 border border-neutral-200 rounded-2xl rounded-tl-sm px-5 py-4 flex gap-1.5 items-center">
              <div class="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
              <div class="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
              <div class="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
            </div>
          </div>
        </div>

        <div v-if="errorMessage || (isListening && interimTranscript)" class="px-6 py-2">
          <Transition name="fade">
            <div v-if="errorMessage" class="bg-neutral-100 border border-neutral-200 text-black text-xs py-2 px-4 rounded-lg flex items-center gap-2 font-medium">
              <span class="text-sm">⚠️</span> {{ errorMessage }}
            </div>
          </Transition>
          <div v-if="isListening && interimTranscript" class="text-xs text-neutral-500 font-mono italic px-4 py-1">
            » {{ interimTranscript }}
          </div>
        </div>

        <div class="p-4 md:p-6 bg-neutral-50 border-t border-neutral-200">
          <div class="relative flex items-center gap-3">
            <button
              @click="toggleMicrophone"
              :disabled="isLoading || isSpeaking"
              class="md:hidden p-3.5 rounded-xl bg-white border border-neutral-300 text-lg active:scale-95 transition-transform"
            >
              {{ isListening ? '🛑' : '🎙️' }}
            </button>

            <div class="relative flex-1 group">
              <input
                v-model="userInput"
                type="text"
                :placeholder="isListening ? 'Listening...' : 'Type your message...'"
                @keyup.enter="handleSend"
                :disabled="isLoading || isSpeaking || isListening"
                class="w-full pl-5 pr-14 py-3.5 bg-white border border-neutral-300 rounded-xl text-black placeholder:text-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all disabled:bg-neutral-100 disabled:cursor-not-allowed"
              />
              
              <button
                @click="handleSend"
                :disabled="isLoading || isSpeaking || !userInput.trim() || isListening"
                class="absolute right-2 top-2 bottom-2 px-3.5 rounded-lg bg-black text-white hover:bg-neutral-800 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <span v-if="!isLoading && !isSpeaking">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </span>
                <div v-else class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              </button>
            </div>
          </div>
          
          <p class="mt-3 text-[10px] text-center text-neutral-400 font-medium tracking-widest uppercase">
            Powered by Gemini • Whisper • ElevenLabs
          </p>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'
import type { ChatMessage } from '../../types/chat'
import { useChatToSpeech } from '../../composables/useChatToSpeech'
import { useMediaRecorderVoice } from '../../composables/useMediaRecorderVoice'

const userInput = ref('')
const messages = ref<ChatMessage[]>([])
const errorMessage = ref('')
const chatContainer = ref<HTMLElement | null>(null)

const { isLoading, isSpeaking, characterState, speakWithCharacter, stopSpeaking } = useChatToSpeech()
const { isRecording, recordUntilSilenceAndTranscribe, stopRecording, transcribeAudio, errorMessage: voiceError } = useMediaRecorderVoice()

const isListening = ref(false)
const interimTranscript = ref('')

const scrollToBottom = async () => {
  await nextTick()
  if (chatContainer.value) {
    chatContainer.value.scrollTo({
      top: chatContainer.value.scrollHeight,
      behavior: 'smooth'
    })
  }
}

watch(messages, () => {
  scrollToBottom()
}, { deep: true })

watch(voiceError, (newError) => {
  if (newError) {
    errorMessage.value = newError
  }
})

watch(isRecording, (recording) => {
  isListening.value = recording
  if (recording) {
    interimTranscript.value = 'Recording...'
  } else {
    interimTranscript.value = ''
  }
})

const toggleMicrophone = async () => {
  errorMessage.value = ''
  
  if (isRecording.value) {
    const audioBlob = await stopRecording()
    if (!audioBlob) return

    interimTranscript.value = 'Transcribing...'
    const transcript = await transcribeAudio(audioBlob)
    interimTranscript.value = ''

    if (transcript) await handleVoiceInput(transcript)
    else errorMessage.value = 'Failed to transcribe audio.'
  } else {
    interimTranscript.value = 'Listening...'
    const transcript = await recordUntilSilenceAndTranscribe()
    interimTranscript.value = ''

    if (transcript) await handleVoiceInput(transcript)
    else if (!voiceError.value) errorMessage.value = 'No speech detected.'
  }
}

const handleVoiceInput = async (text: string) => {
  messages.value.push({ role: 'user', text })
  interimTranscript.value = ''
  const response = await speakWithCharacter(text)
  if (response?.text) {
    messages.value.push({ role: 'assistant', text: response.text })
  }
}

const handleSend = async () => {
  if (!userInput.value.trim()) return
  const input = userInput.value
  messages.value.push({ role: 'user', text: input })
  userInput.value = ''
  const response = await speakWithCharacter(input)
  if (response?.text) {
    messages.value.push({ role: 'assistant', text: response.text })
  }
}
</script>

<style scoped>
@keyframes ping-slow {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.3); opacity: 0; }
}

@keyframes music-1 {
  0%, 100% { height: 8px; }
  50% { height: 16px; }
}
@keyframes music-2 {
  0%, 100% { height: 12px; }
  50% { height: 24px; }
}
@keyframes music-3 {
  0%, 100% { height: 6px; }
  50% { height: 12px; }
}

.animate-ping-slow { animation: ping-slow 2.5s cubic-bezier(0, 0, 0.2, 1) infinite; }
.animate-ping-slow-delayed { animation: ping-slow 2.5s cubic-bezier(0, 0, 0.2, 1) infinite 1.25s; }
.animate-music-1 { animation: music-1 0.8s ease-in-out infinite; }
.animate-music-2 { animation: music-2 1.1s ease-in-out infinite; }
.animate-music-3 { animation: music-3 0.9s ease-in-out infinite; }

.message-enter-active, .message-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}
.message-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.scrollbar-thin::-webkit-scrollbar { width: 4px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: #e5e5e5;
  border-radius: 20px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #d4d4d4; }
</style>