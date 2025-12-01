// assets/js/login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');  
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});
async function handleLogin(event) {
    event.preventDefault();     
    const form = event.target;
    const email = form.email.value;
    const password = form.password.value;
    const messageDiv = document.getElementById('login-message'); 
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
            messageDiv.textContent = data.message || 'تم تسجيل الدخول بنجاح!';
            messageDiv.classList.remove('loading', 'error');
            messageDiv.classList.add('success');
            localStorage.setItem('user_data', JSON.stringify(data));
            if (data.is_admin) {                     
                window.location.href = '/views/admin.html'; 
            } else {                   
                window.location.href = '/views/index.html'; 
            }

        } else {       
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