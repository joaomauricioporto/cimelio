import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { UploadFoto, type Foto } from './UploadFoto';

interface Peca {
    id: number;
    versao: string | null;
    tamanho: string | null;
    nome_estampa: string | null;
    numero: number | null;
    peca_foto: Foto[];
}

/**
 * Não é um botão de liga-desliga.
 *
 * A tabela peca não tem unique(perfil, camisa) de propósito: colecionador
 * tem duas iguais o tempo todo — uma pra usar, uma pra guardar, tamanhos
 * diferentes. Um toggle esconderia isso e perderia dado.
 */
export function TenhoEssa({ camisaId, aoContar }: {
    camisaId: number;
    /** Avisa quantas peças existem, para a wishlist saber se ainda cabe. */
    aoContar?: (n: number) => void;
}) {
    const { user } = useAuth();
    const [pecas, setPecas] = useState<Peca[]>([]);
    const [aberto, setAberto] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [form, setForm] = useState({ versao: 'torcedor', tamanho: '', nome_estampa: '', numero: '' });

    async function recarregar() {
        if (!user) return;
        const { data } = await supabase
            .from('peca')
            .select('id,versao,tamanho,nome_estampa,numero,peca_foto(id,path)')
            .eq('perfil_id', user.id)
            .eq('camisa_id', camisaId)
            .order('id');
        const lista = (data as Peca[]) ?? [];
        setPecas(lista);
        aoContar?.(lista.length);
    }

    useEffect(() => { recarregar(); }, [user?.id, camisaId]);

    async function adicionar(e: FormEvent) {
        e.preventDefault();
        if (!user) return;
        setErro(null);

        const num = form.numero.trim() === '' ? null : Number(form.numero);
        if (num !== null && (!Number.isInteger(num) || num < 0 || num > 99))
            return setErro('Número deve ser entre 0 e 99.');

        const { error } = await supabase.from('peca').insert({
            perfil_id: user.id,
            camisa_id: camisaId,
            versao: form.versao,
            tamanho: form.tamanho.trim() || null,
            nome_estampa: form.nome_estampa.trim().toUpperCase() || null,
            numero: num,
        });

        if (error) return setErro(error.message);
        setForm({ versao: 'torcedor', tamanho: '', nome_estampa: '', numero: '' });
        setAberto(false);
        recarregar();
    }

    async function remover(id: number) {
        await supabase.from('peca').delete().eq('id', id);
        recarregar();
    }

    if (!user)
        return (
            <div className="caixa">
                <p className="suave">
                    <Link to="/entrar" className="link-inline">Entre</Link> para registrar sua camisa.
                </p>
            </div>
        );

    return (
        <div className="caixa">
            <h3 className="titulo-caixa">
                Minha coleção {pecas.length > 0 && <span className="contador">{pecas.length}</span>}
            </h3>

            {pecas.map(p => (
                <div key={p.id} className="bloco-peca">
                    <div className="linha-peca">
                        <span>
                            {[p.versao, p.tamanho,
                              p.nome_estampa && `${p.nome_estampa} ${p.numero ?? ''}`.trim()]
                                .filter(Boolean).join(' · ') || 'Sem detalhes'}
                        </span>
                        <button className="link" onClick={() => remover(p.id)}
                                aria-label="Remover da coleção">remover</button>
                    </div>
                    <UploadFoto userId={user.id} pecaId={p.id}
                                fotos={p.peca_foto ?? []} aoMudar={recarregar} />
                </div>
            ))}

            {!aberto && (
                <button className="botao" onClick={() => setAberto(true)}>
                    {pecas.length ? 'Tenho outra' : 'Tenho essa'}
                </button>
            )}

            {aberto && (
                <form onSubmit={adicionar} className="form-peca">
                    <label className="rotulo" htmlFor="versao">Versão</label>
                    <select id="versao" className="busca" value={form.versao}
                            onChange={e => setForm({ ...form, versao: e.target.value })}>
                        <option value="torcedor">Torcedor</option>
                        <option value="jogador">Jogador</option>
                        <option value="preparada">Preparada</option>
                        <option value="usada_em_jogo">Usada em jogo</option>
                    </select>

                    <label className="rotulo" htmlFor="tamanho">Tamanho</label>
                    <input id="tamanho" className="busca" value={form.tamanho} placeholder="M, G, GG"
                           onChange={e => setForm({ ...form, tamanho: e.target.value })} />

                    <label className="rotulo" htmlFor="estampa">Nome nas costas</label>
                    <input id="estampa" className="busca" value={form.nome_estampa} placeholder="GABIGOL"
                           onChange={e => setForm({ ...form, nome_estampa: e.target.value })} />

                    <label className="rotulo" htmlFor="numero">Número</label>
                    <input id="numero" className="busca" inputMode="numeric" value={form.numero} placeholder="9"
                           onChange={e => setForm({ ...form, numero: e.target.value })} />

                    {erro && <p role="alert" className="erro">{erro}</p>}

                    <div className="botoes">
                        <button className="botao">Adicionar</button>
                        <button type="button" className="link" onClick={() => setAberto(false)}>cancelar</button>
                    </div>
                </form>
            )}
        </div>
    );
}
