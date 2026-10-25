
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const path = require("path");
const dns = require("dns").promises;
const net = require("net");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const requiredVariables = ["DB_HOST", "DB_USER", "DB_NAME"];
const missingVariables = requiredVariables.filter(
    (name) => !process.env[name]
);

if (missingVariables.length) {
    throw new Error(
        `Missing required database configuration: ${missingVariables.join(", ")}`
    );
}

const dbHost = process.env.DB_HOST;
const dbPort = Number(process.env.DB_PORT || 3306);

if (!Number.isInteger(dbPort) || dbPort < 1 || dbPort > 65535) {
    throw new Error("Invalid DB_PORT configuration");
}

console.log("[DB DIAGNOSTIC] Host configured:", Boolean(dbHost));
console.log("[DB DIAGNOSTIC] Port configured:", dbPort);
console.log(
    "[DB DIAGNOSTIC] DB_PORT environment variable present:",
    Boolean(process.env.DB_PORT)
);

const db = mysql.createPool({
    host: dbHost,
    port: dbPort,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    ssl: {
        ca: process.env.DB_CA_CERT,
        rejectUnauthorized: true,
    },
    
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 15000,
});

async function diagnoseDatabaseConnection() {
    try {
        const addresses = await dns.lookup(dbHost, { all: true });
        console.log(
            "[DB DIAGNOSTIC] DNS OK:",
            addresses.map((entry) => entry.address).join(", ")
        );
    } catch (error) {
        console.error("[DB DIAGNOSTIC] DNS FAILED:", error.code, error.message);
        return;
    }

    await new Promise((resolve) => {
        const socket = net.createConnection({
            host: dbHost,
            port: dbPort,
        });

        let finished = false;

        const finish = (message, error) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            socket.destroy();

            if (error) {
                console.error(message, error.code, error.message);
            } else {
                console.log(message);
            }

            resolve();
        };

        const timer = setTimeout(() => {
            finish("[DB DIAGNOSTIC] TCP TIMEOUT");
        }, 10000);

        socket.once("connect", () => {
            finish("[DB DIAGNOSTIC] TCP CONNECT OK");
        });

        socket.once("error", (error) => {
            finish("[DB DIAGNOSTIC] TCP FAILED:", error);
        });
    });

    let connection;

    try {
        connection = await db.getConnection();
        await connection.ping();
        console.log("[DB DIAGNOSTIC] MySQL connection and ping OK");
    } catch (error) {
        console.error(
            "[DB DIAGNOSTIC] MYSQL FAILED:",
            error.code || "UNKNOWN",
            error.message
        );
    } finally {
        if (connection) connection.release();
    }
}

diagnoseDatabaseConnection().catch((error) => {
    console.error("[DB DIAGNOSTIC] Unexpected failure:", error.message);
});

module.exports = db;
