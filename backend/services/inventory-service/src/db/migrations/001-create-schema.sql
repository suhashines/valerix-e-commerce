-- Create the schema (namespace)
CREATE SCHEMA IF NOT EXISTS inventory;

-- Optional: Own the schema (adjust if needed)
-- ALTER SCHEMA inventory OWNER TO your_db_user;

-- Optional: Create enums for status/type (more strict than plain text)
CREATE TYPE inventory.inventory_reservation_status AS ENUM (
  'reserved',
  'committed',
  'released'
);

CREATE TYPE inventory.inventory_transaction_type AS ENUM (
  'reserve',
  'commit'
);

-- Table: inventory.products
CREATE TABLE IF NOT EXISTS inventory.products (
  product_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  stock_available INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- insert dummy products
INSERT INTO inventory.products (product_id, name, price, stock_available) VALUES
('77777777-7777-7777-7777-777777777777', 'Product A', 10.00, 100),
('88888888-8888-8888-8888-888888888888', 'Product B', 20.00, 50),
('99999999-9999-9999-9999-999999999999', 'Product C', 15.00, 75);

-- Table: inventory.inventory_reservations
CREATE TABLE IF NOT EXISTS inventory.inventory_reservations (
  reservation_id UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES inventory.products(product_id),
  quantity INT NOT NULL,
  status inventory.inventory_reservation_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: inventory.inventory_transactions
CREATE TABLE IF NOT EXISTS inventory.inventory_transactions (
  transaction_id UUID PRIMARY KEY,
  order_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES inventory.products(product_id),
  quantity INT NOT NULL,
  type inventory.inventory_transaction_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order_id
  ON inventory.inventory_reservations(order_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_order_id
  ON inventory.inventory_transactions(order_id);