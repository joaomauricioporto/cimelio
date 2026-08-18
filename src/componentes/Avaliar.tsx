import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { Estrelas } from './Estrelas';

export function Avaliar({ camisaId }: { camisaId: number }) {
    const { user } = useAuth();
    const [nota, setNota] = useState<number | null>(null);
    const [texto, setTexto] = useState('');
    const [estado, setEstado] = useState<'lendo' | 'pronto' | 'salvando' | 'salvo'>('lendo');
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        if (!user) { setEstado('pronto'); return; }
        let cancelado = false;

        supabase.from('resenha')
            .select('nota,texto')
            .eq('camisa_id', camisaId)
            .eq('perfil_id', user.id)
            .maybeSingle()
            .then(({ data }) => {
                if (cancelado) return;
                if (data) { setNota(data.nota); setTexto(data.texto ?? ''); }
                setEstado('pronto');
            });

        return () => { cancelado = true; };
    }, [user?.id, camisaId]);

    async function salvar(novaNota: number | null, novoTexto: string) {
        if (!user) return;
        setEstado('salvando'); setErro(null);

        // upsert com onConflict: a tabela tem unique(perfil_id, camisa_id),
        // então insert puro estouraria na segunda vez. Assim o mesmo
        // caminho serve para criar e para editar.
        const { error } = await supabase.from('resenha').upsert({
            perfil_id: user.id,
            camisa_id: camisaId,
            nota: novaNota,
            texto: novoTexto.trim() || null,
        }, { onConflict: 'perfil_id,camisa_id' });

        if (error) { setErro(error.message); setEstado('pronto'); return; }
        setEstado('salvo');
        setTimeout(() => setEstado('pronto'), 1600);
    }

    if (!user)
        return (
            <div className="caixa">
                <p className="suave">
                    <Link to="/entrar" className="link-inline">Entre</Link> para dar nota e resenhar.
                </p>
            </div>
        );

    if (estado === 'lendo')
        return <div className="caixa"><p className="suave">Carregando sua nota…</p></div>;

    return (
        <div className="caixa">
            <h3 className="titulo-caixa">Sua avaliação</h3>

            <Estrelas valor={nota} aoEscolher={n => { setNota(n); salvar(n, texto); }} />

            <textarea
                className="texto"
                rows={3}
                value={texto}
                onChange={e => setTexto(e.target.value)}
                onBlur={() => { if (nota !== null || texto.trim()) salvar(nota, texto); }}
                placeholder="O que você achou dessa camisa?"
                aria-label="Sua resenha"
            />

            {erro && <p role="alert" className="erro">{erro}</p>}
            {estado === 'salvando' && <p className="suave">Salvando…</p>}
            {estado === 'salvo'    && <p className="ok">Salvo.</p>}
        </div>
    );
}
