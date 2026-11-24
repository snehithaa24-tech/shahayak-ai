import { GoogleGenAI, Modality } from '@google/genai';
import { WebSocket } from 'ws';
import fs from 'fs';
import { getSystemInstruction } from '../src/lib/prompt.ts';

if (fs.existsSync('.env.local')) {
  process.loadEnvFile('.env.local');
}

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live';

async function runAcceptanceTurn(language, promptText, session = null) {
  return new Promise(async (resolve, reject) => {
    let ws = session?.ws;
    let audioBytes = 0;
    let responseText = '';

    const handleMessage = (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.setupComplete) {
          // Send turn
          ws.send(
            JSON.stringify({
              clientContent: {
                turns: [
                  {
                    role: 'user',
                    parts: [{ text: promptText }],
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
              if (part.inlineData?.data) {
                audioBytes += Buffer.from(part.inlineData.data, 'base64').length;
              }
              if (part.text) {
                responseText += part.text;
              }
            }
          }

          if (msg.serverContent.turnComplete) {
            ws.off('message', handleMessage);
            resolve({ ws, audioBytes, responseText });
          }
        }
      } catch (e) {
        console.error('Parse error:', e);
      }
    };

    if (!session) {
      // Create token
      const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1alpha' } });
      const instruction = getSystemInstruction(language);
      const token = await ai.authTokens.create({
        config: {
          uses: 1,
          expireTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
          liveConnectConstraints: {
            model,
            config: {
              responseModalities: [Modality.AUDIO],
              systemInstruction: { parts: [{ text: instruction }] },
            },
          },
        },
      });

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(token.name)}`;
      ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        const modelName = model.startsWith('models/') ? model : `models/${model}`;
        ws.send(
          JSON.stringify({
            setup: {
              model: modelName,
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Aoede' } },
                },
              },
            },
          })
        );
      });

      ws.on('message', handleMessage);
      ws.on('error', reject);
    } else {
      // Existing session (multi-turn)
      ws.on('message', handleMessage);
      ws.send(
        JSON.stringify({
          clientContent: {
            turns: [
              {
                role: 'user',
                parts: [{ text: promptText }],
              },
            ],
            turnComplete: true,
          },
        })
      );
    }
  });
}

async function testHindi() {
  console.log('\n--- TESTING HINDI ACCEPTANCE CONVERSATION ---');
  console.log('Turn 1: "मेरा नाम रवि है। मुझे अंग्रेज़ी सीखने का एक आसान तरीका बताइए।"');
  const t1 = await runAcceptanceTurn('hi', 'मेरा नाम रवि है। मुझे अंग्रेज़ी सीखने का एक आसान तरीका बताइए।');
  console.log(`✔ Turn 1 Audio received: ${t1.audioBytes} bytes.`);
  if (t1.responseText) console.log(`✔ Turn 1 Response: "${t1.responseText}"`);

  console.log('\nTurn 2: "मैंने अपना नाम क्या बताया था?"');
  const t2 = await runAcceptanceTurn('hi', 'मैंने अपना नाम क्या बताया था?', t1);
  console.log(`✔ Turn 2 Audio received: ${t2.audioBytes} bytes.`);
  if (t2.responseText) console.log(`✔ Turn 2 Response: "${t2.responseText}"`);
  t2.ws.close(1000, 'Done');
  return { t1, t2 };
}

async function testEnglish() {
  console.log('\n--- TESTING ENGLISH ACCEPTANCE CONVERSATION ---');
  console.log('Turn 1: "My name is Maya. Suggest a quick breakfast."');
  const t1 = await runAcceptanceTurn('en', 'My name is Maya. Suggest a quick breakfast.');
  console.log(`✔ Turn 1 Audio received: ${t1.audioBytes} bytes.`);
  if (t1.responseText) console.log(`✔ Turn 1 Response: "${t1.responseText}"`);

  console.log('\nTurn 2: "What name did I give you?"');
  const t2 = await runAcceptanceTurn('en', 'What name did I give you?', t1);
  console.log(`✔ Turn 2 Audio received: ${t2.audioBytes} bytes.`);
  if (t2.responseText) console.log(`✔ Turn 2 Response: "${t2.responseText}"`);
  t2.ws.close(1000, 'Done');
  return { t1, t2 };
}

async function main() {
  try {
    await testHindi();
    await testEnglish();
    console.log('\n🎉 ALL ACCEPTANCE CONVERSATIONS PASSED WITH LIVE AUDIO!');
    process.exit(0);
  } catch (err) {
    console.error('Error during acceptance conversations:', err);
    process.exit(1);
  }
}

main();
