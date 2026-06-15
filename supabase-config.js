// ============================================================
//  CONFIGURAÇÃO DO SUPABASE
//  Substitua os valores abaixo pelas suas credenciais.
//  Você encontra isso em: supabase.com → seu projeto → Settings → API
// ============================================================

const SUPABASE_URL = 'COLE_AQUI_SUA_URL_DO_SUPABASE';
const SUPABASE_ANON_KEY = 'COLE_AQUI_SUA_ANON_KEY_DO_SUPABASE';

// Não altere esta linha:
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
