require("dotenv").config();

const { connectDB } = require("./db/connection");
const { connectRabbit } = require("./messaging/rabbitmq");
const { startConsumer } = require("./messaging/consumer");

async function start() {
    await connectDB();
    await connectRabbit();
    await startConsumer();

    console.log("Inventory service started");
}

start().catch((err) => {
    console.error("Failed to start inventory service", err);
    process.exit(1);
});
