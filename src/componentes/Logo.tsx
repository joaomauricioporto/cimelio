/**
 * A marca, em SVG inline.
 *
 * Inline e não <img>: são 400 bytes, aparecem no primeiro quadro sem
 * requisição extra, e a cor vem do CSS — o mesmo componente serve no
 * cabeçalho escuro e em fundo claro.
 */
export function Logo({ tamanho = 30 }: { tamanho?: number }) {
    return (
        <svg width={tamanho} height={tamanho} viewBox="40 44 120 144"
             aria-hidden="true" focusable="false">
            <path d="M100 74 L100 58 A7 7 0 1 1 107 58"
                  fill="none" stroke="currentColor" strokeWidth={6} strokeLinecap="round" />
            <path d="M86 74 L68 74 L46 98 L46 126 L68 134 L70 182 L130 182
                     L132 134 L154 126 L154 98 L132 74 L114 74 Q100 88 86 74 Z"
                  fill="currentColor" />
            <path d="M124 130 A26 26 0 1 0 124 150 L109.8 150 A14 14 0 1 1 109.8 130 Z"
                  fill="var(--ink)" />
        </svg>
    );
}
