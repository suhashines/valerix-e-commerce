const rabbit = require("./rabbitmq");

async function publish(routingKey, payload, retries = 3) {
    const channel = rabbit.channel;
    try {
        channel.publish(
            process.env.INVENTORY_EXCHANGE || "inventory",
            routingKey,
            Buffer.from(JSON.stringify(payload)),
            { persistent: true }
        );
    } catch (err) {
        if (retries > 0) {
            console.log("Retry publish", routingKey, retries);
            return publish(routingKey, payload, retries - 1);
        }
        console.error("Publish failed permanently", err);
        throw err;
    }
}

module.exports = {
    publish,
};
