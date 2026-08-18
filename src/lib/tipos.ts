/**
 * Tipos do banco.
 *
 * Escritos à mão por enquanto. Assim que o projeto estiver no Supabase,
 * troque por geração automática — que não deixa o tipo divergir do schema:
 *   npx supabase gen types typescript --project-id SEU_REF > src/lib/tipos.ts
 */
import type { Padrao } from './camisaSvg';

export type TipoCamisa =
    | 'titular' | 'reserva' | 'terceira' | 'quarta'
    | 'goleiro' | 'treino' | 'prejogo' | 'especial';

export type StatusCamisa = 'pendente' | 'aprovada' | 'rejeitada';

/** Uma linha de camisa_detalhe (a view, não a tabela). */
export interface CamisaDetalhe {
    id: number;
    slug: string;
    time_nome: string;
    time_slug: string;
    marca_nome: string | null;
    temporada: string;
    tipo: TipoCamisa;
    patrocinador: string | null;
    variante: string | null;
    padrao: Padrao;
    cor_base: string;
    cor_secundaria: string | null;
    cor_detalhe: string | null;
    status: StatusCamisa;
    total_notas: number | null;
    media_estrelas: number | null;
    total_resenhas: number | null;
}

/** Uma linha do retorno de buscar_camisas(). */
export interface ResultadoBusca {
    id: number;
    slug: string;
    time_nome: string;
    marca_nome: string | null;
    temporada: string;
    tipo: TipoCamisa;
    patrocinador: string | null;
    padrao: Padrao;
    cor_base: string;
    cor_secundaria: string | null;
    relevancia: number;
}

export const ROTULO_TIPO: Record<TipoCamisa, string> = {
    titular: 'Titular', reserva: 'Reserva', terceira: 'Terceira',
    quarta: 'Quarta', goleiro: 'Goleiro', treino: 'Treino',
    prejogo: 'Pré-jogo', especial: 'Especial',
};
