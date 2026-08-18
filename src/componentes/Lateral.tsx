import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { urlDaFoto } from '../lib/fotos';
import { Logo } from './Logo';

/**
 * Navegação lateral, só no desktop.
 *
 * A barra do topo tinha oito itens numa linha e quebrava em duas. O
 * problema não era o espaçamento: era pôr navegação de aplicativo num
 * formato de cabeçalho de site.
 *
 * Na vertical cabe tudo com folga, cada item ganha ícone, e a área
 * central fica livre para o conteúdo — que numa tela larga é o que
 * estava sobrando sem uso.
 */
export function Lateral() {
    const { perfil, carregando, sair } = useAuth();
    const { pathname } = useLocation();

    const ativo = (p: string) =>
        p === '/' ? pathname === '/' : pathname.startsWith(p);

    const itens = perfil
        ? [
            { para: '/',            rotulo: 'Linha',       icone: <IcLinha /> },
            { para: '/catalogo',    rotulo: 'Catálogo',    icone: <IcGrade /> },
            { para: '/lancamentos', rotulo: 'Lançamentos', icone: <IcEstrela /> },
            { para: '/pessoas',     rotulo: 'Pessoas',     icone: <IcPessoas /> },
          ]
        : [
            { para: '/',            rotulo: 'Catálogo',    icone: <IcGrade /> },
            { para: '/lancamentos', rotulo: 'Lançamentos', icone: <IcEstrela /> },
            { para: '/pessoas',     rotulo: 'Pessoas',     icone: <IcPessoas /> },
          ];

    return (
        <aside className="lateral">
            <div className="lateral-fixa">
                <Link to="/" className="lateral-marca">
                    <Logo tamanho={32} />
                    <span>Cimelio</span>
                </Link>

                <nav className="lateral-nav" aria-label="Navegação">
                    {itens.map(i => (
                        <Link key={i.para} to={i.para}
                              className={`lateral-item ${ativo(i.para) ? 'ativo' : ''}`}
                              aria-current={ativo(i.para) ? 'page' : undefined}>
                            {i.icone}<span>{i.rotulo}</span>
                        </Link>
                    ))}

                    {!carregando && perfil?.is_admin && (
                        <Link to="/moderacao"
                              className={`lateral-item ${ativo('/moderacao') ? 'ativo' : ''}`}>
                            <IcEscudo /><span>Moderação</span>
                        </Link>
                    )}
                </nav>

                {!carregando && (perfil ? (
                    <>
                        <Link to="/lote" className="botao claro lateral-registrar">
                            Registrar camisa
                        </Link>

                        <div className="lateral-pe">
                            <Link to={`/perfil/${perfil.username}`} className="lateral-eu">
                                {perfil.avatar_path
                                    ? <img src={urlDaFoto(perfil.avatar_path)} alt="" />
                                    : <span className="vazio-avatar" aria-hidden="true" />}
                                <span>
                                    <b>{perfil.nome || perfil.username}</b>
                                    <em>@{perfil.username}</em>
                                </span>
                            </Link>
                            <button className="link" onClick={sair}>sair</button>
                        </div>
                    </>
                ) : (
                    <Link to="/entrar" className="botao claro lateral-registrar">Entrar</Link>
                ))}
            </div>
        </aside>
    );
}

const traco = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const };

function IcLinha() {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" {...traco} /></svg>;
}
function IcGrade() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" {...traco} />
            <rect x="13" y="3.5" width="7.5" height="7.5" rx="2" {...traco} />
            <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" {...traco} />
            <rect x="13" y="13" width="7.5" height="7.5" rx="2" {...traco} />
        </svg>
    );
}
function IcEstrela() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3.4l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"
                  {...traco} strokeLinejoin="round" />
        </svg>
    );
}
function IcPessoas() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="9" cy="8" r="3.4" {...traco} />
            <path d="M2.8 20c0-3.4 2.8-5.6 6.2-5.6s6.2 2.2 6.2 5.6" {...traco} />
            <path d="M16.4 5.2a3.4 3.4 0 0 1 0 6.4M17.6 14.8c2.3.6 3.9 2.5 3.9 5.2" {...traco} />
        </svg>
    );
}
function IcEscudo() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3.2l7 2.6v6c0 4.4-3 7.4-7 9-4-1.6-7-4.6-7-9v-6z" {...traco} strokeLinejoin="round" />
        </svg>
    );
}
