// ============================================================================
// POST /api/ivr/tts — Proxy to Sarvam AI Text-to-Speech
// Returns base64 audio for the given text and language
// ============================================================================

import { NextResponse } from 'next/server';

const SARVAM_API_KEY = process.env.SARVAM_API_KEY || '';
const SARVAM_TTS_URL = 'https://api.sarvam.ai/text-to-speech';

// Map IVR language codes to Sarvam language codes
const LANG_MAP: Record<string, string> = {
  'en': 'en-IN',
  'hi': 'hi-IN',
  'te': 'te-IN',
  'ta': 'ta-IN',
  'ml': 'ml-IN',
  'kn': 'kn-IN',
};

// Preferred speaker per language for natural IVR voice
const SPEAKER_MAP: Record<string, string> = {
  'en-IN': 'priya',
  'hi-IN': 'priya',
  'te-IN': 'priya',
  'ta-IN': 'priya',
  'ml-IN': 'priya',
  'kn-IN': 'priya',
};

export async function POST(request: Request) {
  try {
    const { text, lang } = await request.json();

    if (!text || !lang) {
      return NextResponse.json({ error: 'text and lang required' }, { status: 400 });
    }

    if (!SARVAM_API_KEY) {
      return NextResponse.json({ error: 'TTS not configured' }, { status: 503 });
    }

    const targetLang = LANG_MAP[lang] || LANG_MAP[lang.split('-')[0]] || 'en-IN';
    const speaker = SPEAKER_MAP[targetLang] || 'priya';

    // Sarvam has a 2500 char limit — truncate if needed
    const truncatedText = text.slice(0, 2400);

    const res = await fetch(SARVAM_TTS_URL, {
      method: 'POST',
      headers: {
        'api-subscription-key': SARVAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: truncatedText,
        target_language_code: targetLang,
        speaker,
        model: 'bulbul:v3',
        pace: 0.95,
        temperature: 0.7,
        speech_sample_rate: 22050,
        output_audio_codec: 'mp3',
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[IVR/TTS] Sarvam error:', res.status, errText);
      return NextResponse.json({ error: 'TTS generation failed' }, { status: 502 });
    }

    const data = await res.json();
    const audioBase64 = data.audios?.[0];

    if (!audioBase64) {
      return NextResponse.json({ error: 'No audio returned' }, { status: 502 });
    }

    return NextResponse.json({ audio: audioBase64 });
  } catch (error) {
    console.error('[IVR/TTS] Error:', error);
    return NextResponse.json(
      { error: 'TTS failed' },
      { status: 500 },
    );
  }
}
