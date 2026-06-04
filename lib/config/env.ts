// ============================================================================
// Typed Environment Variable Accessors
// ============================================================================

function getEnv(key: string, required = true): string {
  const value = process.env[key];
  if (!value && required) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value ?? '';
}

// --- Supabase ---
export const supabaseUrl = () => getEnv('NEXT_PUBLIC_SUPABASE_URL');
export const supabaseAnonKey = () => getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
export const supabaseServiceRoleKey = () => getEnv('SUPABASE_SERVICE_ROLE_KEY');

// --- Razorpay ---
export const razorpayKeyId = () => getEnv('RAZORPAY_KEY_ID');
export const razorpayKeySecret = () => getEnv('RAZORPAY_KEY_SECRET');
export const razorpayWebhookSecret = () => getEnv('RAZORPAY_WEBHOOK_SECRET');
export const nextPublicRazorpayKeyId = () => getEnv('NEXT_PUBLIC_RAZORPAY_KEY_ID');

// --- External APIs ---
export const openWeatherMapApiKey = () => getEnv('OPENWEATHERMAP_API_KEY', false);
export const waqiApiToken = () => getEnv('WAQI_API_TOKEN', false);
export const newsDataApiKey = () => getEnv('NEWSDATA_API_KEY', false);
export const openRouterApiKey = () => getEnv('OPENROUTER_API_KEY', false);

// --- Cron ---
export const cronSecret = () => getEnv('CRON_SECRET');

// --- App ---
export const appUrl = () => getEnv('NEXT_PUBLIC_APP_URL', false) || 'http://localhost:3000';
export const nodeEnv = () => getEnv('NODE_ENV', false) || 'development';
export const isProduction = () => nodeEnv() === 'production';
