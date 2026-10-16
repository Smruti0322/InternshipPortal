const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const requiredVariables = ["DB_HOST", "DB_USER", "DB_NAME"];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);
if (missingVariables.length) {
    throw new Error(`Missing required database configuration: ${missingVariables.join(", ")}`);
}

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

db.getConnection()
    .then((connection) => {
        console.log("MySQL connected successfully");
        connection.release();
    })
    .catch((error) => {
        console.error("MySQL connection error:", error);
    });

module.exports = db;
