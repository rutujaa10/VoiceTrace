/**
 * AI Entity Extraction Service
 *
 * Uses an LLM (GPT-4o-mini) to extract structured business data from
 * transcribed vendor speech. Also detects "Missed Profit" phrases.
 *
 * Input: raw transcript (Hindi/English/Hinglish)
 * Output: { items[], expenses[], missedProfits[], model, tokensUsed }
 */

const OpenAI = require('openai');
const { env } = require('../config/env');

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

/**
 * System prompt for the LLM to extract entities.
 */
const buildSystemPrompt = (businessCategory, language) => {
  return `You are a financial data extraction AI for Indian street vendors.
Your job is to parse a vendor's spoken transcript (in Hindi, English, or Hinglish) and extract STRICTLY structured JSON.

VENDOR CONTEXT:
- Business category: ${businessCategory}
- Language: ${language}

EXTRACTION RULES:
1. ITEMS SOLD — Extract each item with name, quantity, unit price, total price.
   - If vendor says "50 samose 10 rupaye mein", that means 50 units at ₹10 each = ₹500 total.
   - If vendor says "chai bechke 500 rupaye aaye", that means total from chai = ₹500 (estimate quantity/price).
   - If a range is given ("30-35 rupaye"), pick the midpoint and set confidence to 0.6.
   - Normalize item names to simple lowercase Hindi/English (e.g., "samosa", "chai", "vada_pav").

2. EXPENSES — Extract any purchases, costs, rent, or transport mentioned.
   - Categorize as: raw_material, transport, rent, equipment, labor, packaging, other.
   - "200 rupaye ka tel" = raw_material, ₹200, description: "cooking oil"

3. MISSED PROFITS — Detect phrases indicating items that ran out or couldn't be sold:
   - Hindi triggers: "khatam ho gaya", "khatam ho gaye", "nahi bach paya", "aur bik sakte the", 
     "jaldi khatam", "stock khatam", "zyada la sakte the", "demand thi par nahi tha",
     "log maang rahe the", "shortage"
   - English triggers: "ran out", "sold out", "could have sold more", "out of stock", 
     "people were asking", "shortage"
   - For each missed profit: estimate the lost revenue based on the item's selling price and
     a reasonable estimate of additional units that could have been sold (10-30 units).
   - Include the trigger phrase that matched.

4. CONFIDENCE SCORING:
   - 1.0 = vendor stated exact numbers clearly
   - 0.8 = reasonable inference from context
   - 0.6 = approximate/range values
   - 0.4 = educated guess

RESPOND WITH ONLY THIS JSON STRUCTURE (no markdown, no explanation):
{
  "items": [
    { "name": "string", "quantity": number, "unitPrice": number, "totalPrice": number, "confidence": number }
  ],
  "expenses": [
    { "category": "string", "amount": number, "description": "string", "confidence": number }
  ],
  "missedProfits": [
    { "item": "string", "estimatedLoss": number, "triggerPhrase": "string", "confidence": number }
  ]
}

If no items/expenses/missed profits are detected, return empty arrays.
CRITICAL: Return ONLY valid JSON. No markdown fences, no extra text.`;
};

/**
 * Extract structured entities from a transcript.
 */
const extractEntities = async (transcript, businessCategory = 'general', language = 'hi') => {
  if (!openai) {
    console.warn('[Extraction] OpenAI not configured. Returning mock extraction.');
    return getMockExtraction(transcript);
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: buildSystemPrompt(businessCategory, language),
        },
        {
          role: 'user',
          content: `TRANSCRIPT:\n"${transcript}"`,
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);

    // Validate & sanitize
    const result = {
      items: (parsed.items || []).map(sanitizeItem),
      expenses: (parsed.expenses || []).map(sanitizeExpense),
      missedProfits: (parsed.missedProfits || []).map(sanitizeMissedProfit),
      model: 'gpt-4o-mini',
      tokensUsed: response.usage?.total_tokens || 0,
    };

    return result;
  } catch (error) {
    console.error('[Extraction] LLM extraction error:', error.message);
    throw new Error(`Entity extraction failed: ${error.message}`);
  }
};

// ---- Sanitizers ----

const sanitizeItem = (item) => ({
  name: String(item.name || 'unknown').toLowerCase().trim(),
  quantity: Math.max(0, Number(item.quantity) || 1),
  unitPrice: Math.max(0, Number(item.unitPrice) || 0),
  totalPrice: Math.max(0, Number(item.totalPrice) || 0),
  confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0.8)),
});

const sanitizeExpense = (exp) => ({
  category: ['raw_material', 'transport', 'rent', 'equipment', 'labor', 'packaging', 'other']
    .includes(exp.category) ? exp.category : 'other',
  amount: Math.max(0, Number(exp.amount) || 0),
  description: String(exp.description || '').trim(),
  confidence: Math.min(1, Math.max(0, Number(exp.confidence) || 0.8)),
});

const sanitizeMissedProfit = (mp) => ({
  item: String(mp.item || 'unknown').toLowerCase().trim(),
  estimatedLoss: Math.max(0, Number(mp.estimatedLoss) || 0),
  triggerPhrase: String(mp.triggerPhrase || '').trim(),
  confidence: Math.min(1, Math.max(0, Number(mp.confidence) || 0.7)),
});

/**
 * Mock extraction for development without API key.
 */
const getMockExtraction = (transcript) => {
  const lower = transcript.toLowerCase();
  const items = [];
  const expenses = [];
  const missedProfits = [];

  // Simple keyword-based mock
  if (lower.includes('samosa') || lower.includes('samose')) {
    items.push({ name: 'samosa', quantity: 50, unitPrice: 10, totalPrice: 500, confidence: 0.9 });
  }
  if (lower.includes('chai')) {
    items.push({ name: 'chai', quantity: 100, unitPrice: 10, totalPrice: 1000, confidence: 0.8 });
  }
  if (lower.includes('tel') || lower.includes('oil')) {
    expenses.push({ category: 'raw_material', amount: 200, description: 'cooking oil', confidence: 0.9 });
  }
  if (lower.includes('khatam')) {
    missedProfits.push({
      item: 'samosa',
      estimatedLoss: 200,
      triggerPhrase: 'khatam ho gaya',
      confidence: 0.7,
    });
  }

  // Default mock if nothing matched
  if (items.length === 0) {
    items.push({ name: 'misc_items', quantity: 1, unitPrice: 500, totalPrice: 500, confidence: 0.5 });
  }

  return {
    items,
    expenses,
    missedProfits,
    model: 'mock',
    tokensUsed: 0,
  };
};

module.exports = { extractEntities };
