const { v4: uuid } = require("uuid");
const db = require("../db/connection");
const publisher = require("../messaging/publisher");

module.exports = {

    async handler(ctx) {

        const { user_id, items } = ctx.params;

        if (!user_id || !items || !items.length) {
            throw new Error("Invalid order payload");
        }

        const orderId = uuid();

        const client = await db.pool.connect();

        try {

            // first we need to validate the item quantities by invoking the inventory-service
            // if the inventory is sufficient, we can proceed to create the order with status "pending"
            

            await client.query("BEGIN");

            await client.query(
                `INSERT INTO "order".orders(order_id,user_id,status,total_amount)
                 VALUES($1,$2,'pending',0)`,
                [orderId, user_id]
            );

            for (const item of items) {

                await client.query(
                    `INSERT INTO "order".order_items
                     (id,order_id,product_id,quantity,price)
                     VALUES($1,$2,$3,$4,0)`,
                    [uuid(), orderId, item.product_id, item.quantity]
                );
            }

            await client.query("COMMIT");

            await publisher.publish("order.created", {
                order_id: orderId,
                items
            });

            return {
                order_id: orderId,
                status: "pending"
            };

        } catch (err) {

            await client.query("ROLLBACK");
            throw err;

        } finally {

            client.release();
        }
    }
};