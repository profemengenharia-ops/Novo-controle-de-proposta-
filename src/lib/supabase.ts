import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isMockMode = !SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === 'your_supabase_project_url';

if (isMockMode) {
  console.warn('Supabase credentials missing. Running in MOCK MODE for UI preview.');
}

// Ensure valid strings for createClient to prevent crash
const finalUrl = isMockMode ? 'https://mock-project.supabase.co' : SUPABASE_URL;
const finalKey = isMockMode ? 'mock-anon-key' : SUPABASE_ANON_KEY;

export const supabase = createClient(finalUrl, finalKey);
