const { v4: uuid } = require("uuid");
const db = require("../db/connection");
const { publish } = require("../messaging/publisher");

/**
 * Handle an incoming order.created event.
 *
 * Payload shape:
 * {
 *   order_id: string,
 *   items: [ { product_id: string, quantity: number } ]
 * }
 */
async function handleOrderCreated(payload) {
    const { order_id, items } = payload || {};

    if (!order_id || !Array.isArray(items) || items.length === 0) {
        throw new Error("Invalid order.created payload");
    }

    const client = await db.pool.connect();
    try {
        await client.query("BEGIN");

        // Idempotent: ignore if we already have reservations for this order
        const { rowCount } = await client.query(
            "SELECT 1 FROM inventory.inventory_reservations WHERE order_id = $1 LIMIT 1",
            [order_id]
        );

        if (rowCount > 0) {
            await client.query("COMMIT");
            return { ignored: true, reason: "already reserved" };
        }

        for (const item of items) {
            const { product_id, quantity } = item;

            if (!product_id || !Number.isInteger(quantity) || quantity <= 0) {
                throw new Error("Invalid item in order.created payload");
            }

            const productRes = await client.query(
                "SELECT stock_available FROM inventory.products WHERE product_id = $1 FOR UPDATE",
                [product_id]
            );

            if (productRes.rowCount === 0) {
                throw new Error(`Product not found: ${product_id}`);
            }

            const stockAvailable = productRes.rows[0].stock_available;
            if (stockAvailable < quantity) {
                throw new Error(
                    `Not enough stock for product ${product_id} (requested ${quantity}, available ${stockAvailable})`
                );
            }

            // Deduct stock (reserved)
            await client.query(
                "UPDATE inventory.products SET stock_available = stock_available - $1 WHERE product_id = $2",
                [quantity, product_id]
            );

            // Record reservation and transaction
            await client.query(
                `INSERT INTO inventory.inventory_reservations
                    (reservation_id, order_id, product_id, quantity, status)
                 VALUES ($1, $2, $3, $4, 'reserved')`,
                [uuid(), order_id, product_id, quantity]
            );

            await client.query(
                `INSERT INTO inventory.inventory_transactions
                    (transaction_id, order_id, product_id, quantity, type)
                 VALUES ($1, $2, $3, $4, 'reserve')`,
                [uuid(), order_id, product_id, quantity]
            );
        }

        await client.query("COMMIT");

        await publish("inventory.reserved", { order_id, items });

        return { success: true };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    handleOrderCreated,
};
