# Lumie Assistant 🎤

A modern AI voice chat application with real-time speech recognition, intelligent responses, and expressive character animations.

https://github.com/user-attachments/assets/1e8f0c0f-c136-4789-994f-d17032c8fe5e

## Features

### Voice Chat
- **Auto-Stop Recording**: Automatic silence detection (1.2s of quiet) triggers voice sending
- **Whisper v3 Transcription**: State-of-the-art speech-to-text via Cloudflare Workers
- **Gemini AI Responses**: Intelligent, context-aware conversation
- **ElevenLabs TTS**: Natural-sounding speech synthesis with multiple voices

### UI/UX
- **Modern Minimalist Design**: Clean white/black/neutral palette with glassmorphism effects
- **Smooth Animations**: Character animation during speech, floating elements, pulse effects
- **Responsive Layout**: Optimized for mobile, tablet, and desktop devices
- **Real-time Feedback**: Visual indicators for recording, processing, and speaking states

### Architecture
- **Nuxt 4**: Modern Vue 3 framework with auto-routing and API layer
- **TypeScript**: Type-safe development across frontend and backend
- **Composables**: Reusable voice and chat logic (`useMediaRecorderVoice`, `useChatToSpeech`)
- **Web Audio API**: Real-time volume monitoring for silence detection

## Quick Start

### Prerequisites
- Node.js 18+ and npm (or your preferred package manager)
- API Keys:
  - Cloudflare Workers token (for Whisper access)
  - Google Gemini API key (for chat responses)
  - ElevenLabs API key (for text-to-speech)

### Installation

```bash
npm install
```

### Configuration

Create a `.env` file in the root directory with your API credentials:

```env
WORKER_TOKEN=your_cloudflare_worker_token
OPENAI_WHISPER_ENDPOINT=https://your-cloudflare-worker.workers.dev/whisper
AURA_2_ENDPOINT=https://your-cloudflare-worker.workers.dev/aura2
GEMINI_API_KEY=your_gemini_api_key
```

See `.env.example` for reference.

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note**: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R) may be needed after code updates due to Nuxt's client bundling caching.

### Production Build

```bash
npm run build
npm run preview
```

## How It Works

### Voice Pipeline

1. **Recording**: Tap the microphone button to start recording
2. **Silence Detection**: 
   - Monitors audio volume in real-time using Web Audio API's AnalyserNode
   - SILENCE_THRESHOLD = 0.015 (RMS volume)
   - SILENCE_DURATION_MS = 1200 (1.2 seconds)
   - Auto-stops recording when silence detected
3. **Transcription**: Audio sent to Whisper v3 for speech-to-text conversion
4. **Chat**: Transcribed text sent to Gemini AI for intelligent response
5. **Speech Synthesis**: AI response converted to speech via ElevenLabs
6. **Animation**: Character animates while speaking the response

### Key Files

#### Composables (Voice Logic)
- **`composables/useMediaRecorderVoice.ts`**: 
  - `recordUntilSilence()`: Records audio with automatic silence detection
  - `recordUntilSilenceAndTranscribe()`: Full recording + transcription pipeline
  - `transcribeAudio()`: Sends audio to Whisper endpoint

- **`composables/useChatToSpeech.ts`**:
  - `sendChatMessage()`: Sends text to Gemini API
  - `generateSpeech()`: Converts response text to audio
  - `playAudio()`: Manages audio playback with character animation

#### Pages & Components
- **`app/pages/index.vue`**: Main chat interface with modern UI
  - Character display panel
  - Message history with auto-scroll
  - Microphone button with visual feedback
  - Responsive mobile/desktop layout

#### API Routes
- **`server/api/v1/transcribe.ts`**: Whisper transcription endpoint
- **`server/api/v1/chat.ts`**: Gemini chat endpoint
- **`server/api/v1/speaker.ts`**: ElevenLabs TTS endpoint

#### Character & Configuration
- **`context/character.ts`**: System prompt for Yuzu character personality
- **`nuxt.config.ts`**: Nuxt configuration with runtime environment variables
- **`types/`**: TypeScript interfaces for Chat and Speaker types

## Cloudflare Workers Deployment

The application uses Cloudflare Workers to proxy AI model calls for Whisper (STT) and Aura-2 (TTS).

### Quick Setup

1. **Install Wrangler CLI**:
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. **Deploy Workers**:
   ```bash
   cd cloudflare/workers
   npm install
   wrangler deploy
   ```

3. **Set API Key Secret**:
   ```bash
   wrangler secret put API_KEY
   # Paste your secure bearer token
   ```

4. **Update `.env`** with worker URLs:
   ```env
   WORKER_TOKEN=your_bearer_token
   OPENAI_WHISPER_ENDPOINT=https://lumie-workers.YOUR_ACCOUNT.workers.dev
   AURA_2_ENDPOINT=https://lumie-workers.YOUR_ACCOUNT.workers.dev/aura2
   ```

### Detailed Guide

See `cloudflare/workers/DEPLOYMENT.md` for comprehensive deployment instructions including:
- Environment configuration
- Secret management
- Environment-specific deployments (dev, staging, production)
- Worker endpoints and parameters
- Troubleshooting and best practices

### Worker Endpoints

**Whisper (STT)**:
```bash
POST https://your-worker.workers.dev/
Authorization: Bearer YOUR_API_KEY
Content-Type: multipart/form-data
Body: audio file
```

**Aura-2 (TTS)**:
```bash
POST https://your-worker.workers.dev/aura2
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
Body: { "text": "Hello world" }
```


## Development Tips

### Silence Detection Tuning
If auto-stop seems too sensitive or delayed:
- Increase `SILENCE_THRESHOLD` (0.015) for less sensitive detection
- Increase `SILENCE_DURATION_MS` (1200ms) for longer pauses

Adjust in `composables/useMediaRecorderVoice.ts` lines 108-109.

### Testing Voice Flow
1. Open browser DevTools (F12)
2. Check Console for error messages (only essential errors logged)
3. Hard refresh (Ctrl+Shift+R) if seeing stale code
4. Allow microphone access when prompted

### Character Customization
Edit `context/character.ts` to change Yuzu's personality and system prompt.

## Build & Deployment

### Local Production Build
```bash
npm run build
npm run preview
```

### Deploy to Production
```bash
npm run build
# Output: .output/ directory ready for deployment
```

The `.output/` directory contains:
- `.output/server/index.mjs`: Standalone server
- `.output/public/`: Static assets

Deploy to any Node.js hosting (Vercel, Netlify, Railway, etc.)

## Architecture Overview

```
Lumie Assistant
├── app/
│   ├── pages/index.vue        → Main UI
│   └── app.vue                → Root component
├── composables/
│   ├── useMediaRecorderVoice.ts → Voice recording + silence detection
│   └── useChatToSpeech.ts      → Chat API + TTS + playback
├── server/api/v1/
│   ├── transcribe.ts          → Whisper endpoint
│   ├── chat.ts                → Gemini endpoint
│   └── speaker.ts             → ElevenLabs endpoint
├── context/
│   └── character.ts           → Character system prompt
└── types/
    ├── chat.ts                → ChatMessage interface
    └── speaker.ts             → AuraInput interface
```

## Troubleshooting

### Microphone Not Working
- Check browser permissions (Settings > Privacy > Microphone)
- Ensure HTTPS in production (required for Web Audio API)
- Try a different browser if issue persists

### Transcription Fails
- Verify `WORKER_TOKEN` and `OPENAI_WHISPER_ENDPOINT` in `.env`
- Check Cloudflare Worker logs for errors
- Ensure audio file is valid WebM format

### No Chat Response
- Verify `GEMINI_API_KEY` is valid and has quota remaining
- Check `server/api/v1/chat.ts` logs for API errors
- Ensure transcription succeeded (check console)

### Audio Playback Issues
- Verify `AURA_2_ENDPOINT` and ElevenLabs API key
- Check browser autoplay policy (may require user interaction first)
- Try different browser if issue persists

## Contributing

Suggestions for improvements:
- Add conversation context/history
- Support multiple character personalities
- Implement voice selection UI
- Add conversation export/logging
- Real-time transcription display

## License

MIT

---

Built with ❤️ using Nuxt 4, Vue 3, and Web Audio API
