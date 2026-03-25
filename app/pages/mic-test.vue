<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <h1 class="text-3xl font-bold mb-6">Microphone & Speech API Test</h1>
      
      <!-- Browser Info -->
      <div class="mb-6 p-4 bg-blue-50 rounded">
        <h2 class="font-bold mb-2">Browser Information</h2>
        <p class="text-sm"><strong>User Agent:</strong> {{ browserInfo.userAgent }}</p>
        <p class="text-sm"><strong>Secure Context:</strong> {{ browserInfo.secureContext ? '✅ Yes' : '❌ No' }}</p>
        <p class="text-sm"><strong>HTTPS:</strong> {{ browserInfo.isHttps ? '✅ Yes' : '⚠️ No (localhost is OK)' }}</p>
      </div>

      <!-- API Support -->
      <div class="mb-6 p-4 rounded" :class="apiSupport.speechRecognition ? 'bg-green-50' : 'bg-red-50'">
        <h2 class="font-bold mb-2">API Support</h2>
        <p class="text-sm">
          <strong>Speech Recognition:</strong> 
          {{ apiSupport.speechRecognition ? '✅ Supported' : '❌ Not Supported' }}
        </p>
        <p class="text-sm">
          <strong>MediaRecorder:</strong> 
          {{ apiSupport.mediaRecorder ? '✅ Supported' : '❌ Not Supported' }}
        </p>
        <p class="text-sm">
          <strong>getUserMedia:</strong> 
          {{ apiSupport.getUserMedia ? '✅ Supported' : '❌ Not Supported' }}
        </p>
      </div>

      <!-- Test Buttons -->
      <div class="space-y-4">
        <!-- Test 1: Microphone Permission -->
        <div class="p-4 border rounded">
          <h3 class="font-bold mb-2">Test 1: Microphone Permission</h3>
          <button
            @click="testMicrophonePermission"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            :disabled="testing"
          >
            Test Microphone Access
          </button>
          <p v-if="micTest.result" class="mt-2 text-sm" :class="micTest.success ? 'text-green-600' : 'text-red-600'">
            {{ micTest.result }}
          </p>
        </div>

        <!-- Test 2: Speech Recognition -->
        <div class="p-4 border rounded">
          <h3 class="font-bold mb-2">Test 2: Speech Recognition API</h3>
          <button
            @click="testSpeechRecognition"
            class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            :disabled="testing || !apiSupport.speechRecognition"
          >
            Test Speech Recognition
          </button>
          <p v-if="speechTest.result" class="mt-2 text-sm" :class="speechTest.success ? 'text-green-600' : 'text-red-600'">
            {{ speechTest.result }}
          </p>
          <p v-if="speechTest.transcript" class="mt-1 text-sm font-bold">
            Transcript: "{{ speechTest.transcript }}"
          </p>
        </div>

        <!-- Test 3: Audio Recording -->
        <div class="p-4 border rounded">
          <h3 class="font-bold mb-2">Test 3: MediaRecorder (Alternative Method)</h3>
          <button
            @click="testMediaRecorder"
            class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            :disabled="testing || !apiSupport.mediaRecorder"
          >
            Test Audio Recording
          </button>
          <p v-if="recorderTest.result" class="mt-2 text-sm" :class="recorderTest.success ? 'text-green-600' : 'text-red-600'">
            {{ recorderTest.result }}
          </p>
        </div>
      </div>

      <!-- Recommendations -->
      <div class="mt-6 p-4 bg-yellow-50 rounded">
        <h2 class="font-bold mb-2">Recommendations</h2>
        <ul class="text-sm space-y-1 list-disc list-inside">
          <li v-if="!browserInfo.secureContext">⚠️ Use HTTPS or localhost for secure context</li>
          <li v-if="!apiSupport.speechRecognition">❌ Switch to Chrome or Edge browser (Speech Recognition unsupported)</li>
          <li v-if="apiSupport.speechRecognition">✅ Speech Recognition API is available</li>
          <li v-if="apiSupport.mediaRecorder">✅ MediaRecorder available as fallback option</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const browserInfo = ref({
  userAgent: '',
  secureContext: false,
  isHttps: false
})

const apiSupport = ref({
  speechRecognition: false,
  mediaRecorder: false,
  getUserMedia: false
})

const micTest = ref({ result: '', success: false })
const speechTest = ref({ result: '', success: false, transcript: '' })
const recorderTest = ref({ result: '', success: false })
const testing = ref(false)

onMounted(() => {
  // Detect browser info
  browserInfo.value = {
    userAgent: navigator.userAgent,
    secureContext: window.isSecureContext,
    isHttps: window.location.protocol === 'https:'
  }

  // Check API support
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  apiSupport.value = {
    speechRecognition: !!SpeechRecognition,
    mediaRecorder: !!(window as any).MediaRecorder,
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  }
})

const testMicrophonePermission = async () => {
  testing.value = true
  micTest.value = { result: 'Testing...', success: false }
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach(track => track.stop())
    micTest.value = { result: '✅ Microphone access granted!', success: true }
  } catch (err: any) {
    micTest.value = { result: `❌ Error: ${err.message}`, success: false }
  } finally {
    testing.value = false
  }
}

const testSpeechRecognition = () => {
  testing.value = true
  speechTest.value = { result: 'Listening... (speak now)', success: false, transcript: '' }
  
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  const recognition = new SpeechRecognition()
  recognition.lang = 'en-US'
  recognition.continuous = false
  recognition.interimResults = false

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript
    speechTest.value = {
      result: '✅ Speech Recognition working!',
      success: true,
      transcript
    }
    testing.value = false
  }

  recognition.onerror = (event: any) => {
    speechTest.value = {
      result: `❌ Error: ${event.error} - ${event.message || 'No additional details'}`,
      success: false,
      transcript: ''
    }
    testing.value = false
  }

  recognition.onend = () => {
    if (testing.value) {
      testing.value = false
    }
  }

  try {
    recognition.start()
  } catch (err: any) {
    speechTest.value = { result: `❌ Failed to start: ${err.message}`, success: false, transcript: '' }
    testing.value = false
  }
}

const testMediaRecorder = async () => {
  testing.value = true
  recorderTest.value = { result: 'Testing...', success: false }
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mediaRecorder = new MediaRecorder(stream)
    
    mediaRecorder.ondataavailable = (e) => {
      recorderTest.value = {
        result: `✅ MediaRecorder working! Recorded ${e.data.size} bytes`,
        success: true
      }
    }

    mediaRecorder.start()
    setTimeout(() => {
      mediaRecorder.stop()
      stream.getTracks().forEach(track => track.stop())
      testing.value = false
    }, 1000)
  } catch (err: any) {
    recorderTest.value = { result: `❌ Error: ${err.message}`, success: false }
    testing.value = false
  }
}
</script>
