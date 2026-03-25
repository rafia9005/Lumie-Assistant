import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import { systemPrompt } from '../../../context/character';

const DATA_DIR = path.join(process.cwd(), 'store', 'sessions');

async function ensureDataDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
}

function chatFilePath(sessionId: string) {
    const id = sessionId.replace(/[^a-zA-Z0-9-_]/g, '_') || 'global';
    return path.join(DATA_DIR, `${id}.json`);
}

async function loadChat(sessionId: string) {
    await ensureDataDir();
    const file = chatFilePath(sessionId);
    try {
        const raw = await fs.readFile(file, 'utf8');
        return JSON.parse(raw) as Array<{ role: string; text: string }>;
    } catch {
        return [];
    }
}

async function saveChat(sessionId: string, messages: Array<{ role: string; text: string }>) {
    await ensureDataDir();
    const file = chatFilePath(sessionId);
    await fs.writeFile(file, JSON.stringify(messages, null, 2), 'utf8');
}

async function appendMessage(sessionId: string, message: { role: string; text: string }) {
    const msgs = await loadChat(sessionId);
    msgs.push(message);
    await saveChat(sessionId, msgs);
}

export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const body = await readBody(event);

    const { sessionId = 'global', input,  model = 'gemini-2.5-flash' } = body || {};

    if (!input || typeof input !== 'string') {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing or invalid `input` in request body'
        });
    }

    if (!config.geminiToken) {
        throw createError({
            statusCode: 500,
            statusMessage: 'GEMINI_API_KEY not configured'
        });
    }

    const ai = new GoogleGenAI({ apiKey: config.geminiToken });

     const history = await loadChat(sessionId);
     const contents: any[] = [];
     const userMessage = input;

     for (const m of history) {
         const role = m.role === 'assistant' ? 'model' : 'user';
         contents.push({ role, parts: [{ text: m.text }] });
     }

     contents.push({ role: 'user', parts: [{ text: userMessage }] });
     await appendMessage(sessionId, { role: 'user', text: input });

    try {
        const modelConfig = { thinkingConfig: { thinkingBudget: -1 }, systemInstruction: {
            text: systemPrompt,
        } };
        let assistantText = '';

        const response = await ai.models.generateContentStream({
            model,
            config: modelConfig,
            contents
        });

        for await (const chunkRaw of response) {
            const chunk: any = chunkRaw;
            const text = (chunk?.text) || (chunk?.candidates?.[0]?.content?.[0]?.text) || '';
            if (text) {
                assistantText += text;
            }
        }

        if (assistantText) {
            await appendMessage(sessionId, { role: 'assistant', text: assistantText });
        }

        setHeader(event, 'Content-Type', 'application/json');
        return {
            ok: true,
            sessionId,
            text: assistantText,
            history: await loadChat(sessionId)
        };
    } catch (err: any) {
        const msg = err?.message || String(err);
        throw createError({
            statusCode: 500,
            statusMessage: `Gemini error: ${msg}`
        });
    }
});
