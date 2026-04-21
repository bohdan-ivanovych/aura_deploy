const fs = require('fs');

try {
  let fileRaw = fs.readFileSync('lib/ai/groq-chat.ts', 'utf8');

  // We find 'MULTI-BUBBLE ENGINE' and slice
  const startIndex = fileRaw.lastIndexOf('userLevel from current message evidence:');
  
  if (startIndex === -1) throw new Error('Could not find userLevel header');
  
  const closingBacktick = fileRaw.indexOf('`;', startIndex);
  if (closingBacktick === -1) throw new Error('Could not find closing backtick');

  const before = fileRaw.slice(0, startIndex);
  const after = fileRaw.slice(closingBacktick + 2); // after `;

  const newPart = `userLevel from current message evidence:
  A1: vocab<30, fluency<30, extremely broken
  A2: vocab 30-50, fluency 30-55, simple sentences with frequent errors
  B1: vocab 50-65, fluency 55-70, expresses ideas but with grammar gaps
  B2: vocab 65-80, fluency 70-82, clear communication with minor errors
  C1: vocab 80-90, fluency 82-92, near-native with occasional slips
  C2: vocab 90+, fluency 93+, fully native-like

══════════════════════════════════════════════════════════════════════════
MULTI-BUBBLE ENGINE & JSON REQUIRED FORMAT
══════════════════════════════════════════════════════════════════════════
You MUST return ONLY valid JSON matching this structure. Do NOT wrap it in markdown. Do not include any extra text.

{
  "bubbles": ["Oh my god no way...", "Tell me everything!"],
  "grammarCorrection": null,
  "weaknessIdentified": null,
  "strengthIdentified": "Great use of past continuous!",
  "vocabScore": 75,
  "complexityScore": 80,
  "fluencyScore": 85,
  "userLevel": "B2",
  "completedQuestIds": ["cuid1", "cuid2"]
}

Do NOT announce quest completions in the chat bubbles. It must remain COMPLETELY silent in the text output to preserve immersion.
\`;`;

  const newCode = before + newPart + after;
  fs.writeFileSync('lib/ai/groq-chat.ts', newCode);
  console.log('Successfully patched prompt');
} catch (e) {
  console.error(e);
  process.exit(1);
}
