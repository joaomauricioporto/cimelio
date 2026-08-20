import { Link } from 'react-router-dom';
import { Camisa } from './Camisa';
import { urlDaFoto } from '../lib/fotos';
import type { Padrao } from '../lib/camisaSvg';
import type { TipoCamisa } from '../lib/tipos';

export interface PecaDestaque {
    id: number;
    destaque: number | null;
    nome_estampa: string | null;
    numero: number | null;
    tamanho: string | null;
    peca_foto: { path: string }[];
    camisa: {
        slug: string; padrao: Padrao; tipo: TipoCamisa;
        cor_base: string; cor_secundaria: string | null; cor_detalhe: string | null;
        temporada_ini: number; temporada_fim: number;
        time: { nome: string } | null;
    } | null;
}

/**
 * As três fixadas.
 *
 * É a primeira coisa que alguém vê ao abrir um perfil, então elas são
 * grandes e ocupam a largura toda. Uma estante começa pela peça que o
 * dono quer mostrar, não pela última que ele registrou.
 */
export function Destaques({ pecas }: { pecas: PecaDestaque[] }) {
    if (pecas.length === 0) return null;

    return (
        <div className="destaques">
            {pecas.map(p => {
                const c = p.camisa;
                if (!c) return null;
                const temporada = c.temporada_fim === c.temporada_ini
                    ? String(c.temporada_ini)
                    : `${c.temporada_ini}/${String(c.temporada_fim).slice(2)}`;
                const foto = p.peca_foto?.[0];

                return (
                    <Link key={p.id} to={`/camisa/${c.slug}`} className="destaque"
                          style={{ '--filete': c.cor_secundaria ?? c.cor_base } as React.CSSProperties}>
                        <span className="pos numeral">{p.destaque}</span>

                        <div className="destaque-img">
                            {foto
                                ? <img src={urlDaFoto(foto.path)} alt="" loading="lazy" />
                                : <Camisa padrao={c.padrao} corBase={c.cor_base}
                                          corSecundaria={c.cor_secundaria}
                                          corDetalhe={c.cor_detalhe} tamanho={140} />}
                        </div>

                        <div className="destaque-info">
                            <strong>{c.time?.nome}</strong>
                            <span className="meta">{temporada}</span>
                            {p.nome_estampa && (
                                <span className="estampa">
                                    {p.nome_estampa} {p.numero ?? ''}
                                </span>
                            )}
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
