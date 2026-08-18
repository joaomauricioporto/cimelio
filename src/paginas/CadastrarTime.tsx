import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Camisa } from '../componentes/Camisa';
import { SeletorCor } from '../componentes/SeletorCor';

/** Países mais comuns primeiro; o resto entra pelo campo livre. */
const PAISES = [
    ['BR', 'Brasil'], ['AR', 'Argentina'], ['UY', 'Uruguai'], ['CL', 'Chile'],
    ['CO', 'Colômbia'], ['PY', 'Paraguai'], ['PE', 'Peru'], ['MX', 'México'],
    ['IT', 'Itália'], ['ES', 'Espanha'], ['GB', 'Reino Unido'], ['DE', 'Alemanha'],
    ['FR', 'França'], ['PT', 'Portugal'], ['NL', 'Holanda'], ['BE', 'Bélgica'],
    ['US', 'Estados Unidos'], ['JP', 'Japão'], ['SA', 'Arábia Saudita'],
] as const;

function paraSlug(nome: string): string {
    return nome.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export function CadastrarTime() {
    const { user } = useAuth();
    const navegar = useNavigate();

    const [f, setF] = useState({
        nome: '', tipo: 'clube' as 'clube' | 'selecao', pais: 'BR',
        cor_1: '#FFFFFF' as string | null,
        cor_2: '#111111' as string | null,
    });
    const [erro, setErro] = useState<string | null>(null);
    const [jaExiste, setJaExiste] = useState(false);
    const [enviando, setEnviando] = useState(false);

    async function enviar(e: FormEvent) {
        e.preventDefault();
        setErro(null); setJaExiste(false);

        const nome = f.nome.trim();
        if (nome.length < 2) return setErro('Informe o nome do time.');
        const slug = paraSlug(nome);
        if (!slug) return setErro('Esse nome não gera um endereço válido.');

        setEnviando(true);
        const { error } = await supabase.from('time').insert({
            nome, slug, tipo: f.tipo, pais: f.pais,
            cor_1: f.cor_1, cor_2: f.cor_2,
            status: 'pendente',
            enviado_por: user!.id,
        });
        setEnviando(false);

        if (error) {
            // Slug duplicado quer dizer que o time já está cadastrado —
            // possivelmente pendente e invisível para quem não enviou.
            return error.message.includes('time_slug_key')
                ? setJaExiste(true)
                : setErro(error.message);
        }

        // Volta ao cadastro de camisa: quem chega aqui veio de lá,
        // travado por falta do time. O time já aparece na lista dele
        // mesmo pendente — a política deixa o autor ver o próprio envio.
        navegar('/cadastrar');
    }

    if (!user)
        return (
            <div className="container">
                <div className="vazio">
                    <h2>Entre para cadastrar um time</h2>
                    <Link to="/entrar" className="botao" style={{ display: 'inline-block' }}>
                        Entrar
                    </Link>
                </div>
            </div>
        );

    return (
        <div className="container" style={{ maxWidth: 640 }}>
            <h1 style={{ fontSize: 26, fontWeight: 500 }}>Cadastrar time</h1>
            <p className="suave">
                Só o time. As camisas dele você cadastra depois, uma por uma.
            </p>

            <div className="cadastro">
                <aside className="previa">
                    {/* As cores aqui não são de uma camisa específica: são as
                        do clube, e servem de sugestão em toda camisa que
                        alguém cadastrar dele depois. A prévia existe para
                        você conferir se acertou o tom. */}
                    <Camisa padrao="listras" corBase={f.cor_1 ?? '#FFFFFF'}
                            corSecundaria={f.cor_2} tamanho={200}
                            descricao="Prévia das cores do time" />
                    <p className="meta">{f.nome || 'Cores do clube'}</p>
                </aside>

                <form onSubmit={enviar} className="form-cadastro">
                    <label className="rotulo" htmlFor="nome">Nome</label>
                    <input id="nome" className="busca" value={f.nome} maxLength={60}
                           placeholder="Milan, Boca Juniors, Náutico…"
                           onChange={e => setF({ ...f, nome: e.target.value })} />
                    {f.nome.trim() && (
                        <p className="suave" style={{ fontSize: 13, marginTop: 4 }}>
                            endereço: /{paraSlug(f.nome)}
                        </p>
                    )}

                    <div className="dois">
                        <div>
                            <label className="rotulo" htmlFor="tipo">Tipo</label>
                            <select id="tipo" className="busca" value={f.tipo}
                                    onChange={e => setF({ ...f, tipo: e.target.value as 'clube' | 'selecao' })}>
                                <option value="clube">Clube</option>
                                <option value="selecao">Seleção</option>
                            </select>
                        </div>
                        <div>
                            <label className="rotulo" htmlFor="pais">País</label>
                            <select id="pais" className="busca" value={f.pais}
                                    onChange={e => setF({ ...f, pais: e.target.value })}>
                                {PAISES.map(([sigla, nome]) =>
                                    <option key={sigla} value={sigla}>{nome}</option>)}
                            </select>
                        </div>
                    </div>

                    <SeletorCor rotulo="Cor principal" valor={f.cor_1}
                                aoMudar={c => setF({ ...f, cor_1: c ?? '#FFFFFF' })} />
                    <SeletorCor rotulo="Cor secundária" valor={f.cor_2} opcional
                                aoMudar={c => setF({ ...f, cor_2: c })} />

                    {erro && <p role="alert" className="erro">{erro}</p>}
                    {jaExiste && (
                        <p className="aviso">
                            Esse time já está cadastrado. Pode ser que ainda esteja
                            aguardando moderação — nesse caso, aparece em breve.
                        </p>
                    )}

                    <button className="botao largo" disabled={enviando}>
                        {enviando ? 'Enviando…' : 'Cadastrar time'}
                    </button>
                    <p className="suave" style={{ fontSize: 13 }}>
                        Entra como pendente. Você já pode usá-lo para cadastrar
                        camisas; os outros passam a vê-lo após a moderação.
                    </p>
                </form>
            </div>
        </div>
    );
}
