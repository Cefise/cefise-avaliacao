const SUPABASE_URL = 'https://oooedutvxendobfqiinlj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vZWR1dHZ4ZW5kb2JmcWlpbmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NDg3NjAsImV4cCI6MjA5NzEyNDc2MH0.KSuRBgH3mLDP0zcdl4v6TVvG3Kt_5y6aXOQFDxC8O8E';

if (!window._supabaseClient) {
  window._supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
const supabase = window._supabaseClient;
const supabase = window._supabaseClient;
