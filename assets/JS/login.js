// assets/js/login.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    // تأكد أن نموذج تسجيل الدخول في ملف login.html يحتوي على id="login-form"
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

/**
 * دالة لمعالجة إرسال نموذج تسجيل الدخول.
 * تتواصل مع الواجهة الخلفية (API) وتحفظ بيانات المستخدم وتوجهه.
 */
async function handleLogin(event) {
    event.preventDefault(); // منع الإرسال التقليدي للنموذج

    const form = event.target;
    const email = form.email.value;
    const password = form.password.value;
    
    // افتراض وجود عنصر div لعرض الرسائل بـ id="login-message"
    const messageDiv = document.getElementById('login-message'); 

    // تهيئة رسائل الخطأ والتحميل
    messageDiv.textContent = 'جاري التحقق من البيانات...';
    messageDiv.className = 'message loading';

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok) { 
            // ----------------------------------------------------
            // 🔑 حالة النجاح (الخادم أرسل 200)
            // ----------------------------------------------------
            messageDiv.textContent = data.message || 'تم تسجيل الدخول بنجاح!';
            messageDiv.classList.remove('loading', 'error');
            messageDiv.classList.add('success');

            // حفظ بيانات المستخدم في التخزين المحلي (Local Storage)
            localStorage.setItem('user_data', JSON.stringify(data));
            
            // التوجيه بناءً على دور المستخدم
            if (data.is_admin) {
                // توجيه المسؤول إلى لوحة التحكم
                window.location.href = '/views/admin.html'; 
            } else {
                // توجيه العميل إلى الصفحة الرئيسية
                window.location.href = '/views/index.html'; 
            }

        } else {
            // ----------------------------------------------------
            // ❌ حالة الفشل (الخادم أرسل 401 أو 400)
            // ----------------------------------------------------
            messageDiv.textContent = data.message || 'خطأ في تسجيل الدخول. يرجى التحقق من البيانات.';
            messageDiv.classList.remove('loading', 'success');
            messageDiv.classList.add('error');
        }

    } catch (error) {
        console.error('Network or server error:', error);
        messageDiv.textContent = 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
        messageDiv.classList.remove('loading', 'success');
        messageDiv.classList.add('error');
    }
}