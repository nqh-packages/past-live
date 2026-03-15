/**
 * @what - Benchmark scene image generation: 5 prompts x 5 scenes = 25 calls
 * @why - Find the fastest prompt that still produces good era-appropriate images
 * @usage - npx tsx src/scene-image-benchmark.ts
 */

import { GoogleGenAI } from '@google/genai';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IMAGE_MODEL } from './image-gen.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '../../docs/call-logs/benchmark');
mkdirSync(OUTPUT_DIR, { recursive: true });

const ai = new GoogleGenAI({
  apiKey: process.env['GEMINI_API_KEY'] ?? '',
  httpOptions: { apiVersion: 'v1alpha' },
});

const MODEL = IMAGE_MODEL;

// ─── 5 Scenes (realistic show_scene descriptions from Gemini Live) ───────────

const SCENES: { character: string; description: string }[] = [
  {
    character: 'Constantine XI, Constantinople 1453',
    description: 'Constantinople, 1453. Massive Ottoman warships being dragged over greased logs across the hills of Galata to bypass the great chain blocking the Golden Horn. Hundreds of soldiers heaving ropes under torchlight. The harbor chain glints in the distance.',
  },
  {
    character: 'Murasaki Shikibu, Heian Japan 1008',
    description: 'Heian Period, 1008. A chaotic scene of richly dressed Japanese court ladies and nobles frantically dragging large wooden boats over muddy, forested hills during a desperate, disorganized retreat. The mood is one of surreal panic and absurdity.',
  },
  {
    character: 'Gene Kranz, Houston 1969',
    description: 'NASA Mission Control, Houston, July 1969. Rows of men in white shirts and ties hunched over green-glowing consoles. Cigarette smoke hangs in the air. A giant screen at the front shows the lunar module altitude dropping. Tension fills the room.',
  },
  {
    character: 'Leonardo da Vinci, Florence 1502',
    description: 'Florence, 1502. Leonardo da Vinci standing on the banks of the Arno River, studying an enormous half-built dam. Workers swarm wooden scaffolding. Maps and engineering sketches are pinned to a makeshift table. The river rages below.',
  },
  {
    character: 'Cleopatra, Alexandria 48 BC',
    description: 'Alexandria, 48 BC. The great library at night, scrolls stacked floor to ceiling. Oil lamps cast golden light across marble floors. A young woman in Egyptian royal dress studies a naval map spread across a stone table. The harbor is visible through tall windows.',
  },
];

// ─── 5 Prompt Strategies ─────────────────────────────────────────────────────

const PROMPTS: { name: string; build: (desc: string) => string }[] = [
  {
    name: 'P1_current_long',
    build: (desc) =>
      `Create a historically accurate illustration in the art style OF THE ERA being depicted. If ancient China, use ink wash painting style. If medieval Europe, use illuminated manuscript style. If ancient Egypt, use Egyptian wall painting style. If Renaissance, use oil painting style. The art style MUST match the historical period shown. Wide shot, dramatic lighting. No text overlays. No modern art styles.\n\nScene: ${desc}`,
  },
  {
    name: 'P2_minimal',
    build: (desc) =>
      `Historical illustration. Era-appropriate art style. Wide shot, dramatic lighting. No text.\n\n${desc}`,
  },
  {
    name: 'P3_just_description',
    build: (desc) => desc,
  },
  {
    name: 'P4_paint_prefix',
    build: (desc) =>
      `Paint this scene:\n\n${desc}`,
  },
  {
    name: 'P5_generate_image',
    build: (desc) =>
      `Generate an image: ${desc}`,
  },
];

// ─── Runner ──────────────────────────────────────────────────────────────────

interface Result {
  prompt: string;
  scene: string;
  durationMs: number;
  hasImage: boolean;
  error?: string;
}

async function runOne(promptName: string, promptText: string, sceneName: string): Promise<Result> {
  const start = Date.now();
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      config: { responseModalities: ['image', 'text'] },
    });

    const durationMs = Date.now() - start;
    const parts = response.candidates?.[0]?.content?.parts;
    let hasImage = false;

    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          hasImage = true;
          const filename = `${promptName}__${sceneName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}.png`;
          writeFileSync(join(OUTPUT_DIR, filename), Buffer.from(part.inlineData.data, 'base64'));
        }
      }
    }

    return { prompt: promptName, scene: sceneName, durationMs, hasImage };
  } catch (err) {
    return {
      prompt: promptName,
      scene: sceneName,
      durationMs: Date.now() - start,
      hasImage: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  console.log(`\n🎨 Scene Image Benchmark: ${MODEL}`);
  console.log(`   ${PROMPTS.length} prompts × ${SCENES.length} scenes = ${PROMPTS.length * SCENES.length} calls\n`);

  const results: Result[] = [];

  for (const prompt of PROMPTS) {
    console.log(`\n── ${prompt.name} ──`);
    for (const scene of SCENES) {
      const shortScene = scene.character.slice(0, 30);
      process.stdout.write(`  ${shortScene}... `);
      const result = await runOne(prompt.name, prompt.build(scene.description), scene.character);
      results.push(result);
      const status = result.hasImage ? '✓' : result.error ? '✗' : '—';
      console.log(`${status} ${(result.durationMs / 1000).toFixed(1)}s`);
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  console.log('\n\n═══ RESULTS ═══\n');
  console.log('| Prompt | Avg (s) | Min (s) | Max (s) | Success |');
  console.log('|--------|---------|---------|---------|---------|');

  for (const prompt of PROMPTS) {
    const mine = results.filter((r) => r.prompt === prompt.name);
    const successful = mine.filter((r) => r.hasImage);
    const durations = successful.map((r) => r.durationMs / 1000);
    const avg = durations.length ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1) : 'N/A';
    const min = durations.length ? Math.min(...durations).toFixed(1) : 'N/A';
    const max = durations.length ? Math.max(...durations).toFixed(1) : 'N/A';
    console.log(`| ${prompt.name} | ${avg} | ${min} | ${max} | ${successful.length}/${mine.length} |`);
  }

  // Save full results
  const reportPath = join(OUTPUT_DIR, 'benchmark-results.json');
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nFull results: ${reportPath}`);
  console.log(`Images saved: ${OUTPUT_DIR}/`);
}

main().catch(console.error);
