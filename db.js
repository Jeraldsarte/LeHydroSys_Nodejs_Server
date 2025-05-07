const mysql = require('mysql2');
require('dotenv').config();

// Create a database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Connect to the database
db.connect(err => {
    if (err) {
        console.error('❌ Database connection failed:', err);
        throw err;
    }
    console.log('✅ Connected to MySQL database.');
});

// Function to test the database connection
function testDbConnection() {
    return new Promise((resolve, reject) => {
        db.ping(err => {
            if (err) {
                console.error('❌ Database ping failed:', err);
                reject(err);
            } else {
                console.log('✅ Database ping successful.');
                resolve();
            }
        });
    });
}

// Export the database connection and test function
module.exports = {
    db,
    testDbConnection
};