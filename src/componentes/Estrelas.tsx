/**
 * Nota em meias-estrelas.
 *
 * O banco guarda 1..10 inteiro; a tela mostra 0,5..5. Inteiro evita
 * comparação de float e permite meia-estrela sem casa decimal solta.
 * A conversão vive só aqui — nenhum outro lugar do app divide por 2.
 */
interface Props {
    /** Valor de 1 a 10, ou null para "sem nota". */
    valor: number | null;
    /** Sem isto, é só exibição. */
    aoEscolher?: (valor: number) => void;
    tamanho?: number;
}

export function Estrelas({ valor, aoEscolher, tamanho = 26 }: Props) {
    const editavel = Boolean(aoEscolher);
    const preenchidas = valor ?? 0;

    return (
        <div className="estrelas" role={editavel ? 'radiogroup' : undefined}
             aria-label={editavel ? 'Dar nota' : `Nota ${(preenchidas / 2).toFixed(1)} de 5`}>
            {[0, 1, 2, 3, 4].map(i => {
                const metade = i * 2 + 1;   // meia estrela
                const cheia  = i * 2 + 2;   // estrela cheia
                const nivel  = preenchidas >= cheia ? 2 : preenchidas >= metade ? 1 : 0;

                return (
                    <span key={i} className="estrela" style={{ width: tamanho, height: tamanho }}>
                        <Icone nivel={nivel} tamanho={tamanho} />
                        {editavel && (
                            <>
                                {/* Metade esquerda dá meia estrela, direita dá cheia. */}
                                <button type="button" className="zona esquerda"
                                        aria-label={`${(metade / 2).toFixed(1)} estrelas`}
                                        onClick={() => aoEscolher!(metade)} />
                                <button type="button" className="zona direita"
                                        aria-label={`${(cheia / 2).toFixed(1)} estrelas`}
                                        onClick={() => aoEscolher!(cheia)} />
                            </>
                        )}
                    </span>
                );
            })}
        </div>
    );
}

function Icone({ nivel, tamanho }: { nivel: 0 | 1 | 2; tamanho: number }) {
    const d = 'M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4 6.2 20.5l1.1-6.5L2.6 9.4l6.5-.9z';
    const id = `meia-${nivel}-${tamanho}`;
    return (
        <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true">
            {nivel === 1 && (
                <defs>
                    <linearGradient id={id}>
                        <stop offset="50%" stopColor="var(--acento)" />
                        <stop offset="50%" stopColor="transparent" />
                    </linearGradient>
                </defs>
            )}
            <path d={d}
                  fill={nivel === 2 ? 'var(--acento)' : nivel === 1 ? `url(#${id})` : 'transparent'}
                  stroke="var(--acento)" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
    );
}
