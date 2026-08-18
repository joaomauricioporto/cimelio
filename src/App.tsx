import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { urlDaFoto } from './lib/fotos';
import { Catalogo } from './paginas/Catalogo';
import { CamisaPagina } from './paginas/CamisaPagina';
import { Entrar } from './paginas/Entrar';
import { Perfil } from './paginas/Perfil';
import { Lancamentos } from './paginas/Lancamentos';
import { NaoAchou } from './paginas/NaoAchou';
import { CadastrarCamisa } from './paginas/CadastrarCamisa';
import { Moderacao } from './paginas/Moderacao';
import { EditarPerfil } from './paginas/EditarPerfil';

function Cabecalho() {
    const { perfil, carregando, sair } = useAuth();

    return (
        <header className="topo">
            <div className="container barra">
                <Link to="/" className="marca">
                    Cimelio <span>· toda camisa tem uma história</span>
                </Link>

                <nav className="nav">
                    <Link to="/lancamentos">Lançamentos</Link>
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

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Cabecalho />
                <Routes>
                    <Route path="/"              element={<Catalogo />} />
                    <Route path="/camisa/:slug"  element={<CamisaPagina />} />
                    <Route path="/lancamentos"   element={<Lancamentos />} />
                    <Route path="/entrar"        element={<Entrar />} />
                    <Route path="/perfil/:username" element={<Perfil />} />
                    <Route path="/cadastrar"     element={<CadastrarCamisa />} />
                    <Route path="/camisa/:slug/editar" element={<CadastrarCamisa />} />
                    <Route path="/moderacao"     element={<Moderacao />} />
                    <Route path="/editar-perfil" element={<EditarPerfil />} />
                    <Route path="*"              element={<NaoAchou />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}
