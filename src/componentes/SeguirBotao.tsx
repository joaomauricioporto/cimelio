import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

interface Props {
    perfilId: string;
    aoMudar?: (seguindo: boolean) => void;
}

export function SeguirBotao({ perfilId, aoMudar }: Props) {
    const { user } = useAuth();
    const [seguindo, setSeguindo] = useState<boolean | null>(null);
    const [ocupado, setOcupado] = useState(false);

    useEffect(() => {
        if (!user || user.id === perfilId) { setSeguindo(null); return; }
        let cancelado = false;

        supabase.from('seguir')
            .select('seguidor_id')
            .eq('seguidor_id', user.id).eq('seguido_id', perfilId)
            .maybeSingle()
            .then(({ data }) => { if (!cancelado) setSeguindo(Boolean(data)); });

        return () => { cancelado = true; };
    }, [user?.id, perfilId]);

    if (!user)
        return <Link to="/entrar" className="botao">Entrar para seguir</Link>;

    if (user.id === perfilId)
        return <Link to="/editar-perfil" className="botao vazado escuro">Editar perfil</Link>;

    if (seguindo === null) return null;

    async function alternar() {
        setOcupado(true);
        // Muda a tela antes da resposta: seguir é uma ação leve e a
        // espera de rede pesa mais que o risco de reverter.
        const alvo = !seguindo;
        setSeguindo(alvo);
        aoMudar?.(alvo);

        const { error } = alvo
            ? await supabase.from('seguir')
                  .insert({ seguidor_id: user!.id, seguido_id: perfilId })
            : await supabase.from('seguir')
                  .delete().eq('seguidor_id', user!.id).eq('seguido_id', perfilId);

        if (error) { setSeguindo(!alvo); aoMudar?.(!alvo); }
        setOcupado(false);
    }

    return (
        <button className={seguindo ? 'botao vazado escuro' : 'botao'}
                onClick={alternar} disabled={ocupado}>
            {seguindo ? 'Seguindo' : 'Seguir'}
        </button>
    );
}
