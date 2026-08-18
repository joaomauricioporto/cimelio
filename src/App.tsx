import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { urlDaFoto } from './lib/fotos';
import { Logo } from './componentes/Logo';
import { Catalogo } from './paginas/Catalogo';
import { CamisaPagina } from './paginas/CamisaPagina';
import { Entrar } from './paginas/Entrar';
import { Perfil } from './paginas/Perfil';
import { Lancamentos } from './paginas/Lancamentos';
import { NaoAchou } from './paginas/NaoAchou';
import { CadastrarCamisa } from './paginas/CadastrarCamisa';
import { Moderacao } from './paginas/Moderacao';
import { EditarPerfil } from './paginas/EditarPerfil';
import { CadastrarTime } from './paginas/CadastrarTime';
import { Pessoas } from './paginas/Pessoas';
import { Feed } from './paginas/Feed';

function Cabecalho() {
    const { perfil, carregando, sair } = useAuth();

    return (
        <header className="topo">
            <div className="container barra">
                <Link to="/" className="marca">
                    <Logo />
                    Cimelio <span>toda camisa tem uma história</span>
                </Link>

                <nav className="nav">
                    {!carregando && perfil && <Link to="/">Linha</Link>}
                    <Link to="/catalogo">Catálogo</Link>
                    <Link to="/lancamentos">Lançamentos</Link>
                    <Link to="/pessoas">Pessoas</Link>
                    {/* Nada é renderizado enquanto a sessão não resolve:
                        mostrar "Entrar" e trocar por "@fulano" meio segundo
                        depois é o pisca clássico de app com Supabase. */}
                    {!carregando && perfil && <Link to="/cadastrar">+ Camisa</Link>}
                    {!carregando && perfil?.is_admin && <Link to="/moderacao">Moderação</Link>}
                    {!carregando && (perfil
                        ? <>
                            <Link to={`/perfil/${perfil.username}`} className="eu">
                                {perfil.avatar_path &&
                                    <img className="avatar-mini" src={urlDaFoto(perfil.avatar_path)} alt="" />}
                                @{perfil.username}
                            </Link>
                            <button className="link" onClick={sair}>sair</button>
                          </>
                        : <Link to="/entrar">Entrar</Link>
                    )}
                </nav>
            </div>
        </header>
    );
}

/**
 * A porta de entrada muda com quem chega.
 *
 * Visitante vê a abertura e o catálogo: precisa entender o que é o
 * lugar antes de qualquer coisa. Quem já tem conta vê a linha do tempo,
 * porque o motivo de voltar é o que os outros registraram — catálogo
 * ele acessa quando procura algo específico.
 */
function Inicio() {
    const { user, carregando } = useAuth();
    if (carregando) return null;
    return user ? <Feed /> : <Catalogo />;
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Cabecalho />
                <main>
                <Routes>
                    <Route path="/"              element={<Inicio />} />
                    <Route path="/catalogo"      element={<Catalogo />} />
                    <Route path="/liga/:ligaSlug" element={<Catalogo />} />
                    <Route path="/camisa/:slug"  element={<CamisaPagina />} />
                    <Route path="/lancamentos"   element={<Lancamentos />} />
                    <Route path="/entrar"        element={<Entrar />} />
                    <Route path="/perfil/:username" element={<Perfil />} />
                    <Route path="/cadastrar"     element={<CadastrarCamisa />} />
                    <Route path="/camisa/:slug/editar" element={<CadastrarCamisa />} />
                    <Route path="/moderacao"     element={<Moderacao />} />
                    <Route path="/editar-perfil" element={<EditarPerfil />} />
                    <Route path="/cadastrar-time" element={<CadastrarTime />} />
                    <Route path="/pessoas"       element={<Pessoas />} />
                    <Route path="*"              element={<NaoAchou />} />
                </Routes>
                </main>
            </AuthProvider>
        </BrowserRouter>
    );
}
