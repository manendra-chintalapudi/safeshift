'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Send, Loader2, Mic, MicOff, Volume2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getTranslator } from '@/lib/i18n/translations';

// ─── Template questions → navigation + highlight targets ─────────────────────

interface TemplateAction {
  question: string;
  route: string;
  elementId: string;
  emoji: string;
}

function getTemplates(t: (k: string) => string): TemplateAction[] {
  return [
    { question: t('ai.q1'), route: '/dashboard', elementId: 'card-gigpoints', emoji: '🪙' },
    { question: t('ai.q2'), route: '/dashboard', elementId: 'card-savings', emoji: '💰' },
    { question: t('ai.q3'), route: '/dashboard', elementId: 'card-policy', emoji: '🛡️' },
    { question: t('ai.q4'), route: '/dashboard/claims', elementId: 'card-claims-list', emoji: '📋' },
  ];
}

// ─── Highlight helper ────────────────────────────────────────────────────────

function highlightElement(id: string) {
  // Poll for the element — it may not exist yet if the page is still loading data
  let attempts = 0;
  const interval = setInterval(() => {
    const el = document.getElementById(id);
    if (el) {
      clearInterval(interval);
      el.classList.remove('ai-highlight');
      void el.offsetWidth;
      el.classList.add('ai-highlight');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => el.classList.remove('ai-highlight'), 2800);
    }
    attempts++;
    if (attempts > 25) clearInterval(interval); // give up after ~5s
  }, 200);
}

// ─── Language options ────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'en', label: 'English', bcp47: 'en-IN' },
  { code: 'hi', label: 'हिन्दी', bcp47: 'hi-IN' },
  { code: 'te', label: 'తెలుగు', bcp47: 'te-IN' },
  { code: 'ta', label: 'தமிழ்', bcp47: 'ta-IN' },
  { code: 'ml', label: 'മലയാളം', bcp47: 'ml-IN' },
  { code: 'kn', label: 'ಕನ್ನಡ', bcp47: 'kn-IN' },
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const F = "var(--font-inter),'Inter',sans-serif";

// ─── Simple markdown renderer ────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode {
  // Split into lines
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listOrdered = false;

  function flushList() {
    if (listItems.length === 0) return;
    const Tag = listOrdered ? 'ol' : 'ul';
    elements.push(
      <Tag key={`list-${elements.length}`} style={{
        margin: '6px 0', paddingLeft: 20,
        listStyleType: listOrdered ? 'decimal' : 'disc',
      }}>
        {listItems.map((item, i) => (
          <li key={i} style={{ marginBottom: 3 }}>{inlineFormat(item)}</li>
        ))}
      </Tag>
    );
    listItems = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Unordered list item
    const ulMatch = trimmed.match(/^[-*]\s+(.*)/);
    if (ulMatch) {
      if (listItems.length > 0 && listOrdered) flushList();
      listOrdered = false;
      listItems.push(ulMatch[1]);
      continue;
    }

    // Ordered list item
    const olMatch = trimmed.match(/^\d+[.)]\s+(.*)/);
    if (olMatch) {
      if (listItems.length > 0 && !listOrdered) flushList();
      listOrdered = true;
      listItems.push(olMatch[1]);
      continue;
    }

    // Non-list line — flush any pending list
    flushList();

    // Empty line
    if (trimmed === '') {
      elements.push(<div key={`br-${i}`} style={{ height: 6 }} />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={`p-${i}`} style={{ margin: '2px 0' }}>{inlineFormat(trimmed)}</p>
    );
  }

  flushList();
  return <>{elements}</>;
}

function inlineFormat(text: string): React.ReactNode {
  // Process **bold** and split into segments
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} style={{ fontWeight: 700, color: '#1A1A1A' }}>
        {match[1]}
      </strong>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AIAssistantPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState('en');
  const [listening, setListening] = useState(false);
  const [userLang, setUserLang] = useState('en');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('profiles').select('language').eq('id', user.id).single()
        .then(({ data: p }) => {
          if (p && (p as { language: string }).language) {
            const l = (p as { language: string }).language;
            setUserLang(l);
            setLang(l);
          }
        });
    });
  }, []);

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages((prev) => [...prev, { role: 'ai', text: t('ai.voiceNotSupported') }]);
      return;
    }

    const recognition = new SpeechRecognition();
    const langEntry = LANGUAGES.find((l) => l.code === lang);
    recognition.lang = langEntry?.bcp47 || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
      // If we got a final result, stop listening
      if (event.results[event.results.length - 1].isFinal) {
        setListening(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[SpeechRecognition] Error:', event.error);
      setListening(false);
      if (event.error === 'not-allowed') {
        setMessages((prev) => [...prev, { role: 'ai', text: t('ai.micDenied') }]);
      } else if (event.error === 'no-speech') {
        setMessages((prev) => [...prev, { role: 'ai', text: t('ai.noSpeech') }]);
      }
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setListening(true);
    } catch (err) {
      console.error('[SpeechRecognition] Start failed:', err);
      setListening(false);
    }
  }

  function speakText(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    // Strip markdown formatting for cleaner speech
    const clean = text.replace(/\*\*/g, '').replace(/^[-*]\s+/gm, '').replace(/^\d+[.)]\s+/gm, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    const langEntry = LANGUAGES.find((l) => l.code === lang);
    utterance.lang = langEntry?.bcp47 || 'en-IN';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  function handleTemplate(t: TemplateAction) {
    router.push(t.route);
    // highlightElement now polls for the element, so no fixed delay needed
    highlightElement(t.elementId);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    try {
      const res = await fetch('/api/driver/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, lang }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'ai', text: data.answer || 'No response received.' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: t('ai.connectionError') }]);
    } finally {
      setLoading(false);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const t = getTranslator(lang);
  const TEMPLATES = getTemplates(t);
  const hasChat = messages.length > 0;

  return (
    <div style={{ padding: '24px 20px', maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 120px)' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: hasChat ? 20 : 32 }}>
        {/* Maven bear avatar */}
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          border: '2.5px solid #F07820',
          overflow: 'hidden',
          margin: '0 auto 16px',
          background: '#FFE4C0',
        }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
            <circle cx="100" cy="100" r="100" fill="#FFE4C0"/>
            {/* Body */}
            <path stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" fill="#FFFFFF"
              d="M200,158.5c0-20.2-14.8-36.5-35-36.5h-14.9V72.8c0-27.4-21.7-50.4-49.1-50.8c-28-0.5-50.9,22.1-50.9,50v50H35.8C16,122,0,138,0,157.8L0,213h200L200,158.5z"/>
            <path fill="#FFECD6" d="M100,156.4c-22.9,0-43,11.1-54.1,27.7c15.6,10,34.2,15.9,54.1,15.9s38.5-5.8,54.1-15.9C143,167.5,122.9,156.4,100,156.4z"/>
            {/* Ears */}
            <g fill="#FFECD6" stroke="#1A1A1A" strokeWidth="2.5">
              <circle cx="47" cy="83" r="11.5"/>
              <path d="M46.3 78.9c-2.3 0-4.1 1.9-4.1 4.1 0 2.3 1.9 4.1 4.1 4.1" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
            <g>
              <circle fill="#FFECD6" stroke="#1A1A1A" strokeWidth="2.5" cx="153" cy="83" r="11.5"/>
              <path fill="#FFECD6" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                d="M153.7,78.9c2.3,0,4.1,1.9,4.1,4.1c0,2.3-1.9,4.1-4.1,4.1"/>
            </g>
            {/* Ear hair */}
            <path d="M53.4 62.8C48.5 67.4 45 72.2 42.8 77c3.4-.1 6.8-.1 10.1.1-4 3.7-6.8 7.6-8.2 11.6 2.1 0 4.2 0 6.3.2-2.6 4.1-3.8 8.3-3.7 12.5 1.2-.7 3.4-1.4 5.2-1.9"
              fill="#fff" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              d="M146.6,62.8c4.9,4.6,8.4,9.4,10.6,14.2c-3.4-0.1-6.8-0.1-10.1,0.1c4,3.7,6.8,7.6,8.2,11.6c-2.1,0-4.2,0-6.3,0.2c2.6,4.1,3.8,8.3,3.7,12.5c-1.2-0.7-3.4-1.4-5.2-1.9"/>
            {/* Face */}
            <path fill="#FFECD6" d="M134.5,46v35.5c0,21.815-15.446,39.5-34.5,39.5s-34.5-17.685-34.5-39.5V46"/>
            {/* Hair */}
            <path fill="#FFFFFF" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              d="M81.457,27.929c1.755-4.084,5.51-8.262,11.253-11.77c0.979,2.565,1.883,5.14,2.712,7.723c3.162-4.265,8.626-8.27,16.272-11.235c-0.737,3.293-1.588,6.573-2.554,9.837c4.857-2.116,11.049-3.64,18.428-4.156c-2.403,3.23-5.021,6.391-7.852,9.474"/>
            {/* Eyebrows */}
            <path fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              d="M63.56,55.102c6.243,5.624,13.38,10.614,21.296,14.738c2.071-2.785,4.01-5.626,5.816-8.515c4.537,3.785,9.583,7.263,15.097,10.329c1.197-3.043,2.287-6.104,3.267-9.179c4.087,2.004,8.427,3.761,12.996,5.226c0.545-3.348,0.986-6.696,1.322-10.037c4.913-0.481,9.857-1.34,14.787-2.599"/>
            {/* Eyes */}
            <circle cx="85.5" cy="78.5" r="3.5" fill="#7C3A0A"/>
            <circle cx="84" cy="76" r="1" fill="#fff"/>
            <circle cx="114.5" cy="78.5" r="3.5" fill="#7C3A0A"/>
            <circle cx="113" cy="76" r="1" fill="#fff"/>
            {/* Nose */}
            <path d="M97.7 79.9h4.7c1.9 0 3 2.2 1.9 3.7l-2.3 3.3c-.9 1.3-2.9 1.3-3.8 0l-2.3-3.3c-1.3-1.6-.2-3.7 1.8-3.7z" fill="#7C3A0A"/>
            {/* Mouth */}
            <path fill="#C4622A"
              d="M100.2,101c-0.4,0-1.4,0-1.8,0c-2.7-0.3-5.3-1.1-8-2.5c-0.7-0.3-0.9-1.2-0.6-1.8c0.2-0.5,0.7-0.7,1.2-0.7c0.2,0,0.5,0.1,0.6,0.2c3,1.5,5.8,2.3,8.6,2.3s5.7-0.7,8.6-2.3c0.2-0.1,0.4-0.2,0.6-0.2c0.5,0,1,0.3,1.2,0.7c0.4,0.7,0.1,1.5-0.6,1.9c-2.6,1.4-5.3,2.2-7.9,2.5C101.7,101,100.5,101,100.2,101z"/>
            <path fill="#FFFFFF" d="M106,97h-4c-1.1,0-2-0.9-2-2v-2h8v2C108,96.1,107.1,97,106,97z"/>
            <path fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinejoin="round"
              d="M100.2,101c-0.4,0-1.4,0-1.8,0c-2.7-0.3-5.3-1.1-8-2.5c-0.7-0.3-0.9-1.2-0.6-1.8c0.2-0.5,0.7-0.7,1.2-0.7c0.2,0,0.5,0.1,0.6,0.2c3,1.5,5.8,2.3,8.6,2.3s5.7-0.7,8.6-2.3c0.2-0.1,0.4-0.2,0.6-0.2c0.5,0,1,0.3,1.2,0.7c0.4,0.7,0.1,1.5-0.6,1.9c-2.6,1.4-5.3,2.2-7.9,2.5C101.7,101,100.5,101,100.2,101z"/>
          </svg>
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em', margin: '0 0 8px', fontFamily: F, whiteSpace: 'nowrap' }}>
          {t('ai.title')}
        </h1>
        {!hasChat && (
          <p style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.5, margin: 0, fontFamily: F }}>
            {t('ai.subtitle')}
          </p>
        )}
      </div>

      {/* Language selector pills */}
      <div style={{
        display: 'flex', gap: 6, justifyContent: 'center',
        flexWrap: 'wrap', marginBottom: hasChat ? 16 : 24,
      }}>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: lang === l.code ? '1.5px solid #F07820' : '1px solid #E5E7EB',
              background: lang === l.code ? '#FEF3E8' : '#ffffff',
              color: lang === l.code ? '#F07820' : '#6B7280',
              fontSize: 13,
              fontWeight: lang === l.code ? 700 : 500,
              cursor: 'pointer',
              fontFamily: F,
              transition: 'all 0.15s',
            }}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Template question cards — hide once chat starts */}
      {!hasChat && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          {TEMPLATES.map((t) => (
            <button
              key={t.elementId}
              onClick={() => handleTemplate(t)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 18px',
                borderRadius: 14,
                border: '1px solid #E5E7EB',
                background: '#ffffff',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: F,
                transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#F07820';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(240,120,32,0.12)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#FEF3E8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>
                {t.emoji}
              </div>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: '#374151' }}>
                {t.question}
              </span>
              <ArrowRight size={18} color="#9CA3AF" strokeWidth={2} style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>
      )}

      {/* Chat messages */}
      {hasChat && (
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                minWidth: 0,
                padding: '12px 16px',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: m.role === 'user' ? '#F07820' : '#ffffff',
                color: m.role === 'user' ? '#fff' : '#374151',
                fontSize: 14,
                lineHeight: 1.55,
                fontFamily: F,
                border: m.role === 'ai' ? '1px solid #E5E7EB' : 'none',
                boxShadow: m.role === 'ai' ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
              }}
            >
              {m.role === 'ai' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <img src="/logo.png" alt="SafeShift" width={20} height={20} style={{ borderRadius: 2 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#F07820', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {t('ai.title')}
                  </span>
                </div>
              )}
              {m.role === 'ai' ? renderMarkdown(m.text) : m.text}
              {m.role === 'ai' && (
                <button
                  onClick={() => speakText(m.text)}
                  aria-label="Read aloud"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    marginTop: 8, padding: '4px 10px',
                    borderRadius: 8, border: '1px solid #E5E7EB',
                    background: '#F9FAFB', cursor: 'pointer',
                    fontSize: 11, color: '#6B7280', fontFamily: F,
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#F07820'; e.currentTarget.style.color = '#F07820'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#6B7280'; }}
                >
                  <Volume2 size={12} strokeWidth={2} />
                  {t('ai.listen')}
                </button>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{
              alignSelf: 'flex-start', maxWidth: '85%',
              padding: '12px 16px', borderRadius: '16px 16px 16px 4px',
              background: '#ffffff', border: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Loader2 size={16} color="#F07820" strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 14, color: '#9CA3AF', fontFamily: F }}>{t('ai.thinking')}</span>
              <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse-mic { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
              `}</style>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input bar */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center',
        padding: '12px 14px',
        background: '#ffffff',
        borderRadius: 16,
        border: '1px solid #E5E7EB',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        marginTop: hasChat ? 0 : 'auto',
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={listening ? t('ai.listening') : t('ai.placeholder')}
          disabled={loading}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: 15,
            color: '#1A1A1A',
            background: 'transparent',
            fontFamily: F,
          }}
        />
        {/* Mic button */}
        <button
          onClick={toggleMic}
          disabled={loading}
          aria-label={listening ? 'Stop listening' : 'Start voice input'}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: listening ? '#FEE2E2' : '#F3F4F6',
            border: listening ? '1.5px solid #EF4444' : '1px solid #E5E7EB',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.18s',
            flexShrink: 0,
            animation: listening ? 'pulse-mic 1.2s ease-in-out infinite' : 'none',
          }}
        >
          {listening
            ? <MicOff size={18} color="#EF4444" strokeWidth={2} />
            : <Mic size={18} color="#6B7280" strokeWidth={2} />
          }
        </button>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: input.trim() && !loading ? '#F07820' : '#E5E7EB',
            border: 'none',
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.18s',
            flexShrink: 0,
          }}
        >
          <Send size={18} color={input.trim() && !loading ? '#fff' : '#9CA3AF'} strokeWidth={2} />
        </button>
      </div>

      {/* Footer hint */}
      {!hasChat && (
        <p style={{
          textAlign: 'center', fontSize: 13, color: '#9CA3AF',
          marginTop: 20, fontFamily: F, lineHeight: 1.5,
        }}>
          {t('ai.footer')}
        </p>
      )}
    </div>
  );
}
