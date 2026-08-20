/**
 * O escudo.
 *
 * Deixou de ser SVG desenhado à mão e passou a ser a arte real. Uma
 * marca com quadrantes, contorno duplo e sombra não se reconstrói em
 * caminho vetorial sem perder o desenho — e a imagem carrega uma vez e
 * fica em cache.
 */
export function Logo({ tamanho = 30 }: { tamanho?: number }) {
    return (
        <img
            src="/escudo.png"
            width={tamanho}
            height={tamanho}
            alt=""
            aria-hidden="true"
            style={{ display: 'block', objectFit: 'contain' }}
        />
    );
}
