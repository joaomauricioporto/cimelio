import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Camisa } from '../componentes/Camisa';
import { Destaques, type PecaDestaque } from '../componentes/Destaques';
import { SeguirBotao } from '../componentes/SeguirBotao';
import { Estrelas } from '../componentes/Estrelas';
import { Comentarios } from '../componentes/Comentarios';
import { urlDaFoto } from '../lib/fotos';
import { ROTULO_TIPO, type TipoCamisa } from '../lib/tipos';
import type { Padrao } from '../lib/camisaSvg';

interface Perf {
    id: string; username: string; nome: string | null;
    bio: string | null; avatar_path: string | null;
    wishlist_publica: boolean;
}

interface Contagens {
    camisas: number; seguidores: number; seguindo: number;
    avaliacoes: number; curtidas: number;
}

interface ResenhaPerfil {
    id: number; nota: number | null; texto: string | null; criado_em: string;
    camisa_slug: string; time_nome: string; temporada: string; tipo_camisa: TipoCamisa;
    padrao: Padrao; cor_base: string;
    cor_secundaria: string | null; cor_detalhe: string | null;
    curtidas: number; comentarios: number;
}

interface ItemWishlist {
    id: number; is_grail: boolean;
    camisa: {
        slug: string; padrao: Padrao; tipo: TipoCamisa;
        cor_base: string; cor_secundaria: string | null; cor_detalhe: string | null;
        temporada_ini: number; temporada_fim: number;
        time: { nome: string } | null;
    } | null;
}

const CAMPOS_PECA = `id,destaque,versao,tamanho,nome_estampa,numero,
    peca_foto ( path ),
    camisa:camisa_id (
        slug,tipo,temporada_ini,temporada_fim,
        padrao,cor_base,cor_secundaria,cor_detalhe,
        time:time_id ( nome )
    )`;

export function Perfil() {
    const { username } = useParams<{ username: string }>();
    const { perfil: meu } = useAuth();

    const [p, setP] = useState<Perf | null>(null);
    const [cont, setCont] = useState<Contagens | null>(null);
    const [pecas, setPecas] = useState<PecaDestaque[]>([]);
    const [desejos, setDesejos] = useState<ItemWishlist[]>([]);
    const [resenhas, setResenhas] = useState<ResenhaPerfil[]>([]);
    const [aberta, setAberta] = useState<number | null>(null);
    const [aba, setAba] = useState<'colecao' | 'resenhas' | 'wishlist'>('colecao');
    const [estado, setEstado] = useState<'carregando' | 'pronto' | 'nao_achou'>('carregando');

    const souEu = meu?.username === username;

    useEffect(() => {
        let cancelado = false;

        (async () => {
            setEstado('carregando');
            const { data: perf } = await supabase
                .from('perfil')
                .select('id,username,nome,bio,avatar_path,wishlist_publica')
                .eq('username', username).maybeSingle();

            if (cancelado) return;
            if (!perf) { setEstado('nao_achou'); return; }
            const pf = perf as Perf;
            setP(pf);

            // Um join só para a coleção inteira, e uma chamada para as
            // quatro contagens. Perfil que abre devagar é perfil que
            // ninguém compartilha.
            const [pecasRes, contRes, wlRes, resRes] = await Promise.all([
                supabase.from('peca').select(CAMPOS_PECA)
                    .eq('perfil_id', pf.id)
                    .order('destaque', { ascending: true, nullsFirst: false })
                    .order('id', { ascending: false }),
                supabase.rpc('contagens_perfil', { p_id: pf.id }),
                supabase.from('wishlist')
                    .select(`id,is_grail, camisa:camisa_id (
                        slug,tipo,temporada_ini,temporada_fim,padrao,
                        cor_base,cor_secundaria,cor_detalhe, time:time_id ( nome ))`)
                    .eq('perfil_id', pf.id)
                    .order('is_grail', { ascending: false }),
                supabase.rpc('resenhas_do_perfil', { p_id: pf.id, limite: 40 }),
            ]);

            if (cancelado) return;
            setPecas((pecasRes.data as unknown as PecaDestaque[]) ?? []);
            setCont(((contRes.data as Contagens[]) ?? [])[0] ?? null);
            setDesejos((wlRes.data as unknown as ItemWishlist[]) ?? []);
            setResenhas((resRes.data as ResenhaPerfil[]) ?? []);
            setEstado('pronto');
        })();

        return () => { cancelado = true; };
    }, [username, meu?.id]);

    async function tirarDaWishlist(id: number) {
        await supabase.from('wishlist').delete().eq('id', id);
        setDesejos(d => d.filter(x => x.id !== id));
    }

    async function fixar(pecaId: number, posicao: number | null) {
        // Libera a posição antes de ocupá-la: o índice único no banco
        // recusaria duas peças na mesma vaga, e trocar sem soltar seria
        // erro garantido.
        if (posicao !== null) {
            const ocupante = pecas.find(x => x.destaque === posicao);
            if (ocupante && ocupante.id !== pecaId)
                await supabase.from('peca').update({ destaque: null }).eq('id', ocupante.id);
        }
        await supabase.from('peca').update({ destaque: posicao }).eq('id', pecaId);

        setPecas(ps => ps.map(x =>
            x.id === pecaId ? { ...x, destaque: posicao }
            : x.destaque === posicao && posicao !== null ? { ...x, destaque: null }
            : x
        ));
    }

    if (estado === 'carregando')
        return <div className="container pagina"><p className="suave">Carregando…</p></div>;

    if (estado === 'nao_achou' || !p)
        return (
            <div className="container pagina">
                <div className="vazio">
                    <h2>Perfil não encontrado</h2>
                    <p>O endereço não existe ou o username mudou.</p>
                    <Link to="/" className="botao">Voltar ao catálogo</Link>
                </div>
            </div>
        );

    const fixadas = pecas.filter(x => x.destaque).sort((a, b) => a.destaque! - b.destaque!);
    const podeVerWishlist = souEu || p.wishlist_publica;

    return (
        <>
            <header className="capa malha">
                <div className="container capa-conteudo">
                    {p.avatar_path
                        ? <img className="capa-avatar" src={urlDaFoto(p.avatar_path)} alt="" />
                        : <div className="capa-avatar vazio-avatar" aria-hidden="true" />}

                    <div className="capa-dados">
                        <h1>{p.nome || p.username}</h1>
                        <p className="capa-user">@{p.username}</p>
                        {p.bio && <p className="capa-bio">{p.bio}</p>}

                        {cont && (
                            <ul className="placar">
                                <li><b className="num">{cont.camisas}</b><span>camisas</span></li>
                                <li><b className="num">{cont.avaliacoes}</b><span>avaliações</span></li>
                                <li><b className="num">{cont.curtidas}</b><span>curtidas</span></li>
                                <li><b className="num">{cont.seguidores}</b><span>seguidores</span></li>
                                <li><b className="num">{cont.seguindo}</b><span>seguindo</span></li>
                            </ul>
                        )}
                    </div>

                    <div className="capa-acao">
                        <SeguirBotao perfilId={p.id}
                            aoMudar={s => setCont(c => c
                                ? { ...c, seguidores: c.seguidores + (s ? 1 : -1) } : c)} />
                    </div>
                </div>
            </header>

            <div className="container pagina">
                {fixadas.length > 0 && (
                    <section className="secao">
                        <h2 className="rotulo-secao">Em destaque</h2>
                        <Destaques pecas={fixadas} />
                    </section>
                )}

                {souEu && fixadas.length === 0 && pecas.length > 0 && (
                    <div className="dica">
                        Escolha até três camisas para fixar no topo do seu perfil.
                        O botão está em cada uma, logo abaixo.
                    </div>
                )}

                <nav className="abas-perfil" role="tablist">
                    <button role="tab" aria-selected={aba === 'colecao'}
                            className={`aba ${aba === 'colecao' ? 'ativa' : ''}`}
                            onClick={() => setAba('colecao')}>
                        Coleção <span className="num">{pecas.length}</span>
                    </button>
                    <button role="tab" aria-selected={aba === 'resenhas'}
                            className={`aba ${aba === 'resenhas' ? 'ativa' : ''}`}
                            onClick={() => setAba('resenhas')}>
                        Avaliações <span className="num">{resenhas.length}</span>
                    </button>
                    {podeVerWishlist && (
                        <button role="tab" aria-selected={aba === 'wishlist'}
                                className={`aba ${aba === 'wishlist' ? 'ativa' : ''}`}
                                onClick={() => setAba('wishlist')}>
                            Wishlist <span className="num">{desejos.length}</span>
                        </button>
                    )}
                </nav>

                {aba === 'colecao' && (
                    pecas.length === 0
                        ? <div className="vazio">
                              <h2>Estante vazia</h2>
                              <p>{souEu
                                  ? 'Dar nota não coloca a camisa aqui. Abra uma camisa e use "Tenho essa".'
                                  : 'Nenhuma camisa registrada ainda.'}</p>
                              <Link to="/" className="botao">Explorar catálogo</Link>
                          </div>
                        : <div className="grade">
                              {pecas.map(p2 => (
                                  <CartaoPeca key={p2.id} p={p2} souEu={souEu}
                                              fixadas={fixadas.length} aoFixar={fixar} />
                              ))}
                          </div>
                )}

                {aba === 'resenhas' && (
                    resenhas.length === 0
                        ? <div className="vazio">
                              <h2>Nenhuma avaliação</h2>
                              <p>{souEu
                                  ? 'Abra uma camisa e dê sua nota.'
                                  : 'Essa pessoa ainda não avaliou nada.'}</p>
                          </div>
                        : <div className="lista-resenhas">
                              {resenhas.map(r => (
                                  <article key={r.id} className="resenha-perfil"
                                           style={{ '--filete': r.cor_secundaria ?? r.cor_base } as React.CSSProperties}>
                                      <Link to={`/camisa/${r.camisa_slug}`} className="rp-camisa">
                                          <Camisa padrao={r.padrao} corBase={r.cor_base}
                                                  corSecundaria={r.cor_secundaria}
                                                  corDetalhe={r.cor_detalhe} tamanho={78}
                                                  descricao={r.time_nome} />
                                      </Link>

                                      <div className="rp-corpo">
                                          <Link to={`/camisa/${r.camisa_slug}`} className="rp-titulo">
                                              <strong>{r.time_nome}</strong>
                                              <span className="meta">
                                                  {r.temporada} · {ROTULO_TIPO[r.tipo_camisa]}
                                              </span>
                                          </Link>

                                          {r.nota && <Estrelas valor={r.nota} tamanho={16} />}
                                          {r.texto && <p className="rp-texto">{r.texto}</p>}

                                          <div className="rp-numeros">
                                              <span>{r.curtidas} {r.curtidas === 1 ? 'curtida' : 'curtidas'}</span>
                                              <button className="link"
                                                      onClick={() => setAberta(a => a === r.id ? null : r.id)}>
                                                  {r.comentarios} {r.comentarios === 1 ? 'comentário' : 'comentários'}
                                              </button>
                                          </div>

                                          {aberta === r.id && <Comentarios resenhaId={r.id} />}
                                      </div>
                                  </article>
                              ))}
                          </div>
                )}

                {aba === 'wishlist' && (
                    desejos.length === 0
                        ? <div className="vazio">
                              <h2>Wishlist vazia</h2>
                              <p>{souEu
                                  ? 'Abra uma camisa que você ainda não tem e use "Quero essa".'
                                  : 'Nada na lista por enquanto.'}</p>
                              {souEu && <Link to="/catalogo" className="botao">Explorar catálogo</Link>}
                          </div>
                        : <div className="grade">
                              {desejos.map(d => {
                                  const c = d.camisa; if (!c) return null;
                                  const temp = c.temporada_fim === c.temporada_ini
                                      ? String(c.temporada_ini)
                                      : `${c.temporada_ini}/${String(c.temporada_fim).slice(2)}`;
                                  return (
                                      <div key={d.id} className="card"
                                           style={{ '--filete': c.cor_secundaria ?? c.cor_base } as React.CSSProperties}>
                                          <Link to={`/camisa/${c.slug}`} className="vitrine">
                                              <Camisa padrao={c.padrao} corBase={c.cor_base}
                                                      corSecundaria={c.cor_secundaria}
                                                      corDetalhe={c.cor_detalhe} tamanho={150}
                                                      descricao={`${c.time?.nome ?? ''} ${temp}`} />
                                          </Link>
                                          <div className="time">{c.time?.nome}</div>
                                          <div className="meta">{temp} · {ROTULO_TIPO[c.tipo]}</div>
                                          {d.is_grail && <div className="grail">Grail</div>}
                                          {souEu && (
                                              <div className="fixar">
                                                  <button className="link"
                                                          onClick={() => tirarDaWishlist(d.id)}>
                                                      tirar da lista
                                                  </button>
                                              </div>
                                          )}
                                      </div>
                                  );
                              })}
                          </div>
                )}
            </div>
        </>
    );
}

function CartaoPeca({ p, souEu, fixadas, aoFixar }: {
    p: PecaDestaque; souEu: boolean; fixadas: number;
    aoFixar: (id: number, pos: number | null) => void;
}) {
    const c = p.camisa;
    if (!c) return null;
    const temp = c.temporada_fim === c.temporada_ini
        ? String(c.temporada_ini)
        : `${c.temporada_ini}/${String(c.temporada_fim).slice(2)}`;
    const foto = p.peca_foto?.[0];

    return (
        <div className="card" style={{ '--filete': c.cor_secundaria ?? c.cor_base } as React.CSSProperties}>
            <Link to={`/camisa/${c.slug}`} className="vitrine">
                {foto
                    ? <img className="foto-card" src={urlDaFoto(foto.path)} alt="" loading="lazy" />
                    : <Camisa padrao={c.padrao} corBase={c.cor_base}
                              corSecundaria={c.cor_secundaria} corDetalhe={c.cor_detalhe}
                              tamanho={150} descricao={`${c.time?.nome ?? ''} ${temp}`} />}
            </Link>

            <div className="time">{c.time?.nome}</div>
            <div className="meta">{temp} · {ROTULO_TIPO[c.tipo]}</div>
            {p.nome_estampa && (
                <div className="meta estampa">{p.nome_estampa} {p.numero ?? ''}</div>
            )}

            {souEu && (
                <div className="fixar">
                    {p.destaque
                        ? <button className="link" onClick={() => aoFixar(p.id, null)}>
                              desafixar {p.destaque}º
                          </button>
                        : fixadas < 3
                            ? <button className="link"
                                      onClick={() => aoFixar(p.id, fixadas + 1)}>
                                  fixar no topo
                              </button>
                            : <span className="meta">3 fixadas</span>}
                </div>
            )}
        </div>
    );
}
