/**
 * Assistant View — AI Voice Assistant Chat Interface
 *
 * Features:
 * - Conversational chat UI with message bubbles
 * - Text input + Web Speech API mic button for voice queries
 * - Real-time AI responses powered by GPT-4o-mini with 7-day data context
 * - Auto-scroll to latest message
 * - Suggested quick questions
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../state/AppContext';
import { assistantAPI, ledgerAPI } from '../api';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import ReviewForm from '../components/ledger/ReviewForm';

const QUICK_QUESTIONS = [
  'Aaj ka total kitna hai?',
  'Sabse zyada kya bikta hai?',
  'Is hafte ki kamai?',
  'Mera loan score kya hai?',
  'Kal ka kharcha kitna tha?',
  'Missed profit kitna hai?',
];

import { Bot, CheckCircle, Send, Mic, Square, AlertCircle } from 'lucide-react';

export default function Assistant() {
  const { state } = useApp();
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'ai',
      text: 'Namaste! Main aapka AI business assistant hoon. Apne business ke baare mein kuch bhi poochiye — Hindi ya English mein!',
      time: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Web Speech API for voice input
  const speech = useVoiceRecorder({ lang: 'hi-IN', maxDurationSeconds: 30 });

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // When speech stops and has transcript, inject it into input
  useEffect(() => {
    if (!speech.isListening && speech.hasTranscript) {
      setInput(speech.transcript);
      speech.resetTranscript();
    }
  }, [speech.isListening, speech.hasTranscript]);

  // Send message
  const handleSend = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;

    // Add user bubble
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: msg,
      time: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await assistantAPI.chat(state.vendorId, msg);
      const aiMsg = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        text: res.data.data.type === 'logging' ? 'Maine aapki bataayi gayi jaankari nikaal li hai. Kripya niche review karein aur save karein:' : res.data.data.reply,
        type: res.data.data.type || 'query',
        extraction: res.data.data.extraction,
        time: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'ai',
        text: 'Maaf kijiye, abhi jawab nahi mil paya. Thodi der baad try karein.',
        time: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [input, isLoading, state.vendorId]);

  // Handle save from inline ReviewForm
  const handleSaveLogging = async (msgId, data) => {
    setIsLoading(true);
    try {
      await ledgerAPI.manualEntry(state.vendorId, data);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isSaved: true } : m));
      setMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: 'ai',
        type: 'query',
        text: 'Aapka data ledger mein save ho gaya hai!',
        time: new Date(),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'ai',
        text: 'Save fail ho gaya. Kripya dubara koshish karein.',
        time: new Date(),
        isError: true,
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicToggle = () => {
    if (speech.isListening) {
      speech.stopListening();
    } else {
      speech.startListening();
    }
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 80px)',
        maxHeight: 'calc(100vh - 80px)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-md)', flexShrink: 0 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}
        >
          <Bot size={24} style={{ color: 'var(--primary-500)', flexShrink: 0 }} />
          <span className="gradient-text">{t('assistant.title')}</span>
          <span
            className="badge badge-success"
            style={{ fontSize: '0.65rem', marginLeft: 'auto' }}
          >
            ● Online
          </span>
        </h1>
      </div>

      {/* Chat Messages Area */}
      <div
        className="glass-card"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-md)',
          minHeight: 0,
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            {/* Bubble */}
            <div
              style={{
                padding: '14px 18px',
                borderRadius:
                  msg.role === 'user'
                    ? '20px 20px 4px 20px'
                    : '20px 20px 20px 4px',
                background:
                  msg.role === 'user'
                    ? 'linear-gradient(135deg, var(--primary-500), var(--primary-600))'
                    : msg.isError
                    ? 'rgba(239, 68, 68, 0.08)'
                    : 'var(--bg-card)',
                border:
                  msg.role === 'ai'
                    ? '1px solid var(--border-subtle)'
                    : 'none',
                boxShadow: msg.role === 'user' 
                    ? '0 6px 16px -4px rgba(34,197,94,0.35)' 
                    : '0 4px 12px -2px rgba(0,0,0,0.04)',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                fontWeight: msg.role === 'user' ? 500 : 400,
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {msg.text}
            </div>

            {/* Inline Review Form for logging intents */}
            {msg.type === 'logging' && msg.extraction && !msg.isSaved && (
              <div style={{ marginTop: '12px', width: '100%' }}>
                <ReviewForm
                  initialItems={msg.extraction.items || []}
                  initialExpenses={msg.extraction.expenses || []}
                  reviewSource="assistant"
                  reviewMode={true}
                  processing={isLoading}
                  onSave={(data) => handleSaveLogging(msg.id, data)}
                  onDiscard={() => setMessages(prev => prev.filter(m => m.id !== msg.id))}
                />
              </div>
            )}
            
            {msg.type === 'logging' && msg.isSaved && (
              <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--success-500)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={14} /> Entry Saved Successfully
              </div>
            )}

            {/* Timestamp */}
            <div
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                marginTop: 4,
                padding: '0 4px',
              }}
            >
              {msg.role === 'ai' ? <Bot size={12} style={{ display: 'inline', marginRight: '4px' }} /> : ''}
              {formatTime(msg.time)}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              alignSelf: 'flex-start',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px 16px 16px 4px',
            }}
          >
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'var(--text-muted)',
                    animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {t('assistant.thinking')}
            </span>
          </div>
        )}

        {/* Speech listening indicator */}
        {speech.isListening && (
          <div
            style={{
              alignSelf: 'flex-end',
              padding: '8px 16px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              fontSize: '0.82rem',
              color: 'var(--danger-400)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
            }}
          >
            Listening... {speech.interimText && (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {speech.interimText}
              </span>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions (show when no conversation yet) */}
      {messages.length <= 1 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-xs)',
            marginBottom: 'var(--space-md)',
            flexShrink: 0,
          }}
        >
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              className="btn btn-ghost"
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '10px 18px',
                borderRadius: '24px',
                background: 'rgba(34,197,94,0.06)',
                color: 'var(--primary-600)',
                border: '1px solid rgba(34,197,94,0.2)',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 8px -2px rgba(34,197,94,0.1)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.background = 'rgba(34,197,94,0.1)' }}
              onMouseLeave={(e) => { e.target.style.transform = 'none'; e.target.style.background = 'rgba(34,197,94,0.06)' }}
              onClick={() => handleSend(q)}
              disabled={isLoading}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          padding: '12px 16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '32px',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.08)',
          flexShrink: 0,
        }}
      >
        {/* Mic button */}
        {speech.isSupported && (
          <button
            onClick={handleMicToggle}
            disabled={isLoading}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: speech.isListening
                ? 'rgba(239, 68, 68, 0.15)'
                : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))',
              color: speech.isListening ? 'var(--danger-500)' : '#6366f1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
            aria-label={speech.isListening ? 'Stop listening' : 'Voice input'}
          >
            {speech.isListening ? <Square size={20} className="animate-pulse" /> : <Mic size={20} />}
          </button>
        )}

        {/* Text input */}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('assistant.placeholder')}
          disabled={isLoading || speech.isListening}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            padding: '8px 0',
          }}
        />

        {/* Send button */}
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background:
              input.trim() && !isLoading
                ? 'linear-gradient(135deg, var(--primary-500), var(--primary-600))'
                : 'var(--bg-secondary)',
            color: input.trim() && !isLoading ? '#fff' : 'var(--text-muted)',
            cursor: input.trim() && !isLoading ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s',
            boxShadow: input.trim() && !isLoading ? '0 4px 12px rgba(34,197,94,0.3)' : 'none'
          }}
          aria-label="Send message"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}
