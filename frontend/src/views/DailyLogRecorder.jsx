/**
 * DailyLogRecorder — Dual-Mode Daily Logging Dashboard
 *
 * MODE 1: "AI Conversation" — Vapi voice agent asks questions, extracts data via tool call
 * MODE 2: "Smart Extract" — Speak freely, backend Gemini AI detects sales/expenses/items
 *
 * Both modes feed into a Review & Confirm form with micro-mic field corrections.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Vapi from '@vapi-ai/web';
import {
  Mic, MicOff, CheckCircle, Loader2, RotateCcw, Save,
  Phone, PhoneOff, Volume2, Zap, MessageSquare, ArrowRight,
  IndianRupee, ShoppingBag, TrendingDown, TrendingUp
} from 'lucide-react';
import { useFieldMic } from '../hooks/useFieldMic';
import { useApp, actionTypes } from '../state/AppContext';
import { ledgerAPI } from '../api';
import '../tailwind.css';

const VAPI_PUBLIC_KEY = '19aaf11b-e042-4057-b80e-aa2454dc0b3d';

// ---- Micro-Mic Field Sub-Component ----
function VoiceField({ label, icon: Icon, value, onChange, type = 'text', placeholder, id, prefix }) {
  const isNumeric = type === 'number';
  const fieldMic = useFieldMic({ lang: 'hi-IN', isNumeric });

  useEffect(() => {
    if (fieldMic.transcript) {
      onChange(fieldMic.transcript);
    }
  }, [fieldMic.transcript]);

  return (
    <div className="group">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
        <Icon size={15} className="text-indigo-400" />
        {label}
      </label>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          {prefix && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 text-white text-base
                       placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                       focus:border-indigo-500/50 transition-all duration-200
                       ${prefix ? 'pl-8 pr-4' : 'px-4'}`}
          />
        </div>

        <button
          type="button"
          onClick={() => fieldMic.isListening ? fieldMic.stopListening() : fieldMic.startListening()}
          disabled={!fieldMic.isSupported}
          className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center
                      transition-all duration-200 border cursor-pointer
                      ${fieldMic.isListening
                        ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-lg shadow-red-500/20'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-400'
                      }
                      disabled:opacity-30 disabled:cursor-not-allowed`}
          title={fieldMic.isListening ? 'Stop' : 'Speak to correct'}
        >
          {fieldMic.isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      </div>

      {fieldMic.isListening && (
        <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1 animate-pulse">
          <Volume2 size={11} /> Listening... speak now
        </p>
      )}
    </div>
  );
}


// ---- Main Component ----
export default function DailyLogRecorder() {
  const { state, dispatch } = useApp();
  const vapiRef = useRef(null);

  // Top-level mode: 'choose' | 'vapi' | 'smart'
  const [mode, setMode] = useState('choose');

  // Phase: 'idle' | 'calling' | 'recording' | 'processing' | 'review' | 'saving' | 'saved'
  const [phase, setPhase] = useState('idle');
  const [callStatus, setCallStatus] = useState('');
  const [error, setError] = useState('');

  // Smart Extract - recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef(null);

  // Web Speech API for Smart Extract mode
  const smartMic = useFieldMic({ lang: 'hi-IN', isNumeric: false });

  // Form data for Review phase
  const [formData, setFormData] = useState({
    salesAmount: '',
    expenseAmount: '',
    itemsSold: '',
    daySummary: '',
  });

  // Full extraction result from backend
  const [extractionResult, setExtractionResult] = useState(null);

  // Conversation messages (Vapi mode)
  const [messages, setMessages] = useState([]);

  // ---- Initialize Vapi (only when entering vapi mode) ----
  useEffect(() => {
    if (mode !== 'vapi') return;

    const vapi = new Vapi(VAPI_PUBLIC_KEY);
    vapiRef.current = vapi;

    vapi.on('call-start', () => {
      setCallStatus('Connected! AI is greeting you...');
      setMessages([]);
      setPhase('calling');
    });

    vapi.on('call-end', () => {
      setCallStatus('');
      setPhase((prev) => (prev === 'calling' ? 'idle' : prev));
    });

    vapi.on('speech-start', () => {
      setCallStatus('🔊 AI is speaking...');
    });

    vapi.on('speech-end', () => {
      setCallStatus('🎤 Your turn — speak now...');
    });

    vapi.on('message', (msg) => {
      // Conversation transcript
      if (msg.type === 'transcript' && msg.transcriptType === 'final') {
        setMessages((prev) => [
          ...prev,
          { role: msg.role, text: msg.transcript, ts: Date.now() },
        ]);
      }

      // Tool call — AI finished asking questions, collect raw answers
      if (msg.type === 'tool-calls') {
        const tc = (msg.toolCallList || msg.toolCalls || []).find(
          (t) => t.function?.name === 'submit_ledger_data'
        );
        if (tc) {
          // Instead of trusting GPT's math, we'll send the full
          // conversation transcript to the backend Gemini extraction
          // (same pipeline as Record section) for accurate parsing.
          setTimeout(() => {
            vapi.stop();
            // Build transcript from all user messages
            setMessages((prev) => {
              const userParts = prev
                .filter((m) => m.role === 'user')
                .map((m) => m.text)
                .join('. ');
              if (userParts.trim()) {
                handleVapiExtract(userParts);
              } else {
                // Fallback: try to use the tool call args
                try {
                  const args = typeof tc.function.arguments === 'string'
                    ? JSON.parse(tc.function.arguments)
                    : tc.function.arguments;
                  const fallbackText = `Items sold: ${args.itemsSold || ''}. Sales: ${args.salesAmount || 0} rupees. Expenses: ${args.expenseAmount || 0} rupees. ${args.daySummary || ''}`;
                  handleVapiExtract(fallbackText);
                } catch (e) {
                  setError('Could not extract data. Please try again.');
                  setPhase('idle');
                }
              }
              return prev;
            });
          }, 800);
        }
      }
    });

    vapi.on('error', (err) => {
      console.error('[Vapi] Error:', err);
      setError('Voice call error: ' + (err?.message || 'Connection failed. Check mic permissions.'));
      setPhase('idle');
    });

    return () => {
      vapi.stop();
    };
  }, [mode]);

  // ---- Vapi Extract: Send conversation transcript to backend Gemini extraction ----
  // Uses extract-only endpoint — does NOT save to ledger until user confirms
  const handleVapiExtract = async (transcript) => {
    if (!transcript || transcript.trim().length < 3) {
      setError('Could not capture enough data. Please try again.');
      setPhase('idle');
      return;
    }

    setPhase('processing');

    try {
      const res = await ledgerAPI.extractOnly(
        state.vendorId,
        transcript.trim(),
        'hi'
      );

      const extraction = res.data.data.extraction;

      // Store full extraction for display
      setExtractionResult(extraction);

      // Compute totals from Gemini's accurate extraction
      const totalSales = (extraction.items || []).reduce((s, i) => s + (i.totalPrice || 0), 0);
      const totalExpenses = (extraction.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
      const itemNames = (extraction.items || []).map((i) => `${i.name} x${i.quantity}`).join(', ');

      setFormData({
        salesAmount: String(totalSales),
        expenseAmount: String(totalExpenses),
        itemsSold: itemNames || '',
        daySummary: '',
      });

      setPhase('review');
    } catch (err) {
      console.error('[VapiExtract] Error:', err);
      setError(err.response?.data?.error?.message || 'Extraction failed. Please try again.');
      setPhase('idle');
    }
  };

  // ---- Smart Extract: Handle transcript from Web Speech ----
  useEffect(() => {
    if (mode === 'smart' && smartMic.transcript && phase === 'recording') {
      handleSmartExtract(smartMic.transcript);
    }
  }, [smartMic.transcript]);

  // ---- Recording timer ----
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  // ---- Start Vapi Call ----
  const startVapiCall = useCallback(async () => {
    setError('');
    setPhase('calling');
    setCallStatus('Connecting...');
    setMessages([]);

    try {
      await vapiRef.current.start({
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: 'hi',
        },
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a warm, friendly AI assistant for Indian street vendors using VoiceTrace app. You speak in Hinglish (Hindi-English mix) with a casual, encouraging tone.

CRITICAL LANGUAGE RULE:
- You ALWAYS speak and ask questions in Hinglish.
- The user can answer in ANY language — Hindi, English, Hinglish, Marathi, or any mix. You MUST understand and accept their answer regardless of language.
- Never ask the user to repeat in a specific language. Just extract the data from whatever they say.

YOUR GOAL: Ask exactly 3 questions, ONE AT A TIME, in this exact order:

QUESTION 1 — WHAT DID YOU SELL?
Ask: "Aaj aapne kya kya becha? Items ke naam aur kitne mein beche woh batao."
Extract: itemsSold (string — item names), salesAmount (number — total sales in ₹)
Example answers you should accept:
- "Maine samose beche 500 rupay ke, aur chai 300 ki" → items: samosa, chai | sales: 800
- "I sold 50 samosas at 10 each and tea for 300" → items: samosa, tea | sales: 800
- "samosa 500, chai 300" → items: samosa, chai | sales: 800

QUESTION 2 — WHAT DID YOU SPEND?
Ask: "Badhiya! Ab batao aaj kya kya kharcha hua? Kitne rupaye lage?"
Extract: expenseAmount (number — total expenses in ₹), expenseDetails (string)
Example answers:
- "200 ka tel liya aur 100 ka maida" → expenses: 300 | details: oil, flour
- "I spent 500 on raw materials" → expenses: 500 | details: raw materials
- "kuch nahi kharcha" → expenses: 0

QUESTION 3 — HOW WAS THE DAY?
Ask: "Achha! Aur overall aaj ka din kaisa raha? Koi item khatam ho gaya ya kuch special hua?"
Extract: daySummary (string — any missed profits, stockouts, or general feedback)
Example answers:
- "Samose 3 baje khatam ho gaye, nahi toh aur bik jaate" → missed: samosa sold out at 3pm
- "Good day, everything sold well" → summary: good day
- "Bohot slow tha aaj" → summary: slow day

AFTER ALL 3 QUESTIONS:
- IMMEDIATELY call submit_ledger_data with ALL the collected data.
- Say: "Shukriya! Aapka poora din ka hisaab save ho raha hai. Kal bhi batana!"
- Calculate salesAmount by adding up all item prices mentioned.

IMPORTANT RULES:
- Ask ONLY ONE question at a time. Wait for the answer before asking the next.
- Be patient and encouraging after each answer — say things like "Bahut badhiya!", "Achha!", "Wah!"
- If the user's answer is unclear, gently ask for clarification ONCE, then move on with your best estimate.
- NEVER skip a question. Always ask all 3.
- Accept numbers in any format: "500", "paanch sau", "five hundred", "5 hundred" — all are valid.`,
            },
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'submit_ledger_data',
                description: 'Submit the complete daily ledger data after all 3 questions are answered. Call this ONLY after collecting items sold, expenses, and day summary.',
                parameters: {
                  type: 'object',
                  properties: {
                    salesAmount: { type: 'number', description: 'Total sales/revenue in rupees, calculated by adding up all items sold' },
                    expenseAmount: { type: 'number', description: 'Total expenses in rupees' },
                    itemsSold: { type: 'string', description: 'Comma-separated list of items sold with quantities if mentioned' },
                    daySummary: { type: 'string', description: 'How the day went — any missed profits, stockouts, or general feedback from the vendor' },
                  },
                  required: ['salesAmount', 'expenseAmount', 'itemsSold'],
                },
              },
            },
          ],
        },
        voice: {
          provider: 'azure',
          voiceId: 'en-IN-PrabhatNeural',
        },
        firstMessage: 'Namaste! Main aapka VoiceTrace assistant hoon. Chaliye aaj ka hisaab likhte hain! Sabse pehle bataaiye — aaj aapne kya kya becha aur kitne mein becha?',
      });
    } catch (err) {
      console.error('[Vapi] Start error:', err);
      setError('Could not start voice call. Please allow microphone access and try again.');
      setPhase('idle');
    }
  }, []);

  // ---- Smart Extract: Start recording ----
  const startSmartRecording = () => {
    setError('');
    setRecordingTime(0);
    setIsRecording(true);
    setPhase('recording');
    smartMic.startListening();
  };

  // ---- Smart Extract: Stop & process ----
  const stopSmartRecording = () => {
    setIsRecording(false);
    smartMic.stopListening();
    // The transcript will trigger handleSmartExtract via useEffect
  };

  // ---- Smart Extract: Send to backend for Gemini extraction ----
  const handleSmartExtract = async (transcript) => {
    if (!transcript || transcript.trim().length < 3) {
      setError('Could not hear anything. Please try again.');
      setPhase('idle');
      return;
    }

    setPhase('processing');

    try {
      const res = await ledgerAPI.submitText(
        state.vendorId,
        transcript.trim(),
        'hi'
      );

      const data = res.data.data;
      const extraction = data.extraction;

      // Store full extraction for display
      setExtractionResult(extraction);

      // Compute totals for the form
      const totalSales = (extraction.items || []).reduce((s, i) => s + (i.totalPrice || 0), 0);
      const totalExpenses = (extraction.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
      const itemNames = (extraction.items || []).map((i) => i.name).join(', ');

      setFormData({
        salesAmount: String(totalSales),
        expenseAmount: String(totalExpenses),
        itemsSold: itemNames || '',
        daySummary: '',
      });

      if (data.loanReadiness) {
        dispatch({ type: actionTypes.SET_LOAN_SCORE, payload: data.loanReadiness });
      }

      setPhase('review');
    } catch (err) {
      console.error('[SmartExtract] Error:', err);
      setError(err.response?.data?.error?.message || 'Extraction failed. Please try again.');
      setPhase('idle');
    }
  };

  // ---- End Vapi Call (user pressed End Call) ----
  const endCall = useCallback(() => {
    vapiRef.current?.stop();
    setCallStatus('');
    // Collect all user messages and send for extraction
    setMessages((prev) => {
      const userParts = prev
        .filter((m) => m.role === 'user')
        .map((m) => m.text)
        .join('. ');
      if (userParts.trim().length > 2) {
        handleVapiExtract(userParts);
      } else {
        setPhase('idle');
        setError('Not enough conversation data. Please try again and answer the questions.');
      }
      return prev;
    });
  }, []);

  // ---- Save to Ledger (user confirmed the reviewed data) ----
  const handleSave = async () => {
    setError('');
    setPhase('saving');

    try {
      // Build a clean transcript from the reviewed/edited form data
      const transcript = `Items sold: ${formData.itemsSold}. Total sales: ${formData.salesAmount} rupees. Total expenses: ${formData.expenseAmount} rupees.${formData.daySummary ? ' Day summary: ' + formData.daySummary : ''}`;

      const res = await ledgerAPI.submitText(state.vendorId, transcript, 'hi');

      if (res.data.data?.loanReadiness) {
        dispatch({ type: actionTypes.SET_LOAN_SCORE, payload: res.data.data.loanReadiness });
      }

      setPhase('saved');
    } catch (err) {
      console.error('[Save] Error:', err);
      setError(err.response?.data?.error?.message || 'Save failed. Please try again.');
      setPhase('review');
    }
  };

  // ---- Reset ----
  const handleReset = () => {
    setPhase('idle');
    setMode('choose');
    setFormData({ salesAmount: '', expenseAmount: '', itemsSold: '', daySummary: '' });
    setExtractionResult(null);
    setMessages([]);
    setError('');
    setCallStatus('');
    setRecordingTime(0);
    setIsRecording(false);
  };

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ---- Render ----
  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#0f0f23] p-2 md:p-0">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight"
              style={{ fontFamily: 'var(--font-display, Outfit, sans-serif)' }}>
            📋 <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Daily Log
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Speak naturally — AI detects your sales, expenses & items
          </p>
        </div>

        {/* ======== MODE CHOOSER ======== */}
        {mode === 'choose' && phase === 'idle' && (
          <div className="space-y-4 animate-[fadeIn_0.4s_ease]">

            {/* Mode: Smart Extract (primary) */}
            <button
              onClick={() => { setMode('smart'); }}
              className="w-full group bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20
                         rounded-2xl p-5 text-left transition-all duration-300
                         hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500
                               flex items-center justify-center shrink-0">
                  <Zap size={22} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-base mb-1">⚡ Smart Extract</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Speak freely about your day — <span className="text-indigo-300">AI auto-detects</span> sales, expenses, items & missed profits from your speech.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full">
                    ✨ Recommended
                  </span>
                </div>
                <ArrowRight size={18} className="text-slate-500 group-hover:text-indigo-400 transition-colors mt-1" />
              </div>
            </button>

            {/* Mode: AI Conversation (Vapi) */}
            <button
              onClick={() => { setMode('vapi'); }}
              className="w-full group bg-white/[0.02] border border-white/[0.08]
                         rounded-2xl p-5 text-left transition-all duration-300
                         hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500
                               flex items-center justify-center shrink-0">
                  <MessageSquare size={22} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-bold text-base mb-1">🗣️ AI Conversation</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    AI voice asks you questions one by one in Hinglish and extracts data from your answers.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                    🎙️ Guided flow
                  </span>
                </div>
                <ArrowRight size={18} className="text-slate-500 group-hover:text-purple-400 transition-colors mt-1" />
              </div>
            </button>
          </div>
        )}


        {/* ======== SMART EXTRACT MODE ======== */}
        {mode === 'smart' && phase === 'idle' && (
          <div className="flex flex-col items-center gap-6 animate-[fadeIn_0.4s_ease]">
            <div className="relative">
              <div className="absolute inset-[-16px] rounded-full border-2 border-indigo-500/10 animate-ping" style={{ animationDuration: '3s' }} />
              <button
                onClick={startSmartRecording}
                className="relative w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500
                           flex items-center justify-center shadow-2xl shadow-indigo-500/30
                           hover:scale-105 hover:shadow-indigo-500/50 active:scale-95
                           transition-all duration-300 cursor-pointer border-0"
              >
                <Mic size={40} className="text-white" />
              </button>
            </div>

            <div className="text-center">
              <p className="text-white font-semibold text-lg">Tap & Speak</p>
              <p className="text-slate-500 text-sm mt-1 max-w-xs leading-relaxed">
                Tell everything about your day — sales, expenses, items. AI will detect each part.
              </p>
            </div>

            <div className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
              <p className="text-xs text-slate-500 font-semibold mb-2">💡 Example</p>
              <p className="text-sm text-slate-400 leading-relaxed italic">
                "Aaj 50 samose beche 10 rupaye mein, chai se 500 rupaye aaye, 
                200 rupaye ka tel kharida, aur samose shaam ko khatam ho gaye"
              </p>
            </div>

            <button onClick={() => setMode('choose')} className="text-slate-500 text-sm hover:text-slate-300 transition-colors cursor-pointer bg-transparent border-0">
              ← Back
            </button>
          </div>
        )}

        {/* Smart Extract: Recording */}
        {mode === 'smart' && phase === 'recording' && (
          <div className="flex flex-col items-center gap-6 animate-[fadeIn_0.3s_ease]">
            <div className="relative">
              <div className="absolute inset-[-20px] rounded-full bg-red-500/15 animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="absolute inset-[-10px] rounded-full border-2 border-red-500/30 animate-pulse" />
              <button
                onClick={stopSmartRecording}
                className="relative w-28 h-28 rounded-full bg-gradient-to-br from-red-500 to-orange-500
                           flex items-center justify-center shadow-2xl shadow-red-500/30
                           hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border-0"
              >
                <MicOff size={36} className="text-white" />
              </button>
            </div>

            <div className="text-center">
              <p className="text-3xl font-extrabold text-red-400 font-mono">{formatTime(recordingTime)}</p>
              <p className="text-red-400/80 text-sm mt-1 animate-pulse">🔴 Listening... Tap to stop</p>
              <p className="text-slate-500 text-xs mt-2">Speak everything — sales, expenses, items</p>
            </div>
          </div>
        )}

        {/* Smart Extract: Processing */}
        {mode === 'smart' && phase === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-16 animate-[fadeIn_0.3s_ease]">
            <Loader2 size={40} className="text-indigo-400 animate-spin" />
            <div className="text-center">
              <p className="text-white font-semibold">AI is analyzing your speech...</p>
              <p className="text-slate-500 text-sm mt-1">Detecting sales, expenses, items & missed profits</p>
            </div>
          </div>
        )}


        {/* ======== VAPI MODE ======== */}
        {mode === 'vapi' && phase === 'idle' && (
          <div className="flex flex-col items-center gap-6 animate-[fadeIn_0.4s_ease]">
            <div className="relative">
              <div className="absolute inset-[-16px] rounded-full border-2 border-purple-500/10 animate-ping" style={{ animationDuration: '3s' }} />
              <button
                onClick={startVapiCall}
                className="relative w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-pink-500
                           flex items-center justify-center shadow-2xl shadow-purple-500/30
                           hover:scale-105 hover:shadow-purple-500/50 active:scale-95
                           transition-all duration-300 cursor-pointer border-0"
              >
                <Phone size={40} className="text-white" />
              </button>
            </div>

            <div className="text-center">
              <p className="text-white font-semibold text-lg">Start AI Conversation</p>
              <p className="text-slate-500 text-sm mt-1">AI will ask you questions by voice</p>
            </div>

            <button onClick={() => setMode('choose')} className="text-slate-500 text-sm hover:text-slate-300 transition-colors cursor-pointer bg-transparent border-0">
              ← Back
            </button>
          </div>
        )}

        {/* Vapi: Active Call */}
        {mode === 'vapi' && phase === 'calling' && (
          <div className="flex flex-col items-center gap-5 animate-[fadeIn_0.4s_ease]">
            <div className="relative">
              <div className="absolute inset-[-20px] rounded-full bg-green-500/15 animate-ping" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-[-10px] rounded-full border-2 border-green-500/30 animate-pulse" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500
                             flex items-center justify-center shadow-2xl shadow-green-500/30">
                <Volume2 size={32} className="text-white animate-pulse" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-green-400 font-semibold text-sm">{callStatus}</p>
              <p className="text-slate-500 text-xs mt-1">Speak naturally in Hindi, English, or Hinglish</p>
            </div>

            {/* Live Messages */}
            {messages.length > 0 && (
              <div className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 max-h-52 overflow-y-auto">
                <p className="text-xs text-slate-500 mb-3 font-semibold">💬 Conversation</p>
                <div className="space-y-2">
                  {messages.slice(-8).map((msg, i) => (
                    <div
                      key={i}
                      className={`text-sm px-3 py-2 rounded-xl max-w-[85%] ${
                        msg.role === 'assistant'
                          ? 'bg-indigo-500/10 text-indigo-300 mr-auto rounded-bl-sm'
                          : 'bg-white/5 text-slate-300 ml-auto text-right rounded-br-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={endCall}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500/15 border border-red-500/30 rounded-xl
                         text-red-400 font-semibold text-sm hover:bg-red-500/25 transition-all duration-200 cursor-pointer"
            >
              <PhoneOff size={15} />
              End Call
            </button>
          </div>
        )}


        {/* ======== PROCESSING PHASE (extracting from transcript) ======== */}
        {phase === 'processing' && (
          <div className="flex flex-col items-center gap-5 py-16 animate-[fadeIn_0.3s_ease]">
            <Loader2 size={44} className="text-indigo-400 animate-spin" />
            <div className="text-center">
              <p className="text-white font-semibold text-lg">Extracting your data...</p>
              <p className="text-slate-400 text-sm mt-1">AI is parsing items, amounts &amp; expenses from your conversation</p>
            </div>
          </div>
        )}


        {/* ======== REVIEW PHASE (both modes) ======== */}
        {phase === 'review' && (
          <div className="animate-[fadeIn_0.4s_ease]">

            {/* Success banner */}
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl p-3.5 mb-5">
              <CheckCircle size={18} className="text-green-400 shrink-0" />
              <div>
                <p className="text-green-400 font-semibold text-sm">✅ Data Extracted — Review Before Saving</p>
                <p className="text-slate-500 text-xs mt-0.5">Edit any values below, then confirm to save to ledger. Or discard to start over.</p>
              </div>
            </div>

            {/* Extracted Items Detail (Smart mode only) */}
            {extractionResult && extractionResult.items?.length > 0 && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 mb-4">
                <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5">
                  <ShoppingBag size={13} /> DETECTED ITEMS
                </h4>
                <div className="space-y-1.5">
                  {extractionResult.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-sm py-1.5 border-b border-white/5 last:border-0">
                      <span className="text-slate-300">
                        {item.name} <span className="text-slate-500">× {item.quantity}</span>
                        {item.confidence < 0.7 && <span className="ml-1" title="Low confidence">⚠️</span>}
                      </span>
                      <span className="font-semibold text-green-400">₹{item.totalPrice}</span>
                    </div>
                  ))}
                </div>

                {extractionResult.expenses?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <h4 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                      <TrendingDown size={13} /> DETECTED EXPENSES
                    </h4>
                    {extractionResult.expenses.map((exp, i) => (
                      <div key={i} className="flex justify-between text-sm py-1">
                        <span className="text-slate-400">{exp.description || exp.category}</span>
                        <span className="text-red-400 font-semibold">-₹{exp.amount}</span>
                      </div>
                    ))}
                  </div>
                )}

                {extractionResult.missedProfits?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <h4 className="text-xs font-bold text-slate-400 mb-2">📉 MISSED PROFITS</h4>
                    {extractionResult.missedProfits.map((mp, i) => (
                      <div key={i} className="text-sm py-1 text-amber-400">
                        {mp.item}: ~₹{mp.estimatedLoss} <span className="text-slate-500 text-xs">"{mp.triggerPhrase}"</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Editable Form */}
            <div className="bg-white/[0.03] backdrop-blur-lg border border-white/[0.08] rounded-2xl p-5 space-y-4">
              <VoiceField
                id="field-sales"
                label="Total Sales (₹)"
                icon={TrendingUp}
                type="number"
                value={formData.salesAmount}
                onChange={(val) => setFormData((p) => ({ ...p, salesAmount: val }))}
                placeholder="e.g. 1500"
                prefix="₹"
              />

              <VoiceField
                id="field-expenses"
                label="Total Expenses (₹)"
                icon={TrendingDown}
                type="number"
                value={formData.expenseAmount}
                onChange={(val) => setFormData((p) => ({ ...p, expenseAmount: val }))}
                placeholder="e.g. 400"
                prefix="₹"
              />

              <VoiceField
                id="field-items"
                label="Items Sold"
                icon={ShoppingBag}
                type="text"
                value={formData.itemsSold}
                onChange={(val) => setFormData((p) => ({ ...p, itemsSold: val }))}
                placeholder="e.g. samosa, chai, pakora"
              />

              {/* Computed Profit */}
              {formData.salesAmount && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3.5 flex justify-between items-center">
                  <span className="text-sm text-indigo-300 font-medium flex items-center gap-1.5">
                    <IndianRupee size={14} /> Net Profit
                  </span>
                  <span className="text-xl font-extrabold text-white"
                        style={{ fontFamily: 'var(--font-display, Outfit, sans-serif)' }}>
                    ₹{(Number(formData.salesAmount) || 0) - (Number(formData.expenseAmount) || 0)}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSave}
                disabled={!formData.salesAmount || !formData.itemsSold}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm
                           bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white
                           shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02]
                           active:scale-[0.98] transition-all duration-200 cursor-pointer border-0
                           disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Save size={16} />
                ✅ Confirm & Save to Ledger
              </button>

              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm
                           bg-red-500/10 border border-red-500/20 text-red-400
                           hover:bg-red-500/20 transition-all duration-200 cursor-pointer"
              >
                🗑️ Discard
              </button>

              <button
                onClick={handleReset}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10
                           text-slate-400 hover:bg-white/10 hover:text-white transition-all duration-200 cursor-pointer"
                title="Start over"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        )}


        {/* ======== SAVING ======== */}
        {phase === 'saving' && (
          <div className="flex flex-col items-center gap-4 py-16 animate-[fadeIn_0.3s_ease]">
            <Loader2 size={40} className="text-indigo-400 animate-spin" />
            <p className="text-slate-300 font-medium">Saving to ledger...</p>
          </div>
        )}

        {/* ======== SAVED ======== */}
        {phase === 'saved' && (
          <div className="flex flex-col items-center gap-5 py-10 animate-[fadeIn_0.4s_ease]">
            <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center">
              <CheckCircle size={40} className="text-green-400" />
            </div>

            <div className="text-center">
              <p className="text-white font-bold text-xl">Saved! 🎉</p>
              <p className="text-slate-400 text-sm mt-1">Your daily log has been recorded.</p>
            </div>

            <div className="w-full bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-slate-500">Sales</p>
                  <p className="text-lg font-bold text-green-400">₹{formData.salesAmount || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Expenses</p>
                  <p className="text-lg font-bold text-red-400">₹{formData.expenseAmount || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Profit</p>
                  <p className="text-lg font-bold text-indigo-400">
                    ₹{(Number(formData.salesAmount) || 0) - (Number(formData.expenseAmount) || 0)}
                  </p>
                </div>
              </div>
              {formData.itemsSold && (
                <div className="mt-3 pt-3 border-t border-white/5 text-center">
                  <p className="text-xs text-slate-500">Items</p>
                  <p className="text-sm text-slate-300 mt-1">{formData.itemsSold}</p>
                </div>
              )}
            </div>

            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl
                         text-slate-300 font-semibold text-sm hover:bg-white/10 transition-all duration-200 cursor-pointer"
            >
              <RotateCcw size={14} />
              Record Another
            </button>
          </div>
        )}


        {/* ======== Error Toast ======== */}
        {error && (
          <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50
                          bg-red-500/15 border border-red-500/30 rounded-xl p-4 backdrop-blur-lg
                          animate-[fadeIn_0.3s_ease]">
            <div className="flex items-start gap-3">
              <span className="text-red-400 text-base">⚠️</span>
              <p className="flex-1 text-red-300 text-sm">{error}</p>
              <button
                onClick={() => setError('')}
                className="text-red-400/60 hover:text-red-400 cursor-pointer bg-transparent border-0 text-base"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
