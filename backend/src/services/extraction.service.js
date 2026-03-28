/**
 * AI Entity Extraction Service — Enhanced
 *
 * Uses multi-provider AI fallback to extract structured business data
 * from transcribed vendor speech. Handles ambiguity, confidence flags,
 * and word-level audio timestamp mapping.
 *
 * Input: raw transcript (Hindi/English/Hinglish), optional word timestamps
 * Output: { items[], expenses[], missedProfits[], model, tokensUsed }
 *
 * Phases covered:
 *  - Phase 1: Entity extraction with ambiguity handling & needsConfirmation flags
 *  - Phase 2: Stock suggestion extraction (next-day prep triggers)
 *  - Phase 4 Feature 6: isApproximate / clarificationNeeded flags
 *  - Phase 4 Feature 8: Audio timestamp mapping per entity
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
 *  1. Try Gemini 2.5 Flash (primary — most reliable)
 *  2. Try OpenRouter free models (gemma-3-27b, gemma-3-4b)
 *  3. Try Grok mini (xAI) as final fallback
 *  Each provider gets 3 attempts with increasing delays.
 */
const PROVIDERS = [
  { baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/', apiKey: env.GEMINI_API_KEY, model: 'gemini-2.5-flash', label: 'Gemini-Flash' },
  { baseURL: env.AI_BASE_URL, apiKey: env.AI_API_KEY, model: 'google/gemma-3-27b-it:free', label: 'OpenRouter-27B' },
  { baseURL: env.AI_BASE_URL, apiKey: env.AI_API_KEY, model: 'google/gemma-3-4b-it:free', label: 'OpenRouter-4B' },
  { baseURL: 'https://api.x.ai/v1', apiKey: env.GROK_API_KEY, model: 'grok-3-mini-fast', label: 'Grok-Mini' },
];

const callWithFallback = async (buildRequest) => {
  const errors = [];

  for (const provider of PROVIDERS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
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

        if (isRetryable && attempt < 2) {
          const delay = attempt * 1500;
          console.warn(`[AI] ${provider.label} (${err.status}). Retry ${attempt}/2 in ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
        } else {
          console.warn(`[AI] ${provider.label} exhausted. Trying next provider...`);
          break;
        }
      }
    }
  }

  throw new Error(`All AI providers failed: ${errors.join(', ')}. Try again in a minute.`);
};

/**
 * System prompt for LLM entity extraction.
 *
 * Enhanced with:
 *  - Hinglish/casual speech tolerance (filler words, code-switching)
 *  - Ambiguity detection with isApproximate & needsConfirmation flags
 *  - sourcePhrase tracking for audio playback mapping
 *  - Stock shortage trigger detection for next-day suggestions
 */
const buildSystemPrompt = (businessCategory, language) => {
  return `You are a financial data extraction AI for Indian street vendors.
Your job is to parse a vendor's spoken transcript (in Hindi, English, or Hinglish) and extract STRICTLY structured JSON.

VENDOR CONTEXT:
- Business category: ${businessCategory}
- Language: ${language}

IMPORTANT — HANDLING CASUAL SPEECH:
- Vendors speak casually with filler words (haan, toh, matlab, like, basically) — IGNORE fillers.
- Code-switching is common: "Aaj maine around 200 rupees ka oil buy kiya" — handle mixed Hindi/English.
- Approximate numbers: "lagbhag 50", "around 200", "kuch 30-40" → use midpoint, mark isApproximate: true.
- Vague quantities: "kuch", "thode", "bahut", "some", "few" → estimate reasonably, set needsConfirmation: true.

EXTRACTION RULES:

1. ITEMS SOLD — Extract each item with name, quantity, unit price, total price.
   - "50 samose 10 rupaye mein" → 50 units × ₹10 = ₹500, confidence: 1.0
   - "chai bechke 500 rupaye aaye" → total ₹500, estimate qty/price, confidence: 0.8
   - "lagbhag 30-35 samose beche" → qty: 33, isApproximate: true, confidence: 0.6
   - "kuch bananas bech diye" → qty: 10 (guess), needsConfirmation: true, confidence: 0.4
     clarificationNeeded: "Quantity unclear — you said 'kuch bananas'"
   - Normalize item names to simple lowercase Hindi/English (e.g., "samosa", "chai", "vada_pav").
   - CRITICAL: Include "sourcePhrase" — the exact words from transcript that produced this item.

2. EXPENSES — Extract purchases, costs, rent, or transport.
   - Categorize as: raw_material, transport, rent, equipment, labor, packaging, other.
   - "200 rupaye ka tel" → raw_material, ₹200, description: "cooking oil"
   - "kuch paisa auto mein laga" → transport, amount: 50 (guess), needsConfirmation: true
   - Include "sourcePhrase" for audio mapping.

3. MISSED PROFITS — Detect phrases indicating items ran out or demand exceeded supply:
   - Hindi: "khatam ho gaya", "khatam ho gaye", "nahi bach paya", "aur bik sakte the",
     "jaldi khatam", "stock khatam", "zyada la sakte the", "demand thi par nahi tha",
     "log maang rahe the", "shortage", "kum pad gaya"
   - English: "ran out", "sold out", "could have sold more", "out of stock",
     "people were asking", "shortage", "not enough"
   - Estimate lost revenue (10-30 additional units × selling price).
   - Include the exact trigger phrase.

4. CONFIDENCE & AMBIGUITY SCORING:
   - 1.0 = exact numbers stated clearly → isApproximate: false, needsConfirmation: false
   - 0.8 = reasonable inference from context → isApproximate: false, needsConfirmation: false
   - 0.6 = range/approximate values given → isApproximate: true, needsConfirmation: false
   - 0.4 = educated guess, vague input → isApproximate: true, needsConfirmation: true
     Set clarificationNeeded to a short user-friendly message explaining what's unclear.

RESPOND WITH ONLY THIS JSON STRUCTURE (no markdown, no explanation, no code fences):
{
  "items": [
    {
      "name": "string",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number,
      "confidence": number,
      "isApproximate": boolean,
      "needsConfirmation": boolean,
      "clarificationNeeded": "string or null",
      "sourcePhrase": "exact words from transcript"
    }
  ],
  "expenses": [
    {
      "category": "string",
      "amount": number,
      "description": "string",
      "confidence": number,
      "isApproximate": boolean,
      "needsConfirmation": boolean,
      "clarificationNeeded": "string or null",
      "sourcePhrase": "exact words from transcript"
    }
  ],
  "missedProfits": [
    {
      "item": "string",
      "estimatedLoss": number,
      "triggerPhrase": "string",
      "confidence": number
    }
  ]
}

If no items/expenses/missed profits are detected, return empty arrays.
CRITICAL: Return ONLY valid JSON. No markdown fences, no extra text.`;
};

/**
 * Map extracted entities to word-level audio timestamps.
 *
 * For each item/expense, find the best-matching timestamp window
 * from the word-level data returned by Whisper.
 *
 * @param {Array} entities - items or expenses with sourcePhrase
 * @param {Array} wordTimestamps - [{word, start, end}, ...]
 * @returns {Array} - entities with audioTimestamp populated
 */
const mapAudioTimestamps = (entities, wordTimestamps = []) => {
  if (!wordTimestamps || wordTimestamps.length === 0) return entities;

  return entities.map((entity) => {
    if (!entity.sourcePhrase) return entity;

    const phraseWords = entity.sourcePhrase.toLowerCase().split(/\s+/).filter(Boolean);
    if (phraseWords.length === 0) return entity;

    // Sliding window match: find the best contiguous match in wordTimestamps
    let bestMatch = null;
    let bestScore = 0;

    for (let i = 0; i <= wordTimestamps.length - 1; i++) {
      // Try windows of various sizes around the phrase length
      for (let windowSize = Math.max(1, phraseWords.length - 2); windowSize <= Math.min(wordTimestamps.length - i, phraseWords.length + 3); windowSize++) {
        const window = wordTimestamps.slice(i, i + windowSize);
        const windowWords = window.map(w => w.word.toLowerCase().replace(/[^\w\u0900-\u097F]/g, ''));

        // Count matching words
        let matches = 0;
        for (const pw of phraseWords) {
          const cleanPw = pw.replace(/[^\w\u0900-\u097F]/g, '');
          if (windowWords.some(ww => ww.includes(cleanPw) || cleanPw.includes(ww))) {
            matches++;
          }
        }

        const score = matches / phraseWords.length;
        if (score > bestScore && score >= 0.4) {
          bestScore = score;
          bestMatch = {
            startTime: window[0].start,
            endTime: window[window.length - 1].end,
            sourcePhrase: entity.sourcePhrase,
          };
        }
      }
    }

    return {
      ...entity,
      audioTimestamp: bestMatch || {
        startTime: null,
        endTime: null,
        sourcePhrase: entity.sourcePhrase,
      },
    };
  });
};

/**
 * Extract structured entities from a transcript.
 *
 * @param {string} transcript - raw transcript text
 * @param {string} businessCategory - vendor business type
 * @param {string} language - hi, en, or hinglish
 * @param {Array} wordTimestamps - optional [{word, start, end}, ...] for audio mapping
 * @returns {Object} - { items, expenses, missedProfits, model, tokensUsed }
 */
const extractEntities = async (transcript, businessCategory = 'general', language = 'hi', wordTimestamps = []) => {
  if (!openai && !env.GEMINI_API_KEY) {
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
    const jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const parsed = JSON.parse(jsonStr);

    let items = (parsed.items || []).map(sanitizeItem);
    let expenses = (parsed.expenses || []).map(sanitizeExpense);
    const missedProfits = (parsed.missedProfits || []).map(sanitizeMissedProfit);

    // Phase 4 Feature 8: Map audio timestamps to extracted entities
    if (wordTimestamps && wordTimestamps.length > 0) {
      items = mapAudioTimestamps(items, wordTimestamps);
      expenses = mapAudioTimestamps(expenses, wordTimestamps);
    }

    return {
      items,
      expenses,
      missedProfits,
      model: response.model || 'unknown',
      tokensUsed: response.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error('[Extraction] LLM extraction error:', error.message);
    throw new Error(`Entity extraction failed: ${error.message}`);
  }
};

// ---- Sanitizers (enhanced with ambiguity fields) ----

const sanitizeItem = (item) => ({
  name: String(item.name || 'unknown').toLowerCase().trim(),
  quantity: Math.max(0, Number(item.quantity) || 1),
  unitPrice: Math.max(0, Number(item.unitPrice) || 0),
  totalPrice: Math.max(0, Number(item.totalPrice) || 0),
  confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0.8)),
  isApproximate: Boolean(item.isApproximate),
  needsConfirmation: Boolean(item.needsConfirmation),
  clarificationNeeded: item.clarificationNeeded || null,
  sourcePhrase: item.sourcePhrase || null,
  audioTimestamp: item.audioTimestamp || { startTime: null, endTime: null, sourcePhrase: null },
});

const sanitizeExpense = (exp) => ({
  category: ['raw_material', 'transport', 'rent', 'equipment', 'labor', 'packaging', 'other']
    .includes(exp.category) ? exp.category : 'other',
  amount: Math.max(0, Number(exp.amount) || 0),
  description: String(exp.description || '').trim(),
  confidence: Math.min(1, Math.max(0, Number(exp.confidence) || 0.8)),
  isApproximate: Boolean(exp.isApproximate),
  needsConfirmation: Boolean(exp.needsConfirmation),
  clarificationNeeded: exp.clarificationNeeded || null,
  sourcePhrase: exp.sourcePhrase || null,
  audioTimestamp: exp.audioTimestamp || { startTime: null, endTime: null, sourcePhrase: null },
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
  if (!openai && !env.GEMINI_API_KEY) {
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
  if (!openai && !env.GEMINI_API_KEY) {
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
        ? 'Sorry, I could not process your question right now. Please try again.'
        : 'Maaf kijiye, abhi aapka sawaal process nahi ho paya. Dobara try karein.',
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
 * Generate plain-language weekly insights using LLM.
 * Phase 2 Feature 3: Feed 7-day data to LLM for 2-3 bullet point observations.
 *
 * @param {Object} analyticsData - output from analytics.service.getWeeklyAnalytics
 * @param {string} language - hi or en
 * @returns {Object} - { insights: string[], tokensUsed: number }
 */
const generateWeeklyInsights = async (analyticsData, language = 'hi') => {
  if (!openai && !env.GEMINI_API_KEY) {
    return { insights: ['Keep logging daily to see weekly patterns!'], tokensUsed: 0 };
  }

  try {
    const { summary, bestSeller, peakDay, missedProfits, dailyBreakdown, topItems } = analyticsData;

    let dataStr = `Weekly Summary: Revenue ₹${summary.totalRevenue}, Expenses ₹${summary.totalExpenses}, Profit ₹${summary.totalProfit}, Days Logged: ${summary.daysLogged}\n`;

    if (bestSeller) {
      dataStr += `Best Seller: ${bestSeller.name} (${bestSeller.totalQuantity} units, ₹${bestSeller.totalRevenue})\n`;
    }
    if (peakDay) {
      dataStr += `Peak Day: ${peakDay.dayName} (₹${peakDay.revenue})\n`;
    }
    if (missedProfits?.totalLoss > 0) {
      dataStr += `Missed Profits: ₹${missedProfits.totalLoss}\n`;
    }
    if (dailyBreakdown?.length > 0) {
      dataStr += 'Daily: ' + dailyBreakdown.map(d => `${d.dayName}: ₹${d.revenue}`).join(', ') + '\n';
    }

    const response = await callWithFallback((model) => ({
      model,
      messages: [
        {
          role: 'system',
          content: `You are a business advisor for Indian street vendors.
Given the weekly data below, generate EXACTLY 3 brief, plain-language observations.
${language === 'en' ? 'Respond in English.' : 'Respond in Roman Hindi/Hinglish (NOT Devanagari).'}

RULES:
- Each observation is ONE line, max 20 words.
- Be specific with numbers (use ₹ symbol).
- Focus on: consistent sellers, high-earning days, expense trends, and actionable advice.
- NO charts, NO complex analysis. Just simple, warm observations.
- Return as a JSON array of 3 strings.

Example output: ["Samosa is your star item — sold every day this week!", "Saturdays earn 40% more than weekdays — stock extra", "Oil expenses are steady at ₹200/day — good control!"]`,
        },
        { role: 'user', content: `WEEKLY DATA:\n${dataStr}` },
      ],
      temperature: 0.6,
      max_tokens: 300,
    }));

    const content = response.choices[0].message.content;
    const jsonStr = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const insights = JSON.parse(jsonStr);

    return {
      insights: Array.isArray(insights) ? insights.slice(0, 3) : [insights],
      tokensUsed: response.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error('[Insights] Weekly insight generation error:', error.message);
    return { insights: ['Keep logging daily to unlock weekly insights!'], tokensUsed: 0 };
  }
};

/**
 * Generate next-day stock suggestions.
 * Phase 2 Feature 4: Based on sell-through rates and "running out" mentions.
 *
 * @param {string} vendorId
 * @param {Array} recentEntries - last 7 days of ledger entries
 * @returns {Array} - [{ item, suggestion, reason }]
 */
const generateStockSuggestions = async (recentEntries, language = 'hi') => {
  if (!recentEntries || recentEntries.length === 0) return [];

  // Build sell-through data
  const itemData = {};
  recentEntries.forEach((entry) => {
    const dateStr = new Date(entry.date).toISOString().slice(0, 10);

    (entry.items || []).forEach((item) => {
      const name = item.name?.toLowerCase().trim();
      if (!name) return;
      if (!itemData[name]) {
        itemData[name] = { totalQty: 0, totalRevenue: 0, days: new Set(), avgPrice: 0 };
      }
      itemData[name].totalQty += item.quantity || 0;
      itemData[name].totalRevenue += item.totalPrice || 0;
      itemData[name].days.add(dateStr);
    });

    // Track missed profit items
    (entry.missedProfits || []).forEach((mp) => {
      const name = mp.item?.toLowerCase().trim();
      if (!name) return;
      if (!itemData[name]) {
        itemData[name] = { totalQty: 0, totalRevenue: 0, days: new Set(), avgPrice: 0, ranOut: true };
      }
      itemData[name].ranOut = true;
    });
  });

  const suggestions = [];
  const daysLogged = recentEntries.length;

  for (const [name, data] of Object.entries(itemData)) {
    const avgDailyQty = Math.round(data.totalQty / Math.max(data.days.size, 1));
    const frequency = data.days.size / daysLogged;

    if (data.ranOut) {
      // Item ran out — suggest making more
      const extra = Math.max(10, Math.round(avgDailyQty * 0.3));
      suggestions.push({
        item: name,
        suggestedQty: avgDailyQty + extra,
        suggestion: `Make ${extra} extra`,
        reason: language === 'en'
          ? `Sold out recently — you usually sell ${avgDailyQty}/day`
          : `Pichle din khatam ho gaya — roz ${avgDailyQty} bikte hain`,
      });
    } else if (frequency >= 0.7) {
      // Consistent seller — maintain stock
      suggestions.push({
        item: name,
        suggestedQty: avgDailyQty,
        suggestion: `Prepare ${avgDailyQty} units`,
        reason: language === 'en'
          ? `Sells consistently (${data.days.size} of ${daysLogged} days)`
          : `Har din bikta hai (${data.days.size}/${daysLogged} din)`,
      });
    }
  }

  // Sort: ran-out items first, then by revenue
  suggestions.sort((a, b) => {
    const aRanOut = itemData[a.item]?.ranOut ? 1 : 0;
    const bRanOut = itemData[b.item]?.ranOut ? 1 : 0;
    if (aRanOut !== bRanOut) return bRanOut - aRanOut;
    return (itemData[b.item]?.totalRevenue || 0) - (itemData[a.item]?.totalRevenue || 0);
  });

  return suggestions.slice(0, 8);
};

/**
 * Mock extraction for dev without API key.
 */
const getMockExtraction = (transcript) => {
  return {
    items: [
      {
        name: 'samosa', quantity: 50, unitPrice: 10, totalPrice: 500, confidence: 1.0,
        isApproximate: false, needsConfirmation: false, clarificationNeeded: null,
        sourcePhrase: '50 samose 10 rupaye mein',
        audioTimestamp: { startTime: null, endTime: null, sourcePhrase: null },
      },
    ],
    expenses: [
      {
        category: 'raw_material', amount: 200, description: 'cooking oil', confidence: 1.0,
        isApproximate: false, needsConfirmation: false, clarificationNeeded: null,
        sourcePhrase: '200 rupaye ka tel',
        audioTimestamp: { startTime: null, endTime: null, sourcePhrase: null },
      },
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
      ? `Aapki pichle 7 din ki kamai ₹${summary.totalRevenue || 0} rahi. Kharcha ₹${summary.totalExpenses || 0} hua aur munafa ₹${summary.totalProfit || 0} raha.\n\nLoan Score: ${vendor.loanScore || 0}/100 | Streak: ${vendor.streak || 0} din`
      : `Your last 7-day revenue was ₹${summary.totalRevenue || 0}. Expenses ₹${summary.totalExpenses || 0}, Profit ₹${summary.totalProfit || 0}.\n\nLoan Score: ${vendor.loanScore || 0}/100 | Streak: ${vendor.streak || 0} days`,
    tokensUsed: 0,
  };
};

module.exports = {
  extractEntities,
  classifyIntent,
  answerQuery,
  generateWeeklyInsights,
  generateStockSuggestions,
  mapAudioTimestamps,
  callWithFallback,
};
