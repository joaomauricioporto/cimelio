import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CamisaCard } from '../componentes/CamisaCard';
import { Hero } from '../componentes/Hero';
import { useConsulta, useAtraso } from '../dados/useConsulta';
import { buscarCamisas, camisasDaLiga, catalogoRecente, listarLigas } from '../dados/consultas';

export function Catalogo() {
    const { ligaSlug } = useParams<{ ligaSlug: string }>();
    const navegar = useNavigate();

    const [termo, setTermo] = useState('');
    const busca = useAtraso(termo);

    const { dados: ligas } = useConsulta(listarLigas, [], { inicial: [] });

    const ligaAtual = useMemo(
        () => (ligas ?? []).find(l => l.slug === ligaSlug),
        [ligas, ligaSlug]
    );

    // Buscar por texto ignora o filtro de liga de propósito: quem digita
    // "milan" quer a camisa do Milan, não ser barrado por estar com o
    // Brasileirão selecionado.
    const { dados: itens, carregando, erro } = useConsulta(
        async () => {
            const t = busca.trim();
            if (t) return buscarCamisas(t);
            return ligaSlug ? camisasDaLiga(ligaSlug) : catalogoRecente();
        },
        [busca, ligaSlug],
        { inicial: [] }
    );

    const titulo = busca.trim()
        ? `Resultados para “${busca.trim()}”`
        : ligaAtual ? ligaAtual.nome : 'Catálogo';

    return (
        <>
            {/* O hero só aparece na entrada limpa: com busca ativa ou
                competição escolhida, a pessoa já sabe o que quer e a
                abertura vira obstáculo. */}
            {!ligaSlug && !busca.trim() && <Hero />}

            <div className="container">
            <div className="painel">
            <input
                className="busca"
                value={termo}
                onChange={e => setTermo(e.target.value)}
                placeholder="Time, ano ou patrocinador — flamengo 2019, milan 04/05"
                aria-label="Buscar camisas"
            />

            <nav className="faixa" aria-label="Competições">
                <button className="competicao" aria-pressed={!ligaSlug}
                        onClick={() => navegar('/')}>
                    Todas
                </button>
                {(ligas ?? []).map(l => (
                    <button key={l.id} className="competicao"
                            aria-pressed={l.slug === ligaSlug}
                            onClick={() => navegar(`/liga/${l.slug}`)}>
                        <span className="pais">{l.pais}</span>
                        {l.nome}
                    </button>
                ))}
            </nav>
            </div>

            <section className="secao" id="catalogo">
                <h2 className="rotulo-secao">{titulo}</h2>

                {erro && <p role="alert" className="erro">{erro}</p>}
                {carregando && <p className="suave">Carregando…</p>}

                {!carregando && (itens ?? []).length === 0 && (
                    // Busca sem resultado é o pico de intenção: a pessoa
                    // tem a camisa na mão. Tratar como erro joga fora a
                    // principal via de crescimento do catálogo.
                    <div className="vazio">
                        <h2>{busca.trim()
                            ? 'Essa camisa ainda não está no Cimelio'
                            : 'Nenhuma camisa nesta competição'}</h2>
                        <p>{busca.trim()
                            ? 'Você tem ela? Cadastre e entra para todo mundo.'
                            : 'Cadastre a primeira.'}</p>
                        <Link className="botao"
                              to={`/cadastrar?termo=${encodeURIComponent(termo.trim())}`}>
                            Cadastrar camisa
                        </Link>
                    </div>
                )}

                <div className="grade">
                    {(itens ?? []).map(c => <CamisaCard key={c.id} c={c} />)}
                </div>

                {!carregando && (itens ?? []).length > 0 && (
                    <p className="convite">
                        Falta alguma camisa aqui?{' '}
                        <Link to="/cadastrar" className="link-inline">Cadastre você mesmo</Link>
                    </p>
                )}
            </section>
            </div>
        </>
    );
}
