import { useCallback, useEffect, useState } from 'react';

/**
 * O padrão de busca do app, num lugar só.
 *
 * Onze arquivos repetiam a mesma sequência: estado de carregando, flag
 * `cancelado` no cleanup, try/catch, setState. Copiar isso significa que
 * corrigir um bug de corrida exige lembrar dos outros dez — e a primeira
 * versão do feed já tinha esquecido de um.
 *
 * A flag de cancelamento é o núcleo: sem ela, resposta antiga que chega
 * atrasada sobrescreve a nova. Acontece toda vez que alguém digita
 * rápido numa busca.
 */

export interface Consulta<T> {
    dados: T | null;
    carregando: boolean;
    erro: string | null;
    /** Refaz a consulta. Útil depois de gravar algo. */
    recarregar: () => void;
}

export function useConsulta<T>(
    buscar: (sinal: { cancelado: boolean }) => Promise<T>,
    deps: unknown[],
    opcoes: { pular?: boolean; inicial?: T } = {}
): Consulta<T> {
    const [dados, setDados] = useState<T | null>(opcoes.inicial ?? null);
    const [carregando, setCarregando] = useState(!opcoes.pular);
    const [erro, setErro] = useState<string | null>(null);
    const [gatilho, setGatilho] = useState(0);

    const recarregar = useCallback(() => setGatilho(g => g + 1), []);

    useEffect(() => {
        if (opcoes.pular) { setCarregando(false); return; }

        const sinal = { cancelado: false };
        setCarregando(true);
        setErro(null);

        buscar(sinal)
            .then(r => { if (!sinal.cancelado) setDados(r); })
            .catch(e => {
                if (sinal.cancelado) return;
                setErro(e instanceof Error ? e.message : 'Erro ao carregar.');
            })
            .finally(() => { if (!sinal.cancelado) setCarregando(false); });

        return () => { sinal.cancelado = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, gatilho, opcoes.pular]);

    return { dados, carregando, erro, recarregar };
}

/**
 * Espera a digitação parar antes de disparar.
 *
 * Vivia duplicado em Catálogo e Pessoas, com valores de atraso
 * diferentes — o que fazia as duas buscas parecerem ter velocidades
 * distintas sem motivo.
 */
export function useAtraso<T>(valor: T, ms = 300): T {
    const [lento, setLento] = useState(valor);
    useEffect(() => {
        const t = setTimeout(() => setLento(valor), ms);
        return () => clearTimeout(t);
    }, [valor, ms]);
    return lento;
}
