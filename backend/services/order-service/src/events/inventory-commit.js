const db = require("../db/connection");

module.exports = async function(ctx) {

    const { order_id } = ctx.params;

    await db.pool.query(
        `UPDATE "order".orders
         SET status='shipped'
         WHERE order_id=$1`,
        [order_id]
    );
};