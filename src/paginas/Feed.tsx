import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Camisa } from '../componentes/Camisa';
import { Estrelas } from '../componentes/Estrelas';
import { SeguirBotao } from '../componentes/SeguirBotao';
import { Acoes } from '../componentes/Acoes';
import { Comentarios } from '../componentes/Comentarios';
import { urlDaFoto } from '../lib/fotos';
import { ROTULO_TIPO, type TipoCamisa } from '../lib/tipos';
import type { Padrao } from '../lib/camisaSvg';

interface Evento {
    tipo: 'peca' | 'resenha';
    ocorrido_em: string;
    ref_id: number;
    perfil_id: string; username: string; nome: string | null; avatar_path: string | null;
    camisa_slug: string; time_nome: string; temporada: string; tipo_camisa: TipoCamisa;
    padrao: Padrao; cor_base: string;
    cor_secundaria: string | null; cor_detalhe: string | null;
    foto_path: string | null;
    nome_estampa: string | null; numero: number | null; tamanho: string | null;
    nota: number | null; texto: string | null;
    curtidas: number; eu_curti: boolean; comentarios: number;
}

interface Sugestao { id: string; username: string; nome: string | null; avatar_path: string | null; camisas: number; }

const POR_PAGINA = 20;

function quando(iso: string): string {
    const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'agora';
    if (s < 3600) return `${Math.floor(s / 60)} min`;
    if (s < 86400) return `${Math.floor(s / 3600)} h`;
    if (s < 604800) return `${Math.floor(s / 86400)} d`;
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function Feed() {
    const { user, carregando: carregandoAuth } = useAuth();
    // Guarda quais eventos estão com a caixa de comentários aberta.
    // Manter no pai e não em cada cartão evita que abrir um feche o
    // outro quando a lista recarrega.
    const [abertos, setAbertos] = useState<Set<string>>(new Set());
    const [modo, setModo] = useState<'seguindo' | 'descobrir'>('seguindo');
    const [eventos, setEventos] = useState<Evento[]>([]);
    const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [fim, setFim] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    const buscar = useCallback(async (antes: string | null) => {
        const { data, error } = await supabase.rpc('feed', {
            p_id: user?.id ?? null,
            so_seguidos: modo === 'seguindo' && Boolean(user),
            limite: POR_PAGINA,
            antes,
        });
        if (error) throw new Error(error.message);
        return (data ?? []) as Evento[];
    }, [user?.id, modo]);

    useEffect(() => {
        if (carregandoAuth) return;
        let cancelado = false;

        (async () => {
            setCarregando(true); setErro(null); setFim(false);
            try {
                const lista = await buscar(null);
                if (cancelado) return;
                setEventos(lista);
                setFim(lista.length < POR_PAGINA);

                // Feed vazio sem saída é abandono. As sugestões carregam
                // junto para a tela vazia já vir com o que fazer nela.
                if (lista.length === 0 || modo === 'seguindo') {
                    const { data } = await supabase.rpc('sugestoes',
                        { p_id: user?.id ?? null, limite: 6 });
                    if (!cancelado) setSugestoes((data ?? []) as Sugestao[]);
                }
            } catch (e) {
                if (!cancelado) setErro(e instanceof Error ? e.message : 'Erro ao carregar.');
            } finally {
                if (!cancelado) setCarregando(false);
            }
        })();

        return () => { cancelado = true; };
    }, [buscar, carregandoAuth, modo, user?.id]);

    async function maisAntigos() {
        const ultimo = eventos[eventos.length - 1];
        if (!ultimo) return;
        // Paginação por data e não por deslocamento: registro novo
        // entrando no topo enquanto a pessoa rola faria o offset repetir
        // ou pular itens.
        const lista = await buscar(ultimo.ocorrido_em);
        setEventos(e => [...e, ...lista]);
        if (lista.length < POR_PAGINA) setFim(true);
    }

    return (
        <div className="container pagina com-aside">
            <div className="coluna-principal">
            <div className="topo-linha">
                <h1 className="titulo-linha">
                    {modo === 'seguindo' ? 'Sua linha' : 'Descobrir'}
                </h1>
                {user && (
                    <div className="abas">
                        <button className={`aba ${modo === 'seguindo' ? 'ativa' : ''}`}
                                onClick={() => setModo('seguindo')}>Seguindo</button>
                        <button className={`aba ${modo === 'descobrir' ? 'ativa' : ''}`}
                                onClick={() => setModo('descobrir')}>Descobrir</button>
                    </div>
                )}
            </div>

            {erro && <p role="alert" className="erro">{erro}</p>}
            {carregando && <p className="suave">Carregando…</p>}

            {!carregando && eventos.length === 0 && (
                <div className="vazio">
                    <h2>{user ? 'Sua linha está vazia' : 'Nada por aqui ainda'}</h2>
                    <p>{user
                        ? 'Siga colecionadores para ver o que eles registram e avaliam.'
                        : 'Entre para seguir gente e montar sua linha.'}</p>
                    {user
                        ? <button className="botao" onClick={() => setModo('descobrir')}>
                              Ver tudo que está acontecendo
                          </button>
                        : <Link to="/entrar" className="botao">Entrar</Link>}
                </div>
            )}

            {/* No celular as sugestões entram no meio da linha; no
                desktop elas vão para a coluna da direita, que existe
                justamente para tirar peso da leitura central. */}
            {sugestoes.length > 0 && (modo === 'descobrir' || eventos.length === 0 || eventos.length < 6) && (
                <section className="secao so-estreito">
                    <h2 className="rotulo-secao">Quem seguir</h2>
                    <div className="tiras-pessoas">
                        {sugestoes.map(s => (
                            <div key={s.id} className="pessoa-mini">
                                <Link to={`/perfil/${s.username}`}>
                                    {s.avatar_path
                                        ? <img className="avatar" src={urlDaFoto(s.avatar_path)} alt="" />
                                        : <div className="avatar vazio-avatar" aria-hidden="true" />}
                                    <strong>{s.nome || s.username}</strong>
                                    <span className="meta">{s.camisas} camisas</span>
                                </Link>
                                <SeguirBotao perfilId={s.id} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <div className="linha-tempo">
                {eventos.map(e => (
                    <article key={`${e.tipo}-${e.ref_id}`} className="evento"
                             style={{ '--filete': e.cor_secundaria ?? e.cor_base } as React.CSSProperties}>
                        {/* Autor primeiro, discreto: quem fez importa, mas o
                            que ele fez é a camisa — e ela vem logo abaixo,
                            grande. */}
                        <header className="evento-topo">
                            <Link to={`/perfil/${e.username}`} className="evento-autor">
                                {e.avatar_path
                                    ? <img className="avatar-mini claro" src={urlDaFoto(e.avatar_path)} alt="" />
                                    : <span className="avatar-mini claro vazio-avatar" aria-hidden="true" />}
                                <span>
                                    <b>{e.nome || e.username}</b>
                                    <em>
                                        {e.tipo === 'peca'
                                            ? 'registrou na coleção'
                                            : e.nota ? 'avaliou' : 'resenhou'}
                                    </em>
                                </span>
                            </Link>
                            <span className="meta">{quando(e.ocorrido_em)}</span>
                        </header>

                        {/* O palco: a camisa ocupa a largura toda, sobre fundo
                            escuro. Num app de camisa, a camisa não pode ser o
                            menor elemento da tela. */}
                        <Link to={`/camisa/${e.camisa_slug}`} className="palco">
                            {e.foto_path
                                ? <img className="palco-foto" src={urlDaFoto(e.foto_path)}
                                       alt={`${e.time_nome} ${e.temporada}`} loading="lazy" />
                                : <Camisa padrao={e.padrao} corBase={e.cor_base}
                                          corSecundaria={e.cor_secundaria}
                                          corDetalhe={e.cor_detalhe} tamanho={230}
                                          descricao={`${e.time_nome} ${e.temporada}`} />}

                            {e.tipo === 'peca' && e.nome_estampa && (
                                <span className="palco-estampa">
                                    {e.nome_estampa} {e.numero ?? ''}
                                </span>
                            )}
                        </Link>

                        <div className="evento-pe">
                            <Link to={`/camisa/${e.camisa_slug}`} className="evento-info">
                                <strong>{e.time_nome}</strong>
                                <span className="meta">
                                    {e.temporada} · {ROTULO_TIPO[e.tipo_camisa]}
                                    {e.tamanho && ` · ${e.tamanho}`}
                                </span>
                            </Link>

                            {e.tipo === 'resenha' && e.nota && (
                                <Estrelas valor={e.nota} tamanho={17} />
                            )}
                        </div>

                        {e.tipo === 'resenha' && e.texto && (
                            <p className="evento-texto">{e.texto}</p>
                        )}

                        <Acoes
                            resenhaId={e.tipo === 'resenha' ? e.ref_id : undefined}
                            pecaId={e.tipo === 'peca' ? e.ref_id : undefined}
                            curtidas={e.curtidas} euCurti={e.eu_curti}
                            comentarios={e.comentarios}
                            autorId={e.perfil_id}
                            aoAbrirComentarios={() => setAbertos(a => {
                                const n = new Set(a);
                                const k = `${e.tipo}-${e.ref_id}`;
                                n.has(k) ? n.delete(k) : n.add(k);
                                return n;
                            })} />

                        {abertos.has(`${e.tipo}-${e.ref_id}`) && (
                            <Comentarios
                                resenhaId={e.tipo === 'resenha' ? e.ref_id : undefined}
                                pecaId={e.tipo === 'peca' ? e.ref_id : undefined} />
                        )}
                    </article>
                ))}
            </div>

            {!carregando && eventos.length > 0 && !fim && (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <button className="botao vazado escuro-nao" onClick={maisAntigos}>
                        Carregar mais
                    </button>
                </div>
            )}
            </div>

            <aside className="coluna-aside">
                {sugestoes.length > 0 && (
                    <div className="bloco-aside">
                        <h2 className="titulo-aside">Quem seguir</h2>
                        {sugestoes.slice(0, 5).map(s => (
                            <div key={s.id} className="linha-sugestao">
                                <Link to={`/perfil/${s.username}`}>
                                    {s.avatar_path
                                        ? <img className="avatar-mini claro" src={urlDaFoto(s.avatar_path)} alt="" />
                                        : <span className="avatar-mini claro vazio-avatar" aria-hidden="true" />}
                                    <span>
                                        <b>{s.nome || s.username}</b>
                                        <em>{s.camisas} camisas</em>
                                    </span>
                                </Link>
                                <SeguirBotao perfilId={s.id} />
                            </div>
                        ))}
                        <Link to="/pessoas" className="link">ver todos</Link>
                    </div>
                )}
            </aside>
        </div>
    );
}
