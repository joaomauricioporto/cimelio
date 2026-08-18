import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

interface Props {
    camisaId: number;
    /** Quantas peças desta camisa o usuário já tem. */
    tenho: number;
}

interface Item { id: number; is_grail: boolean; }

/**
 * Wishlist na página da camisa.
 *
 * Fica ao lado de "Tenho essa" porque as duas respondem à mesma
 * pergunta — a peça está na estante ou ainda falta. Separar em telas
 * diferentes obrigaria o usuário a procurar a camisa duas vezes.
 */
export function Quero({ camisaId, tenho }: Props) {
    const { user } = useAuth();
    const [item, setItem] = useState<Item | null>(null);
    const [lendo, setLendo] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    async function recarregar() {
        if (!user) { setLendo(false); return; }
        const { data } = await supabase
            .from('wishlist').select('id,is_grail')
            .eq('perfil_id', user.id).eq('camisa_id', camisaId)
            .maybeSingle();
        setItem((data as Item) ?? null);
        setLendo(false);
    }

    useEffect(() => { setLendo(true); recarregar(); }, [user?.id, camisaId]);

    async function adicionar(grail: boolean) {
        if (!user) return;
        setErro(null);
        const { error } = await supabase.from('wishlist').insert({
            perfil_id: user.id, camisa_id: camisaId, is_grail: grail,
        });
        if (error) setErro(error.message); else recarregar();
    }

    async function alternarGrail() {
        if (!item) return;
        const alvo = !item.is_grail;
        setItem({ ...item, is_grail: alvo });
        const { error } = await supabase.from('wishlist')
            .update({ is_grail: alvo }).eq('id', item.id);
        if (error) { setItem({ ...item, is_grail: !alvo }); setErro(error.message); }
    }

    async function remover() {
        if (!item) return;
        await supabase.from('wishlist').delete().eq('id', item.id);
        setItem(null);
    }

    if (!user)
        return (
            <div className="caixa">
                <p className="suave">
                    <Link to="/entrar" className="link-inline">Entre</Link> para
                    guardar essa camisa na sua wishlist.
                </p>
            </div>
        );

    if (lendo) return null;

    // Já tem a peça e nada na lista: guardar o que já está na estante
    // não faz sentido, e oferecer isso só polui a tela.
    if (tenho > 0 && !item) return null;

    return (
        <div className="caixa">
            <h3 className="titulo-caixa">Wishlist</h3>

            {!item ? (
                <>
                    <p className="suave" style={{ margin: '0 0 12px', fontSize: 14 }}>
                        Ainda não tem essa? Guarde na sua lista.
                    </p>
                    <div className="botoes">
                        <button className="botao" onClick={() => adicionar(false)}>
                            Quero essa
                        </button>
                        {/* Grail é a peça que a pessoa persegue há anos. É
                            categoria própria no vocabulário do colecionador,
                            não um "favorito" genérico. */}
                        <button className="link" onClick={() => adicionar(true)}>
                            marcar como grail
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <p style={{ margin: '0 0 12px', fontSize: 14.5 }}>
                        {item.is_grail
                            ? 'Na sua wishlist, marcada como grail.'
                            : 'Na sua wishlist.'}
                        {tenho > 0 && (
                            <span className="suave"> Você já registrou essa na coleção.</span>
                        )}
                    </p>
                    <div className="botoes">
                        <button className="link" onClick={alternarGrail}>
                            {item.is_grail ? 'tirar de grail' : 'marcar como grail'}
                        </button>
                        <button className="link" onClick={remover}>
                            tirar da wishlist
                        </button>
                    </div>
                </>
            )}

            {erro && <p role="alert" className="erro">{erro}</p>}
        </div>
    );
}
