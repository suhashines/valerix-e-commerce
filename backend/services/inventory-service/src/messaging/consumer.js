const rabbit = require("./rabbitmq");
const { handleOrderCreated } = require("../handlers/order-created");

const ORDER_EXCHANGE = process.env.ORDER_EXCHANGE || "orders";
const QUEUE_NAME = process.env.INVENTORY_ORDER_QUEUE || "inventory.order.created";
const ROUTING_KEY = process.env.ORDER_CREATED_ROUTING_KEY || "order.created";

async function startConsumer() {
    const channel = rabbit.channel;

    // Make the queue durable so it survives broker restarts.
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    // Bind to the order exchange for order.created events.
    await channel.bindQueue(QUEUE_NAME, ORDER_EXCHANGE, ROUTING_KEY);

    console.log(`Consuming ${ORDER_EXCHANGE}(${ROUTING_KEY}) -> ${QUEUE_NAME}`);

    await channel.consume(
        QUEUE_NAME,
        async (msg) => {
            if (!msg) return;

            try {
                const payload = JSON.parse(msg.content.toString());
                await handleOrderCreated(payload);
                channel.ack(msg);
            } catch (err) {
                console.error("Failed to process order.created event:", err);
                // Decide retry behavior: here we nack and requeue once.
                channel.nack(msg, false, false);
            }
        },
        { noAck: false }
    );
}

module.exports = {
    startConsumer,
};
