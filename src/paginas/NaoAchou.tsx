import { Link } from 'react-router-dom';

/**
 * Rota coringa.
 *
 * Sem ela, qualquer URL que não casa com nenhuma rota renderiza nada —
 * página branca, sem erro no console, sem pista do que houve. Foi
 * exatamente assim que o bug do /@:username passou despercebido.
 */
export function NaoAchou() {
    return (
        <div className="container">
            <div className="vazio">
                <h2>Página não encontrada</h2>
                <p>O endereço não existe ou foi digitado errado.</p>
                <Link to="/" className="botao" style={{ display: 'inline-block' }}>
                    Ir para o catálogo
                </Link>
            </div>
        </div>
    );
}
