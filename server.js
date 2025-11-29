// server.js
const express = require('express');
const db = require('./Data-Base/db_connection');
const path = require('path');
const bcrypt = require('bcrypt'); // لتشفير كلمات المرور
const cors = require('cors');

const app = express();
const PORT = 3000;
const saltRounds = 10; // عدد مرات التشفير

// Middleware
app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname))); 
app.use('/views', express.static(path.join(__dirname, 'front-end'))); 
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Front-End', 'index.html'));
});

// ===================================
// وظائف المساعدة (Auth Middleware)
// ===================================
// دالة وهمية للتحقق من التوثيق (يجب استخدام JWTs في تطبيق حقيقي)
function isLoggedIn(req, res, next) {
    // نفترض أن العميل يرسل "user_id" في الـ Header للتحقق البسيط
    if (req.headers['user-id']) {
        req.userId = req.headers['user-id']; 
        next();
    } else {
        res.status(401).json({ error: 'Unauthorised. Please log in.' });
    }
}

function isAdmin(req, res, next) {
    // نفترض أن العميل يرسل "is_admin" في الـ Header (للتطبيق الأكاديمي)
    // في التطبيق الحقيقي يجب التحقق من الـ Database
    if (req.headers['is-admin'] === 'true') { 
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Admin rights required.' });
    }
}


// ===================================
// 1. API: التوثيق (Auth)
// ===================================

// تسجيل مستخدم جديد
app.post('/api/register', async (req, res) => {
    const { full_name, email, password, phone, address, date_of_birth, gender } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const [result] = await db.query(
            'INSERT INTO users (full_name, email, password, phone, address, date_of_birth, gender) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [full_name, email, hashedPassword, phone, address, date_of_birth, gender]
        );
        res.json({ success: true, user_id: result.insertId, message: 'Registration successful.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already exists.' });
        }
        console.error('Error during registration:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});

// تسجيل الدخول
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // تحقق إذا كان المستخدم مسؤول (Admin) أولاً
        const [adminRows] = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
        if (adminRows.length > 0) {
            const admin = adminRows[0];
            const isMatch = await bcrypt.compare(password, admin.password ); // افترض أننا لا نشفر كلمات مرور المسؤولين حالياً
            if (isMatch || admin.password === password) { // للمشروع الأكاديمي يمكن التحقق بدون تشفير مؤقتاً
                return res.json({ 
                    success: true, 
                    user: { id: admin.admin_id, name: admin.full_name, email: admin.email, isAdmin: true, restaurant_id: admin.restaurant_id } 
                });
            }
        }

        // تحقق من المستخدم العادي
        const [userRows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (userRows.length > 0) {
            const user = userRows[0];
            const isMatch = await bcrypt.compare(password, user.password);
            if (isMatch || user.password === password) {
                return res.json({ 
                    success: true, 
                    user: { id: user.user_id, name: user.full_name, email: user.email, isAdmin: false } 
                });
            }
        }
        
        res.status(401).json({ error: 'Invalid email or password.' });
    } catch (err) {
        console.error('Error during login:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});


// ===================================
// 2. API: المطاعم وقوائم الطعام
// ===================================

// جلب قائمة المطاعم
app.get('/api/restaurants', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT restaurant_id, name, description, location, image FROM restaurants');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching restaurants:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});

// جلب قائمة طعام مطعم معين
app.get('/api/restaurants/:id/dishes', async (req, res) => {
    const restaurantId = req.params.id;
    try {
        const [restaurantRows] = await db.query('SELECT name, description, image FROM restaurants WHERE restaurant_id = ?', [restaurantId]);
        
        const [dishes] = await db.query(
            `SELECT d.dish_id, d.name, d.description, d.price, d.image, c.name as category_name 
             FROM dishes d
             LEFT JOIN categories c ON d.category_id = c.category_id
             WHERE d.restaurant_id = ? 
             ORDER BY c.name, d.name`, 
            [restaurantId]
        );
        
        res.json({ restaurant: restaurantRows[0], menu: dishes });

    } catch (err) {
        console.error('Error fetching dishes:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ===================================
// 3. API: الطلبات (Orders)
// ===================================
/*
// إنشاء طلب جديد
app.post('/api/orders', isLoggedIn, async (req, res) => {
    const userId = req.userId; // من الـ Middleware
    const { restaurant_id, total_price, order_items, payment_method } = req.body;
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 1. إنشاء الطلب الرئيسي (orders)
        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, restaurant_id, total_price, status) VALUES (?, ?, ?, "Preparing")',
            [userId, restaurant_id, total_price]
        );
        const orderId = orderResult.insertId;

        // 2. إضافة تفاصيل الطلب (order_items)
        const items = order_items.map(item => [orderId, item.dish_id, item.quantity, item.price]);
        await connection.query(
            'INSERT INTO order_items (order_id, dish_id, quantity, price) VALUES ?',
            [items]
        );

        // 3. إضافة تفاصيل الدفع (payments)
        await connection.query(
            'INSERT INTO payments (order_id, payment_method, amount, payment_status) VALUES (?, ?, ?, "Pending")',
            [orderId, payment_method, total_price]
        );

        await connection.commit();
        res.json({ success: true, order_id: orderId, message: 'Order created successfully.' });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('Error creating order:', err.message);
        res.status(500).json({ error: 'Server error: Could not place order.' });
    } finally {
        if (connection) connection.release();
    }
});


// جلب طلبات المستخدم (Order History)
app.get('/api/users/orders', isLoggedIn, async (req, res) => {
    const userId = req.userId;
    try {
        const [orders] = await db.query(
            `SELECT o.order_id, r.name as restaurant_name, o.total_price, o.status, o.created_at 
             FROM orders o
             JOIN restaurants r ON o.restaurant_id = r.restaurant_id
             WHERE o.user_id = ? 
             ORDER BY o.created_at DESC`,
            [userId]
        );
        res.json(orders);
    } catch (err) {
        console.error('Error fetching user orders:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});

// جلب تفاصيل طلب محدد
app.get('/api/orders/:id/details', isLoggedIn, async (req, res) => {
    const orderId = req.params.id;
    try {
        const [orderRows] = await db.query(
            `SELECT o.*, r.name as restaurant_name 
             FROM orders o
             JOIN restaurants r ON o.restaurant_id = r.restaurant_id
             WHERE o.order_id = ?`, 
            [orderId]
        );
        const [items] = await db.query(
            `SELECT oi.quantity, oi.price, d.name as dish_name 
             FROM order_items oi
             JOIN dishes d ON oi.dish_id = d.dish_id
             WHERE oi.order_id = ?`,
            [orderId]
        );

        res.json({ order: orderRows[0], items: items });
    } catch (err) {
        console.error('Error fetching order details:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});

// جلب حالة الطلب فقط (لصفحة تتبع حالة الطلب)
app.get('/api/orders/:id/status', async (req, res) => {
    const orderId = req.params.id;
    try {
        const [rows] = await db.query('SELECT status, created_at FROM orders WHERE order_id = ?', [orderId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching order status:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});
*/
app.get('/api/restaurant/orders', isRestaurantAdmin, async (req, res) => {
    // ⚠️ يتم جلب الـ restaurantId من middleware التحقق من صلاحيات المطعم
    const restaurantId = req.restaurantId; 
    
    if (!restaurantId) {
        return res.status(401).json({ error: 'Admin is not associated with a restaurant.' });
    }

    try {
        const [orders] = await db.query(
            `SELECT 
                o.order_id, 
                o.total_price, 
                o.status, 
                o.created_at,
                u.full_name AS client_name,
                u.phone,
                u.address
            FROM orders o
            JOIN users u ON o.user_id = u.user_id
            WHERE o.restaurant_id = ? 
            ORDER BY o.created_at DESC`, 
            [restaurantId]
        );
        
        res.json(orders);
    } catch (err) {
        console.error('Error fetching restaurant orders:', err.message);
        res.status(500).json({ error: 'Server error while fetching restaurant orders.' });
    }
});

// ----------------------------------------------------------------------
// 5. تحديث حالة الطلب (Admin Action)
// ----------------------------------------------------------------------
// PUT /api/orders/:id/status
app.put('/api/orders/:id/status', isRestaurantAdmin, async (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;
    const restaurantId = req.restaurantId; 
    
    // التحقق من صلاحية الحالة الجديدة
    const validStatuses = ['Preparing', 'On the way', 'Delivered'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid order status provided.' });
    }

    try {
        // 🛡️ تحديث حالة الطلب مع التأكد من أن المطعم هو المالك للطلب
        const [result] = await db.query(
            `UPDATE orders 
             SET status = ? 
             WHERE order_id = ? AND restaurant_id = ?`, 
            [status, orderId, restaurantId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Order not found or unauthorized.' });
        }

        res.json({ success: true, message: 'Order status updated successfully.' });
    } catch (err) {
        console.error('Error updating order status:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ... (بقية نقاط اتصالك الحالية: جلب سجل طلبات المستخدم، تفاصيل طلب محدد، حالة الطلب) ...

app.get('/api/users/orders', isLoggedIn, async (req, res) => {
    const userId = req.userId;
    try {
        const [orders] = await db.query(
            `SELECT o.order_id, r.name as restaurant_name, o.total_price, o.status, o.created_at 
             FROM orders o
             JOIN restaurants r ON o.restaurant_id = r.restaurant_id
             WHERE o.user_id = ? 
             ORDER BY o.created_at DESC`,
            [userId]
        );
        res.json(orders);
    } catch (err) {
        console.error('Error fetching user orders:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});

// جلب تفاصيل طلب محدد
app.get('/api/orders/:id/details', isLoggedIn, async (req, res) => {
    const orderId = req.params.id;
    try {
        const [orderRows] = await db.query(
            `SELECT o.*, r.name as restaurant_name 
             FROM orders o
             JOIN restaurants r ON o.restaurant_id = r.restaurant_id
             WHERE o.order_id = ?`, 
            [orderId]
        );
        const [items] = await db.query(
            `SELECT oi.quantity, oi.price, d.name as dish_name 
             FROM order_items oi
             JOIN dishes d ON oi.dish_id = d.dish_id
             WHERE oi.order_id = ?`,
            [orderId]
        );

        res.json({ order: orderRows[0], items: items });
    } catch (err) {
        console.error('Error fetching order details:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});

// جلب حالة الطلب فقط (لصفحة تتبع حالة الطلب)
app.get('/api/orders/:id/status', async (req, res) => {
    const orderId = req.params.id;
    try {
        const [rows] = await db.query('SELECT status, created_at FROM orders WHERE order_id = ?', [orderId]);
        if (rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
        res.json(rows[0]);
    } catch (err) {
        console.error('Error fetching order status:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});


// ===================================
// 4. API: لوحة التحكم (Admin)
// ===================================

// جلب جميع الطلبات للمطعم الخاص بالمسؤول
app.get('/api/admin/orders', isAdmin, async (req, res) => {
    // نفترض أن restaurant_id للمسؤول يتم إرساله عبر الهيدر أو يتم جلبه من قاعدة البيانات بعد التوثيق
    const adminRestaurantId = req.headers['restaurant-id']; 
    if (!adminRestaurantId) return res.status(400).json({ error: 'Restaurant ID missing.' });

    try {
        const [orders] = await db.query(
            `SELECT o.order_id, u.full_name as customer_name, o.total_price, o.status, o.created_at 
             FROM orders o
             JOIN users u ON o.user_id = u.user_id
             WHERE o.restaurant_id = ?
             ORDER BY o.created_at DESC`,
            [adminRestaurantId]
        );
        res.json(orders);
    } catch (err) {
        console.error('Error fetching admin orders:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});

// تحديث حالة الطلب
app.put('/api/admin/orders/:id/status', isAdmin, async (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body; // يجب أن تكون "Preparing", " On the way", "Delivered"

    try {
        await db.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, orderId]);
        res.json({ success: true, message: `Order ${orderId} status updated to ${status}` });
    } catch (err) {
        console.error('Error updating order status:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});

// جلب تقارير المبيعات (مثال: إجمالي المبيعات والأكثر طلباً)
app.get('/api/admin/reports', isAdmin, async (req, res) => {
    const adminRestaurantId = req.headers['restaurant-id'];
    if (!adminRestaurantId) return res.status(400).json({ error: 'Restaurant ID missing.' });
    
    try {
        const [totalSales] = await db.query(
            'SELECT SUM(total_price) as total FROM orders WHERE restaurant_id = ? AND status = "Delivered"',
            [adminRestaurantId]
        );

        const [topDishes] = await db.query(
            `SELECT d.name, SUM(oi.quantity) as total_sold
             FROM order_items oi
             JOIN dishes d ON oi.dish_id = d.dish_id
             WHERE d.restaurant_id = ?
             GROUP BY d.name
             ORDER BY total_sold DESC
             LIMIT 5`,
            [adminRestaurantId]
        );

        res.json({
            success: true,
            report: {
                total_sales: totalSales[0].total || 0,
                top_dishes: topDishes,
            }
        });
    } catch (err) {
        console.error('Error generating reports:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});


// GET reviews
app.get('/api/reviews/:dishId', async (req, res) => {
    const dishId = req.params.dishId;

    const [reviews] = await db.query(`
        SELECT reviews.*, users.full_name AS name
        FROM reviews
        JOIN users ON users.user_id = reviews.user_id
        WHERE dish_id = ?
        ORDER BY created_at DESC
    `, [dishId]);

    res.json({ success: true, reviews });
});


// POST add review
app.post('/api/reviews', async (req, res) => {
    const { user_id, dish_id, rating, comment } = req.body;

    try {
        await db.query(
            'INSERT INTO reviews (user_id, dish_id, rating, comment) VALUES (?, ?, ?, ?)',
            [user_id, dish_id, rating, comment]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.json({ success: false, error: "Database error" });
    }
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});



