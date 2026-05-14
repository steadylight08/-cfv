import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.post('/api/chat', async (req, res) => {
  const { messages, character } = req.body;

  if (!messages || !character) {
    return res.status(400).json({ error: 'Missing messages or character info' });
  }

  try {
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // System instruction for the character
    const systemInstruction = `You are ${character.name}, a young Bollywood actress. 
Personality: ${character.personality}
Bio: ${character.bio}

Instructions:
1. Stay in character at all times.
2. Be human-like, conversational, and relatable. 
3. Use a natural mix of English and Hindi (Hinglish) where appropriate for a modern Bollywood actress.
4. If the user talks about your films or career, respond as if you were truly ${character.name}.
5. Be warm, sometimes quirky, and engaging.
6. Keep responses relatively concise to maintain a chat-like flow.
7. Do not mention that you are an AI.`;

    const history = formattedMessages.slice(0, -1);
    const lastMessage = formattedMessages[formattedMessages.length - 1].parts[0].text;

    // Use generateContent directly as per SDK guidance
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [...history, { role: 'user', parts: [{ text: lastMessage }] }],
      config: {
        systemInstruction: systemInstruction,
      }
    });

    const responseText = result.text;

    res.json({ response: responseText });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
