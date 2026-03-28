/**
 * AI Entity Extraction Service
 *
 * Uses AgentRouter (OpenAI-compatible API) to extract structured business data
 * from transcribed vendor speech. Also detects "Missed Profit" phrases.
 *
 * Input: raw transcript (Hindi/English/Hinglish)
 * Output: { items[], expenses[], missedProfits[], model, tokensUsed }
 */

const OpenAI = require('openai');
const { env } = require('../config/env');

const openai = env.AI_API_KEY
  ? new OpenAI({ apiKey: env.AI_API_KEY, baseURL: env.AI_BASE_URL })
  : null;

/**
 * Multi-provider AI caller with retry + model fallback.
 * 
 * Strategy:
 *  1. Try OpenRouter free models (gemma-3-27b, gemma-3-4b)
 *  2. If all rate-limited, fall back to Gemini direct API
 *  3. Each provider gets 3 attempts with increasing delays
 */
const PROVIDERS = [
  // Gemini direct — primary (working)
  { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', apiKey: env.GEMINI_API_KEY, model: 'gemini-2.5-flash', label: 'Gemini-Flash' },
  // OpenRouter free models (fallback)
  { baseURL: env.AI_BASE_URL, apiKey: env.AI_API_KEY, model: 'google/gemma-3-27b-it:free', label: 'OpenRouter-27B' },
  { baseURL: env.AI_BASE_URL, apiKey: env.AI_API_KEY, model: 'google/gemma-3-4b-it:free', label: 'OpenRouter-4B' },
  // Grok (xAI) — fallback
  { baseURL: 'https://api.x.ai/v1', apiKey: env.GROK_API_KEY, model: 'grok-3-mini-fast', label: 'Grok-Mini' },
];

const callWithFallback = async (buildRequest) => {
  const errors = [];

  for (const provider of PROVIDERS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (!provider.apiKey) {
          errors.push(`${provider.label}: no API key`);
          break;
        }
        const client = (provider.baseURL === env.AI_BASE_URL && openai)
          ? openai
          : new OpenAI({ apiKey: provider.apiKey, baseURL: provider.baseURL });

        return await client.chat.completions.create(buildRequest(provider.model));
      } catch (err) {
        const isRetryable = err.status === 429 || (err.status === 400 && /provider/i.test(err.message));
        errors.push(`${provider.label}: ${err.status} ${err.message || ''}`);
        console.error(`[AI] ${provider.label} error:`, err.status, err.message);

        if (isRetryable && attempt < 3) {
          const delay = attempt * 5000; // 5s, 10s
          console.warn(`[AI] ${provider.label} (${err.status}). Retry ${attempt}/3 in ${delay/1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
        } else {
          console.warn(`[AI] ${provider.label} exhausted. Trying next provider...`);
          break; // next provider
        }
      }
    }
  }

  throw new Error(`All AI providers failed: ${errors.join(', ')}. Try again in a minute.`);
};

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

RESPOND WITH ONLY THIS JSON STRUCTURE (no markdown, no explanation, no code fences):
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
    console.warn('[Extraction] AI API not configured. Returning mock extraction.');
    return getMockExtraction(transcript);
  }

  try {
    const response = await callWithFallback((model) => ({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(businessCategory, language) },
        { role: 'user', content: `TRANSCRIPT:\n"${transcript}"` },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }));

    const content = response.choices[0].message.content;
    // Strip markdown fences if present
    const jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    const result = {
      items: (parsed.items || []).map(sanitizeItem),
      expenses: (parsed.expenses || []).map(sanitizeExpense),
      missedProfits: (parsed.missedProfits || []).map(sanitizeMissedProfit),
      model: response.model || 'gemini-2.0-flash',
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
 * Classify intent: is the vendor logging sales or asking a question?
 */
const classifyIntent = async (transcript, language = 'hi') => {
  if (!openai) {
    console.warn('[Intent] AI API not configured. Defaulting to "logging".');
    return getMockIntent(transcript);
  }

  try {
    const response = await callWithFallback((model) => ({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an intent classifier for an Indian street vendor voice assistant.
Classify the vendor's spoken transcript into exactly ONE intent:

- "logging" — The vendor is reporting sales, expenses, items sold, or stock information.
  Examples: "Aaj 50 samose beche", "200 ka tel kharida", "chai bechke 500 aaye", "samose khatam ho gaye"

- "query" — The vendor is ASKING a question about their business data, past sales, profits, or insights.
  Examples: "Kal kitna kamaya?", "Is hafte ka total kya hai?", "Mera loan score kya hai?",
  "Sabse zyada kya bikta hai?", "How much did I earn yesterday?", "What is my profit this week?"

CRITICAL RULES:
- If the vendor is TELLING you what they sold/spent → "logging"
- If the vendor is ASKING you about their data → "query"
- When in doubt, default to "logging"
- Respond ONLY with valid JSON: {"intent": "logging" or "query", "confidence": 0.0-1.0}`,
        },
        { role: 'user', content: `TRANSCRIPT (${language}):\n"${transcript}"` },
      ],
      temperature: 0,
      max_tokens: 50,
    }));

    const content = response.choices[0].message.content;
    const jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    return {
      intent: parsed.intent === 'query' ? 'query' : 'logging',
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.8)),
    };
  } catch (error) {
    console.error('[Intent] Classification error:', error.message);
    return { intent: 'logging', confidence: 0.5 };
  }
};

/**
 * Mock intent classifier for dev without API key.
 */
const getMockIntent = (transcript) => {
  const lower = transcript.toLowerCase();
  const queryKeywords = [
    'kitna', 'kya hai', 'kya hua', 'how much', 'how many',
    'total', 'score', 'profit', 'kamai', 'kamaya', 'munafa',
    'yesterday', 'kal', 'last week', 'is hafte', 'sabse zyada',
    'average', 'loan', '?',
  ];

  const isQuery = queryKeywords.some((kw) => lower.includes(kw));
  return {
    intent: isQuery ? 'query' : 'logging',
    confidence: 0.7,
  };
};

/**
 * Answer a vendor's business query using their recent data as context.
 */
const answerQuery = async (transcript, vendorContext, weekData) => {
  if (!openai) {
    console.warn('[Query] AI API not configured. Returning mock answer.');
    return getMockQueryAnswer(transcript, vendorContext, weekData);
  }

  try {
    const dataContext = buildDataContext(vendorContext, weekData);

    const response = await callWithFallback((model) => ({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a friendly, helpful business assistant for Indian street vendors.
A vendor is asking a question about their business. Answer using ONLY the data provided below.

RULES:
1. Respond in ${vendorContext.language === 'en' ? 'English' : 'Hindi/Hinglish (use Roman Hindi, NOT Devanagari)'}.
2. Keep your answer SHORT — max 4-5 lines. Vendors read on WhatsApp.
3. Use ₹ symbol for currency and round numbers.
4. Be warm and encouraging. Use emojis sparingly (1-2 per message).
5. If you don't have the data to answer, say so honestly.
6. Never make up numbers. Only use what's in the context below.

VENDOR DATA CONTEXT:
${dataContext}`,
        },
        { role: 'user', content: `VENDOR'S QUESTION:\n"${transcript}"` },
      ],
      temperature: 0.5,
      max_tokens: 300,
    }));

    return {
      answer: response.choices[0].message.content.trim(),
      tokensUsed: response.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error('[Query] Answer generation error:', error.message);
    return {
      answer: vendorContext.language === 'en'
        ? '❌ Sorry, I could not process your question right now. Please try again.'
        : '❌ Maaf kijiye, abhi aapka sawaal process nahi ho paya. Dobara try karein.',
      tokensUsed: 0,
    };
  }
};

/**
 * Build a concise data context string from vendor + 7-day entries.
 */
const buildDataContext = (vendor, weekData) => {
  const { entries = [], summary = {} } = weekData;

  let ctx = `--- Vendor Profile ---
Name: ${vendor.name || 'Unknown'}
Category: ${vendor.category || 'general'}
Loan Readiness Score: ${vendor.loanScore ?? 0}/100
Loan Ready: ${vendor.loanScore >= 75 ? 'YES' : 'NO (need ' + (75 - (vendor.loanScore || 0)) + ' more points)'}
Logging Streak: ${vendor.streak || 0} consecutive days

--- Last 7 Days Summary ---
Total Revenue: ₹${summary.totalRevenue || 0}
Total Expenses: ₹${summary.totalExpenses || 0}
Net Profit: ₹${summary.totalProfit || 0}
Avg Daily Revenue: ₹${Math.round(summary.avgDailyRevenue || 0)}
Days Logged: ${summary.entryCount || 0}
Missed Revenue (est.): ₹${summary.totalMissedRevenue || 0}
`;

  if (entries.length > 0) {
    ctx += '\n--- Daily Breakdown (last 7 days) ---\n';
    entries.forEach((e) => {
      const date = new Date(e.date).toLocaleDateString('en-IN', {
        weekday: 'short', day: 'numeric', month: 'short',
      });
      const itemNames = (e.items || []).map((i) => `${i.name}(${i.quantity})`).join(', ');
      ctx += `${date}: Revenue ₹${e.totalRevenue}, Expenses ₹${e.totalExpenses}, Profit ₹${e.netProfit} | Items: ${itemNames || 'none'}\n`;
    });
  }

  const itemTotals = {};
  entries.forEach((e) => {
    (e.items || []).forEach((item) => {
      if (!itemTotals[item.name]) itemTotals[item.name] = { qty: 0, rev: 0 };
      itemTotals[item.name].qty += item.quantity;
      itemTotals[item.name].rev += item.totalPrice;
    });
  });

  const topItems = Object.entries(itemTotals)
    .sort((a, b) => b[1].rev - a[1].rev)
    .slice(0, 5);

  if (topItems.length > 0) {
    ctx += '\n--- Top Items This Week ---\n';
    topItems.forEach(([name, data]) => {
      ctx += `${name}: ${data.qty} units, ₹${data.rev} revenue\n`;
    });
  }

  return ctx;
};

/**
 * Mock extraction for dev without API key.
 */
const getMockExtraction = (transcript) => {
  return {
    items: [
      { name: 'samosa', quantity: 50, unitPrice: 10, totalPrice: 500, confidence: 1.0 },
    ],
    expenses: [
      { category: 'raw_material', amount: 200, description: 'cooking oil', confidence: 1.0 },
    ],
    missedProfits: [],
    model: 'mock',
    tokensUsed: 0,
  };
};

/**
 * Mock query answer for dev without API key.
 */
const getMockQueryAnswer = (transcript, vendor, weekData) => {
  const { summary = {} } = weekData;
  const isHindi = vendor.language !== 'en';

  return {
    answer: isHindi
      ? `📊 Aapki pichle 7 din ki kamai ₹${summary.totalRevenue || 0} rahi. Kharcha ₹${summary.totalExpenses || 0} hua aur munafa ₹${summary.totalProfit || 0} raha.\n\n🎯 Loan Score: ${vendor.loanScore || 0}/100 | Streak: ${vendor.streak || 0} din`
      : `📊 Your last 7-day revenue was ₹${summary.totalRevenue || 0}. Expenses ₹${summary.totalExpenses || 0}, Profit ₹${summary.totalProfit || 0}.\n\n🎯 Loan Score: ${vendor.loanScore || 0}/100 | Streak: ${vendor.streak || 0} days`,
    tokensUsed: 0,
  };
};

module.exports = { extractEntities, classifyIntent, answerQuery };
