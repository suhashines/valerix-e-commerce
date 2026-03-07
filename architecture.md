## Services covered:

```
API Gateway
Order Service
Inventory Service
Payment Service
Notification Service
User Service
Monitoring / Alert Service
```

---

# 1. Order Service

This is the **orchestrator service**.

Responsibilities:

* accept order
* coordinate inventory reservation
* coordinate payment
* track order status
* publish events

---

# Database Schema (PostgreSQL / Mongo)

### orders

| field        | type      | description                                                         |
| ------------ | --------- | ------------------------------------------------------------------- |
| order_id     | UUID      | primary key                                                         |
| user_id      | UUID      | reference to user                                                   |
| status       | ENUM      | pending, inventory_reserved, payment_pending, paid, shipped, failed |
| total_amount | decimal   | order cost                                                          |
| created_at   | timestamp | creation                                                            |
| updated_at   | timestamp | update                                                              |

---

### order_items

| field      | type    |
| ---------- | ------- |
| id         | UUID    |
| order_id   | UUID    |
| product_id | UUID    |
| quantity   | int     |
| price      | decimal |

---

### order_events

For auditing.

| field      | type      |
| ---------- | --------- |
| event_id   | UUID      |
| order_id   | UUID      |
| event_type | string    |
| payload    | json      |
| created_at | timestamp |

---

# API Endpoints

---

# POST /api/v1/orders

Create order.

### Request

```json
{
 "user_id":"uuid",
 "items":[
   {"product_id":"uuid","quantity":2}
 ]
}
```

---

### Response

```
201 CREATED
{
 "order_id":"uuid",
 "status":"pending"
}
```

---

### Pseudocode

```
function createOrder(request):

  validate request

  order_id = generateUUID()

  BEGIN TRANSACTION

  insert into orders(status="pending")

  insert order_items

  COMMIT

  publish event ORDER_CREATED
     payload = {order_id, items}

  return success
```

---

### Message Queue Event

```
topic: order.created
```

Inventory service consumes.

---

### Error Handling

```
if DB error
   return 500

if queue publish fails
   retry 3 times
   else log event for retry worker
```

---

# GET /api/v1/orders/{order_id}

Fetch order.

---

### Pseudocode

```
function getOrder(order_id):

  order = query orders

  if not found
     return 404

  items = query order_items

  return order + items
```

---

# GET /api/v1/orders/health

Health check.

### Pseudocode

```
function health():

  if database not reachable
     return unhealthy

  if kafka not reachable
     return degraded

  return healthy
```

---

# Event Consumers

Order service listens to events.

---

### inventory.reserved

```
function onInventoryReserved(event):

  order = find order

  update order status = inventory_reserved

  publish payment.requested
```

---

### payment.completed

```
function onPaymentCompleted(event):

 update order status = paid

 publish order.shipped
```

---

### inventory.commit.success

```
update order status = shipped
```

---

---

# 2. Inventory Service

Responsible for:

* stock management
* reservation
* commit deduction
* idempotency

This service introduces **latency simulation**.

---

# Database Schema

(PostgreSQL recommended)

---

### products

| field           | type      |
| --------------- | --------- |
| product_id      | UUID      |
| name            | text      |
| price           | decimal   |
| stock_available | int       |
| created_at      | timestamp |

---

### inventory_reservations

| field          | type                        |
| -------------- | --------------------------- |
| reservation_id | UUID                        |
| order_id       | UUID                        |
| product_id     | UUID                        |
| quantity       | int                         |
| status         | reserved/committed/released |

---

### inventory_transactions

| field          | type           |
| -------------- | -------------- |
| transaction_id | UUID           |
| order_id       | UUID           |
| product_id     | UUID           |
| quantity       | int            |
| type           | reserve/commit |
| created_at     | timestamp      |

This table ensures **idempotency**.

---

# API Endpoints

---

# GET /api/v1/inventory/products

Return products.

---

### Pseudocode

```
products = select * from products

return products
```

---

# listen to the event of `"order_exchange"` with routing key `"order.created"` and proceed to reserve stock.
---

### Pseudocode

```
function reserveStock(request):

 simulateGremlinLatency()

 BEGIN TRANSACTION

 if reservation exists for order_id
     return success  // idempotency

 for each item

   product = select product FOR UPDATE

   if product.stock_available < quantity
       return failure

   update product.stock_available -= quantity

   insert inventory_reservation

 COMMIT

 publish inventory.reserved event
```

---

### Gremlin Latency

```
counter++

if counter % 5 == 0
   sleep(5 seconds)
```

This creates deterministic delay.

---

### Error Handling

```
if DB error
 rollback

if insufficient stock
 publish inventory.failed
```

---

# POST /api/v1/inventory/commit

Called when order ships.

---

### Pseudocode

```
function commitInventory(order_id):

 BEGIN TRANSACTION

 reservations = find by order_id

 if already committed
     return success

 mark reservations committed

 insert transaction log

 COMMIT

 publish inventory.commit.success
```

---

# Schrödinger Protection

Even if crash occurs after commit:

Order service retry → idempotent check prevents double deduction.

---

# GET /api/v1/inventory/health

```
check DB connection
check queue connection
```

---

# 3. Payment Service

Handles payments.

---

# Database Schema

---

### payments

| field      | type                     |
| ---------- | ------------------------ |
| payment_id | UUID                     |
| order_id   | UUID                     |
| user_id    | UUID                     |
| amount     | decimal                  |
| status     | pending/completed/failed |
| created_at | timestamp                |

---

# Event Consumer

Payment listens to:

```
payment.requested
```

---

### Pseudocode

```
function processPayment(event):

 create payment record

 simulate payment processing

 if success
     update status completed
     publish payment.completed

 else
     update status failed
     publish payment.failed
```

---

# API Endpoint

### GET /api/v1/payment/{order_id}

```
return payment status
```

---

# Health Endpoint

```
check DB
```

---

# 4. Notification Service

Simple service.

---

# Database Schema

### notifications

| field      | type      |
| ---------- | --------- |
| id         | UUID      |
| user_id    | UUID      |
| message    | text      |
| created_at | timestamp |

---

# Event Consumers

```
order.shipped
payment.failed
inventory.failed
```

---

### Pseudocode

```
function sendNotification(event):

 message = build message

 insert notification

 send email/websocket
```

---

# API

### GET /api/v1/notifications/{user_id}

```
return notifications
```

---

# 5. User Service

---

# Schema

### users

| field         | type |
| ------------- | ---- |
| user_id       | UUID |
| name          | text |
| email         | text |
| password_hash | text |

---

# API

### POST /login

```
validate credentials
return JWT
```

---

# 6. Alert / Monitoring Service

Monitoring stack:

```
Prometheus
Grafana
```

---

# Metrics

Order service exports:

```
order_response_time
order_success_rate
inventory_latency
```

---

### Response Time Monitoring

Prometheus rule:

```
avg(order_response_time[30s]) > 1s
```

Trigger alert.

Dashboard changes RED.

This matches requirement.

---

# 7. Event Topics

Message queue topics.

```
order.created
inventory.reserved
inventory.failed
payment.requested
payment.completed
payment.failed
order.shipped
inventory.commit.success
```

---

# 8. API Gateway

Responsibilities:

```
authentication
routing
rate limiting
```

Routes:

```
/orders -> order service
/products -> inventory
/payments -> payment
```

---

# 9. Service Resilience Patterns

---

# Timeout

Order → Inventory

```
timeout = 1 second
```

---

# Retry

```
retry = 2 attempts
```

---

# Circuit Breaker

If 50% requests fail:

```
open circuit 10 seconds
```

Return fallback response.

---

# 10. CI/CD Load Test Pipeline

Pipeline steps.

```
build docker images
start containers
run load test
verify results
```

Load test tool:

```
k6
```

Script:

```
1000 concurrent order requests
```

Expected result:

```
some timeout
system continues functioning
```

---

# 11. Implementation Flow (Important for Hackathon)

This is the **optimal build order**.

---

# Step 1

Build **Inventory Service**

Why first?

Other services depend on stock.

Implement:

```
products table
reserve endpoint
health endpoint
```

---

# Step 2

Build **Order Service**

Implement:

```
create order
consume inventory events
```

Test basic flow.

---

# Step 3

Add **Message Queue**

Integrate:

```
order.created
inventory.reserved
```

---

# Step 4

Add **Payment Service**

Connect:

```
payment.requested
payment.completed
```

---

# Step 5

Add **Notification Service**

Consume events.

---

# Step 6

Add **Resilience**

Implement:

```
timeout
retry
circuit breaker
```

---

# Step 7

Implement **Gremlin Latency**

Inside inventory.

---

# Step 8

Add **Monitoring**

Deploy:

```
Prometheus
Grafana
```

---

# Step 9

Add **Load Test Pipeline**

Run:

```
k6
```

---

# Step 10

Deploy to cloud

Use:

```
Docker
Kubernetes
AWS / GCP
```

---

# Final Architecture

```
Client
  |
API Gateway
  |
Order Service
  |
Kafka
  |
Inventory Service
Payment Service
Notification Service

Monitoring
Prometheus + Grafana
```

---

If you'd like, I can also show **three extremely powerful tricks** that can make your hackathon solution **stand out from every other team**:

* **Outbox Pattern** (solves message loss completely)
* **Chaos Engineering script for demo**
* **A perfect architecture diagram judges love**

These can easily give you a **top-3 finish in this hackathon.**
