const amqp = require("amqplib");

let connection;
let channel;

async function connectRabbit() {

    connection = await amqp.connect(process.env.RABBITMQ_URL);

    channel = await connection.createChannel();

    await channel.assertExchange(
        process.env.ORDER_EXCHANGE,
        "topic",
        { durable: true }
    );

    console.log("RabbitMQ connected");
}

module.exports = {
    connectRabbit,
    get channel() {
        return channel;
    }
};