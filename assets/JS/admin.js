/*
// assets/js/admin.js
document.addEventListener('DOMContentLoaded', () => {
    // توجيه المستخدمين غير المسؤولين
    checkAdminAccess();
    
    const path = window.location.pathname;
    
    if (path.includes('admin.html')) {
        loadAdminDashboard();
    } else if (path.includes('admin-orders.html')) {
        loadAdminOrders();
    } else if (path.includes('admin-reports.html')) {
        loadAdminReports();
    }

    document.getElementById('admin-logout')?.addEventListener('click', handleAdminLogout);
});

const user = JSON.parse(localStorage.getItem('user'));
const restaurantId = user ? user.restaurant_id : null;
const adminHeaders = {
    'is-admin': 'true',
    'restaurant-id': restaurantId,
    'Content-Type': 'application/json'
};

function checkAdminAccess() {
    if (!user || !user.isAdmin) {
        alert('وصول غير مصرح به. يرجى تسجيل الدخول كمسؤول.');
        window.location.href = '/views/login.html';
    } else {
        document.getElementById('admin-name').textContent = user.name;
    }
}

function handleAdminLogout() {
    localStorage.removeItem('user');
    window.location.href = '/views/login.html';
}

async function loadAdminDashboard() {
    // جلب التقارير لاستخدامها في لوحة التحكم الرئيسية
    try {
        const response = await fetch('/api/admin/reports', { headers: adminHeaders });
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('total-sales-amount').textContent = `${data.report.total_sales.toFixed(2)} ج.م`;
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }
    
    // جلب آخر الطلبات
    loadAdminOrders(true); // جلب 5 طلبات فقط للعرض السريع
}

async function loadAdminOrders(isDashboard = false) {
    const body = document.getElementById(isDashboard ? 'latest-orders-body' : 'admin-orders-body');
    if (!body) return;
    body.innerHTML = '<tr><td colspan="6">جاري تحميل الطلبات...</td></tr>';
    
    try {
        const url = `/api/admin/orders`;
        const response = await fetch(url, { headers: { ...adminHeaders, 'is-dashboard': isDashboard } });
        const orders = await response.json();

        body.innerHTML = '';
        if (orders.length === 0) {
            body.innerHTML = '<tr><td colspan="6">لا توجد طلبات حالياً.</td></tr>';
            return;
        }

        orders.forEach(order => {
            const row = body.insertRow();
            row.innerHTML = `
                <td>${order.order_id}</td>
                <td>${order.customer_name}</td>
                <td>${(Number(order.total_price) || 0).toFixed(2)} ج.م</td>
                <td><span style="color: ${order.status === 'Delivered' ? 'green' : (order.status.includes('way') ? 'blue' : 'orange')}">${order.status}</span></td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                    ${!isDashboard ? `
                    <select class="status-select" data-order-id="${order.order_id}">
                        <option value="Preparing" ${order.status === 'Preparing' ? 'selected' : ''}>قيد الإعداد</option>
                        <option value=" On the way" ${order.status.includes('way') ? 'selected' : ''}>في الطريق</option>
                        <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>تم التوصيل</option>
                    </select>` : `<a href="/views/order-details.html?id=${order.order_id}">التفاصيل</a>`}
                </td>
            `;
        });
        
        if (!isDashboard) {
            document.querySelectorAll('.status-select').forEach(select => {
                select.addEventListener('change', handleStatusUpdate);
            });
        }

    } catch (error) {
        console.error('Error fetching admin orders:', error);
        body.innerHTML = '<tr><td colspan="6" style="color: red;">خطأ في جلب بيانات الطلبات.</td></tr>';
    }
}

async function handleStatusUpdate(e) {
    const orderId = e.target.getAttribute('data-order-id');
    const newStatus = e.target.value;
    
    try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: adminHeaders,
            body: JSON.stringify({ status: newStatus })
        });
        const result = await response.json();

        if (result.success) {
            alert(`تم تحديث حالة الطلب ${orderId} إلى ${newStatus}`);
            // يمكن إعادة تحميل الجدول هنا
            loadAdminOrders(false); 
        } else {
            alert(result.error || 'فشل تحديث الحالة.');
        }
    } catch (error) {
        alert('خطأ في الاتصال بالخادم أثناء التحديث.');
    }
}

async function loadAdminReports() {
    const revenueSpan = document.getElementById('total-revenue');
    const dishesBody = document.getElementById('top-dishes-body');
    if (!revenueSpan || !dishesBody) return;
    
    revenueSpan.textContent = '... جاري التحميل';
    dishesBody.innerHTML = '<tr><td colspan="2">جاري تحميل التقارير...</td></tr>';

    try {
        const response = await fetch('/api/admin/reports', { headers: adminHeaders });
        const data = await response.json();

        if (data.success) {
            revenueSpan.textContent = `${data.report.total_sales.toFixed(2)} ج.م`;
            dishesBody.innerHTML = '';
            
            data.report.top_dishes.forEach(dish => {
                const row = dishesBody.insertRow();
                row.innerHTML = `<td>${dish.name}</td><td>${dish.total_sold}</td>`;
            });
            if (data.report.top_dishes.length === 0) {
                 dishesBody.innerHTML = '<tr><td colspan="2">لا توجد مبيعات مسلّمة بعد.</td></tr>';
            }
        } else {
            alert(data.error || 'فشل في جلب التقارير.');
        }
    } catch (error) {
        console.error('Error fetching reports:', error);
        revenueSpan.textContent = 'خطأ';
        dishesBody.innerHTML = '<tr><td colspan="2" style="color: red;">خطأ في الاتصال بالخادم.</td></tr>';
    }
}
    */

// assets/js/admin.js
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();

    const path = window.location.pathname;

    if (path.includes('admin.html')) {
        loadAdminDashboard();
    } else if (path.includes('admin-orders.html')) {
        loadAdminOrders();
    } else if (path.includes('admin-reports.html')) {
        loadAdminReports();
    }

    document.getElementById('admin-logout')?.addEventListener('click', handleAdminLogout);
});

const user = JSON.parse(localStorage.getItem('user'));
const restaurantId = user ? user.restaurant_id : null;
const adminHeaders = {
    'is-admin': 'true',
    'restaurant-id': restaurantId,
    'Content-Type': 'application/json'
};

function checkAdminAccess() {
    if (!user || !user.isAdmin) {
        alert('وصول غير مصرح به. يرجى تسجيل الدخول كمسؤول.');
        window.location.href = '/views/login.html';
    } else {
        const adminNameEl = document.getElementById('admin-name');
        if (adminNameEl) adminNameEl.textContent = user.name;
    }
}

function handleAdminLogout() {
    localStorage.removeItem('user');
    window.location.href = '/views/login.html';
}

async function loadAdminDashboard() {
    try {
        const response = await fetch('/api/admin/reports', { headers: adminHeaders });
        const data = await response.json();

        if (data.success) {
            const totalSales = Number(data.report.total_sales) || 0;
            document.getElementById('total-sales-amount').textContent = `${totalSales.toFixed(2)} ج.م`;
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }

    loadAdminOrders(true);
}

async function loadAdminOrders(isDashboard = false) {
    const body = document.getElementById(isDashboard ? 'latest-orders-body' : 'admin-orders-body');
    if (!body) return;

    body.innerHTML = '<tr><td colspan="6">جاري تحميل الطلبات...</td></tr>';

    try {
        const url = `/api/admin/orders`;
        const response = await fetch(url, { headers: { ...adminHeaders, 'is-dashboard': isDashboard } });
        const orders = await response.json();

        body.innerHTML = '';
        if (!Array.isArray(orders) || orders.length === 0) {
            body.innerHTML = '<tr><td colspan="6">لا توجد طلبات حالياً.</td></tr>';
            return;
        }

        orders.forEach(order => {
            const row = body.insertRow();

            const totalPrice = Number(order.total_price) || 0;

            row.innerHTML = `
                <td>${order.order_id}</td>
                <td>${order.customer_name}</td>
                <td>${totalPrice.toFixed(2)} ج.م</td>
                <td><span style="color: ${order.status === 'Delivered' ? 'green' : (order.status.includes('way') ? 'blue' : 'orange')}">${order.status}</span></td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                    ${!isDashboard ? `
                    <select class="status-select" data-order-id="${order.order_id}">
                        <option value="Preparing" ${order.status === 'Preparing' ? 'selected' : ''}>قيد الإعداد</option>
                        <option value="On the way" ${order.status.includes('way') ? 'selected' : ''}>في الطريق</option>
                        <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>تم التوصيل</option>
                    </select>` 
                    : `<a href="/views/order-details.html?id=${order.order_id}">التفاصيل</a>`
                }
                </td>
            `;
        });

        if (!isDashboard) {
            document.querySelectorAll('.status-select').forEach(select => {
                select.addEventListener('change', handleStatusUpdate);
            });
        }

    } catch (error) {
        console.error('Error fetching admin orders:', error);
        body.innerHTML = '<tr><td colspan="6" style="color: red;">خطأ في جلب بيانات الطلبات.</td></tr>';
    }
}

async function handleStatusUpdate(e) {
    const orderId = e.target.getAttribute('data-order-id');
    const newStatus = e.target.value;

    try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: adminHeaders,
            body: JSON.stringify({ status: newStatus })
        });
        const result = await response.json();

        if (result.success) {
            alert(`تم تحديث حالة الطلب ${orderId} إلى ${newStatus}`);
            loadAdminOrders(false);
        } else {
            alert(result.error || 'فشل تحديث الحالة.');
        }
    } catch (error) {
        alert('خطأ في الاتصال بالخادم أثناء التحديث.');
    }
}

async function loadAdminReports() {
    const revenueSpan = document.getElementById('total-revenue');
    const dishesBody = document.getElementById('top-dishes-body');
    if (!revenueSpan || !dishesBody) return;

    revenueSpan.textContent = '... جاري التحميل';
    dishesBody.innerHTML = '<tr><td colspan="2">جاري تحميل التقارير...</td></tr>';

    try {
        const response = await fetch('/api/admin/reports', { headers: adminHeaders });
        const data = await response.json();

        if (data.success) {
            const total = Number(data.report.total_sales) || 0;
            revenueSpan.textContent = `${total.toFixed(2)} ج.م`;

            dishesBody.innerHTML = '';

            data.report.top_dishes.forEach(dish => {
                const row = dishesBody.insertRow();
                row.innerHTML = `<td>${dish.name}</td><td>${dish.total_sold}</td>`;
            });

            if (data.report.top_dishes.length === 0) {
                dishesBody.innerHTML = '<tr><td colspan="2">لا توجد مبيعات مسلّمة بعد.</td></tr>';
            }
        } else {
            alert(data.error || 'فشل في جلب التقارير.');
        }
    } catch (error) {
        console.error('Error fetching reports:', error);
        revenueSpan.textContent = 'خطأ';
        dishesBody.innerHTML = '<tr><td colspan="2" style="color: red;">خطأ في الاتصال بالخادم.</td></tr>';
    }
}
