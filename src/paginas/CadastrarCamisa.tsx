import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Camisa } from '../componentes/Camisa';
import { SeletorCor } from '../componentes/SeletorCor';
import { ROTULO_TIPO, type TipoCamisa } from '../lib/tipos';
import type { Padrao } from '../lib/camisaSvg';

interface Time  { id: number; nome: string; tipo: string; cor_1: string | null; cor_2: string | null; }
interface Marca { id: number; nome: string; }

const PADROES: { valor: Padrao; rotulo: string }[] = [
    { valor: 'lisa',        rotulo: 'Lisa' },
    { valor: 'listras',     rotulo: 'Listras verticais' },
    { valor: 'listras_tri', rotulo: 'Listras tricolores' },
    { valor: 'faixas',      rotulo: 'Faixas horizontais' },
    { valor: 'diagonal',    rotulo: 'Banda diagonal' },
    { valor: 'metades',     rotulo: 'Meia a meia' },
    { valor: 'xadrez',      rotulo: 'Xadrez' },
];

const TIPOS = Object.keys(ROTULO_TIPO) as TipoCamisa[];

export function CadastrarCamisa() {
    const { user } = useAuth();
    const navegar = useNavigate();
    const [params] = useSearchParams();

    const [times, setTimes] = useState<Time[]>([]);
    const [marcas, setMarcas] = useState<Marca[]>([]);
    const [erro, setErro] = useState<string | null>(null);
    const [jaExiste, setJaExiste] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);

    // Um ano de 4 dígitos no termo buscado vira o ano do formulário.
    const termo = params.get('termo') ?? '';
    const anoDoTermo = termo.match(/\b(19|20)\d{2}\b/)?.[0];

    const [f, setF] = useState({
        time_id: '', marca_id: '',
        temporada_ini: anoDoTermo ?? String(new Date().getFullYear()),
        partida: false,                       // temporada 2004/05
        tipo: 'titular' as TipoCamisa,
        patrocinador: '', variante: '',
        foto_url: '', foto_credito: '',
        padrao: 'lisa' as Padrao,
        cor_base: '#FFFFFF',
        cor_secundaria: null as string | null,
        cor_detalhe: null as string | null,
    });

    useEffect(() => {
        supabase.from('time').select('id,nome,tipo,cor_1,cor_2').order('nome')
            .then(({ data }) => setTimes((data as Time[]) ?? []));
        supabase.from('marca').select('id,nome').order('nome')
            .then(({ data }) => setMarcas((data as Marca[]) ?? []));
    }, []);

    const timeEscolhido = useMemo(
        () => times.find(t => String(t.id) === f.time_id),
        [times, f.time_id]
    );

    // Ao escolher o time, as cores dele entram como ponto de partida.
    // Na maioria dos casos o usuário só confirma — que é o que faz o
    // cadastro cair de minutos para segundos.
    function escolherTime(id: string) {
        const t = times.find(x => String(x.id) === id);
        setF(a => ({
            ...a,
            time_id: id,
            cor_base: t?.cor_1 ?? a.cor_base,
            cor_secundaria: a.padrao === 'lisa' ? a.cor_secundaria : (t?.cor_2 ?? a.cor_secundaria),
        }));
    }

    async function enviar(e: FormEvent) {
        e.preventDefault();
        setErro(null); setJaExiste(null);

        if (!f.time_id) return setErro('Escolha o time.');
        const ano = Number(f.temporada_ini);
        if (!Number.isInteger(ano) || ano < 1870 || ano > 2100)
            return setErro('Ano inválido.');
        if (f.padrao !== 'lisa' && !f.cor_secundaria)
            return setErro('Esse padrão precisa de uma cor secundária.');

        const fim = f.partida ? ano + 1 : ano;
        const rotuloTemp = f.partida ? `${ano}-${String(fim).slice(2)}` : String(ano);
        const baseSlug = [
            timeEscolhido?.nome.toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
            rotuloTemp, f.tipo,
        ].join('-');

        setEnviando(true);

        // Duas falhas possíveis, com significados opostos:
        //   camisa_unica   -> a camisa já existe. Leva o usuário até ela.
        //   camisa_slug_key -> só o endereço colidiu. Basta variar o slug.
        for (let tentativa = 0; tentativa < 3; tentativa++) {
            const slug = tentativa === 0 ? baseSlug : `${baseSlug}-${tentativa + 1}`;

            const { error } = await supabase.from('camisa').insert({
                time_id: Number(f.time_id),
                marca_id: f.marca_id ? Number(f.marca_id) : null,
                temporada_ini: ano,
                temporada_fim: fim,
                tipo: f.tipo,
                patrocinador: f.patrocinador.trim() || null,
                variante: f.variante.trim() || null,
                padrao: f.padrao,
                cor_base: f.cor_base,
                cor_secundaria: f.padrao === 'lisa' ? null : f.cor_secundaria,
                cor_detalhe: f.cor_detalhe,
                slug,
                status: 'pendente',
                enviado_por: user!.id,
            });

            if (!error) {
                // Imagem oficial entra como LINK, nunca cópia. E o crédito
                // é obrigatório no banco — a trava está lá justamente
                // porque depender do formulário lembrar é como se perde
                // atribuição, e atribuição perdida vira notificação de
                // direito autoral.
                if (f.foto_url.trim()) {
                    const { data: nova } = await supabase
                        .from('camisa').select('id').eq('slug', slug).maybeSingle();
                    if (nova) {
                        await supabase.from('camisa_foto').insert({
                            camisa_id: (nova as { id: number }).id,
                            url_externa: f.foto_url.trim(),
                            origem: 'oficial',
                            credito: f.foto_credito.trim() || 'Divulgação',
                        });
                    }
                }
                setEnviando(false); navegar(`/camisa/${slug}`); return;
            }

            if (error.message.includes('camisa_unica')) {
                setJaExiste(baseSlug);
                setEnviando(false);
                return;
            }
            if (!error.message.includes('camisa_slug_key')) {
                setErro(error.message);
                setEnviando(false);
                return;
            }
        }

        setErro('Não consegui gerar um endereço único. Tente mudar a variante.');
        setEnviando(false);
    }

    if (!user)
        return (
            <div className="container">
                <div className="vazio">
                    <h2>Entre para cadastrar</h2>
                    <p>Camisa nova passa por moderação antes de entrar no catálogo.</p>
                    <Link to="/entrar" className="botao" style={{ display: 'inline-block' }}>
                        Entrar
                    </Link>
                </div>
            </div>
        );

    return (
        <div className="container">
            <h1 style={{ fontSize: 26, fontWeight: 500 }}>Cadastrar camisa</h1>
            {termo && <p className="suave">Você buscou por “{termo}”.</p>}

            <div className="cadastro">
                {/* Prévia grudada: o desenho muda a cada ajuste, sem precisar
                    salvar para descobrir o resultado. */}
                <aside className="previa">
                    <Camisa
                        padrao={f.padrao}
                        corBase={f.cor_base}
                        corSecundaria={f.padrao === 'lisa' ? null : f.cor_secundaria}
                        corDetalhe={f.cor_detalhe}
                        tamanho={220}
                        descricao="Prévia da camisa"
                    />
                    <p className="meta">
                        {timeEscolhido?.nome ?? 'Escolha o time'}<br />
                        {f.partida
                            ? `${f.temporada_ini}/${String(Number(f.temporada_ini) + 1).slice(2)}`
                            : f.temporada_ini} · {ROTULO_TIPO[f.tipo]}
                    </p>
                </aside>

                <form onSubmit={enviar} className="form-cadastro">
                    <label className="rotulo" htmlFor="time">Time</label>
                    <select id="time" className="busca" value={f.time_id}
                            onChange={e => escolherTime(e.target.value)}>
                        <option value="">Escolha…</option>
                        <optgroup label="Clubes">
                            {times.filter(t => t.tipo === 'clube').map(t =>
                                <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </optgroup>
                        <optgroup label="Seleções">
                            {times.filter(t => t.tipo === 'selecao').map(t =>
                                <option key={t.id} value={t.id}>{t.nome}</option>)}
                        </optgroup>
                    </select>

                    <div className="dois">
                        <div>
                            <label className="rotulo" htmlFor="ano">Ano</label>
                            <input id="ano" className="busca" inputMode="numeric"
                                   value={f.temporada_ini}
                                   onChange={e => setF({ ...f, temporada_ini: e.target.value })} />
                        </div>
                        <div>
                            <label className="rotulo" htmlFor="tipo">Uniforme</label>
                            <select id="tipo" className="busca" value={f.tipo}
                                    onChange={e => setF({ ...f, tipo: e.target.value as TipoCamisa })}>
                                {TIPOS.map(t => <option key={t} value={t}>{ROTULO_TIPO[t]}</option>)}
                            </select>
                        </div>
                    </div>

                    <label className="checkbox">
                        <input type="checkbox" checked={f.partida}
                               onChange={e => setF({ ...f, partida: e.target.checked })} />
                        Temporada partida (europeia), tipo 2004/05
                    </label>

                    <div className="dois">
                        <div>
                            <label className="rotulo" htmlFor="marca">Fornecedora</label>
                            <select id="marca" className="busca" value={f.marca_id}
                                    onChange={e => setF({ ...f, marca_id: e.target.value })}>
                                <option value="">Não sei</option>
                                {marcas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="rotulo" htmlFor="patro">Patrocinador</label>
                            <input id="patro" className="busca" value={f.patrocinador}
                                   placeholder="deixe vazio se não tem"
                                   onChange={e => setF({ ...f, patrocinador: e.target.value })} />
                        </div>
                    </div>

                    <label className="rotulo" htmlFor="padrao">Padrão</label>
                    <select id="padrao" className="busca" value={f.padrao}
                            onChange={e => {
                                const p = e.target.value as Padrao;
                                setF(a => ({
                                    ...a, padrao: p,
                                    cor_secundaria: p !== 'lisa' && !a.cor_secundaria
                                        ? (timeEscolhido?.cor_2 ?? '#111111')
                                        : a.cor_secundaria,
                                }));
                            }}>
                        {PADROES.map(p => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
                    </select>

                    <SeletorCor rotulo="Cor principal" valor={f.cor_base}
                                aoMudar={c => setF({ ...f, cor_base: c ?? '#FFFFFF' })}
                                sugestoes={[timeEscolhido?.cor_1, timeEscolhido?.cor_2]} />

                    {f.padrao !== 'lisa' && (
                        <SeletorCor rotulo="Cor secundária" valor={f.cor_secundaria}
                                    aoMudar={c => setF({ ...f, cor_secundaria: c })}
                                    sugestoes={[timeEscolhido?.cor_2, timeEscolhido?.cor_1]} />
                    )}

                    <SeletorCor rotulo={f.padrao === 'listras_tri' ? 'Terceira listra' : 'Gola e punhos'}
                                valor={f.cor_detalhe} opcional
                                aoMudar={c => setF({ ...f, cor_detalhe: c })}
                                sugestoes={[timeEscolhido?.cor_2, timeEscolhido?.cor_1]} />

                    <label className="rotulo" htmlFor="foto">Link da imagem oficial</label>
                    <input id="foto" className="busca" value={f.foto_url}
                           placeholder="https://loja.clube.com/camisa.jpg (opcional)"
                           onChange={e => setF({ ...f, foto_url: e.target.value })} />
                    <p className="suave" style={{ fontSize: 13, marginTop: 4 }}>
                        Aponta para a imagem no site do clube. Nada é copiado
                        para o Cimelio — se o link sair do ar, volta o desenho.
                    </p>

                    {f.foto_url.trim() && (
                        <>
                            <label className="rotulo" htmlFor="credito">Crédito da imagem</label>
                            <input id="credito" className="busca" value={f.foto_credito}
                                   placeholder="Divulgação / CR Flamengo"
                                   onChange={e => setF({ ...f, foto_credito: e.target.value })} />
                        </>
                    )}

                    <label className="rotulo" htmlFor="variante">Variante</label>
                    <input id="variante" className="busca" value={f.variante}
                           placeholder="Libertadores, centenário… (opcional)"
                           onChange={e => setF({ ...f, variante: e.target.value })} />

                    {erro && <p role="alert" className="erro">{erro}</p>}

                    {jaExiste && (
                        <p className="aviso">
                            Essa camisa já está no catálogo.{' '}
                            <Link to={`/camisa/${jaExiste}`} className="link-inline">Ver a existente</Link>
                        </p>
                    )}

                    <button className="botao largo" disabled={enviando}>
                        {enviando ? 'Enviando…' : 'Cadastrar'}
                    </button>
                    <p className="suave" style={{ fontSize: 13 }}>
                        Entra como pendente e aparece no catálogo depois da moderação.
                    </p>
                </form>
            </div>
        </div>
    );
}
