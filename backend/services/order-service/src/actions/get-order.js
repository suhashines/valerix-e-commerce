const db = require("../db/connection");
const { MoleculerError } = require("moleculer").Errors;

module.exports = {

    async handler(ctx) {

        const { id } = ctx.params;

        const order = await db.pool.query(
            `SELECT * FROM "order".orders WHERE order_id=$1`,
            [id]
        );

        if (!order.rows.length) {
            throw new MoleculerError("Order not found", 404);
        }

        const items = await db.pool.query(
            `SELECT * FROM "order".order_items WHERE order_id=$1`,
            [id]
        );

        return {
            ...order.rows[0],
            items: items.rows
        };
    }
};