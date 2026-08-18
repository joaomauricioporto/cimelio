/**
 * Geometria da camisa e dos padrões, sem React.
 *
 * Separado do componente de propósito: assim a mesma função gera o SVG
 * no navegador, no servidor (open graph, e-mail) e no script de seed.
 * Também torna a geometria testável sem montar árvore de componentes.
 */

export type Padrao =
    | 'lisa' | 'listras' | 'listras_tri' | 'faixas' | 'diagonal' | 'metades' | 'xadrez';

export interface AtributosCamisa {
    padrao: Padrao;
    corBase: string;
    corSecundaria?: string | null;
    corDetalhe?: string | null;
}

/** Sistema de coordenadas interno. Nunca muda — tudo se ajusta a ele. */
export const CAIXA = { x: 46, y: 74, w: 108, h: 108 } as const;
export const VIEW_BOX = '40 68 120 120';

/**
 * Silhueta: ombros retos, mangas abertas, gola em V raso.
 * Mesma forma do logotipo, para o catálogo e a marca falarem igual.
 */
export const CAMINHO_CAMISA =
    'M86 74 L68 74 L46 98 L46 126 L68 134 L70 182 L130 182 ' +
    'L132 134 L154 126 L154 98 L132 74 L114 74 Q100 88 86 74 Z';

export interface Forma {
    tipo: 'rect' | 'poly';
    fill: string;
    x?: number; y?: number; w?: number; h?: number;
    pontos?: string;
}

/**
 * Formas do padrão, desenhadas por cima da cor base e recortadas
 * pela silhueta. Cobrem folgadamente a caixa: o clip resolve a borda,
 * então não vale a pena calcular interseção com a silhueta.
 */
export function formasDoPadrao(a: AtributosCamisa): Forma[] {
    const sec = a.corSecundaria;
    if (!sec || a.padrao === 'lisa') return [];

    const { x, w } = CAIXA;
    const y = 70, h = 120;                 // folga em cima e embaixo
    const formas: Forma[] = [];

    switch (a.padrao) {
        case 'listras': {
            // Ímpar de propósito: listra central alinhada com o número.
            const n = 5;
            const largura = w / (n * 2 - 1);
            for (let i = 0; i < n; i++)
                formas.push({ tipo: 'rect', fill: sec,
                    x: x + i * largura * 2, y, w: largura, h });
            break;
        }
        case 'listras_tri': {
            // Tricolor: Grêmio, Bahia, Náutico, Paysandu. A cor de
            // detalhe entra como terceira listra em vez de viés de gola.
            const ter = a.corDetalhe ?? sec;
            const n = 4;
            const largura = w / (n * 3);
            for (let i = 0; i < n; i++) {
                const base = x + i * largura * 3;
                formas.push({ tipo: 'rect', fill: sec, x: base, y, w: largura, h });
                formas.push({ tipo: 'rect', fill: ter, x: base + largura, y, w: largura, h });
            }
            break;
        }
        case 'faixas': {
            const n = 4;
            const altura = CAIXA.h / (n * 2 - 1);
            for (let i = 0; i < n; i++)
                formas.push({ tipo: 'rect', fill: sec,
                    x: x - 6, y: CAIXA.y + i * altura * 2, w: w + 12, h: altura });
            break;
        }
        case 'diagonal': {
            // Banda do ombro esquerdo ao quadril direito, largura constante.
            formas.push({ tipo: 'poly', fill: sec,
                pontos: '40,188 78,188 160,66 122,66' });
            break;
        }
        case 'metades': {
            formas.push({ tipo: 'rect', fill: sec,
                x: x + w / 2, y, w: w / 2 + 6, h });
            break;
        }
        case 'xadrez': {
            const lado = w / 6;
            for (let c = 0; c < 6; c++)
                for (let l = 0; l < 8; l++)
                    if ((c + l) % 2 === 0)
                        formas.push({ tipo: 'rect', fill: sec,
                            x: x + c * lado, y: 70 + l * lado, w: lado, h: lado });
            break;
        }
    }
    return formas;
}

/** Viés da gola e punhos. Só aparece quando há cor de detalhe. */
export function formasDoDetalhe(a: AtributosCamisa): string[] {
    // No tricolor a cor de detalhe já virou listra; repetir no viés
    // deixaria a gola invisível contra o próprio padrão.
    if (!a.corDetalhe || a.padrao === 'listras_tri') return [];
    return [
        'M86 74 Q100 88 114 74',      // gola
        'M46 126 L68 134',            // punho esquerdo
        'M154 126 L132 134',          // punho direito
    ];
}

/** Gera o SVG como string. Usado no seed e em renderização fora do React. */
export function camisaParaSvg(a: AtributosCamisa, tamanho = 120): string {
    const id = 'c' + Math.random().toString(36).slice(2, 8);
    const formas = formasDoPadrao(a).map(f =>
        f.tipo === 'rect'
            ? `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="${f.fill}"/>`
            : `<polygon points="${f.pontos}" fill="${f.fill}"/>`
    ).join('');
    const detalhes = formasDoDetalhe(a).map(d =>
        `<path d="${d}" fill="none" stroke="${a.corDetalhe}" stroke-width="5" stroke-linecap="round"/>`
    ).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${tamanho}" height="${tamanho}" viewBox="${VIEW_BOX}">`
        + `<defs><clipPath id="${id}"><path d="${CAMINHO_CAMISA}"/></clipPath></defs>`
        + `<g clip-path="url(#${id})">`
        + `<rect x="${CAIXA.x - 8}" y="66" width="${CAIXA.w + 16}" height="126" fill="${a.corBase}"/>`
        + formas + `</g>` + detalhes
        + `<path d="${CAMINHO_CAMISA}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>`
        + `</svg>`;
}
