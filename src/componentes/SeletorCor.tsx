interface Props {
    rotulo: string;
    valor: string | null;
    aoMudar: (hex: string | null) => void;
    /** Cores do clube, oferecidas como atalho. */
    sugestoes?: (string | null | undefined)[];
    opcional?: boolean;
}

/**
 * Campo de cor com atalho para as cores do clube.
 *
 * O input nativo de cor não aceita valor nulo — e nulo tem significado
 * aqui: camisa lisa não tem cor secundária. Por isso o botão de limpar
 * é separado, em vez de tentar representar ausência dentro do input.
 */
export function SeletorCor({ rotulo, valor, aoMudar, sugestoes = [], opcional }: Props) {
    const validas = sugestoes.filter((c): c is string => Boolean(c));

    return (
        <div className="campo-cor">
            <label className="rotulo">{rotulo}</label>

            <div className="linha-cor">
                <input
                    type="color"
                    value={valor ?? '#FFFFFF'}
                    onChange={e => aoMudar(e.target.value.toUpperCase())}
                    aria-label={rotulo}
                />

                <input
                    className="busca hex"
                    value={valor ?? ''}
                    placeholder={opcional ? 'nenhuma' : '#FFFFFF'}
                    onChange={e => {
                        const v = e.target.value.toUpperCase();
                        // Só aceita quando o hexadecimal está completo,
                        // senão a prévia pisca a cada tecla digitada.
                        if (v === '') aoMudar(null);
                        else if (/^#[0-9A-F]{6}$/.test(v)) aoMudar(v);
                    }}
                />

                {validas.map(c => (
                    <button
                        key={c} type="button" className="amostra"
                        style={{ background: c }}
                        title={`Usar ${c}`}
                        aria-label={`Usar cor ${c}`}
                        onClick={() => aoMudar(c)}
                    />
                ))}

                {opcional && valor && (
                    <button type="button" className="link" onClick={() => aoMudar(null)}>
                        limpar
                    </button>
                )}
            </div>
        </div>
    );
}
