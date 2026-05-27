/**
 * Enhanced AI response parser with robust JSON extraction and error handling
 */

// Standardized error class
export class AIParseError extends Error {
  constructor(message: string, public readonly rawResponse?: string) {
    super(message);
    this.name = 'AI_PARSE_FAILED';
  }
}

/**
 * Robustly parses AI-generated JSON strings with regex extraction and comma fixing
 */
export function parseAIReply<T = any>(raw: string): T {
  if (!raw || typeof raw !== 'string') {
    throw new AIParseError('AI response was empty or invalid', raw);
  }

  // Use regex to extract ONLY the JSON portion (objects or arrays)
  const jsonMatch = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  
  if (!jsonMatch) {
    throw new AIParseError('No valid JSON found in AI response', raw);
  }

  let extractedJson = jsonMatch[0];

  // Fix common trailing comma errors BEFORE parsing
  extractedJson = extractedJson.replace(/,\s*([\]}])/g, '$1');

  try {
    return JSON.parse(extractedJson) as T;
  } catch (error) {
    console.error('JSON parsing failed after extraction and cleaning:', error);
    console.error('Extracted JSON:', extractedJson);
    
    throw new AIParseError('Failed to parse extracted JSON', raw);
  }
}

/**
 * Validates AI response structure and required fields
 */
export function validateAIResponse(response: any): any {
  if (!response || typeof response !== 'object') {
    throw new AIParseError('Invalid AI response structure');
  }

  // Handle multiple bubbles natively
  let replyText = response.reply || response.response || null;
  if (Array.isArray(response.bubbles) && response.bubbles.length > 0) {
    replyText = response.bubbles.join('\n\n');
  }

  // Nullify grammar corrections that are just "no error" messages
  let grammar = response.grammarCorrection || null;
  
  // Handle case where AI returns grammarCorrection as an object (e.g., {"correction text": ""})
  if (typeof grammar === 'object' && grammar !== null) {
    const keys = Object.keys(grammar);
    if (keys.length > 0) {
      grammar = keys[0]; // Extract the correction text from the object key
    } else {
      grammar = null;
    }
  }
  
  if (typeof grammar === 'string') {
    grammar = grammar.trim();
    while (/\s*\[[^\]]*\]\s*$/.test(grammar)) {
      grammar = grammar.replace(/\s*\[[^\]]*\]\s*$/, '').trim();
    }
    const lower = grammar.toLowerCase();
    if (lower.startsWith('none') || lower.startsWith('no error') || lower.startsWith('no grammar') || lower.startsWith('no correction')) {
      grammar = null;
    }
  }

  const validated = {
    reply: replyText || 'No response provided',
    replyToUserMsg: Boolean(response.replyToUserMsg),
    grammarCorrection: grammar,
    weaknessIdentified: response.weaknessIdentified || null,
    strengthIdentified: response.strengthIdentified || null,
    xpReward: 0, // computed later in route.ts
    vocabularyNote: response.vocabularyNote || null,
    vibeNote: response.vibeNote || null,
    levelAdjustment: Number(response.levelAdjustment) || 0,
    errorSpan: response.errorSpan || null,
    vocabScore: response.vocabScore ?? null,
    complexityScore: response.complexityScore ?? null,
    fluencyScore: response.fluencyScore ?? null,
    userLevel: response.userLevel || null,
    skillUpdates: response.skillUpdates || null,
    suggestion: response.suggestion || null,
    completedQuestIds: Array.isArray(response.completedQuestIds) ? response.completedQuestIds : [],
    questUpdates: response.questUpdates || null,
    grammarScore: typeof response.grammarScore === 'number' ? response.grammarScore : null,
    accuracyScore: typeof response.accuracyScore === 'number' ? response.accuracyScore : null,
  };

  // Validate reply field
  if (!validated.reply || typeof validated.reply !== 'string') {
    throw new AIParseError('AI response missing valid reply field');
  }

  // Clean up the reply
  validated.reply = validated.reply
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();

  if (!validated.reply) {
    throw new AIParseError('AI response reply is empty after cleaning');
  }

  return validated;
}

/**
 * Enhanced AI response parser with validation and fallback
 */
export function parseAndValidateAIReply(raw: string): any {
  try {
    const parsed = parseAIReply<any>(raw);
    return validateAIResponse(parsed);
  } catch (error) {
    console.error('AI response parsing and validation failed:', error);
    
    // Return a safe fallback response
    return {
      reply: 'I apologize, but I had trouble processing my response. Please try again.',
      grammarCorrection: null,
      weaknessIdentified: null,
      strengthIdentified: null,
      xpReward: 1,
      vocabularyNote: null,
      vibeNote: null,
      levelAdjustment: 0,
      errorSpan: null,
      vocabScore: null,
      complexityScore: null,
      fluencyScore: null,
      userLevel: null,
    };
  }
}
