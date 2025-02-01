import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://stigwnzslyomtzsecjqq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0aWd3bnpzbHlvbXR6c2VjanFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5ODY5MzEsImV4cCI6MjA1MzU2MjkzMX0.qD2o87SyDIWEtWxeKgWurpwZuUEJ2Qqa-02RGoMzAsM';

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL');
if (!SUPABASE_ANON_KEY) throw new Error('Missing SUPABASE_ANON_KEY');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false
  },
  db: {
    schema: 'public'
  }
}); 