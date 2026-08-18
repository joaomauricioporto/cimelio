import {
    createContext, useContext, useEffect, useState,
    type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface Perfil {
    id: string;
    username: string;
    nome: string | null;
    is_admin: boolean;
}

interface Contexto {
    user: User | null;
    perfil: Perfil | null;
    /** false só depois que a sessão do disco foi resolvida. */
    carregando: boolean;
    sair: () => Promise<void>;
}

const Ctx = createContext<Contexto>({
    user: null, perfil: null, carregando: true,
    sair: async () => {},
});

export function useAuth() {
    return useContext(Ctx);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [perfil, setPerfil] = useState<Perfil | null>(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        // getSession lê do localStorage e é assíncrono. Sem este estado
        // de carregando, a tela pisca "deslogado" a cada F5 mesmo com
        // sessão válida — e rota protegida chuta o usuário pra fora.
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setCarregando(false);
        });

        const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
            setSession(s);
            setCarregando(false);
        });

        // Sem este unsubscribe, cada montagem do provider deixa um
        // listener vivo. Em desenvolvimento com StrictMode isso dobra
        // na hora e vira vazamento silencioso.
        return () => sub.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!session?.user) { setPerfil(null); return; }

        let cancelado = false;
        supabase
            .from('perfil')
            .select('id,username,nome,is_admin')
            .eq('id', session.user.id)
            .maybeSingle()
            .then(({ data }) => {
                if (!cancelado) setPerfil((data as Perfil) ?? null);
            });

        return () => { cancelado = true; };
    }, [session?.user?.id]);

    return (
        <Ctx.Provider value={{
            user: session?.user ?? null,
            perfil,
            carregando,
            sair: async () => { await supabase.auth.signOut(); },
        }}>
            {children}
        </Ctx.Provider>
    );
}
