import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function LogoGoogle() {
    return (
        <svg viewBox="0 0 48 48" width="19" height="19" aria-hidden="true">
            <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.8-2 5.1-4.4 6.7v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.4z"/>
            <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.2 15.4 46 24 46z"/>
            <path fill="#FBBC05" d="M11.8 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-3 .7-4.3v-5.7H4.5C2.9 17.2 2 20.5 2 24s.9 6.8 2.5 10l7.3-5.7z"/>
            <path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.4 2 8.1 6.8 4.5 14l7.3 5.7c1.7-5.2 6.5-9 12.2-9z"/>
        </svg>
    );
}

export function Entrar() {
    const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);
    const navegar = useNavigate();

    async function comGoogle() {
        setErro(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            // Volta para a origem atual, e não para uma URL fixa: assim
            // funciona em localhost e em produção sem trocar código.
            options: { redirectTo: window.location.origin },
        });
        if (error) setErro(error.message);
    }

    async function enviar(e: FormEvent) {
        e.preventDefault();
        setErro(null); setAviso(null);

        if (!email.trim()) return setErro('Informe o email.');
        if (senha.length < 8) return setErro('A senha precisa de pelo menos 8 caracteres.');

        setEnviando(true);
        const { error } = modo === 'entrar'
            ? await supabase.auth.signInWithPassword({ email, password: senha })
            : await supabase.auth.signUp({ email, password: senha });
        setEnviando(false);

        if (error) {
            // A mensagem do Supabase vem em inglês e é técnica demais.
            setErro(
                error.message.includes('Invalid login')
                    ? 'Email ou senha incorretos.'
                    : error.message.includes('already registered')
                    ? 'Esse email já tem conta. Tente entrar.'
                    : error.message
            );
            return;
        }

        if (modo === 'criar') setAviso('Confirme o link enviado no seu email.');
        else navegar('/');
    }

    return (
        <div className="container" style={{ maxWidth: 380 }}>
            <h1 style={{ fontSize: 24, fontWeight: 500 }}>
                {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
            </h1>

            {/* O Google vem primeiro de propósito: some a senha, some o
                email de confirmação, e o cadastro cai para dois toques.
                É onde a maioria desiste. */}
            <button className="botao google" onClick={comGoogle}>
                <LogoGoogle />
                Continuar com Google
            </button>

            <div className="ou"><span>ou</span></div>

            <form onSubmit={enviar}>
                <label className="rotulo" htmlFor="email">Email</label>
                <input id="email" className="busca" type="email" autoComplete="email"
                       value={email} onChange={e => setEmail(e.target.value)} />

                <label className="rotulo" htmlFor="senha">Senha</label>
                <input id="senha" className="busca" type="password"
                       autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                       value={senha} onChange={e => setSenha(e.target.value)} />

                {erro  && <p role="alert" className="erro">{erro}</p>}
                {aviso && <p className="aviso">{aviso}</p>}

                <button className="botao largo" disabled={enviando}>
                    {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
                </button>
            </form>

            <button className="link"
                    onClick={() => { setModo(modo === 'entrar' ? 'criar' : 'entrar'); setErro(null); }}>
                {modo === 'entrar' ? 'Não tem conta? Criar' : 'Já tem conta? Entrar'}
            </button>
        </div>
    );
}
