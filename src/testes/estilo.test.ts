import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guarda contra o bug que gerou esta suíte.
 *
 * Ao dividir o CSS em módulos, o arquivo acabou com DOIS blocos :root.
 * O segundo era a paleta antiga, e por vir depois ele vencia — a
 * interface continuava preta e cinza mesmo com as cores novas escritas
 * no código. Nada acusou: typecheck passou, build passou, e só apareceu
 * ao abrir o site.
 */

const css: string = readFileSync(join(process.cwd(), 'src/index.css'), 'utf8');

describe('folha de estilo', () => {
    it('define :root uma única vez', () => {
        const n = (css.match(/^:root \{/gm) ?? []).length;
        expect(n, 'dois :root fazem o último vencer em silêncio').toBe(1);
    });

    it('tem as chaves equilibradas', () => {
        expect(
            (css.match(/\{/g) ?? []).length,
            'chave sobrando quebra o build inteiro'
        ).toBe((css.match(/\}/g) ?? []).length);
    });

    it('não carrega cores da paleta anterior', () => {
        for (const antiga of ['#FFC400', '#14161A', '#14161C', '#EFEDE8', '#F4F3F0']) {
            expect(css.includes(antiga), `${antiga} é de uma paleta descartada`).toBe(false);
        }
    });

    it('define as cores em uso', () => {
        for (const cor of ['#6E1522', '#1A1216', '#F6F2ED']) {
            expect(css.includes(cor), `${cor} sumiu da paleta`).toBe(true);
        }
    });

    // A limpeza do :root duplicado levou junto a definição de --malha,
    // e a textura sumiu sem erro nenhum. Variável usada e não definida
    // falha em silêncio: o navegador ignora a propriedade inteira.
    it('define toda variável que usa', () => {
        const definidas = new Set([...css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map(m => m[1]));
        const usadas = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map(m => m[1]));
        // --filete vem do JSX, via style inline.
        const faltando = [...usadas].filter(v => !definidas.has(v) && v !== '--filete');
        expect(faltando, 'variáveis usadas sem definição').toEqual([]);
    });
});
