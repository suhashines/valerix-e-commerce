# Solution of [BUET CSE FEST HACKATHON 2026 DevOps Challenge](https://file.notion.so/f/f/c25e7a82-f4c8-476c-ba36-74f1a05948a7/7e32122f-93b8-4f50-8334-bfa7ed4b5bc9/Final_Round_Question.pdf?table=block&id=315c04f2-0477-808e-9f81-e21de98691a7&spaceId=c25e7a82-f4c8-476c-ba36-74f1a05948a7&expirationTimestamp=1772755200000&signature=DJn6wjSxvUvt81cflDAGW4byMb4kNTSCXDhYOG0XIX0&downloadName=Final+Round+Question.pdf)

## Backend Framework

- molecular nodejs

## application flow (saga pattern)

1. user views the product list
2. user selects products to order
3. user places the order
4. system processes the order
5. system reserves the stock
6. system sends order confirmation to the user
7. system handles payment processing
8. system updates order status (ready to ship)
9. system finally commits inventory 

**server** : /api/v1/*
where * represents the microservice name (inventory, order, payment, notification, alert)

## list of microservices

## 1. Inventory Service

- db: MongoDB

- tables:
    - products: { product_id, name, description, price, quantity }
    - inventory_logs: { log_id, product_id, change_type (soft/hard), change_amount, timestamp }

    - motivation:
    Keep the current quantity on the products table for fast reads (displaying to users).
Use the inventory_logs table for every single transaction to ensure the "source of truth" is always verifiable.

**api-endpoints:**

- GET /api/v1/inventory: Get the list of products with their current quantity and price

- PUT /api/v1/inventory : Update the inventory for a product (soft update for order processing, hard update for final inventory adjustment)

- body: 
```json
{ product_id, change_type (soft/hard), change_amount }
```

**Restrictions** :

So think about this -
In the real world, systems are messy.
Networks fail, services start, or restart later than expected, and there can
always be noisy neighbours (Yes, they are everywhere).
To try and tackle these issues, first, we will simulate them by introducing a
“gremlin Latency” - that is, your Inventory Service will sometimes delay its
response by several seconds.
This is how it will work -
● The Inventory service should sometimes show significant latency in a
predictable, deterministic pattern while responding to the Order Service.
● The Order service should continue to work smoothly even when this
happens. It should not keep waiting forever for a slow response.
If the Inventory service takes too long to reply, the Order service should stop
waiting and return a clear appropriate message to the user.
This was not part of the monolith but is now introduced to test the resilience of
your new architecture.
Your goal is to ensure that the Order Service can handle these delays
gracefully, returning timeouts or user-friendly error messages instead of crashing or hanging indefinitely.

## 2. Order Service

- db: MongoDB

- tables:
    - orders: { order_id, user_id, products [{ product_id, quantity }], total_amount, status (pending, processing, ready to ship, shipped), timestamp }
    - order_logs: { log_id, order_id, change_type (status update), change_amount, timestamp }

**api-endpoints**:

- POST /api/v1/order: Place a new order
- body:
```json
{ user_id, products [{ product_id, quantity }] }
```

- GET /api/v1/order/health: Check the health of the order service
- GET /api/v1/order/{order_id}: Get the details of an order
- GET /api/v1/order/user/{user_id}: Get the list of orders for a user

## 3. Payment Service

- db: MongoDB

- tables:
    - payments: { payment_id, order_id, user_id, amount, status (pending, completed, failed), timestamp }
    - payment_logs: { log_id, payment_id, change_type (status update), change_amount, timestamp }

**api-endpoints**:


- GET /api/v1/payment/health: Check the health of the payment service
- POST /api/v1/payment: Process a payment for an order
- body:
```json
{ order_id, user_id, amount }
```

## 4. Notification Service

- db: MongoDB

- tables:
    - notifications: { notification_id, user_id, message, status (unread, read), timestamp }

**api-endpoints**:

- GET /api/v1/notification/health: Check the health of the notification service
- POST /api/v1/notification: Send a notification to a user
- body:
```json
{ user_id, message }
``` 
- GET /api/v1/notification/user/{user_id}: Get the list of notifications for a user

## 5. Alert Service (monitoring, logging, alerting)

- db: MongoDB

## 6. User service

- db: MongoDB
- tables:
    - users: { user_id, name, email, password_hash, timestamp }

**api-endpoints**:

- GET /api/v1/user/health: Check the health of the user service
- POST /api/v1/login: Authenticate a user and return a token
- body:
```json
{ email, password }
``` 
- GET /api/v1/user/{user_id}: Get the details of a user


your next tasks are the following:

- based on your proposed architecture provide the following documentation in details for implementing each service:

1. **Database Schema**: Define the database schema for each microservice, including tables, fields, and relationships.

2. **API Endpoints**: List the API endpoints for each microservice, including HTTP methods, request/response formats. 

for each api endpoints explain the pseudocode for the implementation of the endpoint, including necessary business logic, resiliency patterns , message queue interactions, and error handling mechanisms.

3. suggest the flow of implementation for each microservice, including the order of development and integration points between services.


I think this design lacks the idea of decoupling, like backend shouldn't be cluttered in running all the sql scripts required to run for several backend services, this responsibility should be delegated to that appropriate service. 

for example, the order service should be responsible for running the sql scripts required for the order service, and the inventory service should be responsible for running the sql scripts required for the inventory service. This way, we can achieve better separation of concerns and make our system more modular and maintainable.

is it possible to do it without running separate db container for each services?




