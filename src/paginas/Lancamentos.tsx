import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Camisa } from '../componentes/Camisa';
import { Estrelas } from '../componentes/Estrelas';
import { ROTULO_TIPO, type TipoCamisa } from '../lib/tipos';
import type { Padrao } from '../lib/camisaSvg';

interface Lancamento {
    id: number; slug: string; lancada_em: string;
    time_nome: string; time_slug: string;
    liga_id: number; liga_nome: string; liga_ordem: number;
    marca_nome: string | null;
    tipo: TipoCamisa; patrocinador: string | null;
    padrao: Padrao;
    cor_base: string; cor_secundaria: string | null; cor_detalhe: string | null;
    foto_url: string | null;
    media_estrelas: number | null; total_notas: number | null;
}

const ANO_ATUAL = new Date().getFullYear();
const ANOS = [ANO_ATUAL + 1, ANO_ATUAL, ANO_ATUAL - 1];

export function Lancamentos() {
    const [ano, setAno] = useState(ANO_ATUAL);
    const [itens, setItens] = useState<Lancamento[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        let cancelado = false;
        setCarregando(true); setErro(null);

        supabase.from('lancamento')
            .select('*')
            .eq('temporada_ini', ano)
            .order('liga_ordem')
            .order('lancada_em', { ascending: false })
            .then(({ data, error }) => {
                if (cancelado) return;
                if (error) setErro(error.message);
                else setItens((data as Lancamento[]) ?? []);
                setCarregando(false);
            });

        return () => { cancelado = true; };
    }, [ano]);

    // Agrupamento no cliente, não no banco. São dezenas de linhas por
    // ano, não milhares — uma consulta e um reduce sai mais barato que
    // uma consulta por liga.
    const porLiga = useMemo(() => {
        const mapa = new Map<number, { nome: string; itens: Lancamento[] }>();
        for (const l of itens) {
            if (!mapa.has(l.liga_id)) mapa.set(l.liga_id, { nome: l.liga_nome, itens: [] });
            mapa.get(l.liga_id)!.itens.push(l);
        }
        return [...mapa.values()];
    }, [itens]);

    return (
        <div className="container">
            <div className="cabecalho-secao">
                <h1>Lançamentos</h1>
                <div className="abas" role="tablist" aria-label="Temporada">
                    {ANOS.map(a => (
                        <button key={a} role="tab" aria-selected={a === ano}
                                className={`aba ${a === ano ? 'ativa' : ''}`}
                                onClick={() => setAno(a)}>
                            {a}
                        </button>
                    ))}
                </div>
            </div>

            {erro && <p role="alert" className="erro">{erro}</p>}
            {carregando && <p className="suave">Carregando…</p>}

            {!carregando && itens.length === 0 && (
                <div className="vazio">
                    <h2>Nada lançado em {ano} ainda</h2>
                    <p>Assim que os clubes apresentarem, aparece aqui.</p>
                </div>
            )}

            {porLiga.map(liga => (
                <section key={liga.nome} className="secao-liga">
                    <h2 className="titulo-liga">{liga.nome}</h2>
                    <div className="grade">
                        {liga.itens.map(l => <CardLancamento key={l.id} l={l} />)}
                    </div>
                </section>
            ))}
        </div>
    );
}

function CardLancamento({ l }: { l: Lancamento }) {
    const data = new Date(l.lancada_em + 'T00:00:00')
        .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

    return (
        <Link to={`/camisa/${l.slug}`} className="card">
            {/* Em lançamento a foto é o conteúdo: ninguém opina sobre
                camisa que não viu. A ilustração cobre até alguém ter
                a imagem, e volta a ser o fallback se o link quebrar. */}
            {l.foto_url
                ? <img src={l.foto_url} alt={`${l.time_nome} ${ROTULO_TIPO[l.tipo]}`}
                       className="foto-lancamento" loading="lazy" />
                : <Camisa padrao={l.padrao} corBase={l.cor_base}
                          corSecundaria={l.cor_secundaria} corDetalhe={l.cor_detalhe}
                          tamanho={130}
                          descricao={`${l.time_nome} ${ROTULO_TIPO[l.tipo]}`} />}

            <div className="time">{l.time_nome}</div>
            <div className="meta">{ROTULO_TIPO[l.tipo]} · {data}</div>
            {l.marca_nome && <div className="meta">{l.marca_nome}</div>}

            <div className="nota-card">
                {l.media_estrelas != null
                    ? <>
                        <Estrelas valor={Math.round(l.media_estrelas * 2)} tamanho={15} />
                        <span className="meta">{l.total_notas}</span>
                      </>
                    : <span className="meta">Sem nota ainda</span>}
            </div>
        </Link>
    );
}
