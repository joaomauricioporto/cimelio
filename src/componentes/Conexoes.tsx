import { useEffect, useState } from 'react';
import type { UserIdentity } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * Provedores ligados à conta.
 *
 * Quem criou conta por email fica preso à senha. Sem SMTP configurado
 * não existe recuperação — se esquecer, a conta morre. Vincular o
 * Google dá uma segunda porta para a MESMA conta, sem duplicar perfil,
 * coleção nem resenha.
 *
 * Vale saber: o Supabase já junta sozinho quando o email do OAuth é
 * igual ao do cadastro. Esta tela existe para o outro caso — Google com
 * email diferente — e para a pessoa VER o que está ligado, que é o tipo
 * de informação que só aparece quando alguém a procura.
 */
export function Conexoes() {
    const [ids, setIds] = useState<UserIdentity[]>([]);
    const [lendo, setLendo] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);

    async function carregar() {
        const { data, error } = await supabase.auth.getUserIdentities();
        if (error) setErro(error.message);
        else setIds(data?.identities ?? []);
        setLendo(false);
    }

    useEffect(() => { carregar(); }, []);

    const google = ids.find(i => i.provider === 'google');
    const email = ids.find(i => i.provider === 'email');

    async function ligarGoogle() {
        setErro(null); setAviso(null);
        const { error } = await supabase.auth.linkIdentity({
            provider: 'google',
            options: { redirectTo: window.location.origin + '/editar-perfil' },
        });
        if (error) {
            // O Supabase recusa quando o email do Google já pertence a
            // outra conta. Dizer isso é mais útil que repetir o erro cru.
            // 'Manual linking is disabled' vem quando a opção não foi
            // ligada no painel. Dizer o erro cru aqui não ajudaria nem
            // o usuário nem quem for depurar.
            setErro(
                error.message.includes('already')
                    ? 'Esse Google já está ligado a outra conta do Cimelio.'
                : error.message.toLowerCase().includes('manual linking')
                    ? 'Vincular contas está desativado no servidor. Avise o administrador.'
                : error.message
            );
        }
    }

    async function desligar(id: UserIdentity) {
        // Nunca desligar o último: sem nenhum provedor, ninguém mais
        // entra na conta — e não há como desfazer.
        if (ids.length < 2) {
            setErro('Você precisa manter pelo menos uma forma de entrar.');
            return;
        }
        const { error } = await supabase.auth.unlinkIdentity(id);
        if (error) setErro(error.message);
        else { setAviso('Desconectado.'); carregar(); }
    }

    if (lendo) return null;

    return (
        <fieldset className="opcao">
            <legend className="rotulo" style={{ margin: 0 }}>Formas de entrar</legend>

            <div className="conexao">
                <span>
                    <b>Email e senha</b>
                    <em>{email ? 'Ativo' : 'Não configurado'}</em>
                </span>
                {email && ids.length > 1 && (
                    <button type="button" className="link" onClick={() => desligar(email)}>
                        remover
                    </button>
                )}
            </div>

            <div className="conexao">
                <span>
                    <b>Google</b>
                    <em>
                        {google
                            ? google.identity_data?.email ?? 'Conectado'
                            : 'Entre com dois toques, sem senha nem email de confirmação'}
                    </em>
                </span>
                {google
                    ? (ids.length > 1 && (
                        <button type="button" className="link" onClick={() => desligar(google)}>
                            desconectar
                        </button>
                      ))
                    : <button type="button" className="botao" onClick={ligarGoogle}>
                          Conectar
                      </button>}
            </div>

            {erro && <p role="alert" className="erro">{erro}</p>}
            {aviso && <p className="aviso">{aviso}</p>}
        </fieldset>
    );
}
