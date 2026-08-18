# Cimelio — etapa 2: web

Vite + React 19 + TypeScript + Supabase. Catálogo com busca e página da camisa,
tudo ilustrado pelo gerador paramétrico — nenhuma imagem armazenada.

## Rodar

```bash
npm install
cp .env.example .env.local     # preencha com os dados do seu Supabase
npm run dev
```

## Estrutura

```
src/
  lib/
    camisaSvg.ts      geometria e padrões, sem React
    supabase.ts       cliente, com validação de env
    tipos.ts          tipos do banco (trocar por geração automática)
  componentes/
    Camisa.tsx        o gerador, como componente
    CamisaCard.tsx    card do catálogo
  paginas/
    Catalogo.tsx      busca + grade
    CamisaPagina.tsx  página da camisa
```

## Por que a geometria mora fora do React

`camisaSvg.ts` não importa React de propósito. A mesma função gera SVG no
navegador, no script de seed do catálogo e em imagem de compartilhamento
(open graph). Se estivesse dentro do componente, cada um desses precisaria
de uma cópia — e cópias divergem.

## Padrões suportados

`lisa` · `listras` · `listras_tri` · `faixas` · `diagonal` · `metades` · `xadrez`

`listras_tri` existe porque tricolor (Grêmio, Bahia, Náutico, Paysandu) não
cabe em duas cores. Nele, `cor_detalhe` vira a terceira listra em vez de
viés de gola — repetir a cor no viés deixaria a gola invisível contra o
próprio padrão.

## Detalhes que não são óbvios

**`useId` no clipPath.** O id precisa ser único por instância e estável
entre servidor e cliente. Com contador ou `Math.random`, a hidratação
quebra e uma camisa passa a recortar pelo clip da outra.

**Guarda de corrida na busca.** Digitação rápida dispara consultas
concorrentes, e a resposta antiga pode chegar depois da nova. A flag
`cancelado` no cleanup do efeito descarta o resultado obsoleto.

**A chave anon vai no bundle, e tudo bem.** Ela é pública por natureza.
Quem protege o dado é a RLS. A `service_role` é que nunca pode aparecer
no front.

**A tela de "não achei" pede cadastro.** É o momento de maior intenção do
usuário — ele tem a camisa na mão. Tratar isso como erro joga fora a
principal via de crescimento do catálogo.

## Etapa 3 — autenticação e coleção

```
src/lib/auth.tsx              contexto de sessão
src/paginas/Entrar.tsx        login e cadastro
src/paginas/Perfil.tsx        estante do usuário  (/@username)
src/componentes/Estrelas.tsx  nota em meia-estrela
src/componentes/Avaliar.tsx   nota + resenha
src/componentes/TenhoEssa.tsx registro de peça na coleção
```

### Detalhes que não são óbvios

**Estado de carregando na sessão.** `getSession()` lê do localStorage e é
assíncrono. Sem esse estado, a tela pisca "deslogado" a cada F5 mesmo com
sessão válida — e rota protegida chuta o usuário pra fora sozinha.

**`unsubscribe` no `onAuthStateChange`.** Sem isso, cada montagem do
provider deixa um listener vivo. Com StrictMode em desenvolvimento, dobra
na hora e vira vazamento silencioso.

**`upsert` com `onConflict` na resenha.** A tabela tem
`unique(perfil_id, camisa_id)`, então `insert` puro estouraria na segunda
vez. O mesmo caminho serve para criar e para editar.

**"Tenho essa" não é liga-desliga.** A tabela `peca` não tem
`unique(perfil, camisa)` de propósito — colecionador tem duas iguais o
tempo todo. Um toggle esconderia isso e perderia dado.

**Join único no perfil.** Coleção de 80 camisas com N+1 dispara 81
requisições e trava a página. O select aninhado do PostgREST resolve em
uma.

**Nota 1..10 no banco, 0,5..5 na tela.** A conversão vive só no
componente `Estrelas`. Nenhum outro lugar do app divide por 2.

## Falta

- Formulário de cadastro de camisa com seletor de cor
- Upload de foto da peça (bucket + policy de storage)
- Wishlist na interface
- Feed e seguir
- Etapa 4: lançamentos, liga e competição
