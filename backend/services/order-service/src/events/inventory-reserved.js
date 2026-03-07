const db = require("../db/connection");
const publisher = require("../messaging/publisher");

module.exports = async function(ctx) {

    const { order_id } = ctx.params;

    await db.pool.query(
        `UPDATE "order".orders
         SET status='reserved'
         WHERE order_id=$1`,
        [order_id]
    );

    await publisher.publish("payment.requested", { order_id });
};