# Helena

E-commerce de moda desenvolvido como **Projeto Integrador** da faculdade. O objetivo final é entregar uma loja virtual funcional de ponta a ponta, com front-end em **Next.js**, back-end em **Java** e banco de dados **SQL Server**.

A Helena é uma loja fictícia de camisetas, calças, jaquetas e acessórios para o público de 18 a 30 anos, que descobre os produtos pelo Instagram e compra pelo celular. O projeto parte de um levantamento de requisitos com um cliente simulado: hoje o estoque e os pedidos são controlados em planilhas, e a loja precisa de um sistema simples, barato e rápido no celular.

## O que a loja faz

- **Catálogo:** filtros por categoria, tamanho, cor e preço; ordenação; aviso de últimas peças e de tamanho esgotado.
- **Compra sem cadastro:** checkout sem conta nem senha, pensado para o celular.
- **Pagamento:** PIX com confirmação na hora ou cartão em até 6x sem juros.
- **Estoque sem venda dupla:** a peça fica reservada por 15 minutos durante o pagamento, e a compra é bloqueada se o estoque zerar.
- **Frete:** por CEP, com motoboy no mesmo dia, PAC ou Sedex. Se a API de frete cair, entra uma taxa fixa e o checkout continua.
- **Cupom e frete grátis:** um cupom por compra e frete grátis a partir de R$ 300,00.
- **Pós-venda:** acompanhamento do pedido e devolução solicitada pela própria cliente.
- **Privacidade:** coleta mínima de dados e consentimentos separados, seguindo a LGPD.
- **Painel administrativo** (próxima etapa): entrada de mercadoria em lote, estoque, etiquetas, leads e indicadores.

## Arquitetura

```
Navegador ──> Front-end (Next.js) ──> API REST (Java) ──> SQL Server
                 este repositório       outro repositório
```

- O front nunca acessa o banco: ele conversa só com a API, sempre do lado do servidor.
- A API é definida primeiro, em um contrato OpenAPI (`contrato/openapi.yaml`). Enquanto o back-end não existe, o front roda contra uma API simulada gerada a partir desse contrato.
- Gateway de pagamento, frete e nota fiscal entram por integrações, que ficam simuladas até haver acesso de teste.

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Front-end | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Back-end | Java (em outro repositório) |
| Banco de dados | SQL Server |
| Contrato da API | OpenAPI 3.0.3, servidor simulado com Prism |
| Testes | `node:test` |

## Como rodar

Requisito: Node.js 20.9 ou mais novo.

```bash
npm install
npm run dev        # loja em http://localhost:3000
npm run simulado   # API simulada em http://localhost:4010
```

| Comando | O que faz |
|---|---|
| `npm test` | Roda os testes |
| `npm run lint` | Confere o código |
| `npm run build` | Gera a versão de produção |

## Como o projeto é desenvolvido

O comportamento vem antes do código. Cada mudança segue esta ordem:

1. **Especificação:** cenários Dado/Quando/Então em `docs/SPEC-CLIENT.md`.
2. **Teste:** escrito a partir da especificação.
3. **Código:** só o necessário para o teste passar.

Nomes de variáveis, funções, componentes e arquivos ficam em português.

## Documentação

| Arquivo | Conteúdo |
|---|---|
| `docs/SPEC-CLIENT.md` | As 8 telas do cliente, em 103 cenários |
| `docs/DESIGN.md` | Cores, tipografia e componentes da interface |
| `contrato/openapi.yaml` | Contrato da API usada pelas telas do cliente |
| `banco/esquema.sql` | Esquema do banco (rascunho) |
| `CLAUDE.md` | Regras e restrições do projeto |

## Andamento

- [x] Levantamento de requisitos
- [x] Design system
- [x] Especificação das telas do cliente
- [x] Contrato da API
- [x] Rascunho do esquema do banco
- [ ] Telas do cliente
- [ ] Back-end em Java
- [ ] Esquema executado no SQL Server
- [ ] Integrações (pagamento, frete, nota fiscal)
- [ ] Painel administrativo
