# Zakk Chess — briefing do projeto

> Este arquivo explica o projeto para o Claude Code. Leia inteiro antes de começar.
> Dono do projeto: Zakk (empreendedor brasileiro, de Santos/SP). Fale com ele em **português do Brasil** e explique as decisões em linguagem simples.

---

## 1. O que é o Zakk Chess

Um site que ajuda jogadores de xadrez a evoluir analisando **as partidas que eles já jogaram**.

Como funciona, do ponto de vista do usuário:

1. A pessoa digita o **nick dela no Chess.com**.
2. O site importa as partidas dela automaticamente.
3. O site analisa as partidas com o **Stockfish** e encontra os erros.
4. Um **mascote** mostra, de forma pontual, onde a pessoa mais erra. Exemplo: "Na partida contra fulano, no lance 14, você jogou Cxe5 e perdeu a dama. O melhor era Bd3."
5. O site monta um **plano de treino** baseado nos erros que mais se repetem.

**Por que existe:** no Chess.com grátis só dá para fazer uma análise completa por dia. O Zakk Chess quer oferecer **análises ilimitadas no plano grátis**, com um visual bonito e um plano de treino feito a partir dos erros reais da pessoa.

---

## 2. Escopo do MVP (primeira versão)

Fazer **só o núcleo**, bem feito:

- [ ] Campo para digitar o nick do Chess.com
- [ ] Importar as partidas pela API pública do Chess.com (sem chave):
  - lista de meses: `https://api.chess.com/pub/player/{usuario}/games/archives`
  - cada mês traz as partidas com o PGN
- [ ] Análise com Stockfish, **rodando no navegador do usuário** (versão WebAssembly), para não ter custo de servidor
- [ ] Classificar os lances pela perda de avaliação (imprecisão, erro, erro grave)
- [ ] Mostrar a partida num tabuleiro, com os erros marcados e o lance melhor
- [ ] Relatório "onde você mais erra": por fase da partida (abertura, meio-jogo, final) e por tipo de erro (peça pendurada, tática perdida etc.)
- [ ] Plano de treino simples a partir desse relatório
- [ ] Mascote que aparece em momentos específicos para explicar os erros (ver regras abaixo)

### Fora do MVP (não fazer agora)

- ❌ Jogar contra bot
- ❌ Chat aberto com o mascote
- ❌ Login, pagamento, planos pagos (vem depois)
- ❌ Outras plataformas além do Chess.com (Lichess pode vir depois)

---

## 3. Regras importantes

### Custo
O Zakk não quer ter custos altos e imprevisíveis no fim do mês.
- Stockfish **no navegador** (custo zero de servidor).
- As explicações do mascote podem começar com **textos prontos** (templates) montados a partir dos dados da análise, sem chamar nenhum modelo pago.
- Se um dia usarmos um modelo de linguagem para os textos, tem que ser opcional, com limite de uso e cache. **Pergunte ao Zakk antes de adicionar qualquer serviço pago.**

### Mascote
- **Não pode ser um sapo.** O site que inspirou a ideia usa um sapo, e o Zakk não quer parecer cópia.
- O mascote é **pontual**: aparece para apontar um erro, comentar a abertura ou apresentar o plano de treino. Não é um chat.
- O personagem ainda não foi definido. Use um espaço reservado simples até o Zakk decidir.

### Comunicação e marketing
- **Não usar a palavra "IA"** em textos de marketing, landing page, chamadas e botões. O Zakk acha que tira credibilidade. Fale em "análise", "treinador", "motor de xadrez", "Stockfish".
- Tom: direto, motivador, sem exagero.

### Referência, não cópia
A ideia veio de um site existente. Use só a ideia geral. Não copie textos, visual, nome de funções ou o mascote de ninguém.

---

## 4. Identidade visual (provisória)

Tirada do vídeo de apresentação que o Zakk aprovou:

| Uso | Cor |
|---|---|
| Fundo escuro | `#0b0d12` |
| Casa escura do tabuleiro | `#2f7d6d` |
| Casa clara do tabuleiro | `#e8d9b5` |
| Destaque (botões, "CHESS" no logo) | `#4fd1b0` |
| Texto principal | `#f6f3ea` |
| Texto secundário | `#c3cbdb` |

- Logo provisório: **ZAKK** em branco e **CHESS** no verde de destaque, fonte bem pesada.
- Visual escuro, moderno, com cara de app.
- Frase de apoio aprovada: **"Treine. Analise. Evolua."**
- Tem que funcionar muito bem **no celular**. O Zakk usa muito o celular.

---

## 5. Stack sugerida

Sugestão, não obrigação. Se tiver um motivo melhor, explique ao Zakk e decida junto.

- React + TypeScript (Vite ou Next.js)
- `chess.js` para regras e leitura de PGN
- Um componente de tabuleiro em React
- Stockfish em WebAssembly, rodando num Web Worker
- Hospedagem: Netlify ou Cloudflare Pages

---

## 6. Como trabalhar neste projeto

- **O ambiente é temporário.** Antes de qualquer coisa, garanta que o projeto está num repositório do GitHub e faça commit e push com frequência. Se ainda não existe repositório, pergunte ao Zakk o nome.
- O Zakk vê o resultado pelo **celular**, então o `localhost` não serve para ele. Para mostrar o progresso, publique uma versão de teste (deploy) e mande o link.
- Trabalhe em etapas pequenas e mostre cada uma funcionando antes de seguir:
  1. Projeto criado + página inicial com a identidade visual
  2. Digitar o nick e listar as partidas importadas
  3. Abrir uma partida no tabuleiro
  4. Analisar uma partida com o Stockfish e marcar os erros
  5. Relatório "onde você mais erra" com várias partidas
  6. Plano de treino
  7. Mascote (espaço reservado)
- Explique o que fez em poucas linhas, sem jargão.

---

## 7. Em aberto (decidir com o Zakk)

- Personagem e nome do mascote
- Quantas partidas analisar por vez (análise no navegador é lenta com muitas partidas)
- Domínio do site
- Modelo de negócio do plano pago
- Se e quando entra o Lichess
