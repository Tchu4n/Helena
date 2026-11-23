/*
  Helena — database schema (SQL Server 2019 or newer)

  Source: user stories E1 to E19 from the requirements document,
  docs/SPEC-CLIENT.md and contract/openapi.yaml. Covers the store and what the
  admin panel already has defined in the requirements. Business terms map to
  these names in docs/GLOSSARY.md.

  Conventions:
  - Names in simple English, snake_case, singular tables. Words that SQL Server
    reserves are avoided: customer_order instead of "order", admin_user instead
    of "user", return_request instead of "return".
  - Integer IDENTITY primary key, clustered. Whatever the API exposes also has
    a public_id (uniqueidentifier) with a unique index; the integer never
    leaves the back end.
  - Money in decimal(10,2). The API converts it to cents.
  - Dates in UTC, datetime2(3).
  - Enumerations as text with CHECK, so tables stay readable by hand.
  - Card data is never stored anywhere.

  This file lives here until the back-end repository exists.
  Runs once, on an empty database. Not yet run on a SQL Server.
*/

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ---------- Customers and access ---------- */

-- E1, E18: a lead when the details are filled in, a customer after an
-- approved payment.
-- Checkout without login never overwrites the name, e-mail or phone of an
-- existing record: someone typing another person's CPF must not be able to
-- change her e-mail (which is where the access link goes). The typed details
-- stay in the cart and in the order.
CREATE TABLE dbo.customer (
    customer_id          INT IDENTITY(1,1) NOT NULL,
    name                 NVARCHAR(100)     NOT NULL,
    cpf                  CHAR(11)          NOT NULL,
    email                NVARCHAR(150)     NOT NULL,
    phone                VARCHAR(15)       NOT NULL,
    status               VARCHAR(10)       NOT NULL CONSTRAINT df_customer_status DEFAULT 'lead',
    password_hash        VARCHAR(255)      NULL,     -- optional (E18)
    last_interaction_at  DATETIME2(3)      NOT NULL CONSTRAINT df_customer_interaction DEFAULT SYSUTCDATETIME(),
    created_at           DATETIME2(3)      NOT NULL CONSTRAINT df_customer_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_customer PRIMARY KEY CLUSTERED (customer_id),
    CONSTRAINT uq_customer_cpf UNIQUE (cpf),
    CONSTRAINT uq_customer_email UNIQUE (email),
    CONSTRAINT ck_customer_status CHECK (status IN ('lead', 'customer')),
    CONSTRAINT ck_customer_cpf CHECK (cpf NOT LIKE '%[^0-9]%' AND LEN(cpf) = 11),
    CONSTRAINT ck_customer_phone CHECK (phone NOT LIKE '%[^0-9]%'),
    CONSTRAINT ck_customer_email CHECK (email LIKE '%_@_%')
);
-- E10: list of leads that did not buy, from the most recent contact to the oldest.
CREATE NONCLUSTERED INDEX ix_customer_leads ON dbo.customer (last_interaction_at DESC) WHERE status = 'lead';
GO

-- CTA-05: addresses saved in the account.
CREATE TABLE dbo.customer_address (
    address_id    INT IDENTITY(1,1) NOT NULL,
    public_id     UNIQUEIDENTIFIER  NOT NULL CONSTRAINT df_customer_address_public DEFAULT NEWID(),
    customer_id   INT               NOT NULL,
    cep           CHAR(8)           NOT NULL,
    street        NVARCHAR(100)     NOT NULL,
    number        NVARCHAR(10)      NOT NULL,
    complement    NVARCHAR(40)      NULL,
    neighborhood  NVARCHAR(60)      NOT NULL,
    city          NVARCHAR(60)      NOT NULL,
    state         CHAR(2)           NOT NULL,
    CONSTRAINT pk_customer_address PRIMARY KEY CLUSTERED (address_id),
    CONSTRAINT uq_customer_address_public UNIQUE (public_id),
    CONSTRAINT fk_customer_address_customer FOREIGN KEY (customer_id) REFERENCES dbo.customer (customer_id),
    CONSTRAINT ck_customer_address_cep CHECK (cep NOT LIKE '%[^0-9]%' AND LEN(cep) = 8)
);
CREATE NONCLUSTERED INDEX ix_customer_address_customer ON dbo.customer_address (customer_id);
GO

-- LGPD: history of consents per channel. Only receives INSERTs; the current
-- consent is the most recent row for the channel.
CREATE TABLE dbo.consent (
    consent_id    INT IDENTITY(1,1) NOT NULL,
    customer_id   INT               NOT NULL,
    channel       VARCHAR(10)       NOT NULL,
    accepted      BIT               NOT NULL,
    text_version  VARCHAR(20)       NOT NULL,
    ip            VARCHAR(45)       NOT NULL,
    recorded_at   DATETIME2(3)      NOT NULL CONSTRAINT df_consent_recorded DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_consent PRIMARY KEY CLUSTERED (consent_id),
    CONSTRAINT fk_consent_customer FOREIGN KEY (customer_id) REFERENCES dbo.customer (customer_id),
    CONSTRAINT ck_consent_channel CHECK (channel IN ('email', 'whatsapp'))
);
CREATE NONCLUSTERED INDEX ix_consent_current ON dbo.consent (customer_id, channel, consent_id DESC);
GO

-- CTA-09: requests for a copy or deletion of personal data, handled by the team.
CREATE TABLE dbo.data_request (
    data_request_id  INT IDENTITY(1,1) NOT NULL,
    customer_id      INT               NOT NULL,
    type             VARCHAR(10)       NOT NULL,
    status           VARCHAR(12)       NOT NULL CONSTRAINT df_data_request_status DEFAULT 'open',
    created_at       DATETIME2(3)      NOT NULL CONSTRAINT df_data_request_created DEFAULT SYSUTCDATETIME(),
    completed_at     DATETIME2(3)      NULL,
    CONSTRAINT pk_data_request PRIMARY KEY CLUSTERED (data_request_id),
    CONSTRAINT fk_data_request_customer FOREIGN KEY (customer_id) REFERENCES dbo.customer (customer_id),
    CONSTRAINT ck_data_request_type CHECK (type IN ('copy', 'deletion')),
    CONSTRAINT ck_data_request_status CHECK (status IN ('open', 'completed'))
);
GO

-- E11: admin panel users.
CREATE TABLE dbo.admin_user (
    user_id        INT IDENTITY(1,1) NOT NULL,
    name           NVARCHAR(100)     NOT NULL,
    email          NVARCHAR(150)     NOT NULL,
    password_hash  VARCHAR(255)      NOT NULL,   -- the 8-character minimum is checked before hashing
    role           VARCHAR(15)       NOT NULL,
    active         BIT               NOT NULL CONSTRAINT df_admin_user_active DEFAULT 1,
    CONSTRAINT pk_admin_user PRIMARY KEY CLUSTERED (user_id),
    CONSTRAINT uq_admin_user_email UNIQUE (email),
    CONSTRAINT ck_admin_user_role CHECK (role IN ('admin', 'support', 'operations'))
);
GO

/* ---------- Catalog and stock ---------- */

-- E2: one row per model + color + fabric. Another color of the same model is
-- another product with the same model_code.
CREATE TABLE dbo.product (
    product_id      INT IDENTITY(1,1) NOT NULL,
    public_id       UNIQUEIDENTIFIER  NOT NULL CONSTRAINT df_product_public DEFAULT NEWID(),
    slug            VARCHAR(120)      NOT NULL,
    model_code      VARCHAR(50)       NOT NULL,
    name            NVARCHAR(100)     NOT NULL,
    category        VARCHAR(12)       NOT NULL,
    color           NVARCHAR(30)      NOT NULL,
    color_hex       CHAR(7)           NOT NULL,
    fabric          NVARCHAR(50)      NOT NULL,
    collection      NVARCHAR(50)      NOT NULL,
    description     NVARCHAR(2000)    NOT NULL CONSTRAINT df_product_description DEFAULT '',
    price           DECIMAL(10,2)     NOT NULL,
    original_price  DECIMAL(10,2)     NULL,    -- only filled in during a sale
    active          BIT               NOT NULL CONSTRAINT df_product_active DEFAULT 1,
    created_at      DATETIME2(3)      NOT NULL CONSTRAINT df_product_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_product PRIMARY KEY CLUSTERED (product_id),
    CONSTRAINT uq_product_public UNIQUE (public_id),
    CONSTRAINT uq_product_slug UNIQUE (slug),
    CONSTRAINT ck_product_category CHECK (category IN ('tshirts', 'pants', 'jackets', 'accessories')),
    CONSTRAINT ck_product_price CHECK (price > 0),
    CONSTRAINT ck_product_sale CHECK (original_price IS NULL OR original_price > price)
);
CREATE NONCLUSTERED INDEX ix_product_catalog ON dbo.product (category, created_at DESC) INCLUDE (price, original_price) WHERE active = 1;
CREATE NONCLUSTERED INDEX ix_product_model ON dbo.product (model_code);
GO

CREATE TABLE dbo.product_photo (
    photo_id    INT IDENTITY(1,1) NOT NULL,
    product_id  INT               NOT NULL,
    url         VARCHAR(500)      NOT NULL,
    alt_text    NVARCHAR(200)     NOT NULL,
    sort_order  TINYINT           NOT NULL,
    CONSTRAINT pk_product_photo PRIMARY KEY CLUSTERED (photo_id),
    CONSTRAINT fk_product_photo_product FOREIGN KEY (product_id) REFERENCES dbo.product (product_id),
    CONSTRAINT uq_product_photo_order UNIQUE (product_id, sort_order)
);
GO

-- PRO-06: size chart per category, as JSON ready for the screen.
CREATE TABLE dbo.size_guide (
    category  VARCHAR(12)    NOT NULL,
    content   NVARCHAR(MAX)  NOT NULL,
    CONSTRAINT pk_size_guide PRIMARY KEY CLUSTERED (category),
    CONSTRAINT ck_size_guide_category CHECK (category IN ('tshirts', 'pants', 'jackets', 'accessories')),
    CONSTRAINT ck_size_guide_json CHECK (ISJSON(content) = 1)
);
GO

-- E2, E3, E4, E9: product size with the double stock.
--   total_stock     total from the supplier invoice still in the warehouse
--   sale_stock      released for sale
--   reserved_stock  part of sale_stock held by payments in progress
--   available on the site = sale_stock - reserved_stock
--
-- A reservation is a single UPDATE that only succeeds if there is enough
-- stock; that, plus the CHECK below, is what prevents selling the same piece
-- twice at the last second:
--   UPDATE dbo.product_size
--      SET reserved_stock = reserved_stock + @n
--    WHERE product_size_id = @id AND sale_stock - reserved_stock >= @n;
--   (0 rows affected = not enough stock; roll back the transaction)
-- Approved payment: total_stock, sale_stock and reserved_stock go down by @n.
-- Expired reservation or declined payment: only reserved_stock goes down by @n.
CREATE TABLE dbo.product_size (
    product_size_id  INT IDENTITY(1,1) NOT NULL,
    public_id        UNIQUEIDENTIFIER  NOT NULL CONSTRAINT df_product_size_public DEFAULT NEWID(),
    product_id       INT               NOT NULL,
    size             VARCHAR(5)        NOT NULL,
    sort_order       TINYINT           NOT NULL CONSTRAINT df_product_size_order DEFAULT 0,  -- P, M, G, GG
    total_stock      INT               NOT NULL,
    sale_stock       INT               NOT NULL,
    reserved_stock   INT               NOT NULL CONSTRAINT df_product_size_reserved DEFAULT 0,
    damaged_stock    AS (total_stock - sale_stock),
    min_stock        INT               NULL,    -- internal restock alert (E9)
    CONSTRAINT pk_product_size PRIMARY KEY CLUSTERED (product_size_id),
    CONSTRAINT uq_product_size_public UNIQUE (public_id),
    CONSTRAINT uq_product_size UNIQUE (product_id, size),
    CONSTRAINT fk_product_size_product FOREIGN KEY (product_id) REFERENCES dbo.product (product_id),
    CONSTRAINT ck_product_size_not_negative CHECK (total_stock >= 0 AND sale_stock >= 0 AND reserved_stock >= 0),
    CONSTRAINT ck_product_size_sale CHECK (sale_stock <= total_stock),
    CONSTRAINT ck_product_size_reserved CHECK (reserved_stock <= sale_stock),
    CONSTRAINT ck_product_size_min CHECK (min_stock IS NULL OR min_stock > 0)
);
GO

-- E9, PRO-12: who asked to be told when the size is back in stock.
CREATE TABLE dbo.restock_alert (
    restock_alert_id  INT IDENTITY(1,1) NOT NULL,
    product_size_id   INT               NOT NULL,
    channel           VARCHAR(10)       NOT NULL,
    contact           NVARCHAR(150)     NOT NULL,
    created_at        DATETIME2(3)      NOT NULL CONSTRAINT df_restock_alert_created DEFAULT SYSUTCDATETIME(),
    notified_at       DATETIME2(3)      NULL,
    CONSTRAINT pk_restock_alert PRIMARY KEY CLUSTERED (restock_alert_id),
    CONSTRAINT fk_restock_alert_product_size FOREIGN KEY (product_size_id) REFERENCES dbo.product_size (product_size_id),
    CONSTRAINT ck_restock_alert_channel CHECK (channel IN ('email', 'whatsapp'))
);
-- One pending alert per contact and size.
CREATE UNIQUE NONCLUSTERED INDEX uq_restock_alert_pending ON dbo.restock_alert (product_size_id, channel, contact) WHERE notified_at IS NULL;
GO

-- E6
CREATE TABLE dbo.coupon (
    coupon_id         INT IDENTITY(1,1) NOT NULL,
    code              VARCHAR(20)       NOT NULL,
    discount_percent  DECIMAL(5,2)      NOT NULL,
    active            BIT               NOT NULL CONSTRAINT df_coupon_active DEFAULT 1,
    CONSTRAINT pk_coupon PRIMARY KEY CLUSTERED (coupon_id),
    CONSTRAINT uq_coupon_code UNIQUE (code),
    CONSTRAINT ck_coupon_percent CHECK (discount_percent BETWEEN 0 AND 70)
);
GO

/* ---------- Cart ---------- */

-- public_id is the secret the front end keeps in a cookie (SAC-06).
-- The details typed at checkout stay here until they become an order (CHK-05).
CREATE TABLE dbo.cart (
    cart_id        INT IDENTITY(1,1) NOT NULL,
    public_id      UNIQUEIDENTIFIER  NOT NULL CONSTRAINT df_cart_public DEFAULT NEWID(),
    customer_id    INT               NULL,    -- filled in when the lead is saved
    coupon_id      INT               NULL,    -- one coupon per purchase (SAC-15)
    delivery_type  VARCHAR(10)       NULL,
    name           NVARCHAR(100)     NULL,
    email          NVARCHAR(150)     NULL,
    verified_email NVARCHAR(150)     NULL,    -- confirmed with a code (IDT-03); no order without it (IDT-12)
    verified_at    DATETIME2(3)      NULL,
    phone          VARCHAR(15)       NULL,
    cep            CHAR(8)           NULL,
    street         NVARCHAR(100)     NULL,
    number         NVARCHAR(10)      NULL,
    complement     NVARCHAR(40)      NULL,
    neighborhood   NVARCHAR(60)      NULL,
    city           NVARCHAR(60)      NULL,
    state          CHAR(2)           NULL,
    created_at     DATETIME2(3)      NOT NULL CONSTRAINT df_cart_created DEFAULT SYSUTCDATETIME(),
    updated_at     DATETIME2(3)      NOT NULL CONSTRAINT df_cart_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_cart PRIMARY KEY CLUSTERED (cart_id),
    CONSTRAINT uq_cart_public UNIQUE (public_id),
    CONSTRAINT fk_cart_customer FOREIGN KEY (customer_id) REFERENCES dbo.customer (customer_id),
    CONSTRAINT fk_cart_coupon FOREIGN KEY (coupon_id) REFERENCES dbo.coupon (coupon_id),
    CONSTRAINT ck_cart_delivery CHECK (delivery_type IS NULL OR delivery_type IN ('courier', 'pac', 'sedex'))
);
GO

CREATE TABLE dbo.cart_item (
    cart_item_id     INT IDENTITY(1,1) NOT NULL,
    public_id        UNIQUEIDENTIFIER  NOT NULL CONSTRAINT df_cart_item_public DEFAULT NEWID(),
    cart_id          INT               NOT NULL,
    product_size_id  INT               NOT NULL,
    quantity         INT               NOT NULL,
    CONSTRAINT pk_cart_item PRIMARY KEY CLUSTERED (cart_item_id),
    CONSTRAINT uq_cart_item_public UNIQUE (public_id),
    CONSTRAINT uq_cart_item UNIQUE (cart_id, product_size_id),
    CONSTRAINT fk_cart_item_cart FOREIGN KEY (cart_id) REFERENCES dbo.cart (cart_id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_item_product_size FOREIGN KEY (product_size_id) REFERENCES dbo.product_size (product_size_id),
    CONSTRAINT ck_cart_item_quantity CHECK (quantity > 0)
);
GO

/* ---------- Order, reservation and payment ---------- */

-- E5. Name, contact and address are a copy of what was typed at purchase: the
-- invoice and the delivery do not change if the customer edits her account
-- later. payment_method and installments stay null until the customer
-- chooses (CHK-14).
CREATE TABLE dbo.customer_order (
    order_id          INT IDENTITY(1,1) NOT NULL,
    number            VARCHAR(12)       NOT NULL,   -- what the customer sees: HL-100482
    customer_id       INT               NOT NULL,
    cart_id           INT               NOT NULL,
    coupon_id         INT               NULL,       -- influencer tracking (E6)
    status            VARCHAR(22)       NOT NULL CONSTRAINT df_customer_order_status DEFAULT 'awaiting_payment',
    payment_status    VARCHAR(10)       NOT NULL CONSTRAINT df_customer_order_payment_status DEFAULT 'pending',
    payment_method    VARCHAR(6)        NULL,
    installments      TINYINT           NULL,
    products_amount   DECIMAL(10,2)     NOT NULL,
    discount_amount   DECIMAL(10,2)     NOT NULL CONSTRAINT df_customer_order_discount DEFAULT 0,
    shipping_amount   DECIMAL(10,2)     NOT NULL,
    total_amount      AS (CONVERT(DECIMAL(10,2), products_amount - discount_amount + shipping_amount)) PERSISTED,
    name              NVARCHAR(100)     NOT NULL,
    cpf               CHAR(11)          NOT NULL,
    email             NVARCHAR(150)     NOT NULL,
    phone             VARCHAR(15)       NOT NULL,
    cep               CHAR(8)           NOT NULL,
    street            NVARCHAR(100)     NOT NULL,
    address_number    NVARCHAR(10)      NOT NULL,
    complement        NVARCHAR(40)      NULL,
    neighborhood      NVARCHAR(60)      NOT NULL,
    city              NVARCHAR(60)      NOT NULL,
    state             CHAR(2)           NOT NULL,
    created_at        DATETIME2(3)      NOT NULL CONSTRAINT df_customer_order_created DEFAULT SYSUTCDATETIME(),
    paid_at           DATETIME2(3)      NULL,
    preparing_at      DATETIME2(3)      NULL,
    shipped_at        DATETIME2(3)      NULL,
    delivered_at      DATETIME2(3)      NULL,       -- start of the 7-day return period
    CONSTRAINT pk_customer_order PRIMARY KEY CLUSTERED (order_id),
    CONSTRAINT uq_customer_order_number UNIQUE (number),
    CONSTRAINT fk_customer_order_customer FOREIGN KEY (customer_id) REFERENCES dbo.customer (customer_id),
    CONSTRAINT fk_customer_order_cart FOREIGN KEY (cart_id) REFERENCES dbo.cart (cart_id),
    CONSTRAINT fk_customer_order_coupon FOREIGN KEY (coupon_id) REFERENCES dbo.coupon (coupon_id),
    CONSTRAINT ck_customer_order_status CHECK (status IN ('awaiting_payment', 'reservation_expired', 'payment_confirmed', 'preparing', 'shipped', 'delivered', 'support_in_progress')),
    CONSTRAINT ck_customer_order_payment_status CHECK (payment_status IN ('pending', 'approved', 'declined')),
    CONSTRAINT ck_customer_order_method CHECK (payment_method IS NULL OR payment_method IN ('pix', 'card')),
    -- up to 6 installments, minimum installment of R$ 50.00
    CONSTRAINT ck_customer_order_installments CHECK (installments IS NULL OR (installments BETWEEN 1 AND 6 AND (installments = 1 OR (products_amount - discount_amount + shipping_amount) / installments >= 50))),
    CONSTRAINT ck_customer_order_card_installments CHECK (payment_method <> 'card' OR installments IS NOT NULL),
    CONSTRAINT ck_customer_order_amounts CHECK (products_amount > 0 AND shipping_amount >= 0 AND discount_amount >= 0 AND discount_amount <= products_amount)
);
CREATE NONCLUSTERED INDEX ix_customer_order_customer ON dbo.customer_order (customer_id, created_at DESC);
CREATE NONCLUSTERED INDEX ix_customer_order_status ON dbo.customer_order (status, created_at);
GO

-- Name, color, size and price are copied: the order does not change if the product does.
CREATE TABLE dbo.order_item (
    order_item_id    INT IDENTITY(1,1) NOT NULL,
    order_id         INT               NOT NULL,
    product_size_id  INT               NOT NULL,
    name             NVARCHAR(100)     NOT NULL,
    color            NVARCHAR(30)      NOT NULL,
    size             VARCHAR(5)        NOT NULL,
    unit_price       DECIMAL(10,2)     NOT NULL,
    quantity         INT               NOT NULL,
    CONSTRAINT pk_order_item PRIMARY KEY CLUSTERED (order_item_id),
    CONSTRAINT uq_order_item UNIQUE (order_id, product_size_id),
    CONSTRAINT fk_order_item_order FOREIGN KEY (order_id) REFERENCES dbo.customer_order (order_id),
    CONSTRAINT fk_order_item_product_size FOREIGN KEY (product_size_id) REFERENCES dbo.product_size (product_size_id),
    CONSTRAINT ck_order_item CHECK (quantity > 0 AND unit_price > 0)
);
-- "Best sellers" sort order (CAT-09).
CREATE NONCLUSTERED INDEX ix_order_item_sales ON dbo.order_item (product_size_id) INCLUDE (quantity);
GO

-- E4: 15 minutes from the start of payment. A declined payment closes the
-- reservation as 'expired' right away.
CREATE TABLE dbo.reservation (
    reservation_id   INT IDENTITY(1,1) NOT NULL,
    order_id         INT               NOT NULL,
    product_size_id  INT               NOT NULL,
    quantity         INT               NOT NULL,
    reserved_at      DATETIME2(3)      NOT NULL CONSTRAINT df_reservation_start DEFAULT SYSUTCDATETIME(),
    expires_at       DATETIME2(3)      NOT NULL,
    status           VARCHAR(10)       NOT NULL CONSTRAINT df_reservation_status DEFAULT 'reserved',
    CONSTRAINT pk_reservation PRIMARY KEY CLUSTERED (reservation_id),
    CONSTRAINT fk_reservation_order FOREIGN KEY (order_id) REFERENCES dbo.customer_order (order_id),
    CONSTRAINT fk_reservation_product_size FOREIGN KEY (product_size_id) REFERENCES dbo.product_size (product_size_id),
    CONSTRAINT ck_reservation_status CHECK (status IN ('reserved', 'confirmed', 'expired')),
    CONSTRAINT ck_reservation_quantity CHECK (quantity > 0),
    CONSTRAINT ck_reservation_deadline CHECK (expires_at <= DATEADD(MINUTE, 15, reserved_at))
);
-- One open reservation per item of the order; this is what the expiration job scans.
CREATE UNIQUE NONCLUSTERED INDEX uq_reservation_open ON dbo.reservation (order_id, product_size_id) WHERE status = 'reserved';
CREATE NONCLUSTERED INDEX ix_reservation_to_expire ON dbo.reservation (expires_at) INCLUDE (order_id, product_size_id, quantity) WHERE status = 'reserved';
GO

-- Each payment attempt. Only gateway identifiers; nothing from the card.
CREATE TABLE dbo.payment (
    payment_id       INT IDENTITY(1,1) NOT NULL,
    public_id        UNIQUEIDENTIFIER  NOT NULL CONSTRAINT df_payment_public DEFAULT NEWID(),
    order_id         INT               NOT NULL,
    method           VARCHAR(6)        NOT NULL,
    installments     TINYINT           NULL,
    amount           DECIMAL(10,2)     NOT NULL,
    status           VARCHAR(10)       NOT NULL CONSTRAINT df_payment_status DEFAULT 'pending',
    gateway_id       VARCHAR(100)      NULL,
    pix_code         VARCHAR(600)      NULL,
    pix_expires_at   DATETIME2(3)      NULL,
    decline_message  NVARCHAR(200)     NULL,
    created_at       DATETIME2(3)      NOT NULL CONSTRAINT df_payment_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_payment PRIMARY KEY CLUSTERED (payment_id),
    CONSTRAINT uq_payment_public UNIQUE (public_id),
    CONSTRAINT fk_payment_order FOREIGN KEY (order_id) REFERENCES dbo.customer_order (order_id),
    CONSTRAINT ck_payment_method CHECK (method IN ('pix', 'card')),
    CONSTRAINT ck_payment_status CHECK (status IN ('pending', 'approved', 'declined'))
);
CREATE NONCLUSTERED INDEX ix_payment_order ON dbo.payment (order_id, payment_id DESC);
-- An order can have only one approved payment.
CREATE UNIQUE NONCLUSTERED INDEX uq_payment_approved ON dbo.payment (order_id) WHERE status = 'approved';
-- Confirmation coming from the gateway.
CREATE UNIQUE NONCLUSTERED INDEX uq_payment_gateway ON dbo.payment (gateway_id) WHERE gateway_id IS NOT NULL;
GO

/* ---------- Delivery, invoice and label ---------- */

-- E7
CREATE TABLE dbo.shipping (
    shipping_id    INT IDENTITY(1,1) NOT NULL,
    order_id       INT               NOT NULL,
    type           VARCHAR(10)       NOT NULL,
    amount         DECIMAL(10,2)     NOT NULL,   -- 0 when free
    delivery_days  INT               NOT NULL,   -- 0 = same day
    free           BIT               NOT NULL CONSTRAINT df_shipping_free DEFAULT 0,
    fallback       BIT               NOT NULL CONSTRAINT df_shipping_fallback DEFAULT 0,  -- fixed rate, shipping API was down
    tracking_code  VARCHAR(30)       NULL,
    CONSTRAINT pk_shipping PRIMARY KEY CLUSTERED (shipping_id),
    CONSTRAINT uq_shipping_order UNIQUE (order_id),
    CONSTRAINT fk_shipping_order FOREIGN KEY (order_id) REFERENCES dbo.customer_order (order_id),
    CONSTRAINT ck_shipping_type CHECK (type IN ('courier', 'pac', 'sedex')),
    CONSTRAINT ck_shipping_amount CHECK (amount >= 0 AND delivery_days >= 0)
);
GO

-- E12: each call to the shipping API, for the cost counter in the panel.
CREATE TABLE dbo.shipping_api_call (
    call_id    BIGINT IDENTITY(1,1) NOT NULL,
    cep        CHAR(8)              NOT NULL,
    fallback   BIT                  NOT NULL,
    called_at  DATETIME2(3)         NOT NULL CONSTRAINT df_shipping_api_call_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_shipping_api_call PRIMARY KEY CLUSTERED (call_id)
);
CREATE NONCLUSTERED INDEX ix_shipping_api_call_period ON dbo.shipping_api_call (called_at) INCLUDE (fallback);
GO

-- E14: the order only goes to preparing with an 'issued' invoice.
CREATE TABLE dbo.invoice (
    invoice_id     INT IDENTITY(1,1) NOT NULL,
    order_id       INT               NOT NULL,
    status         VARCHAR(10)       NOT NULL,
    access_key     CHAR(44)          NULL,
    error_message  NVARCHAR(500)     NULL,
    issued_at      DATETIME2(3)      NOT NULL CONSTRAINT df_invoice_issued DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_invoice PRIMARY KEY CLUSTERED (invoice_id),
    CONSTRAINT fk_invoice_order FOREIGN KEY (order_id) REFERENCES dbo.customer_order (order_id),
    CONSTRAINT ck_invoice_status CHECK (status IN ('issued', 'error'))
);
CREATE UNIQUE NONCLUSTERED INDEX uq_invoice_issued ON dbo.invoice (order_id) WHERE status = 'issued';
CREATE NONCLUSTERED INDEX ix_invoice_error ON dbo.invoice (issued_at) WHERE status = 'error';
GO

-- E8: one label per order; the row existing means "label created".
CREATE TABLE dbo.shipping_label (
    label_id       INT IDENTITY(1,1) NOT NULL,
    order_id       INT               NOT NULL,
    delivery_info  NVARCHAR(500)     NOT NULL,
    items_summary  NVARCHAR(1000)    NOT NULL,
    format         VARCHAR(10)       NOT NULL CONSTRAINT df_shipping_label_format DEFAULT 'thermal',
    created_at     DATETIME2(3)      NOT NULL CONSTRAINT df_shipping_label_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_shipping_label PRIMARY KEY CLUSTERED (label_id),
    CONSTRAINT uq_shipping_label_order UNIQUE (order_id),
    CONSTRAINT fk_shipping_label_order FOREIGN KEY (order_id) REFERENCES dbo.customer_order (order_id),
    CONSTRAINT ck_shipping_label_format CHECK (format IN ('thermal'))
);
GO

/* ---------- Returns and notifications ---------- */

-- E19: one request per order, even if rejected.
CREATE TABLE dbo.return_request (
    return_id     INT IDENTITY(1,1) NOT NULL,
    order_id      INT               NOT NULL,
    reason        VARCHAR(20)       NOT NULL,
    status        VARCHAR(15)       NOT NULL CONSTRAINT df_return_request_status DEFAULT 'requested',
    requested_at  DATETIME2(3)      NOT NULL CONSTRAINT df_return_request_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_return_request PRIMARY KEY CLUSTERED (return_id),
    CONSTRAINT uq_return_request_order UNIQUE (order_id),
    CONSTRAINT fk_return_request_order FOREIGN KEY (order_id) REFERENCES dbo.customer_order (order_id),
    CONSTRAINT ck_return_request_reason CHECK (reason IN ('wrong_size', 'defect', 'changed_mind', 'other')),
    CONSTRAINT ck_return_request_status CHECK (status IN ('requested', 'in_progress', 'completed', 'rejected'))
);
-- Triage tab in the panel.
CREATE NONCLUSTERED INDEX ix_return_request_triage ON dbo.return_request (requested_at) WHERE status = 'requested';
GO

-- E15: log of messages sent. The unique key prevents sending the same
-- notification twice for the same event.
CREATE TABLE dbo.notification (
    notification_id   INT IDENTITY(1,1) NOT NULL,
    order_id          INT               NULL,    -- confirmation and tracking
    restock_alert_id  INT               NULL,    -- back in stock
    type              VARCHAR(16)       NOT NULL,
    channel           VARCHAR(10)       NOT NULL,
    send_status       VARCHAR(10)       NOT NULL,
    sent_at           DATETIME2(3)      NOT NULL CONSTRAINT df_notification_sent DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_notification PRIMARY KEY CLUSTERED (notification_id),
    CONSTRAINT fk_notification_order FOREIGN KEY (order_id) REFERENCES dbo.customer_order (order_id),
    CONSTRAINT fk_notification_restock_alert FOREIGN KEY (restock_alert_id) REFERENCES dbo.restock_alert (restock_alert_id),
    CONSTRAINT ck_notification_type CHECK (type IN ('confirmation', 'tracking', 'back_in_stock')),
    CONSTRAINT ck_notification_channel CHECK (channel IN ('email', 'whatsapp')),
    CONSTRAINT ck_notification_send_status CHECK (send_status IN ('sent', 'failed')),
    CONSTRAINT ck_notification_source CHECK ((type = 'back_in_stock' AND restock_alert_id IS NOT NULL AND order_id IS NULL) OR (type <> 'back_in_stock' AND order_id IS NOT NULL AND restock_alert_id IS NULL))
);
CREATE UNIQUE NONCLUSTERED INDEX uq_notification_order ON dbo.notification (order_id, type, channel) WHERE order_id IS NOT NULL AND send_status = 'sent';
CREATE UNIQUE NONCLUSTERED INDEX uq_notification_restock_alert ON dbo.notification (restock_alert_id, channel) WHERE restock_alert_id IS NOT NULL AND send_status = 'sent';
GO

/* ---------- Tokens and idempotency ---------- */

-- 6-digit code sent to an e-mail (IDT-02 to IDT-05, CTA-01, CTA-06; owner's
-- decision of 2026-11-23). Stored only as an HMAC-SHA256 with a back-end
-- secret: a plain hash of 6 digits would be easy to reverse. Valid for 10
-- minutes and once; 5 wrong tries kill it; a new code replaces the pending one
-- (replaced_at). The limits of 5 codes per hour per e-mail and per IP count
-- rows by sent_at.
CREATE TABLE dbo.email_code (
    email_code_id  BIGINT IDENTITY(1,1) NOT NULL,
    email          NVARCHAR(150)        NOT NULL,
    code_hash      BINARY(32)           NOT NULL,
    wrong_tries    TINYINT              NOT NULL CONSTRAINT df_email_code_tries DEFAULT 0,
    request_ip     VARCHAR(45)          NULL,
    sent_at        DATETIME2(3)         NOT NULL CONSTRAINT df_email_code_sent DEFAULT SYSUTCDATETIME(),
    expires_at     DATETIME2(3)         NOT NULL,
    used_at        DATETIME2(3)         NULL,
    replaced_at    DATETIME2(3)         NULL,
    CONSTRAINT pk_email_code PRIMARY KEY CLUSTERED (email_code_id),
    CONSTRAINT ck_email_code_tries CHECK (wrong_tries BETWEEN 0 AND 5)
);
CREATE NONCLUSTERED INDEX ix_email_code_email_sent ON dbo.email_code (email, sent_at);
CREATE NONCLUSTERED INDEX ix_email_code_ip_sent ON dbo.email_code (request_ip, sent_at);
GO

-- Customer session, access link sent by e-mail, and access to one order
-- without an account. Only the SHA-256 of the token is stored; the original
-- value exists only in the cookie or in the e-mail. Since 2026-11-23 the store
-- signs in with the e-mail code (dbo.email_code); the 'link' type stays for
-- the contract's /v1/sessions/links, which the store no longer uses.
CREATE TABLE dbo.access_token (
    token_id     BIGINT IDENTITY(1,1) NOT NULL,
    type         VARCHAR(10)          NOT NULL,
    token_hash   BINARY(32)           NOT NULL,
    customer_id  INT                  NULL,
    order_id     INT                  NULL,
    created_at   DATETIME2(3)         NOT NULL CONSTRAINT df_access_token_created DEFAULT SYSUTCDATETIME(),
    expires_at   DATETIME2(3)         NOT NULL,
    used_at      DATETIME2(3)         NULL,    -- access link: single use
    revoked_at   DATETIME2(3)         NULL,    -- session ended
    CONSTRAINT pk_access_token PRIMARY KEY CLUSTERED (token_id),
    CONSTRAINT uq_access_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_access_token_customer FOREIGN KEY (customer_id) REFERENCES dbo.customer (customer_id),
    CONSTRAINT fk_access_token_order FOREIGN KEY (order_id) REFERENCES dbo.customer_order (order_id),
    CONSTRAINT ck_access_token_type CHECK (type IN ('session', 'link', 'order')),
    CONSTRAINT ck_access_token_owner CHECK ((type IN ('session', 'link') AND customer_id IS NOT NULL AND order_id IS NULL) OR (type = 'order' AND order_id IS NOT NULL AND customer_id IS NULL))
);
CREATE NONCLUSTERED INDEX ix_access_token_expires ON dbo.access_token (expires_at);
GO

-- CHK-22, DEV-07: repeating the same key returns the stored response.
CREATE TABLE dbo.idempotency_key (
    idempotency_key_id  BIGINT IDENTITY(1,1) NOT NULL,
    operation           VARCHAR(40)          NOT NULL,
    request_key         UNIQUEIDENTIFIER     NOT NULL,
    response_status     SMALLINT             NULL,    -- null while the first call is still running
    response_body       NVARCHAR(MAX)        NULL,
    created_at          DATETIME2(3)         NOT NULL CONSTRAINT df_idempotency_key_created DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_idempotency_key PRIMARY KEY CLUSTERED (idempotency_key_id),
    CONSTRAINT uq_idempotency_key UNIQUE (operation, request_key)
);
GO

/* ---------- Messages (outbox and inbox) ---------- */

-- Written in the same transaction as the business change (payment approved,
-- label created, stock back). A worker reads the pending rows with
-- WITH (UPDLOCK, READPAST, ROWLOCK) and triggers the invoice, e-mail and
-- WhatsApp. Sequential clustered key so many inserts do not fragment the table.
CREATE TABLE dbo.outbox_message (
    outbox_message_id  BIGINT IDENTITY(1,1) NOT NULL,
    event_id           UNIQUEIDENTIFIER     NOT NULL,
    aggregate_type     NVARCHAR(256)        NOT NULL,
    aggregate_id       NVARCHAR(256)        NOT NULL,
    event_type         NVARCHAR(256)        NOT NULL,
    payload            NVARCHAR(MAX)        NOT NULL,
    occurred_at        DATETIME2(7)         NOT NULL,
    processed_at       DATETIME2(7)         NULL,
    attempts           INT                  NOT NULL CONSTRAINT df_outbox_message_attempts DEFAULT 0,
    next_attempt_at    DATETIME2(7)         NULL,
    last_error         NVARCHAR(2000)       NULL,
    lock_id            UNIQUEIDENTIFIER     NULL,
    lock_expires_at    DATETIME2(7)         NULL,
    CONSTRAINT pk_outbox_message PRIMARY KEY CLUSTERED (outbox_message_id),
    CONSTRAINT uq_outbox_message_event UNIQUE NONCLUSTERED (event_id)
);
CREATE NONCLUSTERED INDEX ix_outbox_message_pending
    ON dbo.outbox_message (occurred_at)
    INCLUDE (event_id, event_type, attempts, next_attempt_at, lock_id, lock_expires_at)
    WHERE processed_at IS NULL;
GO

-- The consumer writes the event_id here in the same transaction in which it
-- acts; a repeated event violates the key and is discarded.
CREATE TABLE dbo.processed_message (
    event_id      UNIQUEIDENTIFIER NOT NULL,
    consumer      VARCHAR(60)      NOT NULL,
    processed_at  DATETIME2(3)     NOT NULL CONSTRAINT df_processed_message_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT pk_processed_message PRIMARY KEY CLUSTERED (event_id, consumer)
);
GO
