import { supabase } from './supabase';

const BUCKET = 'fotos';
const LADO_MAX = 1400;
const QUALIDADE = 0.85;

/**
 * Identificador para o nome do arquivo.
 *
 * Não usa crypto.randomUUID(): essa função só existe em contexto seguro
 * — HTTPS ou localhost. Abrindo pelo IP da rede local em HTTP simples
 * ela some, e o upload quebra com "is not a function". Em produção com
 * HTTPS funcionaria, mas depender de contexto seguro para gerar nome de
 * arquivo é frágil à toa.
 *
 * getRandomValues existe também em contexto inseguro. Math.random é a
 * última reserva: aqui basta evitar colisão dentro da pasta de uma peça
 * de um usuário, não há requisito de sigilo.
 */
function idArquivo(): string {
    const agora = Date.now().toString(36);

    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const b = new Uint8Array(8);
        crypto.getRandomValues(b);
        return agora + '-' + Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    }

    return agora + '-' + Math.random().toString(36).slice(2, 12);
}

/**
 * Reduz a imagem antes de enviar.
 *
 * Não é otimização prematura: foto de celular vem com 4 a 8 MB. A
 * 1400px em JPEG cabem cerca de 1.700 no plano gratuito do Supabase,
 * contra 600 sem tratar.
 *
 * imageOrientation 'from-image' resolve o EXIF: foto tirada de pé no
 * celular chega deitada se ninguém tratar, e o usuário culpa o app.
 */
export async function prepararImagem(arquivo: File): Promise<Blob> {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });

    const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
    const l = Math.round(bitmap.width * escala);
    const a = Math.round(bitmap.height * escala);

    const canvas = document.createElement('canvas');
    canvas.width = l; canvas.height = a;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Não consegui processar a imagem neste navegador.');
    ctx.drawImage(bitmap, 0, 0, l, a);
    bitmap.close();

    const blob = await new Promise<Blob | null>(r =>
        canvas.toBlob(r, 'image/jpeg', QUALIDADE));
    if (!blob) throw new Error('Falha ao converter a imagem.');
    return blob;
}

/** URL pública a partir do caminho guardado no banco. */
export function urlDaFoto(path: string): string {
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Envia a foto e registra em peca_foto.
 *
 * O caminho começa com peca/{userId} porque a política do storage lê o
 * segundo nível e compara com auth.uid(). Mudar o formato do caminho
 * quebra a permissão silenciosamente.
 */
export async function enviarFotoPeca(
    userId: string, pecaId: number, arquivo: File
): Promise<string> {
    const blob = await prepararImagem(arquivo);
    const path = `peca/${userId}/${pecaId}/${idArquivo()}.jpg`;

    const { error: erroUp } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (erroUp) throw new Error(erroUp.message);

    const { error: erroIns } = await supabase
        .from('peca_foto')
        .insert({ peca_id: pecaId, path });

    // Se a linha falhar, o arquivo já subiu. Sem esta limpeza ele fica
    // órfão: ocupa espaço, ninguém vê, e você paga por ele.
    if (erroIns) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw new Error(erroIns.message);
    }

    return path;
}

/**
 * Avatar do perfil.
 *
 * Usa o mesmo prefixo peca/{userId} de propósito: a política do storage
 * compara o segundo nível do caminho com auth.uid(), e criar um prefixo
 * novo exigiria outra política. Reaproveitar mantém uma regra só —
 * menos superfície para errar.
 */
export async function enviarAvatar(userId: string, arquivo: File): Promise<string> {
    const blob = await prepararImagem(arquivo);
    const path = `peca/${userId}/avatar/${idArquivo()}.jpg`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
    if (error) throw new Error(error.message);

    return path;
}

export async function apagarFotoPeca(id: number, path: string): Promise<void> {
    // Arquivo primeiro. Se apagasse a linha antes e o arquivo falhasse,
    // ele viraria órfão sem nenhum registro apontando para ele.
    await supabase.storage.from(BUCKET).remove([path]);
    await supabase.from('peca_foto').delete().eq('id', id);
}
