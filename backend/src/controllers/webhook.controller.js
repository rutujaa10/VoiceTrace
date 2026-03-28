/**
 * Twilio WhatsApp Webhook Controller
 *
 * Handles incoming WhatsApp messages (voice notes and text).
 * Flow:
 *   1. Receive Twilio webhook → identify/register vendor by phone
 *   2. If audio: download → Whisper transcription → LLM extraction → save ledger
 *   3. If text ("YES"/"NO"): confirm/reject daily summary
 *   4. Reply with extracted data summary or confirmation
 */

const twilio = require('twilio');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const { env } = require('../config/env');
const { asyncHandler } = require('../middlewares/errorHandler');
const User = require('../models/User');
const LedgerEntry = require('../models/LedgerEntry');
const whisperService = require('../services/whisper.service');
const extractionService = require('../services/extraction.service');
const loanService = require('../services/loan.service');

let twilioClient = null;
try {
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
    twilioClient = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  } else if (env.TWILIO_ACCOUNT_SID) {
    console.warn('[Twilio] Account SID must start with "AC". WhatsApp disabled.');
  }
} catch (e) {
  console.warn('[Twilio] Init failed:', e.message);
}

/**
 * Send a WhatsApp reply via Twilio.
 */
const sendWhatsAppReply = async (to, message) => {
  if (!twilioClient) {
    console.log(`[WhatsApp Mock] To: ${to}\n${message}`);
    return;
  }

  await twilioClient.messages.create({
    from: env.TWILIO_WHATSAPP_NUMBER,
    to,
    body: message,
  });
};

/**
 * Download audio from Twilio media URL.
 */
const downloadAudio = async (mediaUrl, mediaContentType) => {
  const ext = mediaContentType.includes('ogg') ? '.ogg'
    : mediaContentType.includes('amr') ? '.amr'
    : mediaContentType.includes('mp4') ? '.mp4'
    : '.ogg';

  const filename = `whatsapp-${Date.now()}${ext}`;
  const filepath = path.join(path.resolve(env.STORAGE_PATH), filename);

  const response = await axios({
    url: mediaUrl,
    method: 'GET',
    responseType: 'stream',
    auth: {
      username: env.TWILIO_ACCOUNT_SID,
      password: env.TWILIO_AUTH_TOKEN,
    },
  });

  const writer = fs.createWriteStream(filepath);
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve({ filepath, filename }));
    writer.on('error', reject);
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
        msg += `  • ${mp.item}: ~₹${mp.estimatedLoss} (\"${mp.triggerPhrase}\")\n`;
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
 */
const handleWhatsApp = asyncHandler(async (req, res) => {
  const {
    From: from,
    Body: body,
    NumMedia: numMedia,
    MediaUrl0: mediaUrl,
    MediaContentType0: mediaContentType,
  } = req.body;

  console.log(`[WhatsApp] Message from ${from}: ${body || '(audio)'}`);

  // 1. Find or register vendor
  const phone = from.replace('whatsapp:', '');
  let vendor = await User.findOne({ phone });

  if (!vendor) {
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
    // Respond to Twilio
    res.type('text/xml').send('<Response></Response>');
    return;
  }

  // 2. Handle text confirmations
  if (!parseInt(numMedia, 10) && body) {
    const normalizedBody = body.trim().toLowerCase();

    if (['yes', 'haan', 'ha', 'sahi', 'theek', 'ok'].includes(normalizedBody)) {
      // Confirm today's last unconfirmed entry
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
    } else if (['no', 'nahi', 'galat', 'naa'].includes(normalizedBody)) {
      await sendWhatsAppReply(from,
        '❌ Koi baat nahi. Sahi jaankari voice message mein dobara bhejiye.'
      );
    } else {
      await sendWhatsAppReply(from,
        '🎙️ Apni bikri batane ke liye voice message bhejiye!\n' +
        'Ya phir apne aakhri hisaab ko confirm karne ke liye "YES" ya "NO" likhein.'
      );
    }

    res.type('text/xml').send('<Response></Response>');
    return;
  }

  // 3. Handle audio messages
  if (parseInt(numMedia, 10) > 0 && mediaUrl) {
    try {
      await sendWhatsAppReply(from, '⏳ Aapka voice message process ho raha hai...');

      // Download audio
      const { filepath, filename } = await downloadAudio(mediaUrl, mediaContentType);

      // Transcribe with Whisper
      const transcription = await whisperService.transcribe(filepath);

      // Extract entities with LLM
      const extraction = await extractionService.extractEntities(
        transcription.text,
        vendor.businessCategory,
        vendor.preferredLanguage
      );

      // Create/update today's ledger entry
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let entry = await LedgerEntry.findOne({
        vendor: vendor._id,
        date: { $gte: today },
      });

      if (entry) {
        // Append to existing today's entry
        entry.items.push(...extraction.items);
        entry.expenses.push(...extraction.expenses);
        entry.missedProfits.push(...extraction.missedProfits);
        entry.rawTranscript += '\n---\n' + transcription.text;
      } else {
        entry = new LedgerEntry({
          vendor: vendor._id,
          date: today,
          rawTranscript: transcription.text,
          language: transcription.language || vendor.preferredLanguage,
          items: extraction.items,
          expenses: extraction.expenses,
          missedProfits: extraction.missedProfits,
          audioUrl: filename,
          location: vendor.location,
          processingMeta: {
            whisperDuration: transcription.duration,
            llmModel: extraction.model,
            llmTokensUsed: extraction.tokensUsed,
            processedAt: new Date(),
          },
        });
      }

      await entry.save();

      // Update vendor streak & loan score
      vendor.updateStreak(today);
      await loanService.recalculateScore(vendor);
      await vendor.save();

      // Format and send reply
      const replyMsg = formatExtractedData(extraction, vendor.preferredLanguage);
      await sendWhatsAppReply(from, replyMsg + '\n_Sahi hai? Reply: YES / NO_');

      // Cleanup audio file (optional — keep for records)
      // fs.unlinkSync(filepath);

    } catch (error) {
      console.error('[WhatsApp] Audio processing error:', error);
      await sendWhatsAppReply(from,
        '❌ Voice message process karne mein dikkat aayi. Kripya dobara bhejiye.'
      );
    }
  }

  res.type('text/xml').send('<Response></Response>');
});

/**
 * Handle Twilio status callbacks.
 */
const handleStatusCallback = asyncHandler(async (req, res) => {
  const { MessageSid, MessageStatus } = req.body;
  console.log(`[WhatsApp] Status: ${MessageSid} → ${MessageStatus}`);
  res.sendStatus(200);
});

module.exports = { handleWhatsApp, handleStatusCallback };
