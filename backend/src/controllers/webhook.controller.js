/**
 * Twilio WhatsApp Webhook Controller
 *
 * Handles incoming WhatsApp messages (voice notes and text).
 * Flow:
 *   1. Receive Twilio webhook → identify/register vendor by phone
 *   2. If audio: download → Whisper transcription → LLM extraction → save ledger
 *   3. If text ("YES"/"NO"): confirm/reject daily summary
 *   4. Reply with extracted data summary or confirmation
 *
 * CRITICAL: Twilio expects a 200 response with Content-Type: text/xml.
 * If we return anything else (JSON, 500, etc.), Twilio marks the webhook
 * as failed and may retry — causing silence on the vendor's side.
 */

const twilio = require('twilio');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const { env } = require('../config/env');
const User = require('../models/User');
const LedgerEntry = require('../models/LedgerEntry');
const Item = require('../models/Item');
const whisperService = require('../services/whisper.service');
const extractionService = require('../services/extraction.service');
const loanService = require('../services/loan.service');

// ---- Twilio Client Initialization ----
let twilioClient = null;
try {
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    console.log('[Twilio] ✅ Client initialized successfully');
  } else if (env.TWILIO_ACCOUNT_SID) {
    console.warn('[Twilio] ⚠️ Account SID must start with "AC". WhatsApp disabled.');
  } else {
    console.warn('[Twilio] ⚠️ No TWILIO_ACCOUNT_SID set. WhatsApp replies will be mocked.');
  }
} catch (e) {
  console.warn('[Twilio] ❌ Init failed:', e.message);
}

// ---- Ensure storage directory exists ----
const storagePath = path.resolve(env.STORAGE_PATH || './storage');
if (!fs.existsSync(storagePath)) {
  fs.mkdirSync(storagePath, { recursive: true });
  console.log(`[Storage] Created directory: ${storagePath}`);
}

/**
 * Helper: Always respond with Twilio-compatible XML.
 * This MUST be called at the end of every webhook handler path.
 */
const respondXml = (res) => {
  if (!res.headersSent) {
    res.type('text/xml').status(200).send('<Response></Response>');
  }
};

/**
 * Send a WhatsApp reply via Twilio.
 */
const sendWhatsAppReply = async (to, message) => {
  try {
    if (!twilioClient) {
      console.log(`[WhatsApp Mock Reply] To: ${to}\n${message}`);
      return;
    }

    console.log(`[WhatsApp] Sending reply to ${to} (${message.length} chars)...`);
    await twilioClient.messages.create({
      from: env.TWILIO_WHATSAPP_NUMBER,
      to,
      body: message,
    });
    console.log(`[WhatsApp] ✅ Reply sent to ${to}`);
  } catch (err) {
    console.error(`[WhatsApp] ❌ Failed to send reply to ${to}:`, err.message);
    // Don't throw — we still want to return 200 XML to Twilio
  }
};

/**
 * Download audio from Twilio media URL with authentication.
 */
const downloadAudio = async (mediaUrl, mediaContentType) => {
  console.log(`[Download] Downloading audio: ${mediaUrl}`);
  console.log(`[Download] Content-Type: ${mediaContentType}`);

  const ext = mediaContentType.includes('ogg') ? '.ogg'
    : mediaContentType.includes('amr') ? '.amr'
    : mediaContentType.includes('mp4') ? '.mp4'
    : mediaContentType.includes('3gpp') ? '.3gp'
    : mediaContentType.includes('webm') ? '.webm'
    : '.ogg';

  const filename = `whatsapp-${Date.now()}${ext}`;
  const filepath = path.join(storagePath, filename);

  // Twilio media URLs require authentication
  const response = await axios({
    url: mediaUrl,
    method: 'GET',
    responseType: 'stream',
    auth: {
      username: env.TWILIO_ACCOUNT_SID,
      password: env.TWILIO_AUTH_TOKEN,
    },
    timeout: 30000, // 30 second timeout
    maxRedirects: 5, // Twilio may redirect
  });

  const writer = fs.createWriteStream(filepath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      const fileSize = fs.statSync(filepath).size;
      console.log(`[Download] ✅ Saved: ${filename} (${(fileSize / 1024).toFixed(1)} KB)`);

      if (fileSize === 0) {
        // Clean up empty file
        fs.unlinkSync(filepath);
        reject(new Error('Downloaded audio file is empty (0 bytes)'));
        return;
      }

      resolve({ filepath, filename });
    });
    writer.on('error', (err) => {
      console.error(`[Download] ❌ Write error:`, err.message);
      reject(err);
    });
  });
};

/**
 * Format extracted data into a readable WhatsApp message.
 */
const formatExtractedData = (extraction, language = 'hi') => {
  const { items, expenses, missedProfits } = extraction;

  let msg = '';

  if (language === 'hi' || language === 'hinglish') {
    msg += '📒 *Aaj ka Hisaab:*\n\n';

    if (items.length > 0) {
      msg += '💰 *Bikri (Sales):*\n';
      items.forEach((item) => {
        const conf = item.confidence < 0.7 ? ' ⚠️' : '';
        msg += `  • ${item.name}: ${item.quantity}x ₹${item.unitPrice} = ₹${item.totalPrice}${conf}\n`;
      });
      msg += '\n';
    }

    if (expenses.length > 0) {
      msg += '💸 *Kharcha (Expenses):*\n';
      expenses.forEach((exp) => {
        msg += `  • ${exp.description || exp.category}: ₹${exp.amount}\n`;
      });
      msg += '\n';
    }

    if (missedProfits.length > 0) {
      msg += '📉 *Chhoota Hua Munafa:*\n';
      missedProfits.forEach((mp) => {
        msg += `  • ${mp.item}: ~₹${mp.estimatedLoss} ("${mp.triggerPhrase}")\n`;
      });
      msg += '\n';
    }

    const totalRev = items.reduce((s, i) => s + i.totalPrice, 0);
    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
    msg += `📊 *Total Bikri:* ₹${totalRev}\n`;
    msg += `📊 *Total Kharcha:* ₹${totalExp}\n`;
    msg += `📊 *Munafa:* ₹${totalRev - totalExp}\n`;
  } else {
    msg += '📒 *Today\'s Record:*\n\n';

    if (items.length > 0) {
      msg += '💰 *Sales:*\n';
      items.forEach((item) => {
        const conf = item.confidence < 0.7 ? ' ⚠️' : '';
        msg += `  • ${item.name}: ${item.quantity}x ₹${item.unitPrice} = ₹${item.totalPrice}${conf}\n`;
      });
      msg += '\n';
    }

    if (expenses.length > 0) {
      msg += '💸 *Expenses:*\n';
      expenses.forEach((exp) => {
        msg += `  • ${exp.description || exp.category}: ₹${exp.amount}\n`;
      });
      msg += '\n';
    }

    if (missedProfits.length > 0) {
      msg += '📉 *Missed Profits:*\n';
      missedProfits.forEach((mp) => {
        msg += `  • ${mp.item}: ~₹${mp.estimatedLoss}\n`;
      });
      msg += '\n';
    }

    const totalRev = items.reduce((s, i) => s + i.totalPrice, 0);
    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
    msg += `📊 *Total Sales:* ₹${totalRev}\n`;
    msg += `📊 *Total Expenses:* ₹${totalExp}\n`;
    msg += `📊 *Net Profit:* ₹${totalRev - totalExp}\n`;
  }

  return msg;
};

/**
 * Handle incoming WhatsApp messages.
 *
 * CRITICAL: This handler MUST always respond with 200 + text/xml.
 * We do NOT use asyncHandler here because that would send JSON errors
 * to Twilio, causing webhook failures and silence.
 */
const handleWhatsApp = async (req, res) => {
  try {
    const {
      From: from,
      Body: body,
      NumMedia: numMedia,
      MediaUrl0: mediaUrl,
      MediaContentType0: mediaContentType,
      MessageSid: messageSid,
    } = req.body;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`[WhatsApp] 📥 Incoming message`);
    console.log(`[WhatsApp]   From: ${from}`);
    console.log(`[WhatsApp]   Body: ${body || '(none)'}`);
    console.log(`[WhatsApp]   NumMedia: ${numMedia || 0}`);
    console.log(`[WhatsApp]   MediaUrl: ${mediaUrl || '(none)'}`);
    console.log(`[WhatsApp]   ContentType: ${mediaContentType || '(none)'}`);
    console.log(`[WhatsApp]   MessageSid: ${messageSid || '(none)'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Validate we have a sender
    if (!from) {
      console.error('[WhatsApp] ❌ No "From" field in webhook body. Possible parsing issue.');
      console.error('[WhatsApp] Raw body:', JSON.stringify(req.body));
      respondXml(res);
      return;
    }

    // 1. Find or register vendor
    const phone = from.replace('whatsapp:', '');
    console.log(`[WhatsApp] 🔍 Looking up vendor: ${phone}`);
    let vendor = await User.findOne({ phone });

    if (!vendor) {
      console.log(`[WhatsApp] 🆕 New vendor — creating account for ${phone}`);
      vendor = await User.create({
        phone,
        whatsappId: from,
        onboardedAt: new Date(),
      });
      await sendWhatsAppReply(from,
        '🎙️ Namaste! VoiceTrace mein aapka swagat hai!\n\n' +
        'Apni aaj ki bikri batane ke liye voice message bhejiye.\n' +
        'Example: "Aaj 50 samose beche 10 rupaye mein, aur 200 rupaye ka tel kharida"\n\n' +
        'Welcome to VoiceTrace! Send a voice message with your daily sales.'
      );
      respondXml(res);
      return;
    }

    console.log(`[WhatsApp] ✅ Found vendor: ${vendor.displayName} (${vendor._id})`);

    // 2. Handle text messages (confirmations, queries, text logging)
    const mediaCount = parseInt(numMedia, 10) || 0;

    if (mediaCount === 0 && body) {
      console.log(`[WhatsApp] 📝 Processing text message: "${body}"`);
      await handleTextMessage(from, body, vendor);
      respondXml(res);
      return;
    }

    // 3. Handle audio/media messages
    if (mediaCount > 0 && mediaUrl) {
      console.log(`[WhatsApp] 🎤 Processing audio message...`);
      await handleAudioMessage(from, mediaUrl, mediaContentType, vendor);
      respondXml(res);
      return;
    }

    // 4. Unknown message type
    console.warn(`[WhatsApp] ⚠️ Unknown message type — no text and no media`);
    await sendWhatsAppReply(from,
      '🤔 Samajh nahi aaya. Voice message ya text bhejiye.'
    );
    respondXml(res);

  } catch (error) {
    // CRITICAL: Always return XML to Twilio, even on unhandled errors
    console.error('[WhatsApp] ❌ UNHANDLED ERROR in webhook handler:');
    console.error(error);
    respondXml(res);
  }
};

/**
 * Handle text messages: confirmations, queries, or text-based logging.
 */
const handleTextMessage = async (from, body, vendor) => {
  const normalizedBody = body.trim().toLowerCase();

  // ---- Confirmation: YES ----
  if (['yes', 'haan', 'ha', 'sahi', 'theek', 'ok'].includes(normalizedBody)) {
    console.log(`[WhatsApp] ✅ Vendor confirming today's entry`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entry = await LedgerEntry.findOne({
      vendor: vendor._id,
      date: { $gte: today },
      confirmedByVendor: false,
    }).sort({ createdAt: -1 });

    if (entry) {
      entry.confirmedByVendor = true;
      await entry.save();
      await sendWhatsAppReply(from, '✅ Hisaab confirm ho gaya! Dhanyavaad. 🙏');
    } else {
      await sendWhatsAppReply(from, 'Aaj ka koi pending hisaab nahi hai.');
    }
    return;
  }

  // ---- Confirmation: NO ----
  if (['no', 'nahi', 'galat', 'naa'].includes(normalizedBody)) {
    console.log(`[WhatsApp] ❌ Vendor rejected entry`);
    await sendWhatsAppReply(from,
      '❌ Koi baat nahi. Sahi jaankari voice message mein dobara bhejiye.'
    );
    return;
  }

  // ---- Process text as logging or query ----
  try {
    console.log(`[WhatsApp] 🤖 Classifying text intent...`);
    const { intent } = await extractionService.classifyIntent(
      body,
      vendor.preferredLanguage
    );

    console.log(`[WhatsApp] Intent: ${intent} for vendor ${vendor.phone}`);

    // ---- BRANCH: QUERY ----
    if (intent === 'query') {
      console.log(`[WhatsApp] 📊 Processing as query...`);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);

      const [entries, summary] = await Promise.all([
        LedgerEntry.find({
          vendor: vendor._id,
          date: { $gte: weekAgo },
        }).sort({ date: -1 }).lean(),
        LedgerEntry.getVendorSummary(vendor._id, 7),
      ]);

      const vendorContext = {
        name: vendor.displayName,
        category: vendor.businessCategory,
        language: vendor.preferredLanguage,
        loanScore: vendor.loanReadiness?.score || 0,
        streak: vendor.loanReadiness?.streak || 0,
      };

      const { answer } = await extractionService.answerQuery(
        body,
        vendorContext,
        { entries, summary }
      );

      await sendWhatsAppReply(from, answer);
    } else {
      // ---- BRANCH: LOGGING via text ----
      console.log(`[WhatsApp] 📝 Processing as text logging...`);
      const extraction = await extractionService.extractEntities(
        body,
        vendor.businessCategory,
        vendor.preferredLanguage
      );

      console.log(`[WhatsApp] Extracted: ${extraction.items.length} items, ${extraction.expenses.length} expenses`);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let entry = await LedgerEntry.findOne({
        vendor: vendor._id,
        date: { $gte: today },
      });

      if (entry) {
        entry.items.push(...extraction.items);
        entry.expenses.push(...extraction.expenses);
        entry.missedProfits.push(...extraction.missedProfits);
        entry.rawTranscript += '\n---\n' + body;
      } else {
        entry = new LedgerEntry({
          vendor: vendor._id,
          date: today,
          rawTranscript: body,
          language: vendor.preferredLanguage,
          items: extraction.items,
          expenses: extraction.expenses,
          missedProfits: extraction.missedProfits,
          source: 'whatsapp_text',
          location: vendor.location,
          processingMeta: {
            llmModel: extraction.model,
            llmTokensUsed: extraction.tokensUsed,
            processedAt: new Date(),
          },
        });
      }

      await entry.save();
      console.log(`[WhatsApp] ✅ Ledger entry saved: ${entry._id}`);

      // Upsert items into catalog
      await Item.upsertFromExtraction(vendor._id, extraction.items, today);

      // Update streak & loan score
      vendor.updateStreak(today);
      await loanService.recalculateScore(vendor);
      await vendor.save();

      const replyMsg = formatExtractedData(extraction, vendor.preferredLanguage);
      await sendWhatsAppReply(from, replyMsg + '\n_Sahi hai? Reply: YES / NO_');
    }
  } catch (error) {
    console.error('[WhatsApp] ❌ Text processing error:', error);
    await sendWhatsAppReply(from,
      '❌ Message process karne mein dikkat aayi. Kripya dobara bhejiye.'
    );
  }
};

/**
 * Handle audio/voice note messages.
 * This is the critical path for voice notes.
 */
const handleAudioMessage = async (from, mediaUrl, mediaContentType, vendor) => {
  try {
    // Step 1: Acknowledge receipt
    console.log(`[WhatsApp] Step 1/5: Sending acknowledgment...`);
    await sendWhatsAppReply(from, '⏳ Aapka voice message process ho raha hai...');

    // Step 2: Download audio from Twilio
    console.log(`[WhatsApp] Step 2/5: Downloading audio...`);
    const { filepath, filename } = await downloadAudio(mediaUrl, mediaContentType);
    console.log(`[WhatsApp] ✅ Audio downloaded: ${filepath}`);

    // Step 3: Transcribe with Whisper/Gemini
    console.log(`[WhatsApp] Step 3/5: Transcribing audio...`);
    const transcription = await whisperService.transcribe(filepath);
    console.log(`[WhatsApp] ✅ Transcription: "${transcription.text.substring(0, 100)}..."`);
    console.log(`[WhatsApp]   Language: ${transcription.language}, Duration: ${transcription.duration}ms`);

    if (!transcription.text || transcription.text.trim().length === 0) {
      console.warn(`[WhatsApp] ⚠️ Empty transcription — audio may be silent or too short`);
      await sendWhatsAppReply(from,
        '⚠️ Voice message mein kuch sunai nahi diya. Kripya thoda loud aur clearly bolke dobara bhejiye.'
      );
      return;
    }

    // Step 4: Classify intent (query vs logging)
    console.log(`[WhatsApp] Step 4/5: Classifying intent...`);
    const { intent, confidence: intentConf } = await extractionService.classifyIntent(
      transcription.text,
      vendor.preferredLanguage
    );
    console.log(`[WhatsApp] ✅ Intent: ${intent} (confidence: ${intentConf})`);

    // ---- BRANCH: QUERY ----
    if (intent === 'query') {
      console.log(`[WhatsApp] 📊 Processing voice query...`);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);

      const [entries, summary] = await Promise.all([
        LedgerEntry.find({
          vendor: vendor._id,
          date: { $gte: weekAgo },
        }).sort({ date: -1 }).lean(),
        LedgerEntry.getVendorSummary(vendor._id, 7),
      ]);

      const vendorContext = {
        name: vendor.displayName,
        category: vendor.businessCategory,
        language: vendor.preferredLanguage,
        loanScore: vendor.loanReadiness?.score || 0,
        streak: vendor.loanReadiness?.streak || 0,
      };

      const { answer } = await extractionService.answerQuery(
        transcription.text,
        vendorContext,
        { entries, summary }
      );

      await sendWhatsAppReply(from, answer);
      console.log(`[WhatsApp] ✅ Query answer sent`);
      return;
    }

    // ---- BRANCH: LOGGING ----
    console.log(`[WhatsApp] Step 5/5: Extracting entities...`);
    const extraction = await extractionService.extractEntities(
      transcription.text,
      vendor.businessCategory,
      vendor.preferredLanguage,
      transcription.words || []
    );
    console.log(`[WhatsApp] ✅ Extracted: ${extraction.items.length} items, ${extraction.expenses.length} expenses, ${extraction.missedProfits.length} missed profits`);
    console.log(`[WhatsApp]   Model: ${extraction.model}, Tokens: ${extraction.tokensUsed}`);

    // Create/update today's ledger entry
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let entry = await LedgerEntry.findOne({
      vendor: vendor._id,
      date: { $gte: today },
    });

    if (entry) {
      console.log(`[WhatsApp] 📝 Appending to existing entry: ${entry._id}`);
      entry.items.push(...extraction.items);
      entry.expenses.push(...extraction.expenses);
      entry.missedProfits.push(...extraction.missedProfits);
      entry.rawTranscript += '\n---\n' + transcription.text;
    } else {
      console.log(`[WhatsApp] 📝 Creating new ledger entry`);
      entry = new LedgerEntry({
        vendor: vendor._id,
        date: today,
        rawTranscript: transcription.text,
        language: transcription.language || vendor.preferredLanguage,
        items: extraction.items,
        expenses: extraction.expenses,
        missedProfits: extraction.missedProfits,
        audioUrl: filename,
        source: 'whatsapp_audio',
        location: vendor.location,
        wordTimestamps: transcription.words || [],
        processingMeta: {
          whisperDuration: transcription.duration,
          llmModel: extraction.model,
          llmTokensUsed: extraction.tokensUsed,
          processedAt: new Date(),
        },
      });
    }

    await entry.save();
    console.log(`[WhatsApp] ✅ Ledger entry saved: ${entry._id}`);
    console.log(`[WhatsApp]   Revenue: ₹${entry.totalRevenue}, Expenses: ₹${entry.totalExpenses}, Profit: ₹${entry.netProfit}`);

    // Upsert items into the auto-updated catalog
    await Item.upsertFromExtraction(vendor._id, extraction.items, today);
    console.log(`[WhatsApp] ✅ Item catalog updated`);

    // Update vendor streak & loan score
    vendor.updateStreak(today);
    await loanService.recalculateScore(vendor);
    await vendor.save();
    console.log(`[WhatsApp] ✅ Vendor stats updated — Streak: ${vendor.loanReadiness.streak}, Score: ${vendor.loanReadiness.score}`);

    // Format and send reply
    const replyMsg = formatExtractedData(extraction, vendor.preferredLanguage);
    await sendWhatsAppReply(from, replyMsg + '\n_Sahi hai? Reply: YES / NO_');

    console.log(`[WhatsApp] ✅ Voice note processing complete!`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('[WhatsApp] ❌ Audio processing error:');
    console.error(error);

    // Still try to notify the vendor about the failure
    try {
      await sendWhatsAppReply(from,
        '❌ Voice message process karne mein dikkat aayi. Kripya dobara bhejiye.\n\n' +
        'Error: ' + (error.message || 'Unknown error').substring(0, 100)
      );
    } catch (replyError) {
      console.error('[WhatsApp] ❌ Could not even send error reply:', replyError.message);
    }
  }
};

/**
 * Handle Twilio status callbacks.
 */
const handleStatusCallback = async (req, res) => {
  try {
    const { MessageSid, MessageStatus, To, ErrorCode, ErrorMessage } = req.body;
    console.log(`[WhatsApp] 📬 Status: ${MessageSid} → ${MessageStatus}${ErrorCode ? ` (Error: ${ErrorCode} - ${ErrorMessage})` : ''}`);
    res.sendStatus(200);
  } catch (error) {
    console.error('[WhatsApp] Status callback error:', error.message);
    res.sendStatus(200); // Always respond 200
  }
};

module.exports = { handleWhatsApp, handleStatusCallback };
