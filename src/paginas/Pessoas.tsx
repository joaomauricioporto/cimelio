import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { urlDaFoto } from '../lib/fotos';

interface Pessoa {
    id: string;
    username: string;
    nome: string | null;
    bio: string | null;
    avatar_path: string | null;
    peca: { count: number }[];
}

function useAtraso<T>(valor: T, ms = 300): T {
    const [lento, setLento] = useState(valor);
    useEffect(() => {
        const t = setTimeout(() => setLento(valor), ms);
        return () => clearTimeout(t);
    }, [valor, ms]);
    return lento;
}

export function Pessoas() {
    const [termo, setTermo] = useState('');
    const [itens, setItens] = useState<Pessoa[]>([]);
    const [carregando, setCarregando] = useState(true);
    const busca = useAtraso(termo);

    useEffect(() => {
        let cancelado = false;
        setCarregando(true);

        (async () => {
            // count na relação traz o tamanho da coleção sem puxar as
            // peças: perfil com 200 camisas custa o mesmo que um com 2.
            let q = supabase
                .from('perfil')
                .select('id,username,nome,bio,avatar_path,peca(count)')
                .limit(40);

            const t = busca.trim();
            if (t) q = q.or(`username.ilike.%${t}%,nome.ilike.%${t}%`);

            const { data } = await q;
            if (cancelado) return;

            // Ordena por tamanho da coleção: perfil vazio no topo de uma
            // busca de descoberta não ajuda ninguém.
            const lista = ((data as Pessoa[]) ?? []).sort(
                (a, b) => (b.peca?.[0]?.count ?? 0) - (a.peca?.[0]?.count ?? 0)
            );
            setItens(lista);
            setCarregando(false);
        })();

        return () => { cancelado = true; };
    }, [busca]);

    return (
        <div className="container">
            <h1 style={{ fontSize: 26, fontWeight: 500 }}>Colecionadores</h1>

            <input
                className="busca"
                value={termo}
                onChange={e => setTermo(e.target.value)}
                placeholder="Buscar por nome ou @username"
                aria-label="Buscar colecionadores"
            />

            {carregando && <p className="suave">Buscando…</p>}

            {!carregando && itens.length === 0 && (
                <div className="vazio">
                    <h2>Ninguém encontrado</h2>
                    <p>Tente outro nome.</p>
                </div>
            )}

            <div className="lista-pessoas">
                {itens.map(p => {
                    const total = p.peca?.[0]?.count ?? 0;
                    return (
                        <Link key={p.id} to={`/perfil/${p.username}`} className="cartao-pessoa">
                            {p.avatar_path
                                ? <img className="avatar" src={urlDaFoto(p.avatar_path)} alt="" />
                                : <div className="avatar vazio-avatar" aria-hidden="true" />}

                            <div className="dados-pessoa">
                                <strong>{p.nome || p.username}</strong>
                                <span className="meta">@{p.username}</span>
                                <span className="meta">
                                    {total} {total === 1 ? 'camisa' : 'camisas'}
                                </span>
                                {p.bio && <span className="bio-curta">{p.bio}</span>}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
