// includes/db_connection.js
const mysql = require('mysql2/promise');

// يرجى تعديل الإعدادات التالية
const dbConfig = {
    host: 'localhost',         // عادةً يكون 'localhost' إذا كانت قاعدة البيانات على نفس الجهاز
    user: 'root',              // اسم مستخدم MySQL الخاص بك
    password: 'Mo2172005@', // <<-- 🔑 يجب تغيير هذا
    database: 'Food_Ordering_Website', // اسم قاعدة البيانات الذي أنشأته في الخطوة الأولى
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

pool.getConnection()
    .then(connection => {
        // إذا ظهرت هذه الرسالة، فإن الاتصال ناجح!
        console.log("Successfully connected to MySQL! (Node.js)"); 
        connection.release();
    })
    .catch(err => {
        // إذا ظهرت رسالة خطأ هنا، تحقق من 'host', 'user', و 'password'
        console.error("Error connecting to MySQL:", err.message);
        process.exit(1); 
    });

module.exports = pool;