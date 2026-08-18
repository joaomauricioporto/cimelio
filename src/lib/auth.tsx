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
    bio: string | null;
    avatar_path: string | null;
    wishlist_publica: boolean;
    is_admin: boolean;
}

interface Contexto {
    user: User | null;
    perfil: Perfil | null;
    /** false só depois que a sessão do disco foi resolvida. */
    carregando: boolean;
    /** Relê o perfil. Chamado ao salvar edição, senão o cabeçalho
        continua mostrando o username antigo até dar F5. */
    recarregarPerfil: () => Promise<void>;
    sair: () => Promise<void>;
}

const Ctx = createContext<Contexto>({
    user: null, perfil: null, carregando: true,
    recarregarPerfil: async () => {},
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

    async function lerPerfil(id: string) {
        const { data } = await supabase
            .from('perfil')
            .select('id,username,nome,bio,avatar_path,wishlist_publica,is_admin')
            .eq('id', id)
            .maybeSingle();
        setPerfil((data as Perfil) ?? null);
    }

    useEffect(() => {
        if (!session?.user) { setPerfil(null); return; }
        lerPerfil(session.user.id);
    }, [session?.user?.id]);

    return (
        <Ctx.Provider value={{
            user: session?.user ?? null,
            perfil,
            carregando,
            recarregarPerfil: async () => {
                if (session?.user) await lerPerfil(session.user.id);
            },
            sair: async () => { await supabase.auth.signOut(); },
        }}>
            {children}
        </Ctx.Provider>
    );
}
