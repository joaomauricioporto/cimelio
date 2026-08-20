import { describe, it, expect } from 'vitest';
import {
    camisaParaSvg, formasDoPadrao, formasDoDetalhe, CAMINHO_CAMISA,
    type Padrao,
} from '../lib/camisaSvg';

/**
 * O gerador é a peça mais testável do projeto: função pura, entrada
 * pequena, saída verificável. E é a que mais custa quando quebra —
 * cinquenta camisas do catálogo dependem dela.
 */

const PADROES: Padrao[] = [
    'lisa', 'listras', 'listras_tri', 'faixas', 'diagonal', 'metades', 'xadrez',
];

describe('formasDoPadrao', () => {
    it('não desenha nada sem cor secundária', () => {
        for (const padrao of PADROES) {
            const f = formasDoPadrao({ padrao, corBase: '#FFFFFF', corSecundaria: null });
            expect(f, `padrão ${padrao}`).toHaveLength(0);
        }
    });

    it('lisa continua vazia mesmo com cor secundária', () => {
        expect(formasDoPadrao({
            padrao: 'lisa', corBase: '#FFF', corSecundaria: '#000',
        })).toHaveLength(0);
    });

    it('todo padrão com duas cores produz formas', () => {
        for (const padrao of PADROES.filter(p => p !== 'lisa')) {
            const f = formasDoPadrao({ padrao, corBase: '#FFFFFF', corSecundaria: '#111111' });
            expect(f.length, `padrão ${padrao}`).toBeGreaterThan(0);
        }
    });

    it('tricolor usa a cor de detalhe como terceira listra', () => {
        const f = formasDoPadrao({
            padrao: 'listras_tri', corBase: '#FFFFFF',
            corSecundaria: '#0D4C92', corDetalhe: '#111111',
        });
        const cores = new Set(f.map(x => x.fill));
        expect(cores.has('#0D4C92')).toBe(true);
        expect(cores.has('#111111')).toBe(true);
    });
});

describe('formasDoDetalhe', () => {
    it('não desenha viés quando não há cor de detalhe', () => {
        expect(formasDoDetalhe({ padrao: 'lisa', corBase: '#FFF' })).toHaveLength(0);
    });

    // No tricolor a cor de detalhe já virou listra. Repetir no viés
    // deixaria a gola invisível contra o próprio padrão.
    it('não desenha viés no tricolor, mesmo com cor de detalhe', () => {
        expect(formasDoDetalhe({
            padrao: 'listras_tri', corBase: '#FFF',
            corSecundaria: '#00F', corDetalhe: '#000',
        })).toHaveLength(0);
    });

    it('desenha gola e dois punhos nos demais padrões', () => {
        expect(formasDoDetalhe({
            padrao: 'lisa', corBase: '#FFF', corDetalhe: '#000',
        })).toHaveLength(3);
    });
});

describe('camisaParaSvg', () => {
    it('produz um SVG válido e fechado', () => {
        const svg = camisaParaSvg({ padrao: 'faixas', corBase: '#C4122E', corSecundaria: '#111' });
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg.endsWith('</svg>')).toBe(true);
        expect(svg).toContain(CAMINHO_CAMISA);
    });

    // O id do clipPath precisa ser único: dois SVGs na mesma página com
    // o mesmo id fazem uma camisa recortar pelo clip da outra.
    it('gera id de recorte diferente a cada chamada', () => {
        const a = camisaParaSvg({ padrao: 'lisa', corBase: '#FFF' });
        const b = camisaParaSvg({ padrao: 'lisa', corBase: '#FFF' });
        const id = (s: string) => s.match(/clipPath id="([^"]+)"/)?.[1];
        expect(id(a)).not.toBe(id(b));
    });

    // O contorno vem de variável CSS: camisa preta sobre fundo escuro
    // perde a silhueta se o traço também for escuro.
    it('usa variável CSS no contorno', () => {
        expect(camisaParaSvg({ padrao: 'lisa', corBase: '#111' }))
            .toContain('var(--contorno-camisa');
    });
});
