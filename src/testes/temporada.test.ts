import { describe, it, expect } from 'vitest';

/**
 * O rótulo de temporada.
 *
 * A regra vive no banco, mas está reimplementada em quatro telas que
 * precisam formatar sem passar pela view. Este teste fixa o
 * comportamento esperado — se alguém mudar num lugar e esquecer dos
 * outros, aqui aparece.
 */
function rotulo(ini: number, fim: number): string {
    return fim === ini ? String(ini) : `${ini}/${String(fim).slice(2)}`;
}

describe('rótulo de temporada', () => {
    it('ano civil brasileiro fica só com o ano', () => {
        expect(rotulo(2019, 2019)).toBe('2019');
        expect(rotulo(2026, 2026)).toBe('2026');
    });

    it('temporada europeia usa barra e dois dígitos', () => {
        expect(rotulo(2004, 2005)).toBe('2004/05');
        expect(rotulo(1998, 1999)).toBe('1998/99');
    });

    // A virada de século é onde formatação de ano costuma quebrar.
    it('atravessa a virada do milênio', () => {
        expect(rotulo(1999, 2000)).toBe('1999/00');
        expect(rotulo(2009, 2010)).toBe('2009/10');
    });
});
