import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Camisa } from '../componentes/Camisa';
import { urlDaFoto } from '../lib/fotos';
import { ROTULO_TIPO, type TipoCamisa } from '../lib/tipos';
import type { Padrao } from '../lib/camisaSvg';

interface PecaNaEstante {
    id: number;
    versao: string | null;
    tamanho: string | null;
    nome_estampa: string | null;
    numero: number | null;
    peca_foto: { path: string }[];
    camisa: {
        slug: string; tipo: TipoCamisa;
        temporada_ini: number; temporada_fim: number;
        padrao: Padrao; cor_base: string;
        cor_secundaria: string | null; cor_detalhe: string | null;
        time: { nome: string } | null;
    } | null;
}

export function Perfil() {
    const { username } = useParams<{ username: string }>();
    const { perfil: meu } = useAuth();
    const [nome, setNome] = useState<string | null>(null);
    const [bio, setBio] = useState<string | null>(null);
    const [avatar, setAvatar] = useState<string | null>(null);
    const [pecas, setPecas] = useState<PecaNaEstante[]>([]);
    const [estado, setEstado] = useState<'carregando' | 'pronto' | 'nao_achou'>('carregando');

    useEffect(() => {
        let cancelado = false;

        (async () => {
            const { data: p } = await supabase
                .from('perfil').select('id,username,nome,bio,avatar_path')
                .eq('username', username).maybeSingle();

            if (cancelado) return;
            if (!p) { setEstado('nao_achou'); return; }
            setNome(p.nome || p.username);
            setBio((p as { bio: string | null }).bio);
            setAvatar((p as { avatar_path: string | null }).avatar_path);

            // Um join só, em vez de N+1: sem isto, uma coleção de 80
            // camisas dispara 81 requisições e a página trava.
            const { data: itens } = await supabase
                .from('peca')
                .select(`id,versao,tamanho,nome_estampa,numero,
                         peca_foto ( path ),
                         camisa:camisa_id (
                             slug,tipo,temporada_ini,temporada_fim,
                             padrao,cor_base,cor_secundaria,cor_detalhe,
                             time:time_id ( nome )
                         )`)
                .eq('perfil_id', p.id)
                .order('id', { ascending: false });

            if (cancelado) return;
            setPecas((itens as unknown as PecaNaEstante[]) ?? []);
            setEstado('pronto');
        })();

        return () => { cancelado = true; };
    }, [username]);

    if (estado === 'carregando')
        return <div className="container"><p className="suave">Carregando…</p></div>;

    if (estado === 'nao_achou')
        return (
            <div className="container">
                <div className="vazio">
                    <h2>Perfil não encontrado</h2>
                    <Link to="/" className="botao" style={{ display: 'inline-block' }}>
                        Voltar ao catálogo
                    </Link>
                </div>
            </div>
        );

    return (
        <div className="container">
            <div className="cabecalho-perfil">
                {avatar
                    ? <img className="avatar" src={urlDaFoto(avatar)} alt="" />
                    : <div className="avatar vazio-avatar" aria-hidden="true" />}

                <div className="dados-perfil">
                    <h1>{nome}</h1>
                    <p className="suave">
                        @{username} · {pecas.length} {pecas.length === 1 ? 'camisa' : 'camisas'}
                    </p>
                    {bio && <p className="bio">{bio}</p>}
                </div>

                {meu?.username === username && (
                    <Link to="/editar-perfil" className="link">editar perfil</Link>
                )}
            </div>

            {pecas.length === 0 && (
                <div className="vazio">
                    <h2>Estante vazia</h2>
                    <p>
                        {meu?.username === username
                            ? 'Dar nota não coloca a camisa aqui. Abra uma camisa e use "Tenho essa".'
                            : 'Nenhuma camisa registrada ainda.'}
                    </p>
                    <Link to="/" className="botao" style={{ display: 'inline-block' }}>
                        Explorar catálogo
                    </Link>
                </div>
            )}

            <div className="grade">
                {pecas.map(p => {
                    const c = p.camisa;
                    if (!c) return null;
                    const temporada = c.temporada_fim === c.temporada_ini
                        ? String(c.temporada_ini)
                        : `${c.temporada_ini}/${String(c.temporada_fim).slice(2)}`;

                    return (
                        <Link key={p.id} to={`/camisa/${c.slug}`} className="card">
                            {/* A foto da peça vem primeiro. É a estante do
                                colecionador: ele quer ver o pano dele, não
                                uma ilustração aproximada. O desenho fica
                                para quem ainda não fotografou. */}
                            {p.peca_foto?.[0]
                                ? <img className="foto-card" loading="lazy"
                                       src={urlDaFoto(p.peca_foto[0].path)}
                                       alt={`${c.time?.nome ?? ''} ${temporada}`} />
                                : <Camisa padrao={c.padrao} corBase={c.cor_base}
                                          corSecundaria={c.cor_secundaria} corDetalhe={c.cor_detalhe}
                                          tamanho={130}
                                          descricao={`${c.time?.nome ?? ''} ${temporada}`} />}
                            <div className="time">{c.time?.nome}</div>
                            <div className="meta">{temporada} · {ROTULO_TIPO[c.tipo]}</div>
                            {p.nome_estampa && (
                                <div className="meta estampa">
                                    {p.nome_estampa} {p.numero ?? ''}
                                </div>
                            )}
                            {p.tamanho && <div className="meta">{p.tamanho}</div>}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
