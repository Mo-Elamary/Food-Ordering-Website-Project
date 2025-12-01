// assets/js/Cart.js
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    document.getElementById('checkout-form')?.addEventListener('submit', handleCheckout);
});

function getCart() {
    return JSON.parse(localStorage.getItem('food_cart') || '[]');
}

function saveCart(cart) {
    localStorage.setItem('food_cart', JSON.stringify(cart));
    loadCart(); 
}

function loadCart() {
    const cart = getCart();
    const itemsContainer = document.getElementById('cart-items-container');
    const totalSpan = document.getElementById('cart-total');
    const emptyMsg = document.getElementById('empty-cart-message');
    const checkoutSection = document.getElementById('checkout-section');
    let totalPrice = 0;

    itemsContainer.innerHTML = '';

    if (cart.length === 0) {
        emptyMsg.style.display = 'block';
        checkoutSection.style.display = 'none';
        totalSpan.textContent = '0.00 ج.م';
        return;
    }
    
    emptyMsg.style.display = 'none';
    checkoutSection.style.display = 'block';

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        totalPrice += itemTotal;

        const itemDiv = document.createElement('div');
        itemDiv.className = 'cart-item';
        itemDiv.innerHTML = `
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <p>${item.price} ج.م x ${item.quantity}</p>
            </div>
            <div style="font-weight: bold;">
                ${itemTotal.toFixed(2)} ج.م
                <button data-id="${item.dish_id}" class="remove-item-btn" style="background: #e74c3c; border: none; color: white; margin-right: 10px; padding: 5px; border-radius: 3px; cursor: pointer;">حذف</button>
            </div>
        `;
        itemsContainer.appendChild(itemDiv);
    });

    totalSpan.textContent = `${totalPrice.toFixed(2)} ج.م`;
    
    document.querySelectorAll('.remove-item-btn').forEach(button => {
        button.addEventListener('click', handleRemoveItem);
    });
}

function handleRemoveItem(e) {
    const dishId = parseInt(e.target.getAttribute('data-id'));
    let cart = getCart();
    
    cart = cart.filter(item => item.dish_id !== dishId);
    
    saveCart(cart);
}


async function handleCheckout(e) {
    e.preventDefault();
    const user = JSON.parse(localStorage.getItem('user'));
    const cart = getCart();
    const messageDiv = document.getElementById('cart-message');

    if (!user) {
        messageDiv.className = 'alert-message alert-error';
        messageDiv.textContent = 'يجب تسجيل الدخول لإتمام الطلب.';
        messageDiv.style.display = 'block';
        setTimeout(() => window.location.href = '/views/login.html', 1500);
        return;
    }
    
    if (cart.length === 0) {
        messageDiv.className = 'alert-message alert-error';
        messageDiv.textContent = 'عربة التسوق فارغة!';
        messageDiv.style.display = 'block';
        return;
    }

    const total = parseFloat(document.getElementById('cart-total').textContent);
    const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
    const restaurantId = cart[0].restaurant_id; 

    // تهيئة بيانات الطلب
    const orderData = {
    restaurant_id: restaurantId,
    total_price: total,
    payment_method: paymentMethod,
    items: cart.map(item => ({
        dish_id: item.dish_id,
        quantity: item.quantity,
        price: item.price
    }))
};

    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'user-id': user.id 
            },
            body: JSON.stringify(orderData)
        });
        const result = await response.json();

        if (result.success) {
            messageDiv.className = 'alert-message alert-success';
            messageDiv.textContent = `تم إنشاء الطلب رقم ${result.order_id} بنجاح!`;
            messageDiv.style.display = 'block';
            
            localStorage.removeItem('food_cart');   
            setTimeout(() => {
                window.location.href = `/views/order-status.html?id=${result.order_id}`;
            }, 2000);
        } else {
            messageDiv.className = 'alert-message alert-error';
            messageDiv.textContent = result.error || 'فشل إتمام الطلب. حاول مجدداً.';
            messageDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Checkout error:', error);
        messageDiv.className = 'alert-message alert-error';
        messageDiv.textContent = 'حدث خطأ في الاتصال بالخادم.';
        messageDiv.style.display = 'block';
    }
}