'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type CallState =
  | 'ringing'
  | 'welcome'
  | 'language'
  | 'phone-input'
  | 'phone-lookup'
  | 'greeting'
  | 'menu'
  | 'policy'
  | 'claims'
  | 'coins'
  | 'payment-window'
  | 'maven'
  | 'goodbye'
  | 'ended';

type LangCode = 'en-IN' | 'hi-IN' | 'te-IN' | 'ta-IN' | 'ml-IN' | 'kn-IN';
type LangKey = 'en' | 'hi' | 'te' | 'ta' | 'ml' | 'kn';

interface LookupData {
  found: boolean;
  name?: string;
  city?: string;
  policy?: {
    tier: string;
    name: string;
    premium: number;
    max_payout: number;
    week_start: string;
    week_end: string;
  } | null;
  next_week_policy?: {
    tier: string;
    name: string;
    premium: number;
    week_start: string;
  } | null;
  claims?: Array<{
    event_type: string;
    amount: number;
    status: string;
    date: string;
  }>;
  coins?: number;
  is_payment_window?: boolean;
  next_sunday?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGE MAP
// ─────────────────────────────────────────────────────────────────────────────

const LANG_MAP: Record<string, { code: LangCode; key: LangKey }> = {
  '1': { code: 'en-IN', key: 'en' },
  '2': { code: 'hi-IN', key: 'hi' },
  '3': { code: 'te-IN', key: 'te' },
  '4': { code: 'ta-IN', key: 'ta' },
  '5': { code: 'ml-IN', key: 'ml' },
  '6': { code: 'kn-IN', key: 'kn' },
};

// ─────────────────────────────────────────────────────────────────────────────
// TRANSLATIONS
// ─────────────────────────────────────────────────────────────────────────────

const IVR_TEXT: Record<LangKey, Record<string, string>> = {
  en: {
    welcome: 'Welcome to SafeShift. AI-powered insurance for Porter delivery partners.',
    language_prompt:
      'For English, press 1. Hindi ke liye 2 dabayein. Telugu lo 3 noppandi. Tamil ukku 4 azhuthavum. Malayalam nu 5 amarthuka. Kannada ge 6 otti.',
    phone_prompt: 'Please enter your 10-digit registered mobile number.',
    not_found: 'No account found with this number. Please register on the SafeShift app. Goodbye.',
    greeting: 'Welcome back, {name}!',
    menu: 'Press 1 for Policy Status. Press 2 for Recent Claims. Press 3 for Coin Balance. Press 4 for Payment Window Information. Press 5 to speak with Maven AI. Press 9 to end the call.',
    policy_active:
      'Your {name} policy is active until {week_end}. Premium paid: {premium} rupees. Maximum weekly payout: {max_payout} rupees.',
    policy_next_week: 'Your policy for next week is confirmed. It activates on {week_start}.',
    policy_none:
      'You currently have no active policy. You can reinstate through the app during the Sunday payment window.',
    claims_some: 'You have {n} recent claims. ',
    claim_detail: 'Claim: {event_type} on {date}, {amount} rupees, status: {status}. ',
    claims_none: 'You have no recent claims.',
    coins_some:
      'You have {balance} SafeShift coins. You can redeem {redeemable} coins for {discount} rupees off your next premium.',
    coins_none: 'You have zero SafeShift coins. Earn coins through weekly logins and clean claims.',
    payment_open: 'The payment window is currently open. You can pay your premium until 11:59 PM tonight.',
    payment_closed:
      'The payment window is currently closed. The next window opens on Sunday, {next_sunday}, at 6 AM.',
    maven:
      'Maven AI assistant is available in the SafeShift app. Please open the app and go to the AI section for personalized assistance.',
    return_menu: 'Press 0 to return to the main menu.',
    goodbye: 'Thank you for calling SafeShift. Stay safe on the road. Goodbye!',
  },
  hi: {
    welcome: 'SafeShift mein aapka swagat hai. Porter delivery partners ke liye AI-powered insurance.',
    language_prompt:
      'For English, press 1. Hindi ke liye 2 dabayein. Telugu lo 3 noppandi. Tamil ukku 4 azhuthavum. Malayalam nu 5 amarthuka. Kannada ge 6 otti.',
    phone_prompt: 'Kripya apna 10-ank ka registered mobile number dalein.',
    not_found: 'Is number se koi account nahi mila. Kripya SafeShift app par register karein. Alvida.',
    greeting: 'Aapka swagat hai, {name}!',
    menu: 'Policy status ke liye 1 dabayein. Recent claims ke liye 2 dabayein. Coin balance ke liye 3 dabayein. Payment window ki jaankari ke liye 4 dabayein. Maven AI se baat karne ke liye 5 dabayein. Call khatam karne ke liye 9 dabayein.',
    policy_active:
      'Aapki {name} policy {week_end} tak active hai. Premium paid: {premium} rupaye. Ab tak ka maximum weekly payout: {max_payout} rupaye.',
    policy_next_week: 'Aapki agle hafte ki policy confirmed hai. Yeh {week_start} ko activate hogi.',
    policy_none:
      'Aapki koi active policy nahi hai. Aap Sunday payment window ke dauran app se reinstate kar sakte hain.',
    claims_some: 'Aapke {n} recent claims hain. ',
    claim_detail: 'Claim: {event_type} tarikh {date}, {amount} rupaye, status: {status}. ',
    claims_none: 'Aapke koi recent claims nahi hain.',
    coins_some:
      'Aapke paas {balance} SafeShift coins hain. Aap {redeemable} coins redeem karke apne agle premium par {discount} rupaye ki choot pa sakte hain.',
    coins_none:
      'Aapke paas zero SafeShift coins hain. Weekly login aur clean claims se coins kamayein.',
    payment_open:
      'Payment window abhi khuli hai. Aap aaj raat 11:59 PM tak apna premium bhuktan kar sakte hain.',
    payment_closed:
      'Payment window abhi band hai. Agla window Ravivaar, {next_sunday}, subah 6 baje khulega.',
    maven:
      'Maven AI assistant SafeShift app mein uplabdh hai. Kripya app kholein aur AI section mein jayein.',
    return_menu: 'Main menu par lautne ke liye 0 dabayein.',
    goodbye: 'SafeShift ko call karne ke liye dhanyavaad. Sadak par safe rahein. Alvida!',
  },
  te: {
    welcome: 'SafeShift ki swaagatam. Porter delivery partners kosam AI-powered insurance.',
    language_prompt:
      'For English, press 1. Hindi ke liye 2 dabayein. Telugu lo 3 noppandi. Tamil ukku 4 azhuthavum. Malayalam nu 5 amarthuka. Kannada ge 6 otti.',
    phone_prompt: 'Dayachesi mee 10-digit registered mobile number enter cheyandi.',
    not_found:
      'Ee number tho ekkuva account dorakaledu. Dayachesi SafeShift app lo register avvandi. Selavu.',
    greeting: 'Tirigivachchinanduku swaagatam, {name}!',
    menu: 'Policy status kosam 1 noppandi. Recent claims kosam 2 noppandi. Coin balance kosam 3 noppandi. Payment window samacharam kosam 4 noppandi. Maven AI tho matladataniki 5 noppandi. Call muginchataniki 9 noppandi.',
    policy_active:
      'Mee {name} policy {week_end} varaku active ga undi. Premium paid: {premium} rupayalu. Maximum weekly payout: {max_payout} rupayalu.',
    policy_next_week:
      'Mee vachche vaaram policy confirm ayyindi. Idi {week_start} na activate avutundi.',
    policy_none:
      'Meeku prastaavam ekkuva active policy ledu. Sunday payment window lo app dwara reinstate cheyyavachchu.',
    claims_some: 'Meeku {n} recent claims unnaayi. ',
    claim_detail: 'Claim: {event_type} tedi {date}, {amount} rupayalu, status: {status}. ',
    claims_none: 'Meeku recent claims em levu.',
    coins_some:
      'Meeku {balance} SafeShift coins unnaayi. Mee tarvata premium pai {discount} rupayala discount kosam {redeemable} coins redeem cheyyavachchu.',
    coins_none:
      'Meeku zero SafeShift coins unnaayi. Weekly logins mariyu clean claims dwara coins sampadhinchandi.',
    payment_open:
      'Payment window prastaavam open ga undi. Mee premium ee roju raatri 11:59 PM loga chellinchavatiki avakasam undi.',
    payment_closed:
      'Payment window prastaavam closed ga undi. Tarvata window Aadivaram, {next_sunday}, udayam 6 gantalaku teruchukuntundi.',
    maven:
      'Maven AI assistant SafeShift app lo andubatulo undi. Dayachesi app teeyyandi mariyu AI section ki vellandi.',
    return_menu: 'Main menu ki tirigiraavataniki 0 noppandi.',
    goodbye: 'SafeShift ki call chesinanduku dhanyavaadalu. Road pai safe ga undandi. Selavu!',
  },
  ta: {
    welcome: 'SafeShift-kku varaveekirom. Porter delivery partners-ukkaana AI-powered insurance.',
    language_prompt:
      'For English, press 1. Hindi ke liye 2 dabayein. Telugu lo 3 noppandi. Tamil ukku 4 azhuthavum. Malayalam nu 5 amarthuka. Kannada ge 6 otti.',
    phone_prompt: 'Thayavu seithu ungal 10-ilakka registered mobile number-ai pathivu seyyuungal.',
    not_found:
      'Itha number-il kanakku kaanappadalai. Thayavu seithu SafeShift app-il pathivu seyyungal. Poittu varren.',
    greeting: 'Mendum varaveekirom, {name}!',
    menu: 'Policy nilamai-kku 1 azhuthavum. Sameebaththiya claims-kku 2 azhuthavum. Coin balance-kku 3 azhuthavum. Payment window thagaval-kku 4 azhuthavum. Maven AI-udan pesa 5 azhuthavum. Call-ai mudikka 9 azhuthavum.',
    policy_active:
      'Ungal {name} policy {week_end} varai active-aaga ulladhu. Premium selandhiyadhu: {premium} rubaaigal. Aathikoodiyadha weekly payout: {max_payout} rubaaigal.',
    policy_next_week:
      'Ungal aduththa vaara policy urudhi seiyyappattulathu. Idhu {week_start} andru activate aagum.',
    policy_none:
      'Ungalukku tharporuthaikku active policy illai. Sunday payment window-il app moolam meedum seyyalaam.',
    claims_some: 'Ungalukku {n} sameebaththiya claims ulladhu. ',
    claim_detail:
      'Claim: {event_type} theedhi {date}, {amount} rubaaigal, nilamai: {status}. ',
    claims_none: 'Ungalukku sameebaththiya claims illai.',
    coins_some:
      'Ungalukku {balance} SafeShift coins ulladhu. Ungal aduththa premium-il {discount} rubaaigal thallubadi-kku {redeemable} coins redeem seyyalaam.',
    coins_none:
      'Ungalukku zero SafeShift coins. Weekly login-galum clean claims moolamum coins sambaadiyungal.',
    payment_open:
      'Payment window tharpodhaikku thirandhu ulladhu. Ungal premium-ai inru iravu 11:59 PM-kkulvarai seluththa mudiyum.',
    payment_closed:
      'Payment window tharpodhaikku mooodappattullathu. Aduththa window Nyaayiru, {next_sunday}, kaalaiyil 6 manikkuth thirakum.',
    maven:
      'Maven AI assistant SafeShift app-il kidaikkum. Thayavu seithu app-ai theerungal, AI pidivukku sellungal.',
    return_menu: 'Main menu-kkuth thirumba 0 azhuthavum.',
    goodbye: 'SafeShift-ai azhaithdhatharkku nandri. Saalaiyil paadhukaappaaga irungal. Poittu varren!',
  },
  ml: {
    welcome: 'SafeShift-ilekku swagatham. Porter delivery partners-kkulla AI-powered insurance.',
    language_prompt:
      'For English, press 1. Hindi ke liye 2 dabayein. Telugu lo 3 noppandi. Tamil ukku 4 azhuthavum. Malayalam nu 5 amarthuka. Kannada ge 6 otti.',
    phone_prompt: 'Dayavaayi ningalude 10-akka registered mobile number nalkuka.',
    not_found:
      'Ee number-il oru account-um kandethiyilla. Dayavaayi SafeShift app-il register cheyyuka. Vidaa.',
    greeting: 'Swaagatham, {name}!',
    menu: 'Policy status-inu 1 amarthuka. Recent claims-inu 2 amarthuka. Coin balance-inu 3 amarthuka. Payment window vivarangalkku 4 amarthuka. Maven AI-yumayi samsaarikkan 5 amarthuka. Call avasaanipikkan 9 amarthuka.',
    policy_active:
      'Ningalude {name} policy {week_end} vare active aanu. Premium adacchatu: {premium} rupa. Maximum weekly payout: {max_payout} rupa.',
    policy_next_week:
      'Ningalude adutha aazhchayile policy urapichu. Athu {week_start}-nu activate aakum.',
    policy_none:
      'Ningalkku ippol active policy illa. Sunday payment window-il app vazhiye reinstate cheyyaam.',
    claims_some: 'Ningalkku {n} recent claims undu. ',
    claim_detail: 'Claim: {event_type} theeyathi {date}, {amount} rupa, status: {status}. ',
    claims_none: 'Ningalkku recent claims onnum illa.',
    coins_some:
      'Ningalkku {balance} SafeShift coins undu. Adutha premium-il {discount} rupa discount-inu {redeemable} coins redeem cheyyaam.',
    coins_none:
      'Ningalkku zero SafeShift coins aanu. Weekly logins-um clean claims-um vazhiye coins neduka.',
    payment_open:
      'Payment window ippol turannirikkunnu. Innu raathri 11:59 PM vare premium adakkaam.',
    payment_closed:
      'Payment window ippol adacchirikkunnu. Adutha window Nyaayar, {next_sunday}, raavile 6 manikku thurakkum.',
    maven:
      'Maven AI assistant SafeShift app-il labhyamanu. Dayavaayi app thurannuka, AI section-ilekku pokuka.',
    return_menu: 'Main menu-vilekku madangi pokaan 0 amarthuka.',
    goodbye: 'SafeShift-ilekku vilichathinu nandri. Road-il surakshithaar aayirikku. Vidaa!',
  },
  kn: {
    welcome: 'SafeShift ge swaagatha. Porter delivery partners igaagi AI-powered insurance.',
    language_prompt:
      'For English, press 1. Hindi ke liye 2 dabayein. Telugu lo 3 noppandi. Tamil ukku 4 azhuthavum. Malayalam nu 5 amarthuka. Kannada ge 6 otti.',
    phone_prompt: 'Dayavittu nimma 10-ankiya registered mobile number hakiri.',
    not_found:
      'Ee sankhyeyinda yaavude account sigalilla. Dayavittu SafeShift app nalli register maadi. Vandane.',
    greeting: 'Matte swaagatha, {name}!',
    menu: 'Policy status ge 1 otti. Recent claims ge 2 otti. Coin balance ge 3 otti. Payment window mahiti ge 4 otti. Maven AI jote maataadadalu 5 otti. Call mugisalu 9 otti.',
    policy_active:
      'Nimma {name} policy {week_end} varegu active aagide. Premium paid: {premium} rupaayi. Maximum weekly payout: {max_payout} rupaayi.',
    policy_next_week:
      'Nimma mundina vaarada policy khanditavaagide. Adu {week_start} nalli activate aaguttade.',
    policy_none:
      'Nimage prustuta yaavude active policy illa. Sunday payment window nalli app moolaka reinstate maadabahudu.',
    claims_some: 'Nimage {n} recent claims ide. ',
    claim_detail: 'Claim: {event_type} dinanka {date}, {amount} rupaayi, status: {status}. ',
    claims_none: 'Nimage recent claims illa.',
    coins_some:
      'Nimage {balance} SafeShift coins ide. Nimma mundina premium mele {discount} rupaayi rajaa padevudakkagi {redeemable} coins redeem maadabahudu.',
    coins_none:
      'Nimage zero SafeShift coins. Weekly logins mattu clean claims moolaka coins sampaadinchiri.',
    payment_open:
      'Payment window prustuta teregide. Nimage indu raatri 11:59 PM varegu premium kattalagu aaguttade.',
    payment_closed:
      'Payment window prustuta mugidide. Mundina window Bhaanuvara, {next_sunday}, beligge 6 gantege tereyuttade.',
    maven:
      'Maven AI assistant SafeShift app nalli labhyavide. Dayavittu app teregiri mattu AI section ge hogi.',
    return_menu: 'Main menu ge hintirugalu 0 otti.',
    goodbye: 'SafeShift ge call maadidakkagi dhanyavadagalu. Raste mele suraakshitavaagi iri. Vandane!',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DIAL PAD CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const DIAL_KEYS: Array<{ key: string; sub?: string }> = [
  { key: '1', sub: '' },
  { key: '2', sub: 'ABC' },
  { key: '3', sub: 'DEF' },
  { key: '4', sub: 'GHI' },
  { key: '5', sub: 'JKL' },
  { key: '6', sub: 'MNO' },
  { key: '7', sub: 'PQRS' },
  { key: '8', sub: 'TUV' },
  { key: '9', sub: 'WXYZ' },
  { key: '*', sub: '' },
  { key: '0', sub: '+' },
  { key: '#', sub: '' },
];

// ─────────────────────────────────────────────────────────────────────────────
// DTMF BEEP
// ─────────────────────────────────────────────────────────────────────────────

function playDTMF(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const freqs: Record<string, [number, number]> = {
      '1': [697, 1209],
      '2': [697, 1336],
      '3': [697, 1477],
      '4': [770, 1209],
      '5': [770, 1336],
      '6': [770, 1477],
      '7': [852, 1209],
      '8': [852, 1336],
      '9': [852, 1477],
      '*': [941, 1209],
      '0': [941, 1336],
      '#': [941, 1477],
    };
    const pair = freqs[key];
    if (!pair) return;
    const gain = ctx.createGain();
    gain.gain.value = 0.1;
    gain.connect(ctx.destination);
    pair.forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(gain);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    });
    setTimeout(() => ctx.close(), 300);
  } catch {
    // Audio not available — ignore
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE FILLER
// ─────────────────────────────────────────────────────────────────────────────

function fillTemplate(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [k, v] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT DATE
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    // Date-only strings (YYYY-MM-DD) are parsed as UTC by spec.
    // Append T00:00:00 so they are parsed as local time instead,
    // avoiding off-by-one-day errors in IST (UTC+5:30).
    const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + 'T00:00:00' : dateStr;
    const d = new Date(normalized);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function CallPage() {
  // State
  const [callState, setCallState] = useState<CallState>('ringing');
  const [langCode, setLangCode] = useState<LangCode>('en-IN');
  const [langKey, setLangKey] = useState<LangKey>('en');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [displayText, setDisplayText] = useState('Calling SafeShift...');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [lookupData, setLookupData] = useState<LookupData | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [speechAvailable, setSpeechAvailable] = useState(true);

  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isSpeakingRef = useRef(false);
  const callStateRef = useRef<CallState>(callState);
  const mountedRef = useRef(true);

  // Keep ref in sync
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // ─── SET PAGE TITLE ──────────────────────────────────────────────────
  useEffect(() => {
    document.title = 'SafeShift IVR';
  }, []);

  // ─── INIT ────────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    // Check speech API
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
    } else {
      setSpeechAvailable(false);
    }

    // Start elapsed timer
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (synthRef.current) synthRef.current.cancel();
    };
  }, []);

  // ─── VOICE CACHE ─────────────────────────────────────────────────────
  const voiceCacheRef = useRef<Record<string, SpeechSynthesisVoice | null>>({});
  useEffect(() => {
    if (!synthRef.current) return;
    const loadVoices = () => {
      const voices = synthRef.current!.getVoices();
      if (voices.length === 0) return;
      for (const lang of ['en-IN', 'hi-IN', 'te-IN', 'ta-IN', 'ml-IN', 'kn-IN']) {
        const prefix = lang.split('-')[0];
        const googleVoice = voices.find(v => v.lang === lang && v.name.toLowerCase().includes('google'));
        voiceCacheRef.current[lang] = googleVoice || voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(prefix)) || null;
      }
    };
    loadVoices();
    synthRef.current.onvoiceschanged = loadVoices;
  }, [speechAvailable]);

  // ─── SPEAK FUNCTION (Web Speech API) ───────────────────────────────
  const speak = useCallback(
    (text: string, lang: string): Promise<void> => {
      return new Promise((resolve) => {
        setDisplayText(text);

        if (!speechAvailable || !synthRef.current) {
          setIsSpeaking(true); isSpeakingRef.current = true;
          setTimeout(() => {
            if (mountedRef.current) { setIsSpeaking(false); isSpeakingRef.current = false; }
            resolve();
          }, Math.max(2000, text.split(' ').length * 280));
          return;
        }

        synthRef.current.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 0.88;
        utterance.pitch = 1.05;
        utterance.volume = 1;

        const cachedVoice = voiceCacheRef.current[lang];
        if (cachedVoice) utterance.voice = cachedVoice;

        utterance.onstart = () => { if (mountedRef.current) { setIsSpeaking(true); isSpeakingRef.current = true; } };
        utterance.onend = () => { if (mountedRef.current) { setIsSpeaking(false); isSpeakingRef.current = false; } resolve(); };
        utterance.onerror = () => { if (mountedRef.current) { setIsSpeaking(false); isSpeakingRef.current = false; } resolve(); };

        synthRef.current.speak(utterance);
      });
    },
    [speechAvailable],
  );

  // ─── CANCEL SPEECH ───────────────────────────────────────────────────
  const cancelSpeech = useCallback(() => {
    if (synthRef.current) synthRef.current.cancel();
    setIsSpeaking(false);
    isSpeakingRef.current = false;
  }, []);

  // ─── STATE MACHINE ──────────────────────────────────────────────────
  useEffect(() => {
    if (callState === 'ringing') {
      setDisplayText('Calling SafeShift...');
      const timeout = setTimeout(() => {
        if (mountedRef.current) setCallState('welcome');
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [callState]);

  useEffect(() => {
    if (callState === 'welcome') {
      const run = async () => {
        const t = IVR_TEXT.en;
        await speak(t.welcome, 'en-IN');
        if (mountedRef.current && callStateRef.current === 'welcome') {
          setCallState('language');
        }
      };
      run();
    }
  }, [callState, speak]);

  useEffect(() => {
    if (callState === 'language') {
      const t = IVR_TEXT.en;
      speak(t.language_prompt, 'en-IN');
    }
  }, [callState, speak]);

  useEffect(() => {
    if (callState === 'phone-input') {
      setPhoneDigits('');
      const t = IVR_TEXT[langKey];
      speak(t.phone_prompt, langCode);
    }
  }, [callState, langKey, langCode, speak]);

  useEffect(() => {
    if (callState === 'phone-lookup') {
      const run = async () => {
        setDisplayText('Looking up your account...');
        try {
          const res = await fetch('/api/ivr/lookup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: phoneDigits }),
          });
          const data: LookupData = await res.json();

          if (!mountedRef.current || callStateRef.current !== 'phone-lookup') return;

          if (!data.found) {
            const t = IVR_TEXT[langKey];
            await speak(t.not_found, langCode);
            if (mountedRef.current) setCallState('goodbye');
          } else {
            setLookupData(data);
            setCallState('greeting');
          }
        } catch {
          await speak('We are experiencing technical difficulties. Please try again later. Goodbye.', langCode);
          if (mountedRef.current) setCallState('goodbye');
        }
      };
      run();
    }
  }, [callState, phoneDigits, langKey, langCode, speak]);

  useEffect(() => {
    if (callState === 'greeting' && lookupData) {
      const run = async () => {
        const t = IVR_TEXT[langKey];
        await speak(fillTemplate(t.greeting, { name: lookupData.name || '' }), langCode);
        if (mountedRef.current && callStateRef.current === 'greeting') {
          setCallState('menu');
        }
      };
      run();
    }
  }, [callState, lookupData, langKey, langCode, speak]);

  useEffect(() => {
    if (callState === 'menu') {
      const t = IVR_TEXT[langKey];
      speak(t.menu, langCode);
    }
  }, [callState, langKey, langCode, speak]);

  useEffect(() => {
    if (callState === 'policy' && lookupData) {
      const run = async () => {
        const t = IVR_TEXT[langKey];
        let text: string;
        if (lookupData.policy) {
          text = fillTemplate(t.policy_active, {
            name: lookupData.policy.name,
            week_end: formatDate(lookupData.policy.week_end),
            premium: lookupData.policy.premium,
            max_payout: lookupData.policy.max_payout,
          });
        } else if (lookupData.next_week_policy) {
          text = fillTemplate(t.policy_next_week, {
            week_start: formatDate(lookupData.next_week_policy.week_start),
          });
        } else {
          text = t.policy_none;
        }
        text += ' ' + t.return_menu;
        await speak(text, langCode);
      };
      run();
    }
  }, [callState, lookupData, langKey, langCode, speak]);

  useEffect(() => {
    if (callState === 'claims' && lookupData) {
      const run = async () => {
        const t = IVR_TEXT[langKey];
        let text: string;
        const claims = lookupData.claims || [];
        if (claims.length > 0) {
          text = fillTemplate(t.claims_some, { n: claims.length });
          claims.slice(0, 3).forEach((c) => {
            text += fillTemplate(t.claim_detail, {
              event_type: c.event_type,
              date: formatDate(c.date),
              amount: c.amount,
              status: c.status,
            });
          });
        } else {
          text = t.claims_none;
        }
        text += ' ' + t.return_menu;
        await speak(text, langCode);
      };
      run();
    }
  }, [callState, lookupData, langKey, langCode, speak]);

  useEffect(() => {
    if (callState === 'coins' && lookupData) {
      const run = async () => {
        const t = IVR_TEXT[langKey];
        const balance = lookupData.coins ?? 0;
        let text: string;
        if (balance > 0) {
          text = fillTemplate(t.coins_some, {
            balance,
            redeemable: Math.floor(balance / 100) * 100,
            discount: Math.floor(balance / 100) * 5,
          });
        } else {
          text = t.coins_none;
        }
        text += ' ' + t.return_menu;
        await speak(text, langCode);
      };
      run();
    }
  }, [callState, lookupData, langKey, langCode, speak]);

  useEffect(() => {
    if (callState === 'payment-window' && lookupData) {
      const run = async () => {
        const t = IVR_TEXT[langKey];
        let text: string;
        if (lookupData.is_payment_window) {
          text = t.payment_open;
        } else {
          text = fillTemplate(t.payment_closed, {
            next_sunday: lookupData.next_sunday || 'next Sunday',
          });
        }
        text += ' ' + t.return_menu;
        await speak(text, langCode);
      };
      run();
    }
  }, [callState, lookupData, langKey, langCode, speak]);

  useEffect(() => {
    if (callState === 'maven') {
      const run = async () => {
        const t = IVR_TEXT[langKey];
        await speak(t.maven + ' ' + t.return_menu, langCode);
      };
      run();
    }
  }, [callState, langKey, langCode, speak]);

  // Stop the elapsed timer when call ends
  useEffect(() => {
    if (callState === 'ended') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [callState]);

  useEffect(() => {
    if (callState === 'goodbye') {
      const run = async () => {
        const t = IVR_TEXT[langKey];
        await speak(t.goodbye, langCode);
        if (mountedRef.current && callStateRef.current === 'goodbye') {
          setCallState('ended');
        }
      };
      run();
    }
  }, [callState, langKey, langCode, speak]);

  // ─── KEY PRESS HANDLER ───────────────────────────────────────────────
  const handleKeyPress = useCallback(
    (key: string) => {
      // Animate press
      setPressedKey(key);
      setTimeout(() => setPressedKey(null), 150);

      // DTMF tone
      playDTMF(key);

      // End call from any state
      if (callState === 'ended') return;

      // Don't accept input during ringing, welcome, phone-lookup, greeting, goodbye, ended
      const noInputStates: CallState[] = ['ringing', 'welcome', 'phone-lookup', 'greeting', 'goodbye', 'ended'];
      if (noInputStates.includes(callState)) return;

      // Language selection
      if (callState === 'language') {
        const lang = LANG_MAP[key];
        if (lang) {
          cancelSpeech();
          setLangCode(lang.code);
          setLangKey(lang.key);
          setCallState('phone-input');
        }
        return;
      }

      // Phone input
      if (callState === 'phone-input') {
        if (key === '#') {
          if (phoneDigits.length === 10) {
            cancelSpeech();
            setCallState('phone-lookup');
          }
          return;
        }
        if (key === '*' || key === 'backspace') {
          if (phoneDigits.length > 0) {
            const newDigits = phoneDigits.slice(0, -1);
            setPhoneDigits(newDigits);
            setDisplayText(newDigits ? `Entering number: ${newDigits}` : 'Enter your mobile number');
          }
          return;
        }
        if (phoneDigits.length < 10) {
          const newDigits = phoneDigits + key;
          setPhoneDigits(newDigits);
          setDisplayText(`Entering number: ${newDigits}`);
          if (newDigits.length === 10) {
            cancelSpeech();
            setTimeout(() => {
              if (mountedRef.current) setCallState('phone-lookup');
            }, 500);
          }
        }
        return;
      }

      // Menu navigation — allow interrupting speech to select an option
      if (callState === 'menu') {
        cancelSpeech();
        switch (key) {
          case '1':
            setCallState('policy');
            break;
          case '2':
            setCallState('claims');
            break;
          case '3':
            setCallState('coins');
            break;
          case '4':
            setCallState('payment-window');
            break;
          case '5':
            setCallState('maven');
            break;
          case '9':
            setCallState('goodbye');
            break;
        }
        return;
      }

      // Sub-menu: press 0 to return to menu (allowed even during speech)
      const subMenuStates: CallState[] = ['policy', 'claims', 'coins', 'payment-window', 'maven'];
      if (subMenuStates.includes(callState) && key === '0') {
        cancelSpeech();
        setCallState('menu');
        return;
      }

      // Block all other input while speaking in sub-menu states
      if (isSpeakingRef.current) return;
    },
    [callState, phoneDigits, cancelSpeech],
  );

  // ─── END CALL ────────────────────────────────────────────────────────
  const handleEndCall = useCallback(() => {
    if (callState === 'ended') return;
    cancelSpeech();
    setCallState('goodbye');
  }, [callState, cancelSpeech]);

  // ─── RESTART ─────────────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    cancelSpeech();
    setCallState('ringing');
    setLangCode('en-IN');
    setLangKey('en');
    setPhoneDigits('');
    setDisplayText('Calling SafeShift...');
    setIsSpeaking(false);
    setElapsed(0);
    setLookupData(null);
    // Restart the elapsed timer (it was cleared when call ended)
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }, [cancelSpeech]);

  // ─── KEYBOARD LISTENER ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Backspace') {
        handleKeyPress('backspace');
        return;
      }
      const validKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#'];
      if (validKeys.includes(e.key)) {
        handleKeyPress(e.key);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleKeyPress]);

  // ─── FORMATTED TIME ──────────────────────────────────────────────────
  const formattedTime = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  // ─── RENDER ──────────────────────────────────────────────────────────

  // Call Ended screen
  if (callState === 'ended') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: '#111',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "var(--font-inter),'Inter',sans-serif",
          gap: 24,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Call Ended</h1>
        <p style={{ fontSize: 18, color: '#9CA3AF', margin: 0 }}>Duration: {formattedTime}</p>
        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <button
            onClick={handleRestart}
            style={{
              padding: '14px 32px',
              borderRadius: 12,
              border: 'none',
              backgroundColor: '#22C55E',
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "var(--font-inter),'Inter',sans-serif",
            }}
          >
            Call Again
          </button>
          <a
            href="/"
            style={{
              padding: '14px 32px',
              borderRadius: 12,
              border: '1px solid #333',
              backgroundColor: 'transparent',
              color: '#9CA3AF',
              fontSize: 16,
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              fontFamily: "var(--font-inter),'Inter',sans-serif",
            }}
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  // Main call screen
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#111',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "var(--font-inter),'Inter',sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '20px 24px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>SafeShift Support</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: callState === 'ringing' ? '#FBBF24' : '#22C55E',
                display: 'inline-block',
                animation: callState !== 'ringing' ? 'pulse-dot 2s ease-in-out infinite' : 'none',
              }}
            />
            <span style={{ fontSize: 13, color: '#9CA3AF' }}>
              {callState === 'ringing' ? 'Ringing...' : 'Connected'}
            </span>
          </div>
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: '#9CA3AF',
          }}
        >
          {formattedTime}
        </div>
      </div>

      {/* ── CENTER AREA ───────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 24px',
          minHeight: 0,
        }}
      >
        {/* Ringing animation */}
        {callState === 'ringing' && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: '#22C55E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                animation: 'ring-pulse 1.5s ease-in-out infinite',
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <p style={{ fontSize: 20, fontWeight: 500, color: '#D1D5DB' }}>{displayText}</p>
          </div>
        )}

        {/* IVR text display */}
        {callState !== 'ringing' && (
          <div
            style={{
              backgroundColor: '#1A1A1A',
              borderRadius: 16,
              padding: '24px 20px',
              maxWidth: 380,
              width: '100%',
              textAlign: 'center',
            }}
          >
            {/* Phone digits display */}
            {callState === 'phone-input' && phoneDigits.length > 0 && (
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: 4,
                  marginBottom: 16,
                  color: '#F07820',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {phoneDigits}
              </div>
            )}

            <p
              style={{
                fontSize: 16,
                lineHeight: 1.6,
                color: '#E5E7EB',
                margin: 0,
                whiteSpace: 'pre-wrap',
              }}
            >
              {displayText}
            </p>

            {/* Waveform */}
            {isSpeaking && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  marginTop: 20,
                  height: 32,
                }}
              >
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 4,
                      borderRadius: 2,
                      backgroundColor: '#F07820',
                      animation: `waveform 1s ease-in-out ${i * 0.12}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Speech unavailable notice */}
            {!speechAvailable && (
              <p style={{ fontSize: 12, color: '#6B7280', marginTop: 12 }}>
                (Text-only mode - speech synthesis unavailable)
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── DIAL PAD ──────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '12px 24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 60px)',
            gap: 12,
            justifyContent: 'center',
          }}
        >
          {DIAL_KEYS.map(({ key, sub }) => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: pressedKey === key ? '#444' : '#222',
                color: '#fff',
                fontSize: 24,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transform: pressedKey === key ? 'scale(0.92)' : 'scale(1)',
                transition: 'transform 0.1s, background-color 0.1s',
                fontFamily: "var(--font-inter),'Inter',sans-serif",
                lineHeight: 1,
                padding: 0,
              }}
            >
              <span>{key}</span>
              {sub && (
                <span style={{ fontSize: 8, letterSpacing: 2, color: '#9CA3AF', marginTop: 1 }}>
                  {sub}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Backspace button — visible during phone input */}
        {callState === 'phone-input' && phoneDigits.length > 0 && (
          <button
            onClick={() => handleKeyPress('backspace')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 20px', borderRadius: 20,
              border: '1px solid #333', backgroundColor: '#1A1A1A',
              color: '#9CA3AF', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: "var(--font-inter),'Inter',sans-serif",
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#F07820'; e.currentTarget.style.color = '#F07820'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#333'; e.currentTarget.style.color = '#9CA3AF'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
              <line x1="18" y1="9" x2="12" y2="15"/>
              <line x1="12" y1="9" x2="18" y2="15"/>
            </svg>
            Delete
          </button>
        )}

        {/* End call button */}
        <button
          onClick={handleEndCall}
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: '#EF4444',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 4,
            marginBottom: 8,
            transition: 'transform 0.1s',
          }}
          onMouseDown={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.92)';
          }}
          onMouseUp={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </button>
        <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 500 }}>End Call</span>
      </div>

      {/* ── ANIMATIONS ────────────────────────────────────────────────── */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes ring-pulse {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          70% { box-shadow: 0 0 0 20px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
        @keyframes waveform {
          0%, 100% { height: 6px; }
          50% { height: 28px; }
        }
      `}</style>
    </div>
  );
}
