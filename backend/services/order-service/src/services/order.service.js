const createOrder = require("../actions/create-order");
const getOrder = require("../actions/get-order");
const health = require("../actions/health");

const inventoryReserved = require("../events/inventory-reserved");
const paymentCompleted = require("../events/payment-completed");
const inventoryCommit = require("../events/inventory-commit");

module.exports = {
    name: "orders",

    actions: {
        create: createOrder,
        get: getOrder,
        health: health
    },

    events: {
        "inventory.reserved": inventoryReserved,
        "payment.completed": paymentCompleted,
        "inventory.commit.success": inventoryCommit
    }
};