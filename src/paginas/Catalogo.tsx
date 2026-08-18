import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CamisaCard } from '../componentes/CamisaCard';
import type { ResultadoBusca } from '../lib/tipos';

/** Espera o usuário parar de digitar antes de bater no banco. */
function useAtraso<T>(valor: T, ms = 300): T {
    const [lento, setLento] = useState(valor);
    useEffect(() => {
        const t = setTimeout(() => setLento(valor), ms);
        return () => clearTimeout(t);
    }, [valor, ms]);
    return lento;
}

export function Catalogo() {
    const [termo, setTermo] = useState('');
    const [itens, setItens] = useState<ResultadoBusca[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const busca = useAtraso(termo);

    useEffect(() => {
        // Corrida: com digitação rápida, uma resposta antiga pode chegar
        // depois de uma nova e sobrescrever o resultado certo.
        let cancelado = false;

        (async () => {
            setCarregando(true);
            setErro(null);

            const consulta = busca.trim()
                ? supabase.rpc('buscar_camisas', { termo: busca.trim(), limite: 40 })
                : supabase
                      .from('camisa_detalhe')
                      .select('id,slug,time_nome,marca_nome,temporada,tipo,' +
                              'patrocinador,padrao,cor_base,cor_secundaria')
                      .eq('status', 'aprovada')
                      .order('id', { ascending: false })
                      .limit(40);

            const { data, error } = await consulta;
            if (cancelado) return;

            if (error) setErro(error.message);
            else setItens((data ?? []) as ResultadoBusca[]);
            setCarregando(false);
        })();

        return () => { cancelado = true; };
    }, [busca]);

    return (
        <div className="container">
            <input
                className="busca"
                value={termo}
                onChange={e => setTermo(e.target.value)}
                placeholder="Busque por time, ano ou patrocinador — flamengo 2019, milan 04/05"
                aria-label="Buscar camisas"
            />

            {erro && <p role="alert" style={{ color: '#A32D2D' }}>{erro}</p>}
            {carregando && <p style={{ color: 'var(--suave)' }}>Buscando…</p>}

            {!carregando && itens.length === 0 && (
                // A busca sem resultado é o momento de maior intenção do
                // usuário: ele tem a camisa na mão. É aqui que o catálogo
                // cresce, então a tela vazia pede cadastro em vez de
                // apenas informar que não achou.
                <div className="vazio">
                    <h2>Essa camisa ainda não está no Cimelio</h2>
                    <p>Você tem ela? Cadastra que entra pra todo mundo.</p>
                    <Link className="botao" style={{ display: 'inline-block' }}
                          to={`/cadastrar?termo=${encodeURIComponent(termo.trim())}`}>
                        Cadastrar camisa
                    </Link>
                </div>
            )}

            <div className="grade">
                {itens.map(c => <CamisaCard key={c.id} c={c} />)}
            </div>

            {/* Quem navega sem buscar nada nunca vê a tela de "não achei",
                que era o único caminho até o cadastro. Catálogo aberto
                só cresce se o convite estiver visível. */}
            {!carregando && itens.length > 0 && (
                <p className="convite">
                    Falta alguma camisa aqui?{' '}
                    <Link to="/cadastrar" className="link-inline">Cadastre você mesmo</Link>
                </p>
            )}
        </div>
    );
}
