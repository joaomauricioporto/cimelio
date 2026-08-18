import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Camisa } from '../componentes/Camisa';
import { ROTULO_TIPO, type TipoCamisa } from '../lib/tipos';
import type { Padrao } from '../lib/camisaSvg';

interface Pendente {
    id: number; slug: string;
    temporada_ini: number; temporada_fim: number;
    tipo: TipoCamisa; patrocinador: string | null; variante: string | null;
    padrao: Padrao;
    cor_base: string; cor_secundaria: string | null; cor_detalhe: string | null;
    criado_em: string;
    time: { nome: string } | null;
    marca: { nome: string } | null;
    autor: { username: string } | null;
}

export function Moderacao() {
    const { perfil, carregando } = useAuth();
    const [itens, setItens] = useState<Pendente[]>([]);
    const [lendo, setLendo] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    async function carregar() {
        const { data, error } = await supabase
            .from('camisa')
            .select(`id,slug,temporada_ini,temporada_fim,tipo,patrocinador,variante,
                     padrao,cor_base,cor_secundaria,cor_detalhe,criado_em,
                     time:time_id ( nome ),
                     marca:marca_id ( nome ),
                     autor:enviado_por ( username )`)
            .eq('status', 'pendente')
            .order('criado_em');

        if (error) setErro(error.message);
        else setItens((data as unknown as Pendente[]) ?? []);
        setLendo(false);
    }

    useEffect(() => { if (perfil?.is_admin) carregar(); else setLendo(false); },
             [perfil?.is_admin]);

    async function julgar(id: number, status: 'aprovada' | 'rejeitada') {
        // Some da lista antes da resposta do servidor: a fila precisa
        // ser rápida de percorrer. Se falhar, o item volta.
        const antes = itens;
        setItens(i => i.filter(x => x.id !== id));

        const { error } = await supabase.from('camisa').update({ status }).eq('id', id);
        if (error) { setErro(error.message); setItens(antes); }
    }

    if (carregando || lendo)
        return <div className="container"><p className="suave">Carregando…</p></div>;

    if (!perfil?.is_admin)
        return (
            <div className="container">
                <div className="vazio">
                    <h2>Área restrita</h2>
                    <p>Só quem modera o catálogo acessa esta página.</p>
                    <Link to="/" className="botao" style={{ display: 'inline-block' }}>
                        Voltar ao catálogo
                    </Link>
                </div>
            </div>
        );

    return (
        <div className="container">
            <h1 style={{ fontSize: 26, fontWeight: 500 }}>
                Moderação {itens.length > 0 && <span className="contador">{itens.length}</span>}
            </h1>

            {erro && <p role="alert" className="erro">{erro}</p>}

            {itens.length === 0 && (
                <div className="vazio">
                    <h2>Fila vazia</h2>
                    <p>Nenhuma camisa esperando aprovação.</p>
                </div>
            )}

            {itens.map(c => {
                const temporada = c.temporada_fim === c.temporada_ini
                    ? String(c.temporada_ini)
                    : `${c.temporada_ini}/${String(c.temporada_fim).slice(2)}`;

                return (
                    <div key={c.id} className="fila-item">
                        <Camisa padrao={c.padrao} corBase={c.cor_base}
                                corSecundaria={c.cor_secundaria} corDetalhe={c.cor_detalhe}
                                tamanho={100}
                                descricao={`${c.time?.nome ?? ''} ${temporada}`} />

                        <div className="fila-dados">
                            <strong>{c.time?.nome}</strong>
                            <span className="meta">{temporada} · {ROTULO_TIPO[c.tipo]}</span>
                            <span className="meta">
                                {c.marca?.nome ?? 'sem fornecedora'} ·{' '}
                                {c.patrocinador ?? 'sem patrocínio'}
                                {c.variante && ` · ${c.variante}`}
                            </span>
                            <span className="meta">
                                enviada por @{c.autor?.username ?? 'desconhecido'}
                            </span>
                        </div>

                        <div className="fila-acoes">
                            <button className="botao" onClick={() => julgar(c.id, 'aprovada')}>
                                Aprovar
                            </button>
                            {/* Moderação binária desperdiça contribuição: erro
                                de digitação vira rejeição quando poderia virar
                                correção. */}
                            <Link className="link" to={`/camisa/${c.slug}/editar`}>corrigir</Link>
                            <button className="link" onClick={() => julgar(c.id, 'rejeitada')}>
                                rejeitar
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
