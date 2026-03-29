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
  IndianRupee, ShoppingBag, TrendingDown, TrendingUp, Lightbulb, Edit3, MessageCircle, FileText, Brain
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
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
        <Icon size={15} style={{ color: 'var(--primary-500)' }} />
        {label}
      </label>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          {prefix && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none" style={{ color: 'var(--text-muted)' }}>
              {prefix}
            </span>
          )}
          <input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={`w-full rounded-xl py-3 text-base transition-all duration-200 focus:outline-none ${prefix ? 'pl-8 pr-4' : 'px-4'}`}
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          />
        </div>

        <button
          type="button"
          onClick={() => fieldMic.isListening ? fieldMic.stopListening() : fieldMic.startListening()}
          disabled={!fieldMic.isSupported}
          className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          style={fieldMic.isListening
            ? { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--danger-400)' }
            : { background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }
          }
          title={fieldMic.isListening ? 'Stop' : 'Speak to correct'}
        >
          {fieldMic.isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      </div>

      {fieldMic.isListening && (
        <p className="text-xs mt-1.5 flex items-center gap-1 animate-pulse" style={{ color: 'var(--danger-400)' }}>
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

  // Editable item/expense lists for review phase
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewExpenses, setReviewExpenses] = useState([]);

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

      // Populate editable review items
      const items = (extraction.items || []).map(item => ({
        name: item.name || '',
        quantity: String(item.quantity || 1),
        unitPrice: String(item.unitPrice || ''),
        totalPrice: String(item.totalPrice || 0),
      }));
      const expenses = (extraction.expenses || []).map(exp => ({
        description: exp.description || exp.category || '',
        category: exp.category || 'raw_material',
        amount: String(exp.amount || 0),
      }));
      setReviewItems(items.length > 0 ? items : [{ name: '', quantity: '1', unitPrice: '', totalPrice: '' }]);
      setReviewExpenses(expenses.length > 0 ? expenses : [{ description: '', category: 'raw_material', amount: '' }]);

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

      // Populate editable review items
      const items = (extraction.items || []).map(item => ({
        name: item.name || '',
        quantity: String(item.quantity || 1),
        unitPrice: String(item.unitPrice || ''),
        totalPrice: String(item.totalPrice || 0),
      }));
      const expenses = (extraction.expenses || []).map(exp => ({
        description: exp.description || exp.category || '',
        category: exp.category || 'raw_material',
        amount: String(exp.amount || 0),
      }));
      setReviewItems(items.length > 0 ? items : [{ name: '', quantity: '1', unitPrice: '', totalPrice: '' }]);
      setReviewExpenses(expenses.length > 0 ? expenses : [{ description: '', category: 'raw_material', amount: '' }]);

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
      // Use the edited item-level data via manual entry endpoint
      const validItems = reviewItems.filter(it => it.name.trim() && Number(it.totalPrice) > 0);
      const validExpenses = reviewExpenses.filter(ex => ex.description.trim() && Number(ex.amount) > 0);

      const res = await ledgerAPI.manualEntry(state.vendorId, {
        items: validItems,
        expenses: validExpenses,
      });

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
    setReviewItems([]);
    setReviewExpenses([]);
    setMessages([]);
    setError('');
    setCallStatus('');
    setRecordingTime(0);
    setIsRecording(false);
  };

  // ---- Review form helpers ----
  const updateReviewItem = (index, field, value) => {
    setReviewItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = Number(field === 'quantity' ? value : updated[index].quantity) || 0;
        const price = Number(field === 'unitPrice' ? value : updated[index].unitPrice) || 0;
        updated[index].totalPrice = String(qty * price);
      }
      return updated;
    });
  };
  const addReviewItem = () => setReviewItems(prev => [...prev, { name: '', quantity: '1', unitPrice: '', totalPrice: '' }]);
  const removeReviewItem = (i) => { if (reviewItems.length > 1) setReviewItems(prev => prev.filter((_, idx) => idx !== i)); };

  const updateReviewExpense = (index, field, value) => {
    setReviewExpenses(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };
  const addReviewExpense = () => setReviewExpenses(prev => [...prev, { description: '', category: 'raw_material', amount: '' }]);
  const removeReviewExpense = (i) => { if (reviewExpenses.length > 1) setReviewExpenses(prev => prev.filter((_, idx) => idx !== i)); };

  const reviewTotalSales = reviewItems.reduce((s, it) => s + (Number(it.totalPrice) || 0), 0);
  const reviewTotalExpenses = reviewExpenses.reduce((s, ex) => s + (Number(ex.amount) || 0), 0);
  const reviewProfit = reviewTotalSales - reviewTotalExpenses;

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ---- Render ----
  return (
    <div className="min-h-[calc(100vh-40px)]" style={{ padding: '0' }}>
      <div className="max-w-4xl mx-auto" style={{ paddingTop: '8px' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.2rem, 5vw, 1.75rem)', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={24} style={{ color: 'var(--primary-500)', flexShrink: 0 }} /> 
            <span className="gradient-text" style={{ paddingBottom: '2px' }}>Daily Log</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Speak naturally — AI detects your sales, expenses & items
          </p>
        </div>

        {/* ======== AI CONVERSATION HERO ======== */}
        {mode === 'choose' && phase === 'idle' && (
          <div className="flex flex-col items-center animate-[fadeIn_0.5s_ease]"
               style={{ marginTop: '32px', paddingBottom: '40px' }}>
            
            <div style={{ 
              background: 'var(--bg-card)', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: '32px', 
              padding: '48px 40px', 
              textAlign: 'center', 
              width: '100%', 
              maxWidth: '460px', 
              boxShadow: '0 20px 40px -12px rgba(0,0,0,0.08), 0 0 0 1px rgba(34,197,94,0.05)', 
              position: 'relative', 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              {/* Top gradient line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'var(--gradient-primary)' }} />
              
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '28px' }}>
                <div className="animate-ping" style={{ position: 'absolute', inset: '-16px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', animationDuration: '3s' }} />
                <div className="animate-pulse" style={{ position: 'absolute', inset: '-8px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', animationDuration: '2s' }} />
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 36px -8px rgba(34,197,94,0.5)', position: 'relative' }}>
                  <Mic size={38} className="text-white" />
                </div>
              </div>
              
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', letterSpacing: '-0.02em' }}>
                AI Conversation
              </h2>
              
              <div style={{ 
                  background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)', 
                  borderRadius: '20px', padding: '20px', marginBottom: '32px', width: '100%' 
              }}>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.3, margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                  बस बोलो — बाकी AI संभालेगा
                </p>
                <p style={{ fontSize: '0.85rem', fontWeight: 500, margin: 0, color: 'var(--text-muted)' }}>
                  (Just speak — AI handles the rest)
                </p>
              </div>
              
              <button onClick={() => { setMode('vapi'); }} 
                      className="w-full transition-all duration-300 cursor-pointer border-0 hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98]" 
                      style={{ 
                        background: 'var(--gradient-primary)', 
                        color: 'white', padding: '16px 24px', 
                        borderRadius: '20px', fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-body)', 
                        boxShadow: '0 8px 24px -4px rgba(34,197,94,0.35)', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' 
                      }}>
                <Phone size={20} /> Start Conversation
              </button>
            </div>
            
            <div style={{ marginTop: '28px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
              <Lightbulb size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom', color: 'var(--primary-400)' }} /> 
              Tip: Just answer the AI's questions naturally — it handles the rest!
            </div>
          </div>
        )}


        {/* ======== SMART EXTRACT MODE ======== */}
        {mode === 'smart' && phase === 'idle' && (
          <div className="flex flex-col items-center gap-6 animate-[fadeIn_0.4s_ease]" style={{ marginTop: '32px', paddingBottom: '40px' }}>
            <div className="relative">
              <div className="absolute inset-[-16px] rounded-full animate-ping" style={{ border: '2px solid rgba(34,197,94,0.1)', animationDuration: '3s' }} />
              <button onClick={startSmartRecording} className="relative w-32 h-32 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer border-0" style={{ background: 'var(--gradient-primary)', boxShadow: '0 12px 40px -8px rgba(34,197,94,0.35)' }}>
                <Mic size={40} className="text-white" />
              </button>
            </div>
            <div className="text-center">
              <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Tap & Speak</p>
              <p className="text-sm mt-1 max-w-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>Tell everything about your day — sales, expenses, items. AI will detect each part.</p>
            </div>
            <div className="w-full rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-3xl)' }}>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}><Lightbulb size={12} /> Example</p>
              <p className="text-sm leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>"Aaj 50 samose beche 10 rupaye mein, chai se 500 rupaye aaye, 200 rupaye ka tel kharida, aur samose shaam ko khatam ho gaye"</p>
            </div>
            <button onClick={() => setMode('choose')} className="text-sm transition-colors cursor-pointer bg-transparent border-0" style={{ color: 'var(--text-muted)' }}>← Back</button>
          </div>
        )}

        {/* Smart Extract: Recording */}
        {mode === 'smart' && phase === 'recording' && (
          <div className="flex flex-col items-center gap-6 animate-[fadeIn_0.3s_ease]" style={{ marginTop: '32px', paddingBottom: '40px' }}>
            <div className="relative">
              <div className="absolute inset-[-20px] rounded-full animate-ping" style={{ background: 'rgba(239,68,68,0.1)', animationDuration: '1.5s' }} />
              <div className="absolute inset-[-10px] rounded-full animate-pulse" style={{ border: '2px solid rgba(239,68,68,0.25)' }} />
              <button onClick={stopSmartRecording} className="relative w-28 h-28 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border-0" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', boxShadow: '0 12px 40px -8px rgba(239,68,68,0.35)' }}>
                <MicOff size={36} className="text-white" />
              </button>
            </div>
            <div className="text-center">
              <p className="text-3xl font-extrabold font-mono" style={{ color: 'var(--danger-400)' }}>{formatTime(recordingTime)}</p>
              <p className="text-sm mt-1 animate-pulse" style={{ color: 'rgba(239,68,68,0.7)' }}>Listening... Tap to stop</p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Speak everything — sales, expenses, items</p>
            </div>
          </div>
        )}

        {/* Smart Extract: Processing */}
        {mode === 'smart' && phase === 'processing' && (
          <div className="flex flex-col items-center gap-4 py-16 animate-[fadeIn_0.3s_ease]" style={{ marginTop: '32px', paddingBottom: '40px' }}>
            <Loader2 size={40} style={{ color: 'var(--primary-500)' }} className="animate-spin" />
            <div className="text-center">
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>AI is analyzing your speech...</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Detecting sales, expenses, items & missed profits</p>
            </div>
          </div>
        )}


        {/* ======== VAPI MODE — Start Call ======== */}
        {mode === 'vapi' && phase === 'idle' && (
          <div className="flex flex-col items-center animate-[fadeIn_0.5s_ease]" style={{ marginTop: '32px', paddingBottom: '40px' }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-3xl)', padding: '48px 36px 40px', textAlign: 'center', width: '100%', maxWidth: '420px', boxShadow: '0 4px 24px -4px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--gradient-primary)', borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0' }} />
              <div style={{ position: 'relative', display: 'inline-block', marginBottom: '24px' }}>
                <div className="animate-ping" style={{ position: 'absolute', inset: '-18px', borderRadius: '50%', border: '2px solid rgba(34,197,94,0.12)', animationDuration: '2.5s' }} />
                <div className="animate-pulse" style={{ position: 'absolute', inset: '-10px', borderRadius: '50%', background: 'rgba(34,197,94,0.06)' }} />
                <button onClick={startVapiCall} className="relative hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer border-0" style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 40px -6px rgba(34,197,94,0.4)' }}>
                  <Phone size={40} className="text-white" />
                </button>
              </div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>Tap to Start</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>AI will guide you through voice questions</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {[{ num: '1', text: 'AI asks question' }, { num: '2', text: 'You answer' }, { num: '3', text: 'Review & Save' }].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'white' }}>{step.num}</div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{step.text}</span>
                    {i < 2 && <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', margin: '0 2px' }}>→</span>}
                  </div>
                ))}
              </div>
              <button onClick={() => setMode('choose')} className="transition-colors cursor-pointer bg-transparent border-0" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 500 }}>← Back</button>
            </div>
            <div style={{ marginTop: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.76rem', maxWidth: '340px' }}>
              <Mic size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} /> Make sure your microphone is enabled — speak in any language you're comfortable with!
            </div>
          </div>
        )}

        {/* Vapi: Active Call */}
        {mode === 'vapi' && phase === 'calling' && (
          <div className="flex flex-col items-center gap-5 animate-[fadeIn_0.4s_ease]" style={{ marginTop: '32px', paddingBottom: '40px', width: '100%', maxWidth: '560px', margin: '32px auto 0' }}>
            {/* Pulsing mic orb */}
            <div className="relative">
              <div className="absolute inset-[-20px] rounded-full animate-ping" style={{ background: 'rgba(34,197,94,0.1)', animationDuration: '2s' }} />
              <div className="absolute inset-[-10px] rounded-full animate-pulse" style={{ border: '2px solid rgba(34,197,94,0.25)' }} />
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-primary)', boxShadow: '0 12px 40px -8px rgba(34,197,94,0.35)' }}>
                <Volume2 size={28} className="text-white animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm" style={{ color: 'var(--primary-500)' }}>{callStatus}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Speak naturally in Hindi, English, or Hinglish</p>
            </div>

            {/* Conversation transcript */}
            {messages.length > 0 && (
              <div className="w-full" style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '20px',
                maxHeight: '320px',
                overflowY: 'auto',
                boxShadow: '0 2px 12px -2px rgba(0,0,0,0.04)'
              }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={12} /> Live Conversation
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {messages.slice(-8).map((msg, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'assistant' ? 'flex-start' : 'flex-end' }}>
                      {/* Sender label */}
                      <span style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        marginBottom: '4px',
                        color: msg.role === 'assistant' ? 'var(--primary-500)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {msg.role === 'assistant' ? (
                          <><Brain size={10} /> AI Assistant</>
                        ) : (
                          <><Mic size={10} /> You</>
                        )}
                      </span>
                      {/* Message bubble */}
                      <div style={{
                        maxWidth: '85%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        fontSize: '0.85rem',
                        lineHeight: 1.5,
                        ...(msg.role === 'assistant'
                          ? {
                              background: 'rgba(34,197,94,0.06)',
                              color: 'var(--text-primary)',
                              borderBottomLeftRadius: '4px',
                              border: '1px solid rgba(34,197,94,0.1)'
                            }
                          : {
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-primary)',
                              borderBottomRightRadius: '4px',
                              border: '1px solid var(--border-subtle)'
                            }
                        )
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button onClick={endCall} className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--danger-400)' }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(239,68,68,0.12)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(239,68,68,0.08)'}
            >
              <PhoneOff size={15} /> End Call
            </button>
          </div>
        )}


        {/* ======== PROCESSING PHASE ======== */}
        {phase === 'processing' && (
          <div className="flex flex-col items-center gap-5 py-16 animate-[fadeIn_0.3s_ease]" style={{ marginTop: '32px', paddingBottom: '40px' }}>
            <Loader2 size={44} style={{ color: 'var(--primary-500)' }} className="animate-spin" />
            <div className="text-center">
              <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>Extracting your data...</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>AI is parsing items, amounts &amp; expenses from your conversation</p>
            </div>
          </div>
        )}


        {/* ======== REVIEW PHASE — Editable Item-Level Form ======== */}
        {phase === 'review' && (
          <div className="animate-[fadeIn_0.4s_ease]">
            {/* Review banner */}
            <div className="flex items-center gap-3 rounded-xl p-3.5 mb-5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-2xl)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(99,102,241,0.12)' }}>
                <CheckCircle size={20} style={{ color: 'var(--text-accent)' }} />
              </div>
              <div>
                <p className="font-semibold text-sm flex items-center gap-1" style={{ color: 'var(--text-primary)' }}><Edit3 size={14} /> Review AI Extracted Data</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Edit any values below if the AI got something wrong, then confirm to save</p>
              </div>
            </div>

            {/* Items Sold — Editable */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-3xl)', padding: '16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--gradient-primary)', borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0' }} />
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <ShoppingBag size={15} style={{ color: 'var(--primary-500)' }} /> Items Sold
                </h4>
                <button onClick={addReviewItem} style={{ background: 'rgba(34,197,94,0.08)', color: 'var(--primary-500)', padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', border: 'none', cursor: 'pointer' }}>
                  + Add Item
                </button>
              </div>

              {/* Scrollable grid for mobile */}
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 36px', gap: '6px', marginBottom: '6px', padding: '0 2px', minWidth: '400px' }}>
                {['Item Name', 'Qty', 'Unit ₹', 'Total ₹', ''].map(h => (
                  <span key={h} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
                ))}
              </div>

              {reviewItems.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 36px', gap: '6px', marginBottom: '8px', alignItems: 'center', minWidth: '400px' }}>
                  <input type="text" value={item.name} onChange={e => updateReviewItem(i, 'name', e.target.value)} placeholder="e.g. Samosa"
                    style={{ padding: '9px 10px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-body)', width: '100%' }} />
                  <input type="number" value={item.quantity} min="1" onChange={e => updateReviewItem(i, 'quantity', e.target.value)}
                    style={{ padding: '9px 10px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-body)', width: '100%' }} />
                  <input type="number" value={item.unitPrice} min="0" onChange={e => updateReviewItem(i, 'unitPrice', e.target.value)} placeholder="₹"
                    style={{ padding: '9px 10px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-body)', width: '100%' }} />
                  <div style={{ padding: '9px 10px', borderRadius: 'var(--radius-lg)', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-500)', textAlign: 'center' }}>
                    ₹{Number(item.totalPrice) || 0}
                  </div>
                  <button onClick={() => removeReviewItem(i)} disabled={reviewItems.length <= 1} style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius-lg)', padding: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger-400)', border: 'none', cursor: 'pointer', opacity: reviewItems.length <= 1 ? 0.2 : 1 }}>
                    ✕
                  </button>
                </div>
              ))}
              </div>
            </div>
            <div style={{ height: '12px' }} />

            {/* Expenses — Editable */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-3xl)', padding: '16px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(135deg, #ef4444, #f97316)', borderRadius: 'var(--radius-3xl) var(--radius-3xl) 0 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                  <TrendingDown size={15} style={{ color: 'var(--danger-400)' }} /> Expenses
                </h4>
                <button onClick={addReviewExpense} style={{ background: 'rgba(239,68,68,0.06)', color: 'var(--danger-400)', padding: '5px 12px', borderRadius: 'var(--radius-full)', fontSize: '0.72rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', border: 'none', cursor: 'pointer' }}>
                  + Add Expense
                </button>
              </div>

              {/* Scrollable grid for mobile */}
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 36px', gap: '6px', marginBottom: '6px', padding: '0 2px', minWidth: '360px' }}>
                {['Description', 'Category', 'Amount ₹', ''].map(h => (
                  <span key={h} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</span>
                ))}
              </div>

              {reviewExpenses.map((exp, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1fr 36px', gap: '6px', marginBottom: '8px', alignItems: 'center', minWidth: '360px' }}>
                  <input type="text" value={exp.description} onChange={e => updateReviewExpense(i, 'description', e.target.value)} placeholder="e.g. Oil, Flour"
                    style={{ padding: '9px 10px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-body)', width: '100%' }} />
                  <select value={exp.category} onChange={e => updateReviewExpense(i, 'category', e.target.value)}
                    style={{ padding: '9px 10px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-body)', width: '100%' }}>
                    <option value="raw_material">Raw Material</option>
                    <option value="transport">Transport</option>
                    <option value="rent">Rent</option>
                    <option value="labor">Labor</option>
                    <option value="utilities">Utilities</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="number" value={exp.amount} min="0" onChange={e => updateReviewExpense(i, 'amount', e.target.value)} placeholder="₹200"
                    style={{ padding: '9px 10px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-body)', width: '100%' }} />
                  <button onClick={() => removeReviewExpense(i)} disabled={reviewExpenses.length <= 1} style={{ background: 'rgba(239,68,68,0.06)', borderRadius: 'var(--radius-lg)', padding: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger-400)', border: 'none', cursor: 'pointer', opacity: reviewExpenses.length <= 1 ? 0.2 : 1 }}>
                    ✕
                  </button>
                </div>
              ))}
              </div>
            </div>
            <div style={{ height: '12px' }} />

            {/* Totals Summary */}
            <div style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-3xl)', padding: '16px',
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', textAlign: 'center',
              marginBottom: '16px',
            }}>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>Total Sales</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-500)' }}>₹{reviewTotalSales.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>Total Expenses</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--danger-400)' }}>₹{reviewTotalExpenses.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '3px' }}>Net Profit</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: reviewProfit >= 0 ? 'var(--primary-500)' : 'var(--danger-400)' }}>
                  {reviewProfit >= 0 ? '+' : ''}₹{reviewProfit.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={reviewItems.every(it => !it.name.trim())} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer border-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100" style={{ background: 'var(--gradient-primary)', boxShadow: '0 8px 24px -4px rgba(34,197,94,0.3)', borderRadius: 'var(--radius-lg)' }}>
                <Save size={16} /> ✅ Confirm & Save to Ledger
              </button>
              <button onClick={handleReset} className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: 'var(--danger-400)', borderRadius: 'var(--radius-lg)' }}>
                🗑️ Discard
              </button>
            </div>
          </div>
        )}


        {/* ======== SAVING ======== */}
        {phase === 'saving' && (
          <div className="flex flex-col items-center gap-4 py-16 animate-[fadeIn_0.3s_ease]">
            <Loader2 size={40} style={{ color: 'var(--primary-500)' }} className="animate-spin" />
            <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>Saving to ledger...</p>
          </div>
        )}

        {/* ======== SAVED ======== */}
        {phase === 'saved' && (
          <div className="flex flex-col items-center gap-5 py-10 animate-[fadeIn_0.4s_ease]">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <CheckCircle size={40} style={{ color: 'var(--primary-500)' }} />
            </div>
            <div className="text-center">
              <p className="font-bold text-xl" style={{ color: 'var(--text-primary)' }}>Saved! 🎉</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Your daily log has been recorded.</p>
            </div>
            <div className="w-full rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-3xl)' }}>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sales</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--primary-500)' }}>₹{formData.salesAmount || 0}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Expenses</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--danger-400)' }}>₹{formData.expenseAmount || 0}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Profit</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-accent)' }}>₹{(Number(formData.salesAmount) || 0) - (Number(formData.expenseAmount) || 0)}</p>
                </div>
              </div>
              {formData.itemsSold && (
                <div className="mt-3 pt-3 text-center" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Items</p>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{formData.itemsSold}</p>
                </div>
              )}
            </div>
            <button onClick={handleReset} className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
              <RotateCcw size={14} /> Record Another
            </button>
          </div>
        )}


        {/* ======== Error Toast ======== */}
        {error && (
          <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 rounded-xl p-4 backdrop-blur-lg animate-[fadeIn_0.3s_ease]" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-2xl)' }}>
            <div className="flex items-start gap-3">
              <span style={{ color: 'var(--danger-400)' }} className="text-base">⚠️</span>
              <p className="flex-1 text-sm" style={{ color: 'var(--danger-400)' }}>{error}</p>
              <button onClick={() => setError('')} className="cursor-pointer bg-transparent border-0 text-base" style={{ color: 'var(--danger-400)', opacity: 0.7 }}>✕</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

