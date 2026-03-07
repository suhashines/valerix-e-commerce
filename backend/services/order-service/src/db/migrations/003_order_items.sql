CREATE TABLE IF NOT EXISTS "order".order_items (

id UUID PRIMARY KEY,
order_id UUID REFERENCES "order".orders(order_id),
product_id UUID,
quantity INT,
price DECIMAL

);

-- insert sample data
INSERT INTO "order".order_items (id, order_id, product_id, quantity, price) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '77777777-7777-7777-7777-777777777777', 2, 50.00),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', 1, 200.00),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', '99999999-9999-9999-9999-999999999999', 3, 50.00);