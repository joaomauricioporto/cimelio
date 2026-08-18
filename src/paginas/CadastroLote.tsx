import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { enviarFotoPeca } from '../lib/fotos';
import { Camisa } from '../componentes/Camisa';
import { ROTULO_TIPO, type TipoCamisa } from '../lib/tipos';
import type { Padrao } from '../lib/camisaSvg';

interface Time { id: number; nome: string; tipo: string; cor_1: string | null; cor_2: string | null; }

interface Opcao {
    id: number; slug: string; tipo: TipoCamisa;
    patrocinador: string | null; variante: string | null;
    padrao: Padrao; cor_base: string;
    cor_secundaria: string | null; cor_detalhe: string | null;
}

type Situacao = 'rascunho' | 'enviando' | 'pronto' | 'erro';

interface Item {
    chave: string;
    arquivo: File;
    previa: string;
    timeId: string;
    ano: string;
    tipo: TipoCamisa;
    opcoes: Opcao[];
    camisaId: number | null;
    tamanho: string;
    estampa: string;
    numero: string;
    situacao: Situacao;
    erro?: string;
}

const TIPOS = Object.keys(ROTULO_TIPO) as TipoCamisa[];

export function CadastroLote() {
    const { user, perfil } = useAuth();
    const navegar = useNavigate();
    const entrada = useRef<HTMLInputElement>(null);

    const [times, setTimes] = useState<Time[]>([]);
    const [itens, setItens] = useState<Item[]>([]);
    const [processando, setProcessando] = useState(false);

    useEffect(() => {
        supabase.from('time').select('id,nome,tipo,cor_1,cor_2').order('nome')
            .then(({ data }) => setTimes((data as Time[]) ?? []));
    }, []);

    // URL de prévia é objeto na memória do navegador. Sem revogar, cada
    // lote deixa as imagens presas até a aba fechar.
    useEffect(() => () => { itens.forEach(i => URL.revokeObjectURL(i.previa)); }, []);

    function adicionar(e: React.ChangeEvent<HTMLInputElement>) {
        const arquivos = Array.from(e.target.files ?? []);
        const anoAtual = String(new Date().getFullYear());

        setItens(a => [...a, ...arquivos.map((arquivo, i) => ({
            chave: `${Date.now()}-${i}-${arquivo.name}`,
            arquivo,
            previa: URL.createObjectURL(arquivo),
            timeId: '', ano: anoAtual, tipo: 'titular' as TipoCamisa,
            opcoes: [], camisaId: null,
            tamanho: '', estampa: '', numero: '',
            situacao: 'rascunho' as Situacao,
        }))]);

        if (entrada.current) entrada.current.value = '';
    }

    function mudar(chave: string, mudanca: Partial<Item>) {
        setItens(a => a.map(i => i.chave === chave ? { ...i, ...mudanca } : i));
    }

    /** Busca as camisas que já existem para aquele time, ano e uniforme. */
    async function procurar(item: Item) {
        if (!item.timeId || !item.ano) return;

        const { data } = await supabase
            .from('camisa')
            .select('id,slug,tipo,patrocinador,variante,padrao,cor_base,cor_secundaria,cor_detalhe')
            .eq('time_id', Number(item.timeId))
            .eq('temporada_ini', Number(item.ano))
            .eq('tipo', item.tipo)
            .eq('status', 'aprovada');

        const opcoes = (data as Opcao[]) ?? [];
        // Uma opção só: escolhe sozinho. O passo existe para desambiguar
        // variantes de patrocínio, não para pedir confirmação do óbvio.
        mudar(item.chave, {
            opcoes,
            camisaId: opcoes.length === 1 ? opcoes[0].id : null,
        });
    }

    async function criarCamisa(item: Item): Promise<number> {
        const t = times.find(x => String(x.id) === item.timeId)!;
        const base = t.nome.toLowerCase().normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        for (let n = 0; n < 3; n++) {
            const slug = `${base}-${item.ano}-${item.tipo}` + (n ? `-${n + 1}` : '');
            const { data, error } = await supabase.from('camisa').insert({
                time_id: Number(item.timeId),
                temporada_ini: Number(item.ano),
                temporada_fim: Number(item.ano),
                tipo: item.tipo,
                padrao: 'lisa',
                cor_base: t.cor_1 ?? '#FFFFFF',
                cor_secundaria: null,
                slug, status: 'pendente', enviado_por: user!.id,
            }).select('id').maybeSingle();

            if (!error && data) return (data as { id: number }).id;
            if (error && error.message.includes('camisa_unica')) {
                // Alguém cadastrou entre a busca e agora. Reaproveita.
                const { data: existente } = await supabase.from('camisa').select('id')
                    .eq('time_id', Number(item.timeId))
                    .eq('temporada_ini', Number(item.ano))
                    .eq('tipo', item.tipo).limit(1).maybeSingle();
                if (existente) return (existente as { id: number }).id;
            }
            if (error && !error.message.includes('camisa_slug_key')) throw new Error(error.message);
        }
        throw new Error('Não consegui criar a camisa.');
    }

    async function enviarTudo() {
        setProcessando(true);

        // Sequencial e não em paralelo: dez uploads simultâneos batem no
        // limite de requisições, e o erro fica impossível de atribuir.
        for (const item of itens) {
            if (item.situacao === 'pronto') continue;
            if (!item.timeId) {
                mudar(item.chave, { situacao: 'erro', erro: 'Escolha o time.' });
                continue;
            }

            mudar(item.chave, { situacao: 'enviando', erro: undefined });

            try {
                const camisaId = item.camisaId ?? await criarCamisa(item);

                const num = item.numero.trim() === '' ? null : Number(item.numero);
                const { data: peca, error } = await supabase.from('peca').insert({
                    perfil_id: user!.id,
                    camisa_id: camisaId,
                    tamanho: item.tamanho.trim() || null,
                    nome_estampa: item.estampa.trim().toUpperCase() || null,
                    numero: Number.isInteger(num) ? num : null,
                }).select('id').maybeSingle();

                if (error || !peca) throw new Error(error?.message ?? 'Falha ao criar a peça.');

                await enviarFotoPeca(user!.id, (peca as { id: number }).id, item.arquivo);
                mudar(item.chave, { situacao: 'pronto', camisaId });
            } catch (e) {
                // Falha de um item não derruba o lote: o resto continua e
                // só o que quebrou fica marcado para nova tentativa.
                mudar(item.chave, {
                    situacao: 'erro',
                    erro: e instanceof Error ? e.message : 'Erro desconhecido.',
                });
            }
        }

        setProcessando(false);
    }

    if (!user)
        return (
            <div className="container pagina">
                <div className="vazio">
                    <h2>Entre para cadastrar sua coleção</h2>
                    <Link to="/entrar" className="botao">Entrar</Link>
                </div>
            </div>
        );

    const prontos = itens.filter(i => i.situacao === 'pronto').length;
    const faltam = itens.length - prontos;

    return (
        <div className="container pagina">
            <h1>Cadastrar em lote</h1>
            <p className="suave" style={{ maxWidth: '58ch' }}>
                Escolha as fotos das suas camisas de uma vez. Para cada uma,
                preencha time, ano e uniforme — o resto é opcional.
            </p>

            <div className="lote-acoes">
                <button className="botao" onClick={() => entrada.current?.click()}
                        disabled={processando}>
                    {itens.length ? 'Adicionar mais fotos' : 'Escolher fotos'}
                </button>

                {faltam > 0 && (
                    <button className="botao claro" onClick={enviarTudo} disabled={processando}>
                        {processando ? 'Enviando…' : `Enviar ${faltam}`}
                    </button>
                )}

                {prontos > 0 && !processando && (
                    <button className="link"
                            onClick={() => perfil && navegar(`/perfil/${perfil.username}`)}>
                        ver minha coleção
                    </button>
                )}

                <input ref={entrada} type="file" accept="image/*" multiple
                       onChange={adicionar} style={{ display: 'none' }} />
            </div>

            {prontos > 0 && (
                <p className="aviso">{prontos} de {itens.length} registradas.</p>
            )}

            {itens.length === 0 && (
                <div className="vazio">
                    <h2>Nenhuma foto ainda</h2>
                    <p>
                        Fotografe suas camisas e selecione todas de uma vez.
                        Funciona melhor pelo celular, direto da galeria.
                    </p>
                </div>
            )}

            <div className="lote">
                {itens.map(item => {
                    const t = times.find(x => String(x.id) === item.timeId);
                    return (
                        <div key={item.chave} className={`lote-item ${item.situacao}`}>
                            <div className="lote-foto">
                                <img src={item.previa} alt="" />
                                {item.situacao === 'pronto' && <span className="selo">registrada</span>}
                                {item.situacao === 'enviando' && <span className="selo cinza">enviando…</span>}
                            </div>

                            <div className="lote-campos">
                                <div className="dois">
                                    <div>
                                        <label className="rotulo">Time</label>
                                        <select className="busca" value={item.timeId}
                                                disabled={item.situacao === 'pronto'}
                                                onChange={e => {
                                                    const alterado = { ...item, timeId: e.target.value, camisaId: null };
                                                    mudar(item.chave, alterado);
                                                    procurar(alterado);
                                                }}>
                                            <option value="">Escolha…</option>
                                            {times.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="rotulo">Ano</label>
                                        <input className="busca" inputMode="numeric" value={item.ano}
                                               disabled={item.situacao === 'pronto'}
                                               onChange={e => {
                                                   const alterado = { ...item, ano: e.target.value, camisaId: null };
                                                   mudar(item.chave, alterado);
                                                   procurar(alterado);
                                               }} />
                                    </div>
                                </div>

                                <div className="dois">
                                    <div>
                                        <label className="rotulo">Uniforme</label>
                                        <select className="busca" value={item.tipo}
                                                disabled={item.situacao === 'pronto'}
                                                onChange={e => {
                                                    const alterado = { ...item, tipo: e.target.value as TipoCamisa, camisaId: null };
                                                    mudar(item.chave, alterado);
                                                    procurar(alterado);
                                                }}>
                                            {TIPOS.map(x => <option key={x} value={x}>{ROTULO_TIPO[x]}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="rotulo">Tamanho</label>
                                        <input className="busca" value={item.tamanho} placeholder="M"
                                               disabled={item.situacao === 'pronto'}
                                               onChange={e => mudar(item.chave, { tamanho: e.target.value })} />
                                    </div>
                                </div>

                                <div className="dois">
                                    <div>
                                        <label className="rotulo">Nome nas costas</label>
                                        <input className="busca" value={item.estampa} placeholder="GABIGOL"
                                               disabled={item.situacao === 'pronto'}
                                               onChange={e => mudar(item.chave, { estampa: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="rotulo">Número</label>
                                        <input className="busca" inputMode="numeric" value={item.numero} placeholder="9"
                                               disabled={item.situacao === 'pronto'}
                                               onChange={e => mudar(item.chave, { numero: e.target.value })} />
                                    </div>
                                </div>

                                {/* Só aparece quando há ambiguidade real: mesmo
                                    time, ano e uniforme com patrocínios
                                    diferentes. */}
                                {item.opcoes.length > 1 && (
                                    <>
                                        <label className="rotulo">Qual delas?</label>
                                        <div className="opcoes-camisa">
                                            {item.opcoes.map(o => (
                                                <button key={o.id} type="button"
                                                        className={`opcao-camisa ${item.camisaId === o.id ? 'ativa' : ''}`}
                                                        onClick={() => mudar(item.chave, { camisaId: o.id })}>
                                                    <Camisa padrao={o.padrao} corBase={o.cor_base}
                                                            corSecundaria={o.cor_secundaria}
                                                            corDetalhe={o.cor_detalhe} tamanho={54} />
                                                    <span>{o.patrocinador ?? 'sem patrocínio'}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {item.timeId && item.opcoes.length === 0 && (
                                    <p className="suave" style={{ fontSize: 13 }}>
                                        Não existe no catálogo. Vai ser criada como pendente,
                                        com as cores do {t?.nome}. Você ajusta depois.
                                    </p>
                                )}

                                {item.erro && <p role="alert" className="erro">{item.erro}</p>}

                                {item.situacao !== 'pronto' && (
                                    <button className="link" style={{ marginTop: 10 }}
                                            onClick={() => {
                                                URL.revokeObjectURL(item.previa);
                                                setItens(a => a.filter(x => x.chave !== item.chave));
                                            }}>
                                        remover da fila
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
