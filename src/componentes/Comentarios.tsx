import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { urlDaFoto } from '../lib/fotos';

interface Comentario {
    id: number;
    texto: string;
    criado_em: string;
    perfil: { id: string; username: string; nome: string | null; avatar_path: string | null } | null;
}

interface Props {
    resenhaId?: number;
    pecaId?: number;
    aoContar?: (n: number) => void;
}

export function Comentarios({ resenhaId, pecaId, aoContar }: Props) {
    const { user, perfil } = useAuth();
    const [itens, setItens] = useState<Comentario[]>([]);
    const [texto, setTexto] = useState('');
    const [lendo, setLendo] = useState(true);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    async function carregar() {
        let q = supabase.from('comentario')
            .select('id,texto,criado_em, perfil:perfil_id ( id,username,nome,avatar_path )')
            .order('criado_em');

        q = resenhaId ? q.eq('resenha_id', resenhaId) : q.eq('peca_id', pecaId!);

        const { data } = await q;
        const lista = (data as unknown as Comentario[]) ?? [];
        setItens(lista);
        aoContar?.(lista.length);
        setLendo(false);
    }

    useEffect(() => { setLendo(true); carregar(); }, [resenhaId, pecaId]);

    async function enviar(e: FormEvent) {
        e.preventDefault();
        const t = texto.trim();
        if (!t || !user) return;

        setEnviando(true); setErro(null);
        const { error } = await supabase.from('comentario').insert({
            perfil_id: user.id,
            resenha_id: resenhaId ?? null,
            peca_id: pecaId ?? null,
            texto: t,
        });
        setEnviando(false);

        if (error) return setErro(error.message);
        setTexto('');
        carregar();
    }

    async function apagar(id: number) {
        await supabase.from('comentario').delete().eq('id', id);
        carregar();
    }

    return (
        <div className="comentarios">
            {lendo && <p className="suave" style={{ fontSize: 14 }}>Carregando…</p>}

            {itens.map(c => (
                <div key={c.id} className="comentario">
                    <Link to={`/perfil/${c.perfil?.username}`} className="com-avatar">
                        {c.perfil?.avatar_path
                            ? <img src={urlDaFoto(c.perfil.avatar_path)} alt="" />
                            : <span className="vazio-avatar" aria-hidden="true" />}
                    </Link>
                    <div className="com-corpo">
                        <p className="com-cabeca">
                            <Link to={`/perfil/${c.perfil?.username}`}>
                                <b>{c.perfil?.nome || c.perfil?.username}</b>
                            </Link>
                            <span className="meta">
                                {new Date(c.criado_em).toLocaleDateString('pt-BR',
                                    { day: '2-digit', month: 'short' })}
                            </span>
                            {(c.perfil?.id === user?.id || perfil?.is_admin) && (
                                <button className="link" onClick={() => apagar(c.id)}>apagar</button>
                            )}
                        </p>
                        <p className="com-texto">{c.texto}</p>
                    </div>
                </div>
            ))}

            {!lendo && itens.length === 0 && (
                <p className="suave" style={{ fontSize: 14, margin: '4px 0 12px' }}>
                    Nenhum comentário ainda.
                </p>
            )}

            {user ? (
                <form onSubmit={enviar} className="com-form">
                    <input className="busca" value={texto} maxLength={1000}
                           placeholder="Escreva um comentário…"
                           onChange={e => setTexto(e.target.value)} />
                    <button className="botao" disabled={enviando || !texto.trim()}>
                        {enviando ? '…' : 'Enviar'}
                    </button>
                </form>
            ) : (
                <p className="suave" style={{ fontSize: 14 }}>
                    <Link to="/entrar" className="link-inline">Entre</Link> para comentar.
                </p>
            )}

            {erro && <p role="alert" className="erro">{erro}</p>}
        </div>
    );
}
