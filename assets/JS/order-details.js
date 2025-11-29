// assets/js/order-details.js
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');

    if (orderId) {
        loadOrderDetails(orderId);
    } else {
        document.getElementById('order-details-info').innerHTML = '<p style="color: red;">لم يتم تحديد رقم الطلب.</p>';
    }
});

const user = JSON.parse(localStorage.getItem('user'));
const userHeaders = {
    'user-id': user ? user.id : null,
    'Content-Type': 'application/json'
};

async function loadOrderDetails(id) {
    const infoDiv = document.getElementById('order-details-info');
    const itemsList = document.getElementById('order-items-list');
    const idDisplay = document.getElementById('order-id-display');
    const statusLink = document.getElementById('status-link');

    idDisplay.textContent = id;
    infoDiv.innerHTML = '<p>جاري تحميل التفاصيل...</p>';
    itemsList.innerHTML = '';
    
    try {
        const response = await fetch(`/api/orders/${id}/details`, { headers: userHeaders });
        if (!response.ok) throw new Error('Order not found or access denied.');
        
        const data = await response.json();
        const order = data.order;
        
        // تحديث المعلومات الأساسية
        infoDiv.innerHTML = `
            <p><strong>المطعم:</strong> ${order.restaurant_name}</p>
            <p><strong>تاريخ الطلب:</strong> ${new Date(order.created_at).toLocaleString()}</p>
            <p><strong>الحالة:</strong> <span style="color: ${order.status === 'Delivered' ? 'green' : 'orange'};">${order.status}</span></p>
            <p><strong>الإجمالي المدفوع:</strong> ${parseFloat(order.total_price || 0).toFixed(2)} ج.م</p>
        `;

        // تحديث رابط التتبع
        statusLink.href = `/views/order-status.html?id=${id}`;

        // تحديث قائمة الأصناف
        data.items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'order-item-detail';
            itemDiv.innerHTML = `
                <h4>${item.dish_name}</h4>
                <p>${item.quantity} x ${parseFloat(item.price || 0).toFixed(2)} ج.م</p>
                <p>الإجمالي: ${(item.quantity * item.price).toFixed(2)} ج.م</p>
            `;
            itemsList.appendChild(itemDiv);
        });

    } catch (error) {
        console.error('Error fetching order details:', error);
        infoDiv.innerHTML = `<p style="color: red;">خطأ: لا يمكن جلب تفاصيل الطلب. قد يكون غير موجود أو لا تملك الصلاحية.</p>`;
    }
}