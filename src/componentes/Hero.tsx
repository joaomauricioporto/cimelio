import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Camisa } from './Camisa';
import type { Padrao } from '../lib/camisaSvg';

interface Peca {
    padrao: Padrao;
    cor_base: string;
    cor_secundaria: string | null;
    cor_detalhe: string | null;
    slug: string;
    time_nome: string;
}

/**
 * A abertura.
 *
 * O elemento assinatura é a arara: uma fileira de camisas deslizando,
 * que é literalmente o que um acervo é. Nasce do assunto e não de
 * decoração — e é a única coisa em movimento na página inteira.
 *
 * Os números são reais, lidos do banco. Contador inventado em página
 * inicial é o tipo de coisa que quem entende percebe na hora.
 */
export function Hero() {
    const [pecas, setPecas] = useState<Peca[]>([]);
    const [contas, setContas] = useState<{ camisas: number; times: number } | null>(null);

    useEffect(() => {
        let cancelado = false;

        (async () => {
            const { data } = await supabase
                .from('camisa_detalhe')
                .select('slug,time_nome,padrao,cor_base,cor_secundaria,cor_detalhe')
                .eq('status', 'aprovada')
                .limit(14);
            if (!cancelado) setPecas((data as Peca[]) ?? []);

            const [c, t] = await Promise.all([
                supabase.from('camisa').select('id', { count: 'exact', head: true })
                    .eq('status', 'aprovada'),
                supabase.from('time').select('id', { count: 'exact', head: true })
                    .eq('status', 'aprovada'),
            ]);
            if (!cancelado)
                setContas({ camisas: c.count ?? 0, times: t.count ?? 0 });
        })();

        return () => { cancelado = true; };
    }, []);

    // A fileira é duplicada para o laço fechar sem salto: quando a
    // primeira cópia sai de cena, a segunda já ocupa o lugar exato.
    const fileira = pecas.length ? [...pecas, ...pecas] : [];

    return (
        <section className="hero">
            <div className="container hero-texto">
                <h1 className="hero-titulo">
                    Toda camisa<br />tem uma história
                </h1>
                <p className="hero-linha">
                    Registre o que você tem, com foto e a estampa das costas.
                    Dê nota, escreva o que achou, e monte sua estante.
                </p>

                <div className="hero-acoes">
                    <a href="#catalogo" className="botao claro">Ver o catálogo</a>
                    <Link to="/cadastrar" className="botao vazado">Cadastrar camisa</Link>
                </div>

                {contas && (
                    <p className="hero-conta num">
                        {contas.camisas} camisas · {contas.times} times
                    </p>
                )}
            </div>

            <div className="arara" aria-hidden="true">
                <div className="arara-trilho">
                    {fileira.map((p, i) => (
                        <span key={i} className="arara-item">
                            <Camisa padrao={p.padrao} corBase={p.cor_base}
                                    corSecundaria={p.cor_secundaria}
                                    corDetalhe={p.cor_detalhe} tamanho={104} />
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
