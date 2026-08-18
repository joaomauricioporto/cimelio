import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Camisa } from '../componentes/Camisa';
import { ROTULO_TIPO, type CamisaDetalhe } from '../lib/tipos';
import { TenhoEssa } from '../componentes/TenhoEssa';
import { Avaliar } from '../componentes/Avaliar';
import { Quero } from '../componentes/Quero';
import { urlDaFoto } from '../lib/fotos';
import { useAuth } from '../lib/auth';

export function CamisaPagina() {
    const { slug } = useParams<{ slug: string }>();
    const { perfil } = useAuth();
    const [c, setC] = useState<CamisaDetalhe | null>(null);
    const [fotos, setFotos] = useState<string[]>([]);
    const [tenho, setTenho] = useState(0);
    const [oficial, setOficial] = useState<{ url: string; credito: string } | null>(null);
    const [estado, setEstado] = useState<'carregando' | 'pronto' | 'nao_achou'>('carregando');

    useEffect(() => {
        let cancelado = false;
        (async () => {
            const { data, error } = await supabase
                .from('camisa_detalhe')
                .select('*')
                .eq('slug', slug)
                .maybeSingle();          // maybeSingle não estoura se não achar

            if (cancelado) return;
            if (error || !data) setEstado('nao_achou');
            else {
                setC(data as CamisaDetalhe);
                setEstado('pronto');

                // Fotos reais que a comunidade subiu desta camisa.
                // O desenho é reserva, não padrão: quem quer ver camisa
                // quer ver a camisa.
                const { data: fs } = await supabase
                    .from('peca_foto')
                    .select('path, peca:peca_id!inner(camisa_id)')
                    .eq('peca.camisa_id', (data as CamisaDetalhe).id)
                    .limit(8);
                if (!cancelado) setFotos(((fs ?? []) as { path: string }[]).map(x => x.path));

                const { data: of } = await supabase
                    .from('camisa_foto')
                    .select('url_externa,credito')
                    .eq('camisa_id', (data as CamisaDetalhe).id)
                    .not('url_externa', 'is', null)
                    .order('posicao').limit(1).maybeSingle();
                if (!cancelado && of)
                    setOficial({ url: (of as any).url_externa, credito: (of as any).credito ?? '' });
            }
        })();
        return () => { cancelado = true; };
    }, [slug]);

    if (estado === 'carregando')
        return <div className="container"><p style={{ color: 'var(--suave)' }}>Carregando…</p></div>;

    if (estado === 'nao_achou' || !c)
        return (
            <div className="container">
                <div className="vazio">
                    <h2>Camisa não encontrada</h2>
                    <p>Ela pode ter sido removida, ou o link está errado.</p>
                    <Link to="/" className="botao" style={{ display: 'inline-block' }}>
                        Voltar ao catálogo
                    </Link>
                </div>
            </div>
        );

    const estrelas = c.media_estrelas;

    return (
        <div className="container">
            <div className="detalhe">
                <div className="galeria">
                    {fotos.length > 0 ? (
                        <>
                            <img className="foto-principal" src={urlDaFoto(fotos[0])}
                                 alt={`${c.time_nome} ${c.temporada}`} />
                            {fotos.length > 1 && (
                                <div className="tiras">
                                    {fotos.slice(1).map(p => (
                                        <img key={p} src={urlDaFoto(p)} alt="" loading="lazy" />
                                    ))}
                                </div>
                            )}
                            <p className="meta">{fotos.length} foto(s) da comunidade</p>
                        </>
                    ) : oficial ? (
                        <>
                            <img className="foto-principal" src={oficial.url}
                                 alt={`${c.time_nome} ${c.temporada}`}
                                 onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            <p className="meta">{oficial.credito}</p>
                        </>
                    ) : (
                        <>
                            <Camisa
                                padrao={c.padrao}
                                corBase={c.cor_base}
                                corSecundaria={c.cor_secundaria}
                                corDetalhe={c.cor_detalhe}
                                tamanho={280}
                                descricao={`${c.time_nome} ${c.temporada} ${ROTULO_TIPO[c.tipo]}`}
                            />
                            <p className="meta">
                                Ainda sem foto. Tem essa camisa? Registre e envie a sua.
                            </p>
                        </>
                    )}
                </div>

                <div style={{ flex: '1 1 320px' }}>
                    <div className="titulo-camisa">
                        <h1>{c.time_nome}</h1>
                        {perfil?.is_admin && (
                            <Link to={`/camisa/${c.slug}/editar`} className="link">corrigir</Link>
                        )}
                    </div>
                    <p className="sub">{c.temporada} · {ROTULO_TIPO[c.tipo]}</p>

                    <p className="nota">
                        {estrelas != null
                            ? <><strong>{estrelas.toFixed(1)}</strong> de 5 · {c.total_notas} nota(s)</>
                            : 'Ainda sem nota. Seja o primeiro.'}
                    </p>

                    <dl className="ficha">
                        <div><dt>Fornecedora</dt><dd>{c.marca_nome ?? '—'}</dd></div>
                        <div><dt>Patrocinador</dt><dd>{c.patrocinador ?? 'Sem patrocínio'}</dd></div>
                        {c.variante && <div><dt>Variante</dt><dd>{c.variante}</dd></div>}
                        <div><dt>Resenhas</dt><dd>{c.total_resenhas ?? 0}</dd></div>
                    </dl>

                    <TenhoEssa camisaId={c.id} aoContar={setTenho} />
                    <Quero     camisaId={c.id} tenho={tenho} />
                    <Avaliar   camisaId={c.id} />
                </div>
            </div>
        </div>
    );
}
