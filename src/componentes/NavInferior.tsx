import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { urlDaFoto } from '../lib/fotos';

/**
 * Navegação inferior, só no celular.
 *
 * A barra de cima foi desenhada para desktop e não cabe num polegar:
 * sete links de 14px espremidos no topo da tela. No celular o alcance
 * natural é a base, e é lá que app social põe navegação.
 *
 * Cinco itens é o teto. Acima disso o alvo de toque fica menor que os
 * 44px que a Apple recomenda, e o erro de clique vira regra.
 */
export function NavInferior() {
    const { perfil, carregando } = useAuth();
    const { pathname } = useLocation();

    if (carregando) return null;

    const ativo = (p: string) =>
        p === '/' ? pathname === '/' : pathname.startsWith(p);

    const itens = perfil
        ? [
            { para: '/',          rotulo: 'Linha',    icone: <IconeLinha /> },
            { para: '/catalogo',  rotulo: 'Catálogo', icone: <IconeGrade /> },
            { para: '/lote',      rotulo: 'Registrar', icone: <IconeMais />, destaque: true },
            { para: '/pessoas',   rotulo: 'Pessoas',  icone: <IconePessoas /> },
            { para: `/perfil/${perfil.username}`, rotulo: 'Você',
              icone: perfil.avatar_path
                  ? <img className="nav-avatar" src={urlDaFoto(perfil.avatar_path)} alt="" />
                  : <IconePerfil /> },
          ]
        : [
            { para: '/',            rotulo: 'Catálogo',    icone: <IconeGrade /> },
            { para: '/lancamentos', rotulo: 'Lançamentos', icone: <IconeLinha /> },
            { para: '/pessoas',     rotulo: 'Pessoas',     icone: <IconePessoas /> },
            { para: '/entrar',      rotulo: 'Entrar',      icone: <IconePerfil /> },
          ];

    return (
        <nav className="nav-baixo" aria-label="Navegação principal">
            {itens.map(i => (
                <Link key={i.para} to={i.para}
                      className={`nav-item ${ativo(i.para) ? 'ativo' : ''} ${i.destaque ? 'destaque' : ''}`}
                      aria-current={ativo(i.para) ? 'page' : undefined}>
                    {i.icone}
                    <span>{i.rotulo}</span>
                </Link>
            ))}
        </nav>
    );
}

/* Ícones desenhados aqui em vez de biblioteca: são cinco, somam menos
   de 1 KB, e não trazem 300 KB de pacote para usar cinco formas. */

function IconeLinha() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h10" fill="none" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" />
        </svg>
    );
}

function IconeGrade() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" fill="none"
                  stroke="currentColor" strokeWidth="2.1" />
            <rect x="13" y="3.5" width="7.5" height="7.5" rx="2" fill="none"
                  stroke="currentColor" strokeWidth="2.1" />
            <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" fill="none"
                  stroke="currentColor" strokeWidth="2.1" />
            <rect x="13" y="13" width="7.5" height="7.5" rx="2" fill="none"
                  stroke="currentColor" strokeWidth="2.1" />
        </svg>
    );
}

function IconeMais() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor"
                  strokeWidth="2.6" strokeLinecap="round" />
        </svg>
    );
}

function IconePessoas() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="9" cy="8" r="3.4" fill="none" stroke="currentColor" strokeWidth="2.1" />
            <path d="M2.8 20c0-3.4 2.8-5.6 6.2-5.6s6.2 2.2 6.2 5.6" fill="none"
                  stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
            <path d="M16.4 5.2a3.4 3.4 0 0 1 0 6.4M17.6 14.8c2.3.6 3.9 2.5 3.9 5.2"
                  fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
    );
}

function IconePerfil() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.6" fill="none" stroke="currentColor" strokeWidth="2.1" />
            <path d="M4.6 20.2c0-3.8 3.3-6.2 7.4-6.2s7.4 2.4 7.4 6.2" fill="none"
                  stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
        </svg>
    );
}
