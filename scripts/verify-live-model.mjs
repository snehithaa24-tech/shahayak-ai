#!/usr/bin/env node

/**
 * SAHAYAK AI - Gemini Live Model Handshake and Verification Tool
 *
 * Verifies Live bidirectional audio connectivity, ephemeral token generation,
 * and audio response exchange using official @google/genai SDK.
 */

import { GoogleGenAI, Modality } from '@google/genai';
import { WebSocket } from 'ws';
import fs from 'fs';

// Automatically load .env.local if present
if (fs.existsSync('.env.local') && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env.local');
  } catch (err) {
    console.warn('Notice: Could not load .env.local via process.loadEnvFile:', err.message);
  }
}

async function main() {
  console.log('--------------------------------------------------');
  console.log('SAHAYAK AI: Gemini Live Model & Audio Verification');
  console.log('--------------------------------------------------\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ BLOCKED: GEMINI_API_KEY is not set in the environment.');
    console.error('To run live audio handshake:');
    console.error('1. Get a key from Google AI Studio: https://aistudio.google.com/apikey');
    console.error('2. Add to .env.local: GEMINI_API_KEY=AIzaSy...');
    console.error('3. Run: npm run verify-model\n');
    process.exit(1);
  }

  const model = process.env.GEMINI_LIVE_MODEL || 'gemini-2.0-flash-exp';
  console.log(`Testing Gemini Live model: ${model}`);

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: 'v1alpha' },
  });

  const now = Date.now();
  const expireTime = new Date(now + 10 * 60 * 1000).toISOString();
  const newSessionExpireTime = new Date(now + 60 * 1000).toISOString();

  console.log('1. Creating short-lived ephemeral token via ai.authTokens.create()...');
  let tokenResponse;
  try {
    tokenResponse = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model,
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: {
              parts: [{ text: 'You are Sahayak. Say a brief, friendly one-sentence greeting in Hindi and English.' }],
            },
          },
        },
      },
    });
    console.log(`✔ Ephemeral token created successfully: ${tokenResponse.name.substring(0, 20)}...`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
      console.error('❌ BLOCKED: Gemini Live quota exhausted on this project. Halting retries.');
    } else {
      console.error(`❌ Failed to create ephemeral token for model "${model}":`, msg);
    }
    process.exit(1);
  }

  console.log('2. Opening constrained WebSocket connection to Gemini Live...');
  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(tokenResponse.name)}`;

  const ws = new WebSocket(wsUrl);

  const timeoutTimer = setTimeout(() => {
    console.error('❌ TIMEOUT: Gemini Live connection timed out after 15 seconds.');
    ws.terminate();
    process.exit(1);
  }, 15000);

  let audioBytesReceived = 0;
  let textReceived = '';

  ws.on('open', () => {
    console.log('✔ WebSocket handshake established.');
    const modelName = model.startsWith('models/') ? model : `models/${model}`;
    console.log(`3. Sending setup frame for model: ${modelName}...`);

    ws.send(
      JSON.stringify({
        setup: {
          model: modelName,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Aoede',
                },
              },
            },
          },
        },
      })
    );
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.setupComplete) {
        console.log('✔ Gemini Live setup acknowledged by server!');
        console.log('4. Sending test text turn to trigger audio response...');
        ws.send(
          JSON.stringify({
            clientContent: {
              turns: [
                {
                  role: 'user',
                  parts: [{ text: 'नमस्ते सहायक, क्या आप मुझे सुन सकते हैं?' }],
                },
              ],
              turnComplete: true,
            },
          })
        );
        return;
      }

      if (msg.serverContent) {
        if (msg.serverContent.modelTurn && Array.isArray(msg.serverContent.modelTurn.parts)) {
          for (const part of msg.serverContent.modelTurn.parts) {
            if (part.inlineData && part.inlineData.data) {
              const buf = Buffer.from(part.inlineData.data, 'base64');
              audioBytesReceived += buf.length;
            }
            if (part.text) {
              textReceived += part.text;
            }
          }
        }

        if (msg.serverContent.turnComplete) {
          clearTimeout(timeoutTimer);
          console.log(`✔ Turn complete! Audio bytes received: ${audioBytesReceived} bytes (24kHz 16-bit PCM).`);
          if (textReceived) {
            console.log(`✔ Transcript received: "${textReceived.trim()}"`);
          }
          console.log('\n==================================================');
          console.log(`PASSED: Model "${model}" is fully operational for Live voice!`);
          console.log('==================================================\n');
          ws.close(1000, 'Handshake complete');
          process.exit(0);
        }
      }
    } catch (parseErr) {
      console.warn('Message parsing error:', parseErr);
    }
  });

  ws.on('error', (err) => {
    clearTimeout(timeoutTimer);
    console.error('❌ WebSocket error during handshake:', err.message);
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
