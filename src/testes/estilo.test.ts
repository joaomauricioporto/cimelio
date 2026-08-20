import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
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

const DIR = join(process.cwd(), 'src/estilos');
const css: string = readdirSync(DIR)
    .filter((f: string) => f.endsWith('.css'))
    .map((f: string) => readFileSync(join(DIR, f), 'utf8'))
    .join('\n');

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
});
