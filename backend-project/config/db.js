const mysql = require('mysql2/promise');
require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'SAPTS',
    waitForConnections: true,
    connectionLimit: 10
};

let pool = null;

async function getConnection() {
    try {
        if (pool) return pool;
        pool = mysql.createPool(config);
        console.log('Connected to SAPTS database (MySQL)');
        return pool;
    } catch (err) {
        console.error('Database connection failed:', err);
        throw err;
    }
}

module.exports = { getConnection };
