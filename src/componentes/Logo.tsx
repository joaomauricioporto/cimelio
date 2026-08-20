import escudo from '../assets/escudo.png';

/**
 * O escudo.
 *
 * Deixou de ser SVG desenhado à mão e passou a ser a arte real. Uma
 * marca com quadrantes, contorno duplo e sombra não se reconstrói em
 * caminho vetorial sem perder o desenho.
 *
 * O arquivo mora em src/assets e é importado como módulo, não referido
 * por caminho em texto. Com isso o Vite resolve no build: caminho
 * errado vira erro de compilação, em vez de imagem quebrada descoberta
 * só em produção — que foi exatamente o que aconteceu.
 */
export function Logo({ tamanho = 30 }: { tamanho?: number }) {
    return (
        <img
            src={escudo}
            width={tamanho}
            height={tamanho}
            alt=""
            aria-hidden="true"
            style={{ display: 'block', objectFit: 'contain' }}
        />
    );
}
