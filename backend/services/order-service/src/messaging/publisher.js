const rabbit = require("./rabbitmq");

async function publish(routingKey, payload,retries=3) {


    const channel = rabbit.channel;
    try {

        channel.publish(
            process.env.ORDER_EXCHANGE,
            routingKey,
            Buffer.from(JSON.stringify(payload)),
            { persistent: true }
        );

    } catch (err) {

        if (retries > 0) {
            console.log("Retry publish", retries);
            return publish(routingKey, payload, retries - 1);
        }

        console.error("Publish failed permanently", err);
    }
}

module.exports = {
    publish
};