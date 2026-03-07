# 1. Updated Backend Project Structure

```text
valerix-e-commerce
│
├── backend
│
│   ├── infra
│   │   └── docker-compose.yml
│
│   ├── services
│   │
│   │   ├── order-service
│   │   │   ├── Dockerfile
│   │   │   ├── package.json
│   │   │   ├── .env
│   │   │   ├── order-service.md
│   │   │   └── src
│   │   │
│   │   │       ├── index.js
│   │   │
│   │   │       ├── services
│   │   │       │   └── order.service.js
│   │   │
│   │   │       ├── actions
│   │   │       │   ├── create-order.js
│   │   │       │   ├── get-order.js
│   │   │       │   └── health.js
│   │   │
│   │   │       ├── events
│   │   │       │   ├── inventory-reserved.js
│   │   │       │   ├── payment-completed.js
│   │   │       │   └── inventory-commit.js
│   │   │
│   │   │       ├── db
│   │   │       │   ├── connection.js
│   │   │       │   ├── migrate.js
│   │   │       │   └── migrations
│   │   │       │       ├── 001_schema.sql
│   │   │       │       ├── 002_orders.sql
│   │   │       │       └── 003_order_items.sql
│   │   │
│   │   │       ├── messaging
│   │   │       │   ├── rabbitmq.js
│   │   │       │   └── publisher.js
│   │   │
│   │   │       └── utils
│   │   │           └── logger.js
│   │   │
│   │   ├── inventory-service
│   │   │   ├── Dockerfile
│   │   │   └── src
│   │   │       ├── services
│   │   │       ├── actions
│   │   │       ├── events
│   │   │       ├── db
│   │   │       │   └── migrations
│   │   │       └── messaging
│   │   │
│   │   ├── payment-service
│   │   │   ├── Dockerfile
│   │   │   └── src
│   │   │       ├── services
│   │   │       ├── actions
│   │   │       ├── db
│   │   │       │   └── migrations
│   │   │       └── messaging
│   │   │
│   │   └── notification-service
│   │
│   └── shared
│       ├── config
│       ├── constants
│       └── utils
│
└── README.md
```

Key ideas:

* each service **owns its schema + migrations**
* messaging handled via **RabbitMQ**
* shared code reusable via `/shared`

---

# 2. Backend Infrastructure Compose

Location:

```text
backend/infra/docker-compose.yml
```

Implementation:

```yaml
version: "3.9"

services:

  postgres:
    image: postgres:15.1-alpine
    container_name: valerix-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: valerix
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - valerix-network

  pgweb:
    image: sosedoff/pgweb:latest
    container_name: valerix-pgweb
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      PGWEB_DATABASE_URL: postgres://postgres:postgres@postgres:5432/valerix?sslmode=disable
    depends_on:
      - postgres
    networks:
      - valerix-network

  rabbitmq:
    image: rabbitmq:3-management
    container_name: valerix-rabbitmq
    restart: unless-stopped
    ports:
      - "5672:5672"
      - "15672:15672"
    networks:
      - valerix-network

volumes:
  postgres_data:

networks:
  valerix-network:
```

RabbitMQ UI:

```text
http://localhost:15672
guest / guest
```

pgweb UI:

```text
http://localhost:8081
```

---

# 3. Standard Microservice Folder Structure

Every service should follow this template:

```text
service-name
│
├── Dockerfile
├── package.json
├── .env
│
└── src
    │
    ├── index.js
    │
    ├── services
    │   └── main.service.js
    │
    ├── actions
    │
    ├── events
    │
    ├── db
    │   ├── connection.js
    │   ├── migrate.js
    │   └── migrations
    │
    ├── messaging
    │   ├── rabbitmq.js
    │   └── publisher.js
    │
    └── utils
```

---

# 4. `order-service.md`

Below is the **documentation file you requested**.

---

````markdown
# Order Service

The Order Service is the central orchestrator of the Valerix e-commerce platform.

It is responsible for:

- accepting orders
- validating order requests
- coordinating inventory reservation
- coordinating payment processing
- updating order status
- publishing events for downstream services

---

# Technology Stack

| Component | Technology |
|---|---|
Framework | Moleculer NodeJS |
Database | PostgreSQL |
Messaging | RabbitMQ |
Containerization | Docker |
Runtime | NodeJS |

---

# Setting Up the Order Service

## Initialize Project

```bash
mkdir order-service
cd order-service
npm init -y
````

Install dependencies:

```bash
npm install moleculer moleculer-web pg uuid amqplib dotenv
```

Project entrypoint:

```
src/index.js
```

---

# Database Design

The Order Service owns the **order schema** inside the shared PostgreSQL database.

Schema name:

```
order
```

---

## orders table

| field        | type      | description                         |
| ------------ | --------- | ----------------------------------- |
| order_id     | UUID      | primary key                         |
| user_id      | UUID      | user placing order                  |
| status       | ENUM      | pending / reserved / paid / shipped |
| total_amount | decimal   | order value                         |
| created_at   | timestamp | created time                        |
| updated_at   | timestamp | last update                         |

---

## order_items table

| field      | type    |
| ---------- | ------- |
| id         | UUID    |
| order_id   | UUID    |
| product_id | UUID    |
| quantity   | int     |
| price      | decimal |

---

## order_events table

Used for event auditing.

| field      | type      |
| ---------- | --------- |
| event_id   | UUID      |
| order_id   | UUID      |
| event_type | string    |
| payload    | JSON      |
| created_at | timestamp |

---

# API Endpoints

---

# POST /api/v1/orders

Create a new order.

Request:

```json
{
  "user_id": "uuid",
  "items": [
    { "product_id": "uuid", "quantity": 2 }
  ]
}
```

Response:

```json
{
  "order_id": "uuid",
  "status": "pending"
}
```

---

## Implementation Pseudocode

```
function createOrder(request):

 validate request payload

 generate order_id

 BEGIN TRANSACTION

 insert into order.orders

 for each item
   insert into order.order_items

 COMMIT

 publish event order.created

 return response
```

---

## Resiliency Patterns

### Transaction Safety

All inserts occur inside a single DB transaction.

```
BEGIN
INSERT order
INSERT items
COMMIT
```

Rollback occurs on error.

---

### Messaging Retry

When publishing event:

```
retry up to 3 times
```

If publishing fails:

```
log event to retry queue
```

---

# GET /api/v1/orders/{order_id}

Fetch order details.

Response:

```
{
 order_id,
 status,
 items:[]
}
```

Pseudocode:

```
function getOrder(id):

 query order.orders

 if not found
   return 404

 query order_items

 return order + items
```

---

# GET /api/v1/orders/health

Used by monitoring systems.

Checks:

* database connectivity
* rabbitmq connectivity

Response:

```
{
 status: "healthy"
}
```

If DB unreachable:

```
status: "unhealthy"
```

---

# Event Publishing

RabbitMQ exchange:

```
orders
```

Routing key:

```
order.created
```

Payload:

```
{
 order_id,
 items
}
```

Inventory service consumes this event.

---

# Event Consumers

The Order Service listens to several events.

---

## inventory.reserved

Triggered when inventory successfully reserves stock.

```
update order status = inventory_reserved

publish payment.requested
```

---

## payment.completed

Triggered when payment succeeds.

```
update order status = paid

publish order.shipped
```

---

## inventory.commit.success

Triggered when inventory confirms stock deduction.

```
update order status = shipped
```

---

# Error Handling Strategy

| Scenario         | Handling             |
| ---------------- | -------------------- |
| Database failure | rollback transaction |
| RabbitMQ failure | retry publish        |
| Invalid request  | return 400           |
| Order not found  | return 404           |

---

# Development Flow

Recommended development order:

1. Setup Moleculer service
2. Implement database connection
3. Implement migrations
4. Implement create order endpoint
5. Implement order retrieval
6. Implement event publishing
7. Implement event consumers
8. Implement health endpoint
9. Add logging and monitoring

---

# Service Startup Flow

```
start service
connect database
run migrations
connect rabbitmq
register consumers
start API server
```

---

# Responsibilities

Order Service **must not**:

* access inventory database
* access payment database

All communication occurs through **events or APIs**.

---

# Summary

The Order Service acts as the **workflow coordinator** of the Valerix platform.

It ensures:

* reliable order processing
* event driven coordination
* database consistency
* resiliency against partial failures

```

---

If you'd like, next I can also show you **the complete Moleculer implementation of `order.service.js` with RabbitMQ integration**, which will be the **actual code implementation of this documentation.**
```
