import { Link } from 'react-router-dom';
import { Camisa } from './Camisa';
import { ROTULO_TIPO, type ResultadoBusca } from '../lib/tipos';

export function CamisaCard({ c }: { c: ResultadoBusca }) {
    const descricao = `${c.time_nome} ${c.temporada} ${ROTULO_TIPO[c.tipo]}`;
    return (
        <Link to={`/camisa/${c.slug}`} className="card">
            <Camisa
                padrao={c.padrao}
                corBase={c.cor_base}
                corSecundaria={c.cor_secundaria}
                tamanho={130}
                descricao={descricao}
            />
            <div className="time">{c.time_nome}</div>
            <div className="meta">
                {c.temporada} · {ROTULO_TIPO[c.tipo]}
            </div>
            {c.patrocinador && <div className="meta">{c.patrocinador}</div>}
        </Link>
    );
}
