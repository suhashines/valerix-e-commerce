const amqp = require("amqplib");

let connection;
let channel;

async function connectRabbit() {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    // Handle channel errors without crashing the process immediately.
    channel.on("error", (err) => {
        console.error("RabbitMQ channel error", err);
    });
    connection.on("error", (err) => {
        console.error("RabbitMQ connection error", err);
    });

    // The order service publishes into this exchange.
   await channel.assertExchange(
        process.env.INVENTORY_EXCHANGE || "inventory",
        "topic",
        { durable: true }
    );

    console.log("RabbitMQ connected");
}

module.exports = {
    connectRabbit,
    get channel() {
        return channel;
    },
};
