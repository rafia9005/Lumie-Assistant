# Cloudflare Workers Deployment Guide

This guide covers deploying the Lumie Assistant Cloudflare Workers (Whisper STT and Aura-2 TTS).

## Prerequisites

1. **Cloudflare Account**: Create one at https://dash.cloudflare.com
2. **Wrangler CLI**: Install with `npm install -g wrangler`
3. **Node.js**: Version 18 or higher
4. **Authentication**: Run `wrangler login` to authenticate with Cloudflare

## Project Structure

```
cloudflare/workers/
├── wrangler.toml           # Wrangler configuration
├── package.json            # NPM dependencies
├── .env.example            # Environment variables template
├── openai-whisper.js       # Whisper STT worker
└── aura-2.js              # Aura-2 TTS worker
```

## Setup Steps

### 1. Install Dependencies

```bash
cd cloudflare/workers
npm install
```

### 2. Get Your Cloudflare Account ID

1. Go to https://dash.cloudflare.com
2. Click on your profile icon → Account Settings
3. Copy your **Account ID** from the right sidebar
4. Update `wrangler.toml`:

```toml
account_id = "your_account_id_here"
```

### 3. Configure Routes (Optional)

If you want to expose workers on your domain:

1. Add your domain to Cloudflare (if not already added)
2. Get your **Zone ID**:
   - Go to https://dash.cloudflare.com/
   - Select your domain
   - Copy **Zone ID** from right sidebar
3. Update `wrangler.toml` routes:

```toml
routes = [
  { pattern = "api.yourdomain.com/whisper", zone_name = "yourdomain.com" },
  { pattern = "api.yourdomain.com/aura2", zone_name = "yourdomain.com" }
]
```

### 4. Set Secrets

Secure secrets should be set via `wrangler secret put` (not stored in files):

```bash
# Set API key for authorization
wrangler secret put API_KEY

# For production environment
wrangler secret put API_KEY --env production

# For staging environment
wrangler secret put API_KEY --env staging

# Optional: ElevenLabs API key (if using external API)
wrangler secret put ELEVENLABS_API_KEY
```

When prompted, paste your secure API key value.

**Important**: Never commit secrets to git. Use `.gitignore` to exclude `.env` files.

## Deployment

### Deploy to Development (Workers.dev)

```bash
cd cloudflare/workers
wrangler deploy
```

Your worker will be available at:
```
https://lumie-workers.YOUR_ACCOUNT.workers.dev
```

### Deploy to Staging

```bash
wrangler deploy --env staging
```

Worker URL:
```
https://lumie-workers-staging.YOUR_ACCOUNT.workers.dev
```

### Deploy to Production

```bash
wrangler deploy --env production
```

Worker URL (if routes configured):
```
https://api.yourdomain.com/whisper
https://api.yourdomain.com/aura2
```

## Worker Endpoints

### Whisper (Speech-to-Text)

**Endpoint**: `/whisper` or `https://your-worker.workers.dev/`

**Request**:
```bash
curl -X POST https://your-worker.workers.dev/ \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: multipart/form-data" \
  -F "audio=@recording.webm"
```

**Response**:
```json
{
  "success": true,
  "text": "Hello, how are you?",
  "language": "en",
  "duration": 2.5
}
```

### Aura-2 (Text-to-Speech)

**Endpoint**: `/aura2` or custom route

**Request**:
```bash
curl -X POST https://your-worker.workers.dev/aura2 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is Aura 2",
    "speaker": "alloy",
    "encoding": "mp3",
    "container": "mp3"
  }'
```

**Response**: Audio stream (audio/mpeg, audio/wav, audio/ogg, or audio/aac)

## Available Parameters

### Whisper Options
- `audio` (required): Audio file as multipart form data

### Aura-2 Options
- `text` (required): Text to convert to speech
- `speaker` (optional): Voice character (`alloy`, `aurora`, `bg`, `ember`, `nova`, `sage`, `shimmer`)
- `encoding` (optional): Audio encoding (`pcm`, `ulaw`, `aac`, `linear16`, default: `pcm`)
- `container` (optional): Audio container format (`raw`, `wav`, `ogg`, `mp3`)
- `sample_rate` (optional): Sample rate in Hz (8000-48000, default: 24000)
- `bit_rate` (optional): Bit rate (varies by format)

## Environment Management

### View Secrets

```bash
wrangler secret list
wrangler secret list --env production
```

### Delete Secrets

```bash
wrangler secret delete API_KEY
wrangler secret delete API_KEY --env production
```

### View Worker Logs

```bash
wrangler tail
wrangler tail --env production
```

Real-time log streaming from your deployed worker.

## Development & Testing

### Local Development

```bash
# Start local development server (port 8787)
wrangler dev

# With specific environment
wrangler dev --env staging

# With inspect mode (debugging)
wrangler dev --inspect
```

Test your worker at `http://localhost:8787`

### Test with cURL

```bash
# Transcribe audio
curl -X POST http://localhost:8787 \
  -H "Authorization: Bearer test_key" \
  -F "audio=@sample.webm"

# Generate speech
curl -X POST http://localhost:8787 \
  -H "Authorization: Bearer test_key" \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world"}' \
  --output output.mp3
```

## Troubleshooting

### Authorization Errors (401)

**Issue**: "Unauthorized" response

**Solution**:
1. Verify API key is set: `wrangler secret list`
2. Check header includes `Authorization: Bearer YOUR_API_KEY`
3. Ensure API key value is correct

### Worker Not Found

**Issue**: 404 error when accessing worker

**Solution**:
1. Verify deployment succeeded: `wrangler deployments list`
2. Check worker name in `wrangler.toml`
3. Ensure correct environment: `wrangler list --env production`

### Quota Exceeded

**Issue**: "Workers AI quota exceeded"

**Solution**:
1. Check usage at https://dash.cloudflare.com
2. Review Cloudflare Workers AI pricing
3. Consider increasing plan or implementing rate limiting

### Audio Processing Fails

**Issue**: Transcription or TTS returns empty response

**Solution**:
1. Verify audio file format (must be valid audio)
2. Check file size (max ~25MB for Whisper)
3. Review worker logs: `wrangler tail`

## Best Practices

1. **Security**:
   - Always use `wrangler secret put` for sensitive data
   - Use Bearer token authentication
   - Implement rate limiting in production

2. **Performance**:
   - Cache transcription results when possible
   - Monitor worker costs
   - Consider edge location for faster responses

3. **Monitoring**:
   - Enable real-time logs: `wrangler tail`
   - Set up error alerting
   - Monitor API quota usage

4. **Cost Optimization**:
   - Workers AI usage: ~$0.11 per 1000 requests (Whisper)
   - Free tier: 100k requests/month
   - Paid tier: $5/month + usage

## Integration with Lumie Assistant

Once deployed, update your `.env` in the main project:

```env
WORKER_TOKEN=your_bearer_token
OPENAI_WHISPER_ENDPOINT=https://your-worker.workers.dev
AURA_2_ENDPOINT=https://your-worker.workers.dev/aura2
```

## References

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [Workers AI Models](https://developers.cloudflare.com/workers-ai/models/)
- [Whisper Model](https://developers.cloudflare.com/workers-ai/models/whisper/)
- [Aura-2 Model](https://developers.cloudflare.com/workers-ai/models/aura-2/)

---

For issues or questions, refer to:
- https://community.cloudflare.com/
- https://discord.com/invite/cloudflaredev
