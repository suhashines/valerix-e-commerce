require("dotenv").config();

const { ServiceBroker } = require("moleculer");
const ApiGateway = require("moleculer-web");

const orderService = require("./services/order.service");
const logger = require("./utils/logger");
const { connectDB } = require("./db/connection");
const { connectRabbit } = require("./messaging/rabbitmq");

async function start() {

    await connectDB();
    await connectRabbit();

    const broker = new ServiceBroker({
        nodeID: process.env.SERVICE_NAME || "order-service",
        logger: "Console"
    });

    broker.createService(ApiGateway, {
        settings: {
            port: process.env.PORT || 3000,
            routes: [
                {
                    path: "/api/v1",
                    aliases: {
                        "POST orders": "orders.create",
                        "GET orders/:id": "orders.get",
                        "GET orders/health": "orders.health"
                    },
                    bodyParsers: {
                        json: true
                    }
                }
            ]
        }
    });

    broker.createService(orderService);

    await broker.start();
}

start();