/*
  Helena — esquema do banco (SQL Server 2019 ou mais novo)

  Origem: estórias E1 a E19 do levantamento de requisitos, docs/SPEC-CLIENT.md
  e contrato/openapi.yaml. Cobre a loja e o que o painel administrativo já
  tem definido nos requisitos.

  Convenções:
  - Nomes em PT-BR, sem acento, em snake_case, como nos requisitos.
  - Chave primária inteira IDENTITY, clusterizada. O que aparece na API tem
    também um id_publico (uniqueidentifier) com índice único; o inteiro nunca
    sai do back-end.
  - Dinheiro em decimal(10,2). A API converte para centavos.
  - Datas em UTC, datetime2(3).
  - Enumerações como texto com CHECK, para a tabela ser legível à mão.
  - Dados de cartão não são gravados em lugar nenhum.

  Este arquivo vive aqui até existir o repositório do back-end.
  Roda em banco vazio, uma vez. Ainda não foi executado em um SQL Server.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ---------- Clientes e acesso ---------- */

-- E1, E18: lead ao preencher os dados, cliente após pagamento aprovado.
-- O checkout sem login nunca sobrescreve nome, e-mail ou telefone de um
-- cadastro existente: quem digita o CPF de outra pessoa não pode trocar o
-- e-mail dela (que é por onde chega o link de acesso). Os dados digitados
-- ficam na sacola e no pedido.
CREATE TABLE dbo.cliente (
    id_cliente             INT IDENTITY(1,1) NOT NULL,
    nome                   NVARCHAR(100)     NOT NULL,
    cpf                    CHAR(11)          NOT NULL,
    email                  NVARCHAR(150)     NOT NULL,
    telefone               VARCHAR(15)       NOT NULL,
    status                 VARCHAR(10)       NOT NULL CONSTRAINT df_cliente_status DEFAULT 'lead',
    senha_hash             VARCHAR(255)      NULL,     -- opcional (E18)
    data_ultima_interacao  DATETIME2(3)      NOT NULL CONSTRAINT df_cliente_interacao DEFAULT SYSUTCDATETIME(),
    criado_em              DATETIME2(3)      NOT NULL CONSTRAINT df_cliente_criado DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_cliente PRIMARY KEY CLUSTERED (id_cliente),
    CONSTRAINT uq_cliente_cpf UNIQUE (cpf),
    CONSTRAINT uq_cliente_email UNIQUE (email),
    CONSTRAINT ck_cliente_status CHECK (status IN ('lead', 'cliente')),
    CONSTRAINT ck_cliente_cpf CHECK (cpf NOT LIKE '%[^0-9]%' AND LEN(cpf) = 11),
    CONSTRAINT ck_cliente_telefone CHECK (telefone NOT LIKE '%[^0-9]%'),
    CONSTRAINT ck_cliente_email CHECK (email LIKE '%_@_%')
);
-- E10: lista de leads não convertidos, do contato mais recente ao mais antigo.
CREATE NONCLUSTERED INDEX ix_cliente_leads ON dbo.cliente (data_ultima_interacao DESC) WHERE status = 'lead';
GO

-- CTA-05: endereços salvos na conta.
CREATE TABLE dbo.endereco_cliente (
    id_endereco  INT IDENTITY(1,1) NOT NULL,
    id_publico   UNIQUEIDENTIFIER  NOT NULL CONSTRAINT df_endereco_publico DEFAULT NEWID(),
    id_cliente   INT               NOT NULL,
    cep          CHAR(8)           NOT NULL,
    logradouro   NVARCHAR(100)     NOT NULL,
    numero       NVARCHAR(10)      NOT NULL,
    complemento  NVARCHAR(40)      NULL,
    bairro       NVARCHAR(60)      NOT NULL,
    cidade       NVARCHAR(60)      NOT NULL,
    uf           CHAR(2)           NOT NULL,
    CONSTRAINT pk_endereco_cliente PRIMARY KEY CLUSTERED (id_endereco),
    CONSTRAINT uq_endereco_cliente_publico UNIQUE (id_publico),
    CONSTRAINT fk_endereco_cliente FOREIGN KEY (id_cliente) REFERENCES dbo.cliente (id_cliente),
    CONSTRAINT ck_endereco_cliente_cep CHECK (cep NOT LIKE '%[^0-9]%' AND LEN(cep) = 8)
);
CREATE NONCLUSTERED INDEX ix_endereco_cliente ON dbo.endereco_cliente (id_cliente);
GO

-- LGPD: histórico de aceites por canal. Só recebe INSERT; o aceite vigente é
-- a linha mais recente do canal.
CREATE TABLE dbo.consentimento (
    id_consentimento  INT IDENTITY(1,1) NOT NULL,
    id_cliente        INT               NOT NULL,
    canal             VARCHAR(10)       NOT NULL,
    aceito            BIT               NOT NULL,
    versao_texto      VARCHAR(20)       NOT NULL,
    ip                VARCHAR(45)       NOT NULL,
    registrado_em     DATETIME2(3)      NOT NULL CONSTRAINT df_consentimento_em DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_consentimento PRIMARY KEY CLUSTERED (id_consentimento),
    CONSTRAINT fk_consentimento_cliente FOREIGN KEY (id_cliente) REFERENCES dbo.cliente (id_cliente),
    CONSTRAINT ck_consentimento_canal CHECK (canal IN ('email', 'whatsapp'))
);
CREATE NONCLUSTERED INDEX ix_consentimento_vigente ON dbo.consentimento (id_cliente, canal, id_consentimento DESC);
GO

-- CTA-09: pedidos de cópia ou exclusão de dados, atendidos pela equipe.
CREATE TABLE dbo.solicitacao_dados (
    id_solicitacao  INT IDENTITY(1,1) NOT NULL,
    id_cliente      INT               NOT NULL,
    tipo            VARCHAR(10)       NOT NULL,
    status          VARCHAR(12)       NOT NULL CONSTRAINT df_solicitacao_status DEFAULT 'aberta',
    criado_em       DATETIME2(3)      NOT NULL CONSTRAINT df_solicitacao_criado DEFAULT SYSUTCDATETIME(),
    concluido_em    DATETIME2(3)      NULL,
    CONSTRAINT pk_solicitacao_dados PRIMARY KEY CLUSTERED (id_solicitacao),
    CONSTRAINT fk_solicitacao_cliente FOREIGN KEY (id_cliente) REFERENCES dbo.cliente (id_cliente),
    CONSTRAINT ck_solicitacao_tipo CHECK (tipo IN ('copia', 'exclusao')),
    CONSTRAINT ck_solicitacao_status CHECK (status IN ('aberta', 'concluida'))
);
GO

-- E11: usuários do painel administrativo.
CREATE TABLE dbo.usuario (
    id_usuario  INT IDENTITY(1,1) NOT NULL,
    nome        NVARCHAR(100)     NOT NULL,
    email       NVARCHAR(150)     NOT NULL,
    senha_hash  VARCHAR(255)      NOT NULL,   -- mínimo de 8 caracteres é validado antes do hash
    perfil      VARCHAR(15)       NOT NULL,
    ativo       BIT               NOT NULL CONSTRAINT df_usuario_ativo DEFAULT 1,
    CONSTRAINT pk_usuario PRIMARY KEY CLUSTERED (id_usuario),
    CONSTRAINT uq_usuario_email UNIQUE (email),
    CONSTRAINT ck_usuario_perfil CHECK (perfil IN ('administrador', 'atendimento', 'operacional'))
);
GO

/* ---------- Catálogo e estoque ---------- */

-- E2: um registro por modelo + cor + tecido. Outra cor do mesmo modelo é
-- outro produto com o mesmo codigo_modelo.
CREATE TABLE dbo.produto (
    id_produto      INT IDENTITY(1,1) NOT NULL,
    id_publico      UNIQUEIDENTIFIER  NOT NULL CONSTRAINT df_produto_publico DEFAULT NEWID(),
    slug            VARCHAR(120)      NOT NULL,
    codigo_modelo   VARCHAR(50)       NOT NULL,
    nome            NVARCHAR(100)     NOT NULL,
    categoria       VARCHAR(12)       NOT NULL,
    cor             NVARCHAR(30)      NOT NULL,
    cor_hex         CHAR(7)           NOT NULL,
    tecido          NVARCHAR(50)      NOT NULL,
    colecao         NVARCHAR(50)      NOT NULL,
    descricao       NVARCHAR(2000)    NOT NULL CONSTRAINT df_produto_descricao DEFAULT '',
    preco           DECIMAL(10,2)     NOT NULL,
    preco_original  DECIMAL(10,2)     NULL,    -- preenchido só em promoção
    ativo           BIT               NOT NULL CONSTRAINT df_produto_ativo DEFAULT 1,
    criado_em       DATETIME2(3)      NOT NULL CONSTRAINT df_produto_criado DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_produto PRIMARY KEY CLUSTERED (id_produto),
    CONSTRAINT uq_produto_publico UNIQUE (id_publico),
    CONSTRAINT uq_produto_slug UNIQUE (slug),
    CONSTRAINT ck_produto_categoria CHECK (categoria IN ('camisetas', 'calcas', 'jaquetas', 'acessorios')),
    CONSTRAINT ck_produto_preco CHECK (preco > 0),
    CONSTRAINT ck_produto_promocao CHECK (preco_original IS NULL OR preco_original > preco)
);
CREATE NONCLUSTERED INDEX ix_produto_catalogo ON dbo.produto (categoria, criado_em DESC) INCLUDE (preco, preco_original) WHERE ativo = 1;
CREATE NONCLUSTERED INDEX ix_produto_modelo ON dbo.produto (codigo_modelo);
GO

CREATE TABLE dbo.produto_foto (
    id_foto     INT IDENTITY(1,1) NOT NULL,
    id_produto  INT               NOT NULL,
    url         VARCHAR(500)      NOT NULL,
    descricao   NVARCHAR(200)     NOT NULL,   -- texto alternativo
    ordem       TINYINT           NOT NULL,
    CONSTRAINT pk_produto_foto PRIMARY KEY CLUSTERED (id_foto),
    CONSTRAINT fk_produto_foto_produto FOREIGN KEY (id_produto) REFERENCES dbo.produto (id_produto),
    CONSTRAINT uq_produto_foto_ordem UNIQUE (id_produto, ordem)
);
GO

-- PRO-06: tabela de medidas por categoria, em JSON pronto para a tela.
CREATE TABLE dbo.guia_medidas (
    categoria  VARCHAR(12)    NOT NULL,
    conteudo   NVARCHAR(MAX)  NOT NULL,
    CONSTRAINT pk_guia_medidas PRIMARY KEY CLUSTERED (categoria),
    CONSTRAINT ck_guia_medidas_categoria CHECK (categoria IN ('camisetas', 'calcas', 'jaquetas', 'acessorios')),
    CONSTRAINT ck_guia_medidas_json CHECK (ISJSON(conteudo) = 1)
);
GO

-- E2, E3, E4, E9: tamanho do produto com o estoque duplo.
--   qtd_financeiro  total da nota fiscal ainda em casa
--   qtd_vitrine     liberado para venda
--   qtd_reservada   parte da vitrine presa em pagamentos em andamento
--   disponível no site = qtd_vitrine - qtd_reservada
--
-- A reserva é um único UPDATE, que só passa se houver saldo; é isso, mais o
-- CHECK abaixo, que impede a venda dupla no último segundo:
--   UPDATE dbo.produto_tamanho
--      SET qtd_reservada = qtd_reservada + @n
--    WHERE id_produto_tamanho = @id AND qtd_vitrine - qtd_reservada >= @n;
--   (0 linhas afetadas = estoque insuficiente; desfaz a transação)
-- Pagamento aprovado: qtd_financeiro, qtd_vitrine e qtd_reservada baixam @n.
-- Reserva expirada ou pagamento recusado: só qtd_reservada baixa @n.
CREATE TABLE dbo.produto_tamanho (
    id_produto_tamanho  INT IDENTITY(1,1) NOT NULL,
    id_publico          UNIQUEIDENTIFIER  NOT NULL CONSTRAINT df_produto_tamanho_publico DEFAULT NEWID(),
    id_produto          INT               NOT NULL,
    tamanho             VARCHAR(5)        NOT NULL,
    ordem               TINYINT           NOT NULL CONSTRAINT df_produto_tamanho_ordem DEFAULT 0,  -- P, M, G, GG
    qtd_financeiro      INT               NOT NULL,
    qtd_vitrine         INT               NOT NULL,
    qtd_reservada       INT               NOT NULL CONSTRAINT df_produto_tamanho_reservada DEFAULT 0,
    qtd_defeito         AS (qtd_financeiro - qtd_vitrine),
    qtd_minima          INT               NULL,    -- alerta interno de reposição (E9)
    CONSTRAINT pk_produto_tamanho PRIMARY KEY CLUSTERED (id_produto_tamanho),
    CONSTRAINT uq_produto_tamanho_publico UNIQUE (id_publico),
    CONSTRAINT uq_produto_tamanho UNIQUE (id_produto, tamanho),
    CONSTRAINT fk_produto_tamanho_produto FOREIGN KEY (id_produto) REFERENCES dbo.produto (id_produto),
    CONSTRAINT ck_produto_tamanho_nao_negativo CHECK (qtd_financeiro >= 0 AND qtd_vitrine >= 0 AND qtd_reservada >= 0),
    CONSTRAINT ck_produto_tamanho_vitrine CHECK (qtd_vitrine <= qtd_financeiro),
    CONSTRAINT ck_produto_tamanho_reservada CHECK (qtd_reservada <= qtd_vitrine),
    CONSTRAINT ck_produto_tamanho_minima CHECK (qtd_minima IS NULL OR qtd_minima > 0)
);
GO

-- E9, PRO-12: quem pediu para ser avisado quando o tamanho voltar.
CREATE TABLE dbo.aviso_reposicao (
    id_aviso            INT IDENTITY(1,1) NOT NULL,
    id_produto_tamanho  INT               NOT NULL,
    canal               VARCHAR(10)       NOT NULL,
    contato             NVARCHAR(150)     NOT NULL,
    criado_em           DATETIME2(3)      NOT NULL CONSTRAINT df_aviso_criado DEFAULT SYSUTCDATETIME(),
    avisado_em          DATETIME2(3)      NULL,
    CONSTRAINT pk_aviso_reposicao PRIMARY KEY CLUSTERED (id_aviso),
    CONSTRAINT fk_aviso_produto_tamanho FOREIGN KEY (id_produto_tamanho) REFERENCES dbo.produto_tamanho (id_produto_tamanho),
    CONSTRAINT ck_aviso_canal CHECK (canal IN ('email', 'whatsapp'))
);
-- Um pedido de aviso pendente por contato e tamanho.
CREATE UNIQUE NONCLUSTERED INDEX uq_aviso_pendente ON dbo.aviso_reposicao (id_produto_tamanho, canal, contato) WHERE avisado_em IS NULL;
GO

-- E6
CREATE TABLE dbo.cupom (
    id_cupom             INT IDENTITY(1,1) NOT NULL,
    codigo               VARCHAR(20)       NOT NULL,
    percentual_desconto  DECIMAL(5,2)      NOT NULL,
    ativo                BIT               NOT NULL CONSTRAINT df_cupom_ativo DEFAULT 1,
    CONSTRAINT pk_cupom PRIMARY KEY CLUSTERED (id_cupom),
    CONSTRAINT uq_cupom_codigo UNIQUE (codigo),
    CONSTRAINT ck_cupom_percentual CHECK (percentual_desconto BETWEEN 0 AND 70)
);
GO

/* ---------- Sacola ---------- */

-- O id_publico é o segredo que o front guarda em cookie (SAC-06).
-- Os dados digitados no checkout ficam aqui até virarem pedido (CHK-05).
CREATE TABLE dbo.sacola (
    id_sacola      INT IDENTITY(1,1) NOT NULL,
    id_publico     UNIQUEIDENTIFIER  NOT NULL CONSTRAINT df_sacola_publico DEFAULT NEWID(),
    id_cliente     INT               NULL,    -- preenchido quando o lead é salvo
    id_cupom       INT               NULL,    -- um cupom por compra (SAC-15)
    entrega_tipo   VARCHAR(10)       NULL,
    nome           NVARCHAR(100)     NULL,
    email          NVARCHAR(150)     NULL,
    telefone       VARCHAR(15)       NULL,
    cep            CHAR(8)           NULL,
    logradouro     NVARCHAR(100)     NULL,
    numero         NVARCHAR(10)      NULL,
    complemento    NVARCHAR(40)      NULL,
    bairro         NVARCHAR(60)      NULL,
    cidade         NVARCHAR(60)      NULL,
    uf             CHAR(2)           NULL,
    criado_em      DATETIME2(3)      NOT NULL CONSTRAINT df_sacola_criado DEFAULT SYSUTCDATETIME(),
    atualizado_em  DATETIME2(3)      NOT NULL CONSTRAINT df_sacola_atualizado DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_sacola PRIMARY KEY CLUSTERED (id_sacola),
    CONSTRAINT uq_sacola_publico UNIQUE (id_publico),
    CONSTRAINT fk_sacola_cliente FOREIGN KEY (id_cliente) REFERENCES dbo.cliente (id_cliente),
    CONSTRAINT fk_sacola_cupom FOREIGN KEY (id_cupom) REFERENCES dbo.cupom (id_cupom),
    CONSTRAINT ck_sacola_entrega CHECK (entrega_tipo IS NULL OR entrega_tipo IN ('motoboy', 'pac', 'sedex'))
);
GO

CREATE TABLE dbo.sacola_item (
    id_sacola_item      INT IDENTITY(1,1) NOT NULL,
    id_publico          UNIQUEIDENTIFIER  NOT NULL CONSTRAINT df_sacola_item_publico DEFAULT NEWID(),
    id_sacola           INT               NOT NULL,
    id_produto_tamanho  INT               NOT NULL,
    quantidade          INT               NOT NULL,
    CONSTRAINT pk_sacola_item PRIMARY KEY CLUSTERED (id_sacola_item),
    CONSTRAINT uq_sacola_item_publico UNIQUE (id_publico),
    CONSTRAINT uq_sacola_item UNIQUE (id_sacola, id_produto_tamanho),
    CONSTRAINT fk_sacola_item_sacola FOREIGN KEY (id_sacola) REFERENCES dbo.sacola (id_sacola) ON DELETE CASCADE,
    CONSTRAINT fk_sacola_item_produto_tamanho FOREIGN KEY (id_produto_tamanho) REFERENCES dbo.produto_tamanho (id_produto_tamanho),
    CONSTRAINT ck_sacola_item_quantidade CHECK (quantidade > 0)
);
GO

/* ---------- Pedido, reserva e pagamento ---------- */

-- E5. Nome, contato e endereço são cópia do que foi digitado na compra: a
-- nota fiscal e a entrega não mudam se a cliente editar a conta depois.
-- forma_pagamento e parcelas ficam nulos até a cliente escolher (CHK-14).
CREATE TABLE dbo.pedido (
    id_pedido         INT IDENTITY(1,1) NOT NULL,
    numero            VARCHAR(12)       NOT NULL,   -- o que a cliente vê: HL-100482
    id_cliente        INT               NOT NULL,
    id_sacola         INT               NOT NULL,
    id_cupom          INT               NULL,       -- rastreio de influenciador (E6)
    status            VARCHAR(22)       NOT NULL CONSTRAINT df_pedido_status DEFAULT 'aguardando_pagamento',
    status_pagamento  VARCHAR(10)       NOT NULL CONSTRAINT df_pedido_status_pagamento DEFAULT 'pendente',
    forma_pagamento   VARCHAR(6)        NULL,
    parcelas          TINYINT           NULL,
    valor_produtos    DECIMAL(10,2)     NOT NULL,
    valor_desconto    DECIMAL(10,2)     NOT NULL CONSTRAINT df_pedido_desconto DEFAULT 0,
    valor_frete       DECIMAL(10,2)     NOT NULL,
    valor_total       AS (CONVERT(DECIMAL(10,2), valor_produtos - valor_desconto + valor_frete)) PERSISTED,
    nome              NVARCHAR(100)     NOT NULL,
    cpf               CHAR(11)          NOT NULL,
    email             NVARCHAR(150)     NOT NULL,
    telefone          VARCHAR(15)       NOT NULL,
    cep               CHAR(8)           NOT NULL,
    logradouro        NVARCHAR(100)     NOT NULL,
    numero_endereco   NVARCHAR(10)      NOT NULL,
    complemento       NVARCHAR(40)      NULL,
    bairro            NVARCHAR(60)      NOT NULL,
    cidade            NVARCHAR(60)      NOT NULL,
    uf                CHAR(2)           NOT NULL,
    criado_em         DATETIME2(3)      NOT NULL CONSTRAINT df_pedido_criado DEFAULT SYSUTCDATETIME(),
    pago_em           DATETIME2(3)      NULL,
    em_separacao_em   DATETIME2(3)      NULL,
    enviado_em        DATETIME2(3)      NULL,
    entregue_em       DATETIME2(3)      NULL,       -- início do prazo de 7 dias da devolução
    CONSTRAINT pk_pedido PRIMARY KEY CLUSTERED (id_pedido),
    CONSTRAINT uq_pedido_numero UNIQUE (numero),
    CONSTRAINT fk_pedido_cliente FOREIGN KEY (id_cliente) REFERENCES dbo.cliente (id_cliente),
    CONSTRAINT fk_pedido_sacola FOREIGN KEY (id_sacola) REFERENCES dbo.sacola (id_sacola),
    CONSTRAINT fk_pedido_cupom FOREIGN KEY (id_cupom) REFERENCES dbo.cupom (id_cupom),
    CONSTRAINT ck_pedido_status CHECK (status IN ('aguardando_pagamento', 'reserva_expirada', 'pagamento_confirmado', 'em_separacao', 'enviado', 'entregue', 'suporte_em_andamento')),
    CONSTRAINT ck_pedido_status_pagamento CHECK (status_pagamento IN ('pendente', 'aprovado', 'recusado')),
    CONSTRAINT ck_pedido_forma CHECK (forma_pagamento IS NULL OR forma_pagamento IN ('pix', 'cartao')),
    -- até 6x, parcela mínima de R$ 50,00
    CONSTRAINT ck_pedido_parcelas CHECK (parcelas IS NULL OR (parcelas BETWEEN 1 AND 6 AND (parcelas = 1 OR (valor_produtos - valor_desconto + valor_frete) / parcelas >= 50))),
    CONSTRAINT ck_pedido_parcelas_cartao CHECK (forma_pagamento <> 'cartao' OR parcelas IS NOT NULL),
    CONSTRAINT ck_pedido_valores CHECK (valor_produtos > 0 AND valor_frete >= 0 AND valor_desconto >= 0 AND valor_desconto <= valor_produtos)
);
CREATE NONCLUSTERED INDEX ix_pedido_cliente ON dbo.pedido (id_cliente, criado_em DESC);
CREATE NONCLUSTERED INDEX ix_pedido_status ON dbo.pedido (status, criado_em);
GO

-- Nome, cor, tamanho e preço copiados: o pedido não muda se o produto mudar.
CREATE TABLE dbo.pedido_item (
    id_pedido_item      INT IDENTITY(1,1) NOT NULL,
    id_pedido           INT               NOT NULL,
    id_produto_tamanho  INT               NOT NULL,
    nome                NVARCHAR(100)     NOT NULL,
    cor                 NVARCHAR(30)      NOT NULL,
    tamanho             VARCHAR(5)        NOT NULL,
    preco_unitario      DECIMAL(10,2)     NOT NULL,
    quantidade          INT               NOT NULL,
    CONSTRAINT pk_pedido_item PRIMARY KEY CLUSTERED (id_pedido_item),
    CONSTRAINT uq_pedido_item UNIQUE (id_pedido, id_produto_tamanho),
    CONSTRAINT fk_pedido_item_pedido FOREIGN KEY (id_pedido) REFERENCES dbo.pedido (id_pedido),
    CONSTRAINT fk_pedido_item_produto_tamanho FOREIGN KEY (id_produto_tamanho) REFERENCES dbo.produto_tamanho (id_produto_tamanho),
    CONSTRAINT ck_pedido_item CHECK (quantidade > 0 AND preco_unitario > 0)
);
-- Ordenação "mais vendidos" (CAT-09).
CREATE NONCLUSTERED INDEX ix_pedido_item_vendas ON dbo.pedido_item (id_produto_tamanho) INCLUDE (quantidade);
GO

-- E4: 15 minutos a partir do início do pagamento. Pagamento recusado fecha a
-- reserva como 'expirado' na hora.
CREATE TABLE dbo.reserva (
    id_reserva          INT IDENTITY(1,1) NOT NULL,
    id_pedido           INT               NOT NULL,
    id_produto_tamanho  INT               NOT NULL,
    quantidade          INT               NOT NULL,
    data_hora_reserva   DATETIME2(3)      NOT NULL CONSTRAINT df_reserva_inicio DEFAULT SYSUTCDATETIME(),
    expira_em           DATETIME2(3)      NOT NULL,
    status              VARCHAR(10)       NOT NULL CONSTRAINT df_reserva_status DEFAULT 'reservado',
    CONSTRAINT pk_reserva PRIMARY KEY CLUSTERED (id_reserva),
    CONSTRAINT fk_reserva_pedido FOREIGN KEY (id_pedido) REFERENCES dbo.pedido (id_pedido),
    CONSTRAINT fk_reserva_produto_tamanho FOREIGN KEY (id_produto_tamanho) REFERENCES dbo.produto_tamanho (id_produto_tamanho),
    CONSTRAINT ck_reserva_status CHECK (status IN ('reservado', 'confirmado', 'expirado')),
    CONSTRAINT ck_reserva_quantidade CHECK (quantidade > 0),
    CONSTRAINT ck_reserva_prazo CHECK (expira_em <= DATEADD(MINUTE, 15, data_hora_reserva))
);
-- Uma reserva aberta por peça do pedido; e o que a rotina de expiração varre.
CREATE UNIQUE NONCLUSTERED INDEX uq_reserva_aberta ON dbo.reserva (id_pedido, id_produto_tamanho) WHERE status = 'reservado';
CREATE NONCLUSTERED INDEX ix_reserva_a_expirar ON dbo.reserva (expira_em) INCLUDE (id_pedido, id_produto_tamanho, quantidade) WHERE status = 'reservado';
GO

-- Cada tentativa de pagamento. Só identificadores do gateway; nada do cartão.
CREATE TABLE dbo.pagamento (
    id_pagamento     INT IDENTITY(1,1) NOT NULL,
    id_publico       UNIQUEIDENTIFIER  NOT NULL CONSTRAINT df_pagamento_publico DEFAULT NEWID(),
    id_pedido        INT               NOT NULL,
    forma            VARCHAR(6)        NOT NULL,
    parcelas         TINYINT           NULL,
    valor            DECIMAL(10,2)     NOT NULL,
    status           VARCHAR(10)       NOT NULL CONSTRAINT df_pagamento_status DEFAULT 'pendente',
    id_no_gateway    VARCHAR(100)      NULL,
    pix_copia_cola   VARCHAR(600)      NULL,
    pix_expira_em    DATETIME2(3)      NULL,
    mensagem_recusa  NVARCHAR(200)     NULL,
    criado_em        DATETIME2(3)      NOT NULL CONSTRAINT df_pagamento_criado DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_pagamento PRIMARY KEY CLUSTERED (id_pagamento),
    CONSTRAINT uq_pagamento_publico UNIQUE (id_publico),
    CONSTRAINT fk_pagamento_pedido FOREIGN KEY (id_pedido) REFERENCES dbo.pedido (id_pedido),
    CONSTRAINT ck_pagamento_forma CHECK (forma IN ('pix', 'cartao')),
    CONSTRAINT ck_pagamento_status CHECK (status IN ('pendente', 'aprovado', 'recusado'))
);
CREATE NONCLUSTERED INDEX ix_pagamento_pedido ON dbo.pagamento (id_pedido, id_pagamento DESC);
-- Um pedido só pode ter um pagamento aprovado.
CREATE UNIQUE NONCLUSTERED INDEX uq_pagamento_aprovado ON dbo.pagamento (id_pedido) WHERE status = 'aprovado';
-- Confirmação que chega do gateway.
CREATE UNIQUE NONCLUSTERED INDEX uq_pagamento_gateway ON dbo.pagamento (id_no_gateway) WHERE id_no_gateway IS NOT NULL;
GO

/* ---------- Entrega, nota fiscal e etiqueta ---------- */

-- E7
CREATE TABLE dbo.frete (
    id_frete         INT IDENTITY(1,1) NOT NULL,
    id_pedido        INT               NOT NULL,
    tipo             VARCHAR(10)       NOT NULL,
    valor            DECIMAL(10,2)     NOT NULL,   -- 0 quando grátis
    prazo_estimado   INT               NOT NULL,   -- dias; 0 = mesmo dia
    gratis           BIT               NOT NULL CONSTRAINT df_frete_gratis DEFAULT 0,
    contingencia     BIT               NOT NULL CONSTRAINT df_frete_contingencia DEFAULT 0,  -- taxa fixa, API fora do ar
    codigo_rastreio  VARCHAR(30)       NULL,
    CONSTRAINT pk_frete PRIMARY KEY CLUSTERED (id_frete),
    CONSTRAINT uq_frete_pedido UNIQUE (id_pedido),
    CONSTRAINT fk_frete_pedido FOREIGN KEY (id_pedido) REFERENCES dbo.pedido (id_pedido),
    CONSTRAINT ck_frete_tipo CHECK (tipo IN ('motoboy', 'pac', 'sedex')),
    CONSTRAINT ck_frete_valor CHECK (valor >= 0 AND prazo_estimado >= 0)
);
GO

-- E12: cada chamada à API de frete, para o contador de custo do painel.
CREATE TABLE dbo.consulta_frete (
    id_consulta    BIGINT IDENTITY(1,1) NOT NULL,
    cep            CHAR(8)              NOT NULL,
    contingencia   BIT                  NOT NULL,
    consultado_em  DATETIME2(3)         NOT NULL CONSTRAINT df_consulta_frete_em DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_consulta_frete PRIMARY KEY CLUSTERED (id_consulta)
);
CREATE NONCLUSTERED INDEX ix_consulta_frete_periodo ON dbo.consulta_frete (consultado_em) INCLUDE (contingencia);
GO

-- E14: o pedido só vai para separação com nota 'emitida'.
CREATE TABLE dbo.nota_fiscal (
    id_nota_fiscal  INT IDENTITY(1,1) NOT NULL,
    id_pedido       INT               NOT NULL,
    status_nf       VARCHAR(10)       NOT NULL,
    chave_acesso    CHAR(44)          NULL,
    mensagem_erro   NVARCHAR(500)     NULL,
    data_emissao    DATETIME2(3)      NOT NULL CONSTRAINT df_nota_fiscal_emissao DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_nota_fiscal PRIMARY KEY CLUSTERED (id_nota_fiscal),
    CONSTRAINT fk_nota_fiscal_pedido FOREIGN KEY (id_pedido) REFERENCES dbo.pedido (id_pedido),
    CONSTRAINT ck_nota_fiscal_status CHECK (status_nf IN ('emitida', 'erro'))
);
CREATE UNIQUE NONCLUSTERED INDEX uq_nota_fiscal_emitida ON dbo.nota_fiscal (id_pedido) WHERE status_nf = 'emitida';
CREATE NONCLUSTERED INDEX ix_nota_fiscal_erro ON dbo.nota_fiscal (data_emissao) WHERE status_nf = 'erro';
GO

-- E8: uma etiqueta por pedido; existir a linha é o "etiqueta gerada".
CREATE TABLE dbo.etiqueta (
    id_etiqueta    INT IDENTITY(1,1) NOT NULL,
    id_pedido      INT               NOT NULL,
    dados_entrega  NVARCHAR(500)     NOT NULL,
    resumo_itens   NVARCHAR(1000)    NOT NULL,
    formato        VARCHAR(10)       NOT NULL CONSTRAINT df_etiqueta_formato DEFAULT 'termica',
    gerada_em      DATETIME2(3)      NOT NULL CONSTRAINT df_etiqueta_gerada DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_etiqueta PRIMARY KEY CLUSTERED (id_etiqueta),
    CONSTRAINT uq_etiqueta_pedido UNIQUE (id_pedido),
    CONSTRAINT fk_etiqueta_pedido FOREIGN KEY (id_pedido) REFERENCES dbo.pedido (id_pedido),
    CONSTRAINT ck_etiqueta_formato CHECK (formato IN ('termica'))
);
GO

/* ---------- Devolução e notificações ---------- */

-- E19: uma solicitação por pedido, mesmo se rejeitada.
CREATE TABLE dbo.devolucao (
    id_devolucao      INT IDENTITY(1,1) NOT NULL,
    id_pedido         INT               NOT NULL,
    motivo            VARCHAR(20)       NOT NULL,
    status            VARCHAR(15)       NOT NULL CONSTRAINT df_devolucao_status DEFAULT 'solicitada',
    data_solicitacao  DATETIME2(3)      NOT NULL CONSTRAINT df_devolucao_data DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_devolucao PRIMARY KEY CLUSTERED (id_devolucao),
    CONSTRAINT uq_devolucao_pedido UNIQUE (id_pedido),
    CONSTRAINT fk_devolucao_pedido FOREIGN KEY (id_pedido) REFERENCES dbo.pedido (id_pedido),
    CONSTRAINT ck_devolucao_motivo CHECK (motivo IN ('tamanho_incorreto', 'defeito', 'arrependimento', 'outro')),
    CONSTRAINT ck_devolucao_status CHECK (status IN ('solicitada', 'em_tratativa', 'concluida', 'rejeitada'))
);
-- Aba de triagem do painel.
CREATE NONCLUSTERED INDEX ix_devolucao_triagem ON dbo.devolucao (data_solicitacao) WHERE status = 'solicitada';
GO

-- E15: registro de envios. A chave única impede mandar duas vezes a mesma
-- notificação para o mesmo evento.
CREATE TABLE dbo.notificacao (
    id_notificacao  INT IDENTITY(1,1) NOT NULL,
    id_pedido       INT               NULL,    -- confirmação e rastreio
    id_aviso        INT               NULL,    -- estoque reposto
    tipo            VARCHAR(16)       NOT NULL,
    canal           VARCHAR(10)       NOT NULL,
    status_envio    VARCHAR(10)       NOT NULL,
    enviado_em      DATETIME2(3)      NOT NULL CONSTRAINT df_notificacao_em DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_notificacao PRIMARY KEY CLUSTERED (id_notificacao),
    CONSTRAINT fk_notificacao_pedido FOREIGN KEY (id_pedido) REFERENCES dbo.pedido (id_pedido),
    CONSTRAINT fk_notificacao_aviso FOREIGN KEY (id_aviso) REFERENCES dbo.aviso_reposicao (id_aviso),
    CONSTRAINT ck_notificacao_tipo CHECK (tipo IN ('confirmacao', 'rastreio', 'estoque_reposto')),
    CONSTRAINT ck_notificacao_canal CHECK (canal IN ('email', 'whatsapp')),
    CONSTRAINT ck_notificacao_status CHECK (status_envio IN ('enviado', 'falha')),
    CONSTRAINT ck_notificacao_origem CHECK ((tipo = 'estoque_reposto' AND id_aviso IS NOT NULL AND id_pedido IS NULL) OR (tipo <> 'estoque_reposto' AND id_pedido IS NOT NULL AND id_aviso IS NULL))
);
CREATE UNIQUE NONCLUSTERED INDEX uq_notificacao_pedido ON dbo.notificacao (id_pedido, tipo, canal) WHERE id_pedido IS NOT NULL AND status_envio = 'enviado';
CREATE UNIQUE NONCLUSTERED INDEX uq_notificacao_aviso ON dbo.notificacao (id_aviso, canal) WHERE id_aviso IS NOT NULL AND status_envio = 'enviado';
GO

/* ---------- Tokens e idempotência ---------- */

-- Sessão da cliente, link de acesso por e-mail e acesso a um pedido sem conta.
-- Guarda só o SHA-256 do token; o valor original existe apenas no cookie ou
-- no e-mail.
CREATE TABLE dbo.token_acesso (
    id_token     BIGINT IDENTITY(1,1) NOT NULL,
    tipo         VARCHAR(10)          NOT NULL,
    token_hash   BINARY(32)           NOT NULL,
    id_cliente   INT                  NULL,
    id_pedido    INT                  NULL,
    criado_em    DATETIME2(3)         NOT NULL CONSTRAINT df_token_criado DEFAULT SYSUTCDATETIME(),
    expira_em    DATETIME2(3)         NOT NULL,
    usado_em     DATETIME2(3)         NULL,    -- link de acesso: uso único
    revogado_em  DATETIME2(3)         NULL,    -- sessão encerrada
    CONSTRAINT pk_token_acesso PRIMARY KEY CLUSTERED (id_token),
    CONSTRAINT uq_token_acesso_hash UNIQUE (token_hash),
    CONSTRAINT fk_token_cliente FOREIGN KEY (id_cliente) REFERENCES dbo.cliente (id_cliente),
    CONSTRAINT fk_token_pedido FOREIGN KEY (id_pedido) REFERENCES dbo.pedido (id_pedido),
    CONSTRAINT ck_token_tipo CHECK (tipo IN ('sessao', 'link', 'pedido')),
    CONSTRAINT ck_token_dono CHECK ((tipo IN ('sessao', 'link') AND id_cliente IS NOT NULL AND id_pedido IS NULL) OR (tipo = 'pedido' AND id_pedido IS NOT NULL AND id_cliente IS NULL))
);
CREATE NONCLUSTERED INDEX ix_token_expira ON dbo.token_acesso (expira_em);
GO

-- CHK-22, DEV-07: repetir a mesma chave devolve a resposta guardada.
CREATE TABLE dbo.chave_idempotencia (
    id_chave         BIGINT IDENTITY(1,1) NOT NULL,
    operacao         VARCHAR(40)          NOT NULL,
    chave            UNIQUEIDENTIFIER     NOT NULL,
    resposta_status  SMALLINT             NULL,    -- nulo enquanto a primeira chamada está em andamento
    resposta_corpo   NVARCHAR(MAX)        NULL,
    criado_em        DATETIME2(3)         NOT NULL CONSTRAINT df_chave_criado DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_chave_idempotencia PRIMARY KEY CLUSTERED (id_chave),
    CONSTRAINT uq_chave_idempotencia UNIQUE (operacao, chave)
);
GO

/* ---------- Mensagens (outbox e inbox) ---------- */

-- Gravada na mesma transação da mudança de negócio (pagamento aprovado,
-- etiqueta gerada, estoque reposto). Um processo lê as pendentes com
-- WITH (UPDLOCK, READPAST, ROWLOCK) e dispara nota fiscal, e-mail e WhatsApp.
-- Chave clusterizada sequencial para não fragmentar com muitas inserções.
CREATE TABLE dbo.mensagem_saida (
    sequencia           BIGINT IDENTITY(1,1) NOT NULL,
    id_evento           UNIQUEIDENTIFIER     NOT NULL,
    tipo_agregado       NVARCHAR(256)        NOT NULL,
    id_agregado         NVARCHAR(256)        NOT NULL,
    tipo_evento         NVARCHAR(256)        NOT NULL,
    conteudo            NVARCHAR(MAX)        NOT NULL,
    ocorrido_em         DATETIME2(7)         NOT NULL,
    processado_em       DATETIME2(7)         NULL,
    tentativas          INT                  NOT NULL CONSTRAINT df_mensagem_saida_tentativas DEFAULT 0,
    proxima_tentativa   DATETIME2(7)         NULL,
    ultimo_erro         NVARCHAR(2000)       NULL,
    id_trava            UNIQUEIDENTIFIER     NULL,
    trava_expira_em     DATETIME2(7)         NULL,
    CONSTRAINT pk_mensagem_saida PRIMARY KEY CLUSTERED (sequencia),
    CONSTRAINT uq_mensagem_saida_evento UNIQUE NONCLUSTERED (id_evento)
);
CREATE NONCLUSTERED INDEX ix_mensagem_saida_pendente
    ON dbo.mensagem_saida (ocorrido_em)
    INCLUDE (id_evento, tipo_evento, tentativas, proxima_tentativa, id_trava, trava_expira_em)
    WHERE processado_em IS NULL;
GO

-- Quem consome grava o id_evento aqui na mesma transação em que age; evento
-- repetido viola a chave e é descartado.
CREATE TABLE dbo.mensagem_processada (
    id_evento      UNIQUEIDENTIFIER NOT NULL,
    consumidor     VARCHAR(60)      NOT NULL,
    processado_em  DATETIME2(3)     NOT NULL CONSTRAINT df_mensagem_processada_em DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_mensagem_processada PRIMARY KEY CLUSTERED (id_evento, consumidor)
);
GO
