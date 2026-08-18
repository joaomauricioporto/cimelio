import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Falha alto e cedo. Chave faltando produz erro 401 genérico em toda
// query, e perseguir isso custa horas.
if (!url || !anon) {
    throw new Error(
        'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. ' +
        'Copie .env.example para .env.local e preencha.'
    );
}

export const supabase = createClient(url, anon);

// A chave anon é pública por natureza — ela vai no bundle do navegador.
// Quem protege o dado é a RLS, não o segredo da chave. A service_role,
// essa sim, nunca pode aparecer no front.
