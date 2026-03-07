const { Pool } = require("pg");


const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
});

async function connectDB() {

    console.log("connecting to database");

    await pool.query("SELECT 1");

    console.log("Postgres connected");
}

module.exports = {
    pool,
    connectDB
};