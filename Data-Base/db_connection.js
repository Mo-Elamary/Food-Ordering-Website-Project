// includes/db_connection.js
const mysql = require('mysql2/promise');    
const dbConfig = {
    host: 'localhost',        
    user: 'root',              
    password: 'Mo2172005@', 
    database: 'Food_Ordering_Website',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

pool.getConnection()
    .then(connection => {              
        console.log("Successfully connected to MySQL! (Node.js)"); 
        connection.release();
    })
    .catch(err => {
        console.error("Error connecting to MySQL:", err.message);
        process.exit(1); 
    });

module.exports = pool;