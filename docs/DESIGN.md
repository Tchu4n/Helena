# Design system — Helena

Fonte única do design da loja. Substitui `docs/referencias/DESIGN.md`, que fica só como referência histórica (ele tratava o azul de alto contraste como cor principal e mirava Next 15 / Tailwind 3).

Decisões fechadas com o dono do projeto em 14/11/2026, a partir das 17 capturas de referência, dos fluxogramas de telas, do manual de UX/UI e dos requisitos.

## 1. Intenção

Loja de moda para 18 a 30 anos, comprando pelo celular a partir do Instagram. O design busca o equilíbrio entre a finesse das marcas de luxo (Miu Miu, Hermès) e a conversão das varejistas (Hering, Renner).

**Princípio: editorial no repouso, varejo na ação.** A página parada é calma: fundo quente, muito respiro, quase sem cor. Os sinais de conversão existem, mas só nos lugares fixos listados na seção 4.

- **Objetivos:** produto em primeiro plano; compra com poucos toques e uma mão só; frete e prazo visíveis antes do checkout; contraste AA em tudo.
- **Fora do lançamento:** tema escuro e tema de alto contraste (seção 8).
- **O que seria um fracasso:** parecer loja de promoção (cor de oferta em botões ou espalhada pela página), ou parecer vitrine de luxo em que a cliente não acha tamanho, preço e frete.

## 2. Decisões fechadas

| Decisão | Escolha |
|---|---|
| Fundo | Quente (`#FAF8F5`) |
| Cor de oferta | Terracota (`#9A3412`) |
| Formato dos controles | Pílula |
| Fonte dos títulos | Playfair Display |
| Navegação no celular | Abas inferiores |
| Sacola | Painel ao adicionar a peça + página como passo 1 da compra |
| Botão principal | Preto sólido, nunca colorido |
| Ordem de trabalho | Telas do cliente primeiro; admin depois |

## 3. Tokens

### Cor

| Token | Valor | Uso | Contraste sobre fundo / superfície |
|---|---|---|---|
| `background` | `#FAF8F5` | fundo da página | — |
| `surface` | `#EDE8E1` | atrás das fotos de produto, rodapé, avisos | — |
| `card` | `#FFFFFF` | cartões da sacola, painel, campos | — |
| `primary` | `#121212` | texto, ícones, botão principal | 17,7 / 15,4 |
| `muted` | `#66625C` | legendas, preço riscado | 5,7 / 5,0 |
| `control` | `#857D72` | borda de campos e chips (mínimo 3:1) | 3,8 / 3,3 |
| `line` | `#D9D3CA` | divisores decorativos; nunca texto nem borda de controle | 1,4 |
| `sale` | `#9A3412` | ver seção 4 | 6,9 / 6,0 |
| `success` | `#17692F` | ver seção 4 | 6,4 / 5,6 |
| `error` | `#B42318` | erro, sempre com ícone e texto | 6,2 / 5,4 |

Texto branco sobre `sale` dá 7,3:1. Texto `background` sobre `primary` dá 17,7:1.

### Tipografia

| Papel | Fonte | Peso |
|---|---|---|
| Títulos | Playfair Display | 400 |
| Corpo, preços, botões | Geist | 400 / 500 / 600 |
| Rótulos minúsculos em caixa alta | Geist Mono, espaçamento 0,08em | 500 |

| Nível | Celular | Desktop | Altura de linha |
|---|---|---|---|
| H1 | 28px | 40px | 1,2 |
| H2 | 24px | 32px | 1,25 |
| H3 | 20px | 24px | 1,3 |
| Corpo | 16px | 16px | 1,5 |
| Legenda | 13px | 14px | 1,4 |
| Rótulo | 10px | 11px | 1,35 |

Tamanhos em `rem`. Nenhum contêiner de texto tem altura fixa; texto sempre quebra linha, nunca é cortado. Linha de leitura: 30 a 40 caracteres no celular, 45 a 75 no desktop.

### Forma, espaço e toque

- **Controles** (botão, chip de tamanho, campo, selo, seletor de quantidade): pílula (`border-radius: 9999px`).
- **Fotos, tiles e cartões:** canto reto. **Painel inferior:** 16px só nos cantos de cima.
- **Sem sombras.** Separação por cor de superfície e divisor.
- **Alvo de toque:** mínimo 48×48px, com 8px entre alvos. Botão principal com 48px de altura.
- **Foco:** contorno de 2px em `primary`, afastado 2px.

## 4. Onde cada cor de sinal pode aparecer

| Cor | Pode | Não pode |
|---|---|---|
| `sale` | selo de desconto, preço promocional, timer da reserva de 15 min, aviso de últimas peças, bloco de campanha na home | botão, link, título, ícone de navegação |
| `success` | frete grátis, prazo de entrega calculado, PIX confirmado, pedido confirmado | preço, botão |
| `error` | validação de formulário, pagamento recusado, peça esgotada durante a compra | promoção |

Cor nunca é o único sinal: selo tem texto, erro tem ícone e mensagem, tamanho selecionado tem borda dupla, tamanho esgotado é riscado.

## 5. Componentes

| Componente | Comportamento | Base |
|---|---|---|
| Barra de anúncio | faixa `primary` no topo com cupom ou frete; some nas telas de compra | Hering |
| Cabeçalho | busca à esquerda, logo ao centro, sacola à direita | Miu Miu |
| Abas inferiores | Início, Buscar, Sacola, Conta; nas telas de produto, sacola e checkout dão lugar ao botão fixo | fluxograma do cliente |
| Faixa de benefícios | três itens em rótulo monoespaçado, sem cor | conteúdo Hering, acabamento Hermès |
| Card de produto | foto 3:4 sobre `surface`, selo, coração, botão de compra rápida, nome, preço; esgotado vai para o fim da grade com marcação | Miu Miu + Hering |
| Página de produto | galeria de 4+ fotos (carrossel no celular, grade 2×2 no desktop), título em serifa, preço riscado + atual + selo, parcelas, cor em bolinhas, tamanho em chips, guia de medidas, CEP com prazo logo abaixo, "Adicionar à sacola" fixo na base | Hering + Miu Miu |
| Painel de sacola | sobe de baixo ao adicionar a peça: timer, item, quanto falta para o frete grátis, subtotal, "Finalizar compra" e "Ver sacola" | Hering |
| Página de sacola | cabeçalho reduzido, progresso em 3 passos, timer, cartões brancos, frete por CEP, total com parcelas, "Finalizar compra" | Hermès, com frete antecipado |
| Campo de formulário | rótulo acima, 48px, borda `control`, erro com borda + ícone + texto, atributos `autocomplete` | manual de UX |
| Aviso de cookies | "Rejeitar" e "Aceitar" com mesmo tamanho e cor; nada marcado por padrão | guia de LGPD |

Logo: `public/logo.svg` (placeholder em traço fino).

## 6. Acessibilidade sempre ligada

- Texto com contraste mínimo de 4,5:1; borda de controle e foco com 3:1.
- Foco visível em tudo que é interativo, e nunca coberto pelas barras fixas (usar `scroll-padding`).
- Endereço de cobrança igual ao de entrega por padrão; dados preservados após erro.
- Compra sem conta e sem CAPTCHA de transcrição.
- Respeitar `prefers-reduced-motion`.
- Escopo básico, como nos requisitos: sem leitor de tela avançado nem Libras no lançamento.

## 7. Implementação

O projeto usa Tailwind 4: os tokens vivem em `app/globals.css`, não em `tailwind.config.ts`.

**Idioma do código:** nomes e comentários em inglês simples, seguindo `docs/GLOSSARIO.md`; o texto que a cliente vê fica em português. A correspondência entre os nomes antigos dos tokens e os atuais está no glossário.

```css
@theme {
  --color-background: #FAF8F5;
  --color-surface: #EDE8E1;
  --color-card: #FFFFFF;
  --color-primary: #121212;
  --color-muted: #66625C;
  --color-control: #857D72;
  --color-line: #D9D3CA;
  --color-sale: #9A3412;
  --color-success: #17692F;
  --color-error: #B42318;
  --radius-control: 9999px;
}

/* inline because these variables only exist at runtime (next/font) */
@theme inline {
  --font-serif: var(--font-playfair);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
```

- Fontes por `next/font/google`: Geist e Geist Mono já estão em `app/layout.tsx`; entra só `Playfair_Display`.
- Remover o bloco `prefers-color-scheme: dark` que veio no scaffold, senão a loja aparece meio escura em celulares com tema escuro.
- Trocar `lang="en"` por `lang="pt-BR"`.
- Um teste automático confere os pares de contraste da tabela de cor.

### Abordagens consideradas

| Abordagem | Avaliação |
|---|---|
| Variáveis em `globals.css` via `@theme` | **Escolhida.** É o caminho nativo do Tailwind 4, sem arquivo nem dependência extra |
| `tailwind.config.ts`, como no `DESIGN.md` antigo | Descartada: é o formato do Tailwind 3 |
| Tokens em JSON (DTCG) compilados com Style Dictionary | Descartada: serve para distribuir tokens a iOS, Android e Figma; aqui é uma loja web só |

## 8. Fora do lançamento

- **Tema escuro:** nenhum requisito pede e nenhuma referência tem.
- **Tema de alto contraste:** quando entrar, redefine os mesmos tokens para o nível AAA (7:1): fundo e cartão brancos, texto preto, borda de 2px no lugar dos preenchimentos `surface`, links e foco em azul `#0052A3`. O azul do `DESIGN.md` antigo pertence a este tema.

## 9. Em aberto

- **Checkout (entrega e pagamento):** não há captura de referência real; só os fluxogramas.
- **Fotos reais:** as escolhas foram feitas vendo silhuetas; rever fundo e `surface` quando houver foto de produto.
- **Parte de baixo do painel de sacola** da referência não aparece na captura; o desenho da seção 5 é proposta.
- **Escolhas de quem escreveu, não do dono:** `control` e `line` como cores separadas, verde `success` mais escuro que o do `DESIGN.md` antigo, contorno de foco em `primary`.
