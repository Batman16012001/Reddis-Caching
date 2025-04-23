const mysql = require("mysql2");
require("dotenv").config();

// const pool = mysql.createPool({
//     host: process.env.MYSQL_HOST,
//     port: process.env.MYSQL_PORT,
//     user: process.env.MYSQL_USER,
//     password: process.env.MYSQL_PASSWORD,
//     database: process.env.MYSQL_DATABASE,
//     waitForConnections: process.env.MYSQL_CONNECTION,                       // Ensures that if the connection pool reaches its limit (connectionLimit), new requests will wait for an available connection instead of failing immediately.
//     connectionLimit: process.env.MYSQL_CONNECTION_LIMIT,                    //Limits the number of simultaneous active connections in the pool to 10. Prevents excessive load on MySQL by capping the number of active database connections. Helps avoid exhausting MySQL resources when handling multiple requests.
//     queueLimit: process.env.MYSQL_QUEUE_LIMIT,                              //0 means unlimited queue size, meaning if all connections are busy, new requests will wait indefinitely instead of failing.
//     acquireTimeout: process.env.MYSQL_ACQUIRE_TIMEOUT,                      // Wait max 10s for connection
//     enableKeepAlive: process.env.MYSQL_ENABLE_KEEP_ALIVE,
//     keepAliveInitialDelay: process.env.MYSQL_KEEP_ALIVE_INITIAL_DELAY,      // Keep connection alive every 5 sec
// });
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,                       // Ensures that if the connection pool reaches its limit (connectionLimit), new requests will wait for an available connection instead of failing immediately.
    connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT),                    //Limits the number of simultaneous active connections in the pool to 10. Prevents excessive load on MySQL by capping the number of active database connections. Helps avoid exhausting MySQL resources when handling multiple requests.
    queueLimit: parseInt(process.env.MYSQL_QUEUE_LIMIT),                              //0 means unlimited queue size, meaning if all connections are busy, new requests will wait indefinitely instead of failing.
    // ssl: {
    //     rejectUnauthorized: true
    // }
});

const promisePool = pool.promise();

const connectMYSQLDB = async () => {
    try {
        const connection = await promisePool.getConnection();
        console.log("MySQL Database Connected Successfully!");
        connection.release();
    } catch (error) {
        console.error("MySQL Connection Error:", error.message);
        process.exit(1);
    }
};

pool.on('error', (err) => {
    console.error("MySQL Pool Error:", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
        console.log("Reconnecting to MySQL...");
        connectMYSQLDB(); // Reconnect if connection is lost
    }
});

module.exports = { connectMYSQLDB, promisePool };
