import { useRef, useState, type ChangeEvent } from 'react';
import { enviarFotoPeca, apagarFotoPeca, urlDaFoto } from '../lib/fotos';

export interface Foto { id: number; path: string; }

interface Props {
    userId: string;
    pecaId: number;
    fotos: Foto[];
    aoMudar: () => void;
}

export function UploadFoto({ userId, pecaId, fotos, aoMudar }: Props) {
    const input = useRef<HTMLInputElement>(null);
    const [enviando, setEnviando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    async function selecionar(e: ChangeEvent<HTMLInputElement>) {
        const arquivo = e.target.files?.[0];
        if (!arquivo) return;
        setErro(null); setEnviando(true);

        try {
            await enviarFotoPeca(userId, pecaId, arquivo);
            aoMudar();
        } catch (err) {
            setErro(err instanceof Error ? err.message : 'Falha ao enviar.');
        } finally {
            setEnviando(false);
            // Sem isto, escolher o mesmo arquivo de novo não dispara
            // o evento — o valor não mudou.
            if (input.current) input.current.value = '';
        }
    }

    return (
        <div className="fotos-peca">
            {fotos.map(f => (
                <div key={f.id} className="miniatura">
                    <img src={urlDaFoto(f.path)} alt="Foto da camisa" loading="lazy" />
                    <button className="remover" aria-label="Remover foto"
                            onClick={async () => { await apagarFotoPeca(f.id, f.path); aoMudar(); }}>
                        ×
                    </button>
                </div>
            ))}

            <button type="button" className="add-foto" disabled={enviando}
                    onClick={() => input.current?.click()}>
                {enviando ? '…' : '+ foto'}
            </button>

            {/* capture não é forçado: colecionador costuma fotografar
                antes e escolher da galeria depois. */}
            <input ref={input} type="file" accept="image/*"
                   onChange={selecionar} style={{ display: 'none' }} />

            {erro && <p role="alert" className="erro">{erro}</p>}
        </div>
    );
}
