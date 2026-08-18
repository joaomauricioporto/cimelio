import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Camisa } from '../componentes/Camisa';
import { ROTULO_TIPO, type TipoCamisa } from '../lib/tipos';
import type { Padrao } from '../lib/camisaSvg';

interface Denuncia {
    id: number; motivo: string; detalhe: string | null; criado_em: string;
    resenha_id: number | null; peca_id: number | null;
    comentario_id: number | null; perfil_id: string | null;
    quem: { username: string } | null;
}

const ROTULO_MOTIVO: Record<string, string> = {
    spam: 'Spam', ofensivo: 'Ofensivo', conteudo_sexual: 'Conteúdo sexual',
    assedio: 'Assédio', falsificacao: 'Falsificação',
    direito_autoral: 'Direito autoral', outro: 'Outro',
};

interface TimePendente {
    id: number; nome: string; slug: string; tipo: string; pais: string;
    cor_1: string | null; cor_2: string | null;
    autor: { username: string } | null;
}

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
    const [times, setTimes] = useState<TimePendente[]>([]);
    const [denuncias, setDenuncias] = useState<Denuncia[]>([]);
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

        // Time pendente vem numa fila própria e precisa ser julgado
        // primeiro: sem o time aprovado, as camisas dele ficam invisíveis
        // para todos menos o autor.
        const { data: ts } = await supabase
            .from('time')
            .select('id,nome,slug,tipo,pais,cor_1,cor_2,autor:enviado_por ( username )')
            .eq('status', 'pendente')
            .order('id');
        setTimes((ts as unknown as TimePendente[]) ?? []);

        // Denúncia vem primeiro na tela porque tem prazo social: item
        // ofensivo esperando aprovação de camisa é fila mal ordenada.
        const { data: ds } = await supabase
            .from('denuncia')
            .select('id,motivo,detalhe,criado_em,resenha_id,peca_id,comentario_id,perfil_id, quem:denunciante_id ( username )')
            .eq('status', 'aberta')
            .order('criado_em');
        setDenuncias((ds as unknown as Denuncia[]) ?? []);

        setLendo(false);
    }

    useEffect(() => { if (perfil?.is_admin) carregar(); else setLendo(false); },
             [perfil?.is_admin]);

    async function julgarDenuncia(id: number, status: 'resolvida' | 'descartada') {
        const antes = denuncias;
        setDenuncias(d => d.filter(x => x.id !== id));
        const { error } = await supabase.from('denuncia').update({ status }).eq('id', id);
        if (error) { setErro(error.message); setDenuncias(antes); }
    }

    async function apagarConteudo(d: Denuncia) {
        if (d.comentario_id) await supabase.from('comentario').delete().eq('id', d.comentario_id);
        else if (d.resenha_id) await supabase.from('resenha').delete().eq('id', d.resenha_id);
        else if (d.peca_id) await supabase.from('peca').delete().eq('id', d.peca_id);
        await julgarDenuncia(d.id, 'resolvida');
    }

    async function julgarTime(id: number, status: 'aprovada' | 'rejeitada') {
        const antes = times;
        setTimes(t => t.filter(x => x.id !== id));
        const { error } = await supabase.from('time').update({ status }).eq('id', id);
        if (error) { setErro(error.message); setTimes(antes); }
    }

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
                Moderação {(itens.length + times.length + denuncias.length) > 0 &&
                    <span className="contador">{itens.length + times.length + denuncias.length}</span>}
            </h1>

            {erro && <p role="alert" className="erro">{erro}</p>}

            {denuncias.length > 0 && (
                <>
                    <h2 className="titulo-liga" style={{ marginTop: 22 }}>
                        Denúncias abertas ({denuncias.length})
                    </h2>
                    {denuncias.map(d => (
                        <div key={d.id} className="fila-item">
                            <div className="fila-dados">
                                <strong>{ROTULO_MOTIVO[d.motivo] ?? d.motivo}</strong>
                                <span className="meta">
                                    {d.comentario_id ? 'comentário'
                                        : d.resenha_id ? 'resenha'
                                        : d.peca_id ? 'peça da coleção'
                                        : 'perfil'}
                                    {' · '}
                                    {new Date(d.criado_em).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="meta">
                                    por @{d.quem?.username ?? 'desconhecido'}
                                </span>
                                {d.detalhe && <span className="meta">{d.detalhe}</span>}
                            </div>
                            <div className="fila-acoes">
                                <button className="botao" onClick={() => apagarConteudo(d)}>
                                    Apagar conteúdo
                                </button>
                                <button className="link" onClick={() => julgarDenuncia(d.id, 'descartada')}>
                                    descartar
                                </button>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {times.length > 0 && (
                <>
                    <h2 className="titulo-liga" style={{ marginTop: 22 }}>
                        Times aguardando ({times.length})
                    </h2>
                    {times.map(t => (
                        <div key={t.id} className="fila-item">
                            <Camisa padrao="listras" corBase={t.cor_1 ?? '#FFFFFF'}
                                    corSecundaria={t.cor_2} tamanho={80}
                                    descricao={t.nome} />
                            <div className="fila-dados">
                                <strong>{t.nome}</strong>
                                <span className="meta">
                                    {t.tipo === 'clube' ? 'Clube' : 'Seleção'} · {t.pais}
                                </span>
                                <span className="meta">
                                    enviado por @{t.autor?.username ?? 'desconhecido'}
                                </span>
                            </div>
                            <div className="fila-acoes">
                                <button className="botao" onClick={() => julgarTime(t.id, 'aprovada')}>
                                    Aprovar
                                </button>
                                <button className="link" onClick={() => julgarTime(t.id, 'rejeitada')}>
                                    rejeitar
                                </button>
                            </div>
                        </div>
                    ))}
                </>
            )}

            {times.length > 0 && itens.length > 0 && (
                <h2 className="titulo-liga" style={{ marginTop: 30 }}>
                    Camisas aguardando ({itens.length})
                </h2>
            )}

            {itens.length === 0 && times.length === 0 && denuncias.length === 0 && (
                <div className="vazio">
                    <h2>Fila vazia</h2>
                    <p>Nada esperando aprovação.</p>
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
