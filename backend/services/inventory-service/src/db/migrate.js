/*
run node src/db/migrate.js

it will create schema and populate tables
*/

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("./connection");


async function migrate() {

    const dir = path.join(__dirname, "migrations");

    const files = fs.readdirSync(dir);

    for (const file of files) {

        const sql = fs.readFileSync(path.join(dir, file)).toString();

        console.log("running", file);

        await db.pool.query(sql);
    }

    console.log("migrations completed");

    process.exit();
}

migrate();