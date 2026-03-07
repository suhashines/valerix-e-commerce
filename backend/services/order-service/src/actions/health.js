const db = require("../db/connection");
const rabbit = require("../messaging/rabbitmq");

module.exports = {

    async handler() {

        try {

            await db.pool.query("SELECT 1");

            if (!rabbit.channel) {
                throw new Error("RabbitMQ disconnected");
            }

            return {
                status: "healthy"
            };

        } catch (err) {

            return {
                status: "unhealthy",
                error: err.message
            };
        }
    }
};