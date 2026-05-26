/**
 * Central AI model configuration.
 * The API key lives in the Supabase Edge Function secret GEMINI_API_KEY.
 */
export const GEMINI_MODEL: string =
  import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
