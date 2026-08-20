import { supabase } from '../lib/supabase';
import type { ResultadoBusca } from '../lib/tipos';

/**
 * As consultas ao banco, separadas dos componentes.
 *
 * Antes cada página montava seu próprio `supabase.from(...)` no meio do
 * JSX. O custo aparecia ao mudar o schema: era preciso caçar a coluna
 * nova em oito arquivos diferentes, e uma vez a lista de campos ficou
 * divergente entre catálogo e busca sem ninguém perceber.
 */

/** Campos de camisa usados em card. Uma lista, um lugar. */
const CAMPOS_CARD =
    'id,slug,time_nome,marca_nome,temporada,tipo,patrocinador,padrao,cor_base,cor_secundaria';

export async function buscarCamisas(termo: string, limite = 40) {
    const { data, error } = await supabase.rpc('buscar_camisas', { termo, limite });
    if (error) throw new Error(error.message);
    return (data ?? []) as ResultadoBusca[];
}

export async function camisasDaLiga(ligaSlug: string, limite = 60) {
    const { data, error } = await supabase
        .from('camisa_por_liga')
        .select('id,slug,time_nome,marca_nome,tipo,patrocinador,padrao,cor_base,cor_secundaria,temporada')
        .eq('liga_slug', ligaSlug)
        .order('time_nome')
        .limit(limite);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ResultadoBusca[];
}

export async function catalogoRecente(limite = 60) {
    const { data, error } = await supabase
        .from('camisa_detalhe')
        .select(CAMPOS_CARD)
        .eq('status', 'aprovada')
        .order('id', { ascending: false })
        .limit(limite);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ResultadoBusca[];
}

export async function listarLigas() {
    const { data, error } = await supabase
        .from('liga').select('id,nome,slug,pais,ordem').order('ordem');
    if (error) throw new Error(error.message);
    return (data ?? []) as { id: number; nome: string; slug: string; pais: string; ordem: number }[];
}

export async function buscarPessoas(termo: string, limite = 40) {
    let q = supabase
        .from('perfil')
        .select('id,username,nome,bio,avatar_path,peca(count)')
        .limit(limite);
    if (termo) q = q.or(`username.ilike.%${termo}%,nome.ilike.%${termo}%`);

    const { data, error } = await q;
    if (error) throw new Error(error.message);

    // Ordena por tamanho da coleção: perfil vazio no topo de uma busca
    // de descoberta não ajuda ninguém.
    type P = { id: string; username: string; nome: string | null; bio: string | null;
               avatar_path: string | null; peca: { count: number }[] };
    return ((data as P[]) ?? []).sort(
        (a, b) => (b.peca?.[0]?.count ?? 0) - (a.peca?.[0]?.count ?? 0));
}
