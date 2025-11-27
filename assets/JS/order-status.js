// assets/js/order-status.js
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');

    if (orderId) {
        document.getElementById('tracking-order-id').textContent = orderId;
        // تحديث الحالة كل 5 ثوانٍ
        updateOrderStatus(orderId);
        setInterval(() => updateOrderStatus(orderId), 5000); 
    } else {
        document.getElementById('current-status-info').innerHTML = '<p style="color: red;">لم يتم تحديد رقم الطلب المراد تتبعه.</p>';
    }
});

const statusMap = {
    'Preparing': { step: 1, label: 'قيد الإعداد' },
    ' On the way': { step: 2, label: 'في الطريق' },
    'Delivered': { step: 3, label: 'تم التوصيل' }
};

async function updateOrderStatus(id) {
    try {
        const response = await fetch(`/api/orders/${id}/status`);
        if (!response.ok) throw new Error('Failed to fetch status');
        
        const data = await response.json();
        const currentStatus = data.status;
        const statusDetails = statusMap[currentStatus];
        
        if (!statusDetails) {
            document.getElementById('current-status-display').textContent = 'حالة غير معروفة';
            return;
        }

        const currentStep = statusDetails.step;

        // تحديث شريط التقدم والخطوات
        const steps = ['step-preparing', 'step-on-the-way', 'step-delivered'];
        let progressWidth = 0;

        steps.forEach((stepId, index) => {
            const stepElement = document.getElementById(stepId);
            const stepNum = index + 1;
            
            stepElement.classList.remove('active', 'complete');

            if (stepNum < currentStep) {
                stepElement.classList.add('complete');
            } else if (stepNum === currentStep) {
                stepElement.classList.add('active');
                // حساب العرض لشريط التقدم (100% عند الخطوة 3، 50% عند الخطوة 2)
                progressWidth = (stepNum - 1) * 50; 
            }
        });
        
        // ضبط شريط التقدم
        document.getElementById('progress-bar').style.width = `${progressWidth}%`;

        // تحديث العرض النصي
        document.getElementById('current-status-display').textContent = statusDetails.label;
        document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString();
        
        // إيقاف التحديث إذا تم التوصيل
        if (currentStatus === 'Delivered') {
            clearInterval(this.intervalId); 
            document.getElementById('current-status-display').style.color = 'green';
        }

    } catch (error) {
        console.error('Error updating status:', error);
        document.getElementById('current-status-display').textContent = 'خطأ في الاتصال.';
    }
}