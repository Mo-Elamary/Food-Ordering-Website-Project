// assets/js/review.js
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');

    const user = JSON.parse(localStorage.getItem('user'));
    const userHeaders = {
        'user-id': user ? user.id : null,
        'Content-Type': 'application/json'
    };

    const orderDisplay = document.getElementById('order-id-display');
    const orderSummary = document.getElementById('order-summary');
    const msg = document.getElementById('review-message');
    const form = document.getElementById('review-form');

    if (!orderId) {
        orderSummary.innerHTML = '<p style="color:red;">لم يتم تحديد رقم الطلب.</p>';
        form.style.display = 'none';
        return;
    }

    orderDisplay.textContent = orderId;             
    async function loadOrderAndCheck() {
        try {
            const res = await fetch(`/api/orders/${orderId}/details`, { headers: userHeaders });
            if (!res.ok) throw new Error('Order not found or access denied.');
            const data = await res.json();
            const order = data.order;

            orderSummary.innerHTML = `
                <p><strong>المطعم:</strong> ${order.restaurant_name}</p>
                <p><strong>الحالة:</strong> <span style="color:${order.status === 'Delivered' ? 'green' : 'orange'}">${order.status}</span></p>
                <p><strong>الإجمالي:</strong> ${(parseFloat(order.total_price)||0).toFixed(2)} ج.م</p>
            `;

            if (order.status !== 'Delivered') {
                msg.style.display = 'block';
                msg.style.color = 'orange';
                msg.textContent = 'لا يمكنك تقييم هذا الطلب إلا بعد تسليمه (Delivered).';
                form.style.display = 'none';
                return;
            }

                 
            const rv = await fetch(`/api/orders/${orderId}/review`, { headers: userHeaders });
            const rvData = await rv.json();
            if (rvData.exists) {
                msg.style.display = 'block';
                msg.style.color = 'green';
                msg.innerHTML = `<strong>لقد قمت بالفعل بتقييم هذا الطلب.</strong><br/>التقييم: ${rvData.review.rating}<br/>${rvData.review.comment ? 'تعليق: ' + rvData.review.comment : ''}`;
                form.style.display = 'none';
                return;
            } else {
                  
                form.style.display = 'block';
            }

        } catch (err) {
            console.error('Error loading order:', err);
            orderSummary.innerHTML = '<p style="color:red;">خطأ في جلب تفاصيل الطلب.</p>';
            form.style.display = 'none';
        }
    }

    loadOrderAndCheck();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rating = parseInt(document.getElementById('rating').value, 10);
        const comment = document.getElementById('comment').value.trim();

        if (!rating || rating < 1 || rating > 5) {
            alert('اختر تقييمًا من 1 إلى 5.');
            return;
        }

        try {
            const response = await fetch(`/api/orders/${orderId}/review`, {
                method: 'POST',
                headers: userHeaders,
                body: JSON.stringify({ rating, comment })
            });

            const result = await response.json();
            if (response.ok && result.success) {
                msg.style.display = 'block';
                msg.style.color = 'green';
                msg.textContent = 'تم إرسال التقييم بنجاح. شكرًا لك!';
                form.style.display = 'none';
            } else {
                msg.style.display = 'block';
                msg.style.color = 'red';
                msg.textContent = result.error || 'فشل إرسال التقييم.';
            }
        } catch (err) {
            console.error('Error submitting review:', err);
            alert('حدث خطأ أثناء إرسال التقييم. حاول مرة أخرى.');
        }
    });
    
    document.getElementById('user-logout')?.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('user');
        window.location.href = '/views/index.html';
    });
});
