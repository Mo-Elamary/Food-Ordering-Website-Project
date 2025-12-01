const express = require('express');
const db = require('./Data-Base/db_connection');
const path = require('path');
const bcrypt = require('bcrypt'); 
const cors = require('cors');

const app = express();
const PORT = 3000;
const saltRounds = 10; 

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
function isLoggedIn(req, res, next) {       
    if (req.headers['user-id']) {
        req.userId = req.headers['user-id']; 
        next();
    } else {
        res.status(401).json({ error: 'Unauthorised. Please log in.' });
    }
}

function isAdmin(req, res, next) {
    if (req.headers['is-admin'] === 'true') { 
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Admin rights required.' });
    }
}
// ===================================
// 1. API: التوثيق (Auth)
// ===================================   
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
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {       
        const [adminRows] = await db.query('SELECT * FROM admins WHERE email = ?', [email]);
        if (adminRows.length > 0) {
            const admin = adminRows[0];
            const isMatch = await bcrypt.compare(password, admin.password );
            if (isMatch || admin.password === password) { 
                return res.json({ 
                    success: true, 
                    user: { id: admin.admin_id, name: admin.full_name, email: admin.email, isAdmin: true, restaurant_id: admin.restaurant_id } 
                });
            }
        }    
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
// 2. API: المطاعم وقوائم الطعام
   
app.get('/api/restaurants', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT restaurant_id, name, description, location, image FROM restaurants');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching restaurants:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});
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
// 3. API: الطلبات (Orders)
// Middleware: التحقق من مسؤول المطعم
async function isRestaurantAdmin(req, res, next) {
    try {
        const adminId = req.headers['admin-id'];
        if (!adminId) {
            return res.status(401).json({ error: "Admin ID is missing from headers" });
        }
        const [rows] = await db.query(
            'SELECT admin_id, restaurant_id FROM admins WHERE admin_id = ?',
            [adminId]
        );
        if (rows.length === 0) {
            return res.status(403).json({  error: "Invalid admin account" });
        }
        req.restaurantId = rows[0].restaurant_id;
        next();
    } catch (err) {
        console.error("Error in isRestaurantAdmin middleware:", err.message);
        res.status(500).json({ error: "Server error in admin middleware" });
    }
}
app.post('/api/orders', isLoggedIn, async (req, res) => {
    try {
        const userId = parseInt(req.userId, 10);

        const { items, payment_method, restaurant_id, total_price } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty or invalid items.' });
        }
        if (!restaurant_id) {
            return res.status(400).json({ error: 'restaurant_id is required.' });
        }
        const [orderResult] = await db.query(
            'INSERT INTO orders (user_id, restaurant_id, total_price, status, payment_method, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [userId, restaurant_id, total_price || 0, 'Preparing', payment_method || 'Cash']
        );
        const orderId = orderResult.insertId;
        for (const it of items) {
            const dishId = it.dish_id || it.id || it.product_id;
            const qty = Number(it.quantity || it.qty || 1);
            const price = Number(it.price || it.unit_price || 0);
            if (!dishId) continue; 

            await db.query(
                'INSERT INTO order_items (order_id, dish_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, dishId, qty, price]
            );
        }
        res.json({ success: true, order_id: orderId });
    } catch (err) {
        console.error("Order creation error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
app.get('/api/restaurant/orders', isRestaurantAdmin, async (req, res) => {
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
// 5. تحديث حالة الطلب (Admin Action)
// PUT /api/orders/:id/status
app.put('/api/orders/:id/status', isRestaurantAdmin, async (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;
    const restaurantId = req.restaurantId;      
    const validStatuses = ['Preparing', 'On the way', 'Delivered'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid order status provided.' });
    }
    try {
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
// ---- Reviews APIs ----
app.post('/api/orders/:id/review', isLoggedIn, async (req, res) => {
    const orderId = parseInt(req.params.id, 10);
    const userId = parseInt(req.userId, 10);
    const { rating, comment } = req.body;

    if (!orderId || !userId) return res.status(400).json({ error: 'Invalid request.' });

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be an integer between 1 and 5.' });
    }

    try {      
        const [orderRows] = await db.query('SELECT * FROM orders WHERE order_id = ?', [orderId]);
        if (orderRows.length === 0) return res.status(404).json({ error: 'Order not found.' });
        const order = orderRows[0];
        if (order.user_id !== userId) return res.status(403).json({ error: 'You are not allowed to review this order.' });
        if (order.status !== 'Delivered') return res.status(400).json({ error: 'You can only review delivered orders.' });         
        const [existing] = await db.query('SELECT * FROM reviews WHERE order_id = ?', [orderId]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'This order has already been reviewed.' });
        }
        const restaurantId = order.restaurant_id;
        const [result] = await db.query(
            'INSERT INTO reviews (order_id, user_id, restaurant_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
            [orderId, userId, restaurantId, rating, comment || null]
        );

        res.json({ success: true, review_id: result.insertId, message: 'Review submitted successfully.' });
    } catch (err) {
        console.error('Error creating review:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/orders/:id/review  -> جلب الريفيو الخاص بالطلب (إن وُجد)
app.get('/api/orders/:id/review', isLoggedIn, async (req, res) => {
    const orderId = parseInt(req.params.id, 10);
    const userId = parseInt(req.userId, 10);

    if (!orderId) return res.status(400).json({ error: 'Invalid order id.' });

    try {
        const [rows] = await db.query(
            `SELECT r.*, u.full_name as user_name
             FROM reviews r
             JOIN users u ON r.user_id = u.user_id
             WHERE r.order_id = ?`,
            [orderId]
        );

        if (rows.length === 0) return res.json({ exists: false, review: null });

        const review = rows[0];
        if (review.user_id !== userId) {
            return res.status(403).json({ error: 'Not authorized to view this review.' });
        }

        res.json({ exists: true, review });
    } catch (err) {
        console.error('Error fetching review:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/admin/reviews  -> الأدمن يجلب كل التقييمات لمطعمه
app.get('/api/admin/reviews', isRestaurantAdmin, async (req, res) => {
    try {
        const restaurantId = req.restaurantId;
        const [rows] = await db.query(
            `SELECT r.review_id, r.order_id, r.rating, r.comment, r.created_at,
                    u.user_id, u.full_name as user_name, o.total_price
             FROM reviews r
             JOIN users u ON r.user_id = u.user_id
             JOIN orders o ON r.order_id = o.order_id
             WHERE r.restaurant_id = ?
             ORDER BY r.created_at DESC`,
            [restaurantId]
        );

        res.json({ success: true, reviews: rows });
    } catch (err) {
        console.error('Error fetching admin reviews:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});
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
// 4. API: لوحة التحكم (Admin)
// جلب جميع الطلبات للمطعم الخاص بالمسؤول
app.get('/api/admin/orders', isAdmin, async (req, res) => {
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
app.put('/api/admin/orders/:id/status', isAdmin, async (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;
    try {
        await db.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, orderId]);
        res.json({ success: true, message: `Order ${orderId} status updated to ${status}` });
    } catch (err) {
        console.error('Error updating order status:', err.message);
        res.status(500).json({ error: 'Server error.' });
    }
});
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
// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});