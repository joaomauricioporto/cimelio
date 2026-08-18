import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CamisaCard } from '../componentes/CamisaCard';
import { Hero } from '../componentes/Hero';
import type { ResultadoBusca } from '../lib/tipos';

interface Liga { id: number; nome: string; slug: string; pais: string; ordem: number; }

/** Espera o usuário parar de digitar antes de bater no banco. */
function useAtraso<T>(valor: T, ms = 300): T {
    const [lento, setLento] = useState(valor);
    useEffect(() => {
        const t = setTimeout(() => setLento(valor), ms);
        return () => clearTimeout(t);
    }, [valor, ms]);
    return lento;
}

export function Catalogo() {
    const { ligaSlug } = useParams<{ ligaSlug: string }>();
    const navegar = useNavigate();

    const [termo, setTermo] = useState('');
    const [ligas, setLigas] = useState<Liga[]>([]);
    const [itens, setItens] = useState<ResultadoBusca[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const busca = useAtraso(termo);

    useEffect(() => {
        supabase.from('liga').select('id,nome,slug,pais,ordem').order('ordem')
            .then(({ data }) => setLigas((data as Liga[]) ?? []));
    }, []);

    const ligaAtual = useMemo(
        () => ligas.find(l => l.slug === ligaSlug),
        [ligas, ligaSlug]
    );

    useEffect(() => {
        let cancelado = false;

        (async () => {
            setCarregando(true); setErro(null);

            // Buscar por texto ignora o filtro de liga de propósito: quem
            // digita "milan" quer a camisa do Milan, não ser barrado por
            // estar com o Brasileirão selecionado.
            if (busca.trim()) {
                const { data, error } = await supabase
                    .rpc('buscar_camisas', { termo: busca.trim(), limite: 40 });
                if (cancelado) return;
                if (error) setErro(error.message);
                else setItens((data ?? []) as ResultadoBusca[]);
                setCarregando(false);
                return;
            }

            // camisa_por_liga e não `lancamento`: aquela exige data de
            // apresentação preenchida, o que é certo para a aba de
            // novidades e erraria aqui — camisa cadastrada por usuário
            // não tem data e sumiria da navegação por competição.
            const consulta = ligaSlug
                ? supabase.from('camisa_por_liga')
                      .select('id,slug,time_nome,marca_nome,tipo,patrocinador,padrao,' +
                              'cor_base,cor_secundaria,temporada')
                      .eq('liga_slug', ligaSlug)
                      .order('time_nome')
                      .limit(60)
                : supabase.from('camisa_detalhe')
                      .select('id,slug,time_nome,marca_nome,temporada,tipo,' +
                              'patrocinador,padrao,cor_base,cor_secundaria')
                      .eq('status', 'aprovada')
                      .order('id', { ascending: false })
                      .limit(60);

            const { data, error } = await consulta;
            if (cancelado) return;

            if (error) setErro(error.message);
            else {
                // As duas consultas devolvem formatos diferentes: a view de
                // catálogo já traz `temporada` pronta, a de lançamento traz
                // `temporada_ini`. Normalizar aqui evita espalhar o `if`
                // por dentro do componente do card.
                const linhas = (data ?? []) as unknown as Record<string, unknown>[];
                setItens(linhas.map(c => ({
                    ...c,
                    temporada: c.temporada ?? String(c.temporada_ini ?? ''),
                })) as unknown as ResultadoBusca[]);
            }
            setCarregando(false);
        })();

        return () => { cancelado = true; };
    }, [busca, ligaSlug]);

    const titulo = busca.trim()
        ? `Resultados para “${busca.trim()}”`
        : ligaAtual ? ligaAtual.nome : 'Catálogo';

    return (
        <>
            {/* O hero só aparece na entrada limpa: com busca ativa ou
                competição escolhida, a pessoa já sabe o que quer e a
                abertura vira obstáculo. */}
            {!ligaSlug && !busca.trim() && <Hero />}

            <div className="container">
            <div className="painel">
            <input
                className="busca"
                value={termo}
                onChange={e => setTermo(e.target.value)}
                placeholder="Time, ano ou patrocinador — flamengo 2019, milan 04/05"
                aria-label="Buscar camisas"
            />

            <nav className="faixa" aria-label="Competições">
                <button className="competicao" aria-pressed={!ligaSlug}
                        onClick={() => navegar('/')}>
                    Todas
                </button>
                {ligas.map(l => (
                    <button key={l.id} className="competicao"
                            aria-pressed={l.slug === ligaSlug}
                            onClick={() => navegar(`/liga/${l.slug}`)}>
                        <span className="pais">{l.pais}</span>
                        {l.nome}
                    </button>
                ))}
            </nav>
            </div>

            <section className="secao" id="catalogo">
                <h2 className="rotulo-secao">{titulo}</h2>

                {erro && <p role="alert" className="erro">{erro}</p>}
                {carregando && <p className="suave">Carregando…</p>}

                {!carregando && itens.length === 0 && (
                    // Busca sem resultado é o pico de intenção: a pessoa
                    // tem a camisa na mão. Tratar como erro joga fora a
                    // principal via de crescimento do catálogo.
                    <div className="vazio">
                        <h2>{busca.trim()
                            ? 'Essa camisa ainda não está no Cimelio'
                            : 'Nenhuma camisa nesta competição'}</h2>
                        <p>{busca.trim()
                            ? 'Você tem ela? Cadastre e entra para todo mundo.'
                            : 'Cadastre a primeira.'}</p>
                        <Link className="botao"
                              to={`/cadastrar?termo=${encodeURIComponent(termo.trim())}`}>
                            Cadastrar camisa
                        </Link>
                    </div>
                )}

                <div className="grade">
                    {itens.map(c => <CamisaCard key={c.id} c={c} />)}
                </div>

                {!carregando && itens.length > 0 && (
                    <p className="convite">
                        Falta alguma camisa aqui?{' '}
                        <Link to="/cadastrar" className="link-inline">Cadastre você mesmo</Link>
                    </p>
                )}
            </section>
            </div>
        </>
    );
}
