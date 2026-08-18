import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

interface Props {
    resenhaId?: number;
    pecaId?: number;
    curtidas: number;
    euCurti: boolean;
    comentarios: number;
    aoAbrirComentarios: () => void;
    autorId: string;
}

/**
 * Barra de ações do evento: curtir, comentar, denunciar.
 *
 * Curtir só existe em resenha — curtir o registro de uma peça alheia
 * não quer dizer nada. Comentar vale nos dois.
 */
export function Acoes({
    resenhaId, pecaId, curtidas, euCurti, comentarios,
    aoAbrirComentarios, autorId,
}: Props) {
    const { user } = useAuth();
    const [curtido, setCurtido] = useState(euCurti);
    const [total, setTotal] = useState(curtidas);
    const [menu, setMenu] = useState(false);

    async function curtir() {
        if (!user || !resenhaId) return;

        // Muda antes da resposta: curtir é gesto rápido e repetido, e a
        // espera de rede aqui é o que faz parecer travado.
        const alvo = !curtido;
        setCurtido(alvo);
        setTotal(t => t + (alvo ? 1 : -1));

        const { error } = alvo
            ? await supabase.from('resenha_curtida')
                  .insert({ perfil_id: user.id, resenha_id: resenhaId })
            : await supabase.from('resenha_curtida')
                  .delete().eq('perfil_id', user.id).eq('resenha_id', resenhaId);

        if (error) { setCurtido(!alvo); setTotal(t => t + (alvo ? -1 : 1)); }
    }

    return (
        <div className="acoes">
            {resenhaId && (
                user
                    ? <button className={`acao ${curtido ? 'curtido' : ''}`} onClick={curtir}
                              aria-pressed={curtido} aria-label="Curtir">
                          <Coracao cheio={curtido} />
                          {total > 0 && <span className="num">{total}</span>}
                      </button>
                    : <Link to="/entrar" className="acao" aria-label="Entrar para curtir">
                          <Coracao cheio={false} />
                          {total > 0 && <span className="num">{total}</span>}
                      </Link>
            )}

            <button className="acao" onClick={aoAbrirComentarios} aria-label="Comentários">
                <Balao />
                {comentarios > 0 && <span className="num">{comentarios}</span>}
            </button>

            {user && user.id !== autorId && (
                <div className="acao-menu">
                    <button className="acao" onClick={() => setMenu(m => !m)}
                            aria-expanded={menu} aria-label="Mais opções">
                        <Tres />
                    </button>
                    {menu && (
                        <Denunciar alvo={{ resenhaId, pecaId, perfilId: autorId }}
                                   aoFechar={() => setMenu(false)} />
                    )}
                </div>
            )}
        </div>
    );
}

const MOTIVOS: [string, string][] = [
    ['spam', 'Spam ou propaganda'],
    ['ofensivo', 'Conteúdo ofensivo'],
    ['conteudo_sexual', 'Conteúdo sexual'],
    ['assedio', 'Assédio'],
    ['falsificacao', 'Anúncio de falsificação'],
    ['direito_autoral', 'Uso indevido de imagem'],
    ['outro', 'Outro motivo'],
];

function Denunciar({ alvo, aoFechar }: {
    alvo: { resenhaId?: number; pecaId?: number; perfilId: string };
    aoFechar: () => void;
}) {
    const { user } = useAuth();
    const [enviado, setEnviado] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    async function enviar(motivo: string) {
        const { error } = await supabase.from('denuncia').insert({
            denunciante_id: user!.id,
            resenha_id: alvo.resenhaId ?? null,
            peca_id: alvo.pecaId ?? null,
            motivo,
        });
        // Denúncia repetida não é erro para quem denuncia: já foi
        // registrada, e dizer "você já denunciou" resolve igual.
        if (error && !error.message.includes('denuncia_unica')) {
            setErro('Não consegui registrar. Tente de novo.');
            return;
        }
        setEnviado(true);
    }

    async function bloquear() {
        await supabase.from('bloqueio').insert({
            bloqueador_id: user!.id, bloqueado_id: alvo.perfilId,
        });
        // Recarrega porque o bloqueio muda o que a linha inteira mostra,
        // não só este item.
        window.location.reload();
    }

    return (
        <div className="menu-flutuante" role="menu">
            {enviado ? (
                <>
                    <p className="menu-ok">Denúncia registrada. Obrigado.</p>
                    <button className="menu-item" onClick={aoFechar}>Fechar</button>
                </>
            ) : (
                <>
                    <p className="menu-titulo">Denunciar por</p>
                    {MOTIVOS.map(([v, r]) => (
                        <button key={v} className="menu-item" role="menuitem"
                                onClick={() => enviar(v)}>{r}</button>
                    ))}
                    <hr />
                    <button className="menu-item perigo" onClick={bloquear}>
                        Bloquear esta pessoa
                    </button>
                    <button className="menu-item" onClick={aoFechar}>Cancelar</button>
                    {erro && <p className="erro">{erro}</p>}
                </>
            )}
        </div>
    );
}

function Coracao({ cheio }: { cheio: boolean }) {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20.4s-7.6-4.7-7.6-9.6a4.3 4.3 0 0 1 7.6-2.7 4.3 4.3 0 0 1 7.6 2.7c0 4.9-7.6 9.6-7.6 9.6z"
                  fill={cheio ? 'currentColor' : 'none'}
                  stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        </svg>
    );
}
function Balao() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20.5 12c0 4-3.8 7.2-8.5 7.2-1 0-2-.15-2.9-.42L4 20.5l1.5-3.6C4.2 15.6 3.5 13.9 3.5 12c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2z"
                  fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        </svg>
    );
}
function Tres() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="5.5" r="1.8" fill="currentColor" />
            <circle cx="12" cy="12" r="1.8" fill="currentColor" />
            <circle cx="12" cy="18.5" r="1.8" fill="currentColor" />
        </svg>
    );
}
