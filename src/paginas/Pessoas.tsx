import { useState } from 'react';
import { Link } from 'react-router-dom';
import { urlDaFoto } from '../lib/fotos';
import { useConsulta, useAtraso } from '../dados/useConsulta';
import { buscarPessoas } from '../dados/consultas';

export function Pessoas() {
    const [termo, setTermo] = useState('');
    const busca = useAtraso(termo);

    const { dados: itens, carregando } = useConsulta(
        () => buscarPessoas(busca.trim()),
        [busca],
        { inicial: [] }
    );

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

            {!carregando && (itens ?? []).length === 0 && (
                <div className="vazio">
                    <h2>Ninguém encontrado</h2>
                    <p>Tente outro nome.</p>
                </div>
            )}

            <div className="lista-pessoas">
                {(itens ?? []).map(p => {
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
