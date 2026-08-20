import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import { enviarAvatar, urlDaFoto } from '../lib/fotos';
import { Conexoes } from '../componentes/Conexoes';

const REGRA_USERNAME = /^[a-z0-9_]{3,30}$/;

export function EditarPerfil() {
    const { user, perfil, carregando, recarregarPerfil } = useAuth();
    const navegar = useNavigate();
    const input = useRef<HTMLInputElement>(null);

    const [username, setUsername] = useState('');
    const [nome, setNome] = useState('');
    const [bio, setBio] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);
    const [wishlistPublica, setWishlistPublica] = useState(false);

    const [erro, setErro] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);
    const [checando, setChecando] = useState(false);
    const [livre, setLivre] = useState<boolean | null>(null);

    useEffect(() => {
        if (!perfil) return;
        setUsername(perfil.username);
        setNome(perfil.nome ?? '');
        setBio(perfil.bio ?? '');
        setAvatar(perfil.avatar_path);
        setWishlistPublica(perfil.wishlist_publica);
    }, [perfil?.id]);

    // Verifica disponibilidade enquanto digita. Descobrir que o
    // username está tomado só no submit, depois de escrever bio e subir
    // foto, é o tipo de frustração que faz abandonar formulário.
    useEffect(() => {
        const alvo = username.trim().toLowerCase();
        if (!perfil || alvo === perfil.username || !REGRA_USERNAME.test(alvo)) {
            setLivre(null); return;
        }

        let cancelado = false;
        setChecando(true);

        const t = setTimeout(async () => {
            const { data } = await supabase
                .from('perfil').select('id').eq('username', alvo).maybeSingle();
            if (cancelado) return;
            setLivre(!data);
            setChecando(false);
        }, 400);

        return () => { cancelado = true; clearTimeout(t); };
    }, [username, perfil?.username]);

    async function trocarAvatar(e: React.ChangeEvent<HTMLInputElement>) {
        const arquivo = e.target.files?.[0];
        if (!arquivo || !user) return;
        setErro(null);
        try {
            setAvatar(await enviarAvatar(user.id, arquivo));
        } catch (err) {
            setErro(err instanceof Error ? err.message : 'Falha ao enviar a foto.');
        } finally {
            if (input.current) input.current.value = '';
        }
    }

    async function salvar(e: FormEvent) {
        e.preventDefault();
        setErro(null);

        const alvo = username.trim().toLowerCase();
        if (!REGRA_USERNAME.test(alvo))
            return setErro('Username: 3 a 30 caracteres, só letras minúsculas, números e _');
        if (livre === false)
            return setErro('Esse username já está em uso.');

        setSalvando(true);
        const { error } = await supabase.from('perfil').update({
            username: alvo,
            nome: nome.trim() || null,
            bio: bio.trim() || null,
            avatar_path: avatar,
            wishlist_publica: wishlistPublica,
        }).eq('id', user!.id);
        setSalvando(false);

        if (error) {
            // A corrida existe: alguém pode ter tomado o username entre
            // a checagem e o salvamento. O unique do banco é quem
            // realmente decide.
            return setErro(error.message.includes('perfil_username_key')
                ? 'Esse username acabou de ser tomado. Escolha outro.'
                : error.message);
        }

        await recarregarPerfil();
        navegar(`/perfil/${alvo}`);
    }

    if (carregando)
        return <div className="container"><p className="suave">Carregando…</p></div>;

    if (!user)
        return (
            <div className="container">
                <div className="vazio">
                    <h2>Entre para editar seu perfil</h2>
                    <Link to="/entrar" className="botao" style={{ display: 'inline-block' }}>
                        Entrar
                    </Link>
                </div>
            </div>
        );

    return (
        <div className="container" style={{ maxWidth: 480 }}>
            <h1 style={{ fontSize: 26, fontWeight: 500 }}>Editar perfil</h1>

            <form onSubmit={salvar}>
                <div className="linha-avatar">
                    {avatar
                        ? <img className="avatar-grande" src={urlDaFoto(avatar)} alt="Sua foto" />
                        : <div className="avatar-grande vazio-avatar">sem foto</div>}
                    <div>
                        <button type="button" className="botao"
                                onClick={() => input.current?.click()}>
                            Trocar foto
                        </button>
                        {avatar && (
                            <button type="button" className="link"
                                    style={{ marginLeft: 12 }}
                                    onClick={() => setAvatar(null)}>
                                remover
                            </button>
                        )}
                    </div>
                    <input ref={input} type="file" accept="image/*"
                           onChange={trocarAvatar} style={{ display: 'none' }} />
                </div>

                <label className="rotulo" htmlFor="user">Username</label>
                <div className="linha-user">
                    <span className="arroba">@</span>
                    <input id="user" className="busca" value={username}
                           onChange={e => setUsername(e.target.value.toLowerCase())} />
                </div>
                <p className="suave" style={{ fontSize: 13, marginTop: 4 }}>
                    {checando ? 'Verificando…'
                        : livre === true  ? '✓ disponível'
                        : livre === false ? '✗ já está em uso'
                        : 'Letras minúsculas, números e _ · 3 a 30 caracteres'}
                </p>

                <label className="rotulo" htmlFor="nome">Nome de exibição</label>
                <input id="nome" className="busca" value={nome} maxLength={60}
                       placeholder="Como você quer aparecer"
                       onChange={e => setNome(e.target.value)} />

                <label className="rotulo" htmlFor="bio">Bio</label>
                <textarea id="bio" className="texto" rows={3} value={bio} maxLength={200}
                          placeholder="Colecionador desde 2015, foco em camisas do Brasileirão…"
                          onChange={e => setBio(e.target.value)} />
                <p className="suave" style={{ fontSize: 13 }}>{bio.length}/200</p>

                {/* Privacidade fica junto do resto do perfil, não escondida
                    em outra tela: quem edita a bio é quem decide isso. O
                    padrão é fechado — quem não sabe que a opção existe não
                    é exposto por omissão. */}
                <fieldset className="opcao">
                    <label className="opcao-linha">
                        <input type="checkbox" checked={wishlistPublica}
                               onChange={e => setWishlistPublica(e.target.checked)} />
                        <span>
                            <b>Wishlist pública</b>
                            <em>
                                {wishlistPublica
                                    ? 'Qualquer pessoa vê o que você procura. Facilita troca — e mostra ao vendedor o quanto você quer a peça.'
                                    : 'Só você vê o que está na sua wishlist.'}
                            </em>
                        </span>
                    </label>
                </fieldset>

                <Conexoes />

                {erro && <p role="alert" className="erro">{erro}</p>}

                <button className="botao largo" disabled={salvando || livre === false}>
                    {salvando ? 'Salvando…' : 'Salvar'}
                </button>
            </form>
        </div>
    );
}
