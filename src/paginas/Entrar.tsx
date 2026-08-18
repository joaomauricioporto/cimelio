import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Entrar() {
    const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);
    const navegar = useNavigate();

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
