
document.addEventListener('DOMContentLoaded', () => {
    checkUserLoggedIn();
    loadUserOrders();
    document.getElementById('user-logout')?.addEventListener('click', handleUserLogout);
});

const user = JSON.parse(localStorage.getItem('user'));
const userHeaders = {
    'user-id': user ? user.id : null,
    'Content-Type': 'application/json'
};

function checkUserLoggedIn() {
    if (!user || user.isAdmin) {
        alert('يجب تسجيل الدخول كعميل لرؤية طلباتك.');
        window.location.href = '/views/login.html';
    }
}

function handleUserLogout() {
    localStorage.removeItem('user');
    window.location.href = '/views/index.html';
}

async function loadUserOrders() {
    const body = document.getElementById('my-orders-body');
    if (!body) return;
    body.innerHTML = '<tr><td colspan="6">جاري تحميل طلباتك...</td></tr>';
    
    try {
        const response = await fetch('/api/users/orders', { headers: userHeaders });
        const orders = await response.json();

        body.innerHTML = '';
        if (orders.length === 0) {
            body.innerHTML = '<tr><td colspan="6">لم تقم بطلب أي شيء بعد.</td></tr>';
            return;
        }

        orders.forEach(order => {
            const row = body.insertRow();
            row.innerHTML = `
                <td>${order.order_id}</td>
                <td>${order.restaurant_name}</td>
                <td><span style="color: ${order.status === 'Delivered' ? 'green' : (order.status.includes('way') ? 'blue' : 'orange')}">${order.status}</span></td>
                <td>${parseFloat(order.total_price || 0).toFixed(2)} ج.م</td>
                <td>${new Date(order.created_at).toLocaleDateString()}</td>
                <td>
                    <a href="/views/order-details.html?id=${order.order_id}" class="btn-primary" style="width: auto; padding: 5px 10px; display: inline-block;">التفاصيل</a>
                </td>
            `;
        });

    } catch (error) {
        console.error('Error fetching user orders:', error);
        body.innerHTML = '<tr><td colspan="6" style="color: red;">خطأ في جلب بيانات الطلبات.</td></tr>';
    }
}
