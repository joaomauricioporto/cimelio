import { useId } from 'react';
import {
    CAMINHO_CAMISA, CAIXA, VIEW_BOX,
    formasDoPadrao, formasDoDetalhe,
    type AtributosCamisa,
} from '../lib/camisaSvg';

interface Props extends AtributosCamisa {
    tamanho?: number;
    /** Texto para leitor de tela. Sem isto o catálogo fica mudo. */
    descricao?: string;
}

/**
 * Ilustração da camisa gerada a partir dos atributos do catálogo.
 * Nenhuma imagem é armazenada: quatro campos viram o desenho inteiro.
 *
 * useId em vez de contador ou random: o id do clipPath precisa ser
 * único por instância e estável entre servidor e cliente, senão a
 * hidratação quebra e uma camisa recorta pelo clip da outra.
 */
export function Camisa({
    padrao, corBase, corSecundaria, corDetalhe,
    tamanho = 120, descricao,
}: Props) {
    const clipId = 'camisa-' + useId().replace(/:/g, '');
    const attrs = { padrao, corBase, corSecundaria, corDetalhe };

    return (
        <svg
            width={tamanho} height={tamanho} viewBox={VIEW_BOX}
            role="img" aria-label={descricao ?? 'Camisa'}
        >
            <defs>
                <clipPath id={clipId}>
                    <path d={CAMINHO_CAMISA} />
                </clipPath>
            </defs>

            <g clipPath={`url(#${clipId})`}>
                <rect
                    x={CAIXA.x - 8} y={66}
                    width={CAIXA.w + 16} height={126}
                    fill={corBase}
                />
                {formasDoPadrao(attrs).map((f, i) =>
                    f.tipo === 'rect'
                        ? <rect key={i} x={f.x} y={f.y} width={f.w} height={f.h} fill={f.fill} />
                        : <polygon key={i} points={f.pontos} fill={f.fill} />
                )}
            </g>

            {formasDoDetalhe(attrs).map((d, i) => (
                <path key={i} d={d} fill="none"
                      stroke={corDetalhe!} strokeWidth={5} strokeLinecap="round" />
            ))}

            <path d={CAMINHO_CAMISA} fill="none"
                  stroke="rgba(0,0,0,.35)" strokeWidth={1.5} />
        </svg>
    );
}
