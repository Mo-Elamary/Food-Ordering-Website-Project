// assets/js/main.js
document.addEventListener('DOMContentLoaded', () => {
    // تحديث رابط التوثيق بناءً على حالة المستخدم
    updateAuthLink();

    const path = window.location.pathname;
    
    // منطق التسجيل
    if (path.includes('register.html')) {
        document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    }
    
    // منطق تسجيل الدخول
    if (path.includes('login.html')) {
        document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    }
    
    // منطق جلب المطاعم للصفحة الرئيسية
    if (path.includes('index.html')) {
        fetchRestaurants();
        updateCartCount();
    }
});

// =================== Auth Functions ===================
function updateAuthLink() {
    const authLink = document.getElementById('auth-link');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (authLink) {
        if (user && user.isAdmin) {
            authLink.textContent = 'لوحة التحكم';
            authLink.href = '/views/admin.html';
        } else if (user) {
            authLink.textContent = `مرحباً، ${user.name.split(' ')[0]}`;
            authLink.href = '#'; // يمكن إضافة قائمة منسدلة هنا
            authLink.addEventListener('click', () => {
                alert('تسجيل الخروج سيتم من صفحة الطلبات!');
            });
        } else {
            authLink.textContent = '👤 تسجيل الدخول';
            authLink.href = '/views/login.html';
        }
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    const messageDiv = document.getElementById('message');

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();

        if (result.success) {
            messageDiv.className = 'alert-message alert-success';
            messageDiv.textContent = 'تم التسجيل بنجاح! يمكنك الآن تسجيل الدخول.';
            form.reset();
        } else {
            messageDiv.className = 'alert-message alert-error';
            messageDiv.textContent = result.error || 'فشل التسجيل. حاول مرة أخرى.';
        }
    } catch (error) {
        console.error('Registration error:', error);
        messageDiv.className = 'alert-message alert-error';
        messageDiv.textContent = 'حدث خطأ في الاتصال بالخادم.';
    }
    messageDiv.style.display = 'block';
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const { email, password } = Object.fromEntries(new FormData(form).entries());
    const messageDiv = document.getElementById('message');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();

        if (result.success) {
            // حفظ بيانات المستخدم في Local Storage (بما في ذلك isAdmin)
            localStorage.setItem('user', JSON.stringify(result.user));
            
            if (result.user.isAdmin) {
                window.location.href = '/views/admin.html';
            } else {
                window.location.href = '/views/index.html';
            }
        } else {
            messageDiv.className = 'alert-message alert-error';
            messageDiv.textContent = result.error || 'خطأ في البريد الإلكتروني أو كلمة المرور.';
        }
    } catch (error) {
        console.error('Login error:', error);
        messageDiv.className = 'alert-message alert-error';
        messageDiv.textContent = 'حدث خطأ في الاتصال بالخادم.';
    }
    messageDiv.style.display = 'block';
}

// =================== Cart Functions ===================
function getCart() {
    return JSON.parse(localStorage.getItem('food_cart') || '[]');
}

function updateCartCount() {
    const cart = getCart();
    const countSpan = document.getElementById('cart-count');
    const countSpanMenu = document.getElementById('cart-count-menu');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (countSpan) countSpan.textContent = count;
    if (countSpanMenu) countSpanMenu.textContent = count;
}


// =================== Restaurant Functions ===================
async function fetchRestaurants() {
    const listContainer = document.getElementById('restaurants-list');
    if (!listContainer) return;
    listContainer.innerHTML = '<p style="grid-column: 1 / -1;">جاري تحميل المطاعم...</p>';

    try {
        const response = await fetch('/api/restaurants');
        const restaurants = await response.json();

        listContainer.innerHTML = '';

        if (restaurants.length === 0) {
            listContainer.innerHTML = '<p style="grid-column: 1 / -1;">لا توجد مطاعم متاحة حاليًا.</p>';
            return;
        }

        restaurants.forEach(restaurant => {
            const card = document.createElement('div');
            card.className = 'restaurant-card';
            card.onclick = () => {
                window.location.href = `/views/menu.html?id=${restaurant.restaurant_id}`;
            };
            
            const imagePath = `/assets/images/${restaurant.image || 'default_rest.jpg'}`;

            card.innerHTML = `
                <img src="${imagePath}" class="card-img" alt="${restaurant.name}" onerror="this.onerror=null;this.src='/assets/images/default_rest.jpg';">
                <div class="card-content">
                    <h3>${restaurant.name}</h3>
                    <p>${restaurant.description}</p>
                </div>
            `;
            listContainer.appendChild(card);
        });

    } catch (error) {
        console.error('Error fetching data:', error);
        listContainer.innerHTML = '<p style="grid-column: 1 / -1; color: red;">حدث خطأ أثناء جلب بيانات المطاعم.</p>';
    }
}