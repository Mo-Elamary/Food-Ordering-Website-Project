// assets/js/menu.js
document.addEventListener('DOMContentLoaded', () => {     
    updateCartCountMenu();       
    const urlParams = new URLSearchParams(window.location.search);
    const restaurantId = urlParams.get('id');
    if (restaurantId) {
        fetchMenu(restaurantId);
    } else {
        document.getElementById('menu-container').innerHTML = '<p style="color: red;">لم يتم تحديد رقم المطعم.</p>';
    }
});
function getCart() {
    return JSON.parse(localStorage.getItem('food_cart') || '[]');
}
function saveCart(cart) {
    localStorage.setItem('food_cart', JSON.stringify(cart));
    updateCartCountMenu();
}
function updateCartCountMenu() {
    const cart = getCart();
    const countSpan = document.getElementById('cart-count-menu');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (countSpan) countSpan.textContent = count;
}


async function fetchMenu(id) {
    const infoDiv = document.getElementById('restaurant-info');
    const menuContainer = document.getElementById('menu-container');
    const headerName = document.getElementById('restaurant-name-header');
    
    menuContainer.innerHTML = '<p>جاري تحميل قائمة الطعام...</p>';

    try {
        const response = await fetch(`/api/restaurants/${id}/dishes`);
        if (!response.ok) throw new Error('Failed to fetch menu');
        const data = await response.json();   
        document.getElementById('page-title').textContent = data.restaurant.name;
        headerName.textContent = data.restaurant.name;
        infoDiv.innerHTML = `
            <p>${data.restaurant.description}</p>
            <img src="/assets/images/${data.restaurant.image || 'default_rest.jpg'}" class="card-img" style="height: 150px; width: auto; max-width: 100%;" alt="${data.restaurant.name}">
            <input type="hidden" id="restaurant-id" value="${id}">
        `;

        renderMenu(data.menu, menuContainer);

    } catch (error) {
        console.error('Error fetching menu:', error);
        menuContainer.innerHTML = '<p style="color: red;">حدث خطأ أثناء جلب قائمة الطعام. الرجاء المحاولة لاحقاً.</p>';
    }
}

function renderMenu(dishes, container) {
    container.innerHTML = '';
    if (dishes.length === 0) {
        container.innerHTML = '<p>لا توجد أطباق متاحة حاليًا في هذا المطعم.</p>';
        return;
    }

    const categorizedMenu = dishes.reduce((acc, dish) => {
        const category = dish.category_name || 'أخرى';
        if (!acc[category]) acc[category] = [];
        acc[category].push(dish);
        return acc;
    }, {});

    for (const category in categorizedMenu) {
        const section = document.createElement('div');
        section.className = 'menu-section';
        section.innerHTML = `<h3>${category}</h3>`;
        const grid = document.createElement('div');
        grid.className = 'menu-grid';
        
        categorizedMenu[category].forEach(dish => {
            const item = document.createElement('div');
            item.className = 'dish-card';
            item.innerHTML = `
                <img src="/assets/images/${dish.image || 'default_dish.jpg'}" class="card-img" alt="${dish.name}" onerror="this.onerror=null;this.src='/assets/images/default_dish.jpg';">
                <div class="card-content">
                    <h4>${dish.name}</h4>
                    <p style="font-size: 0.9em; color: #666;">${dish.description}</p>
                    <div class="dish-details">
                        <span class="price">${dish.price} ج.م</span>
                        <button class="add-to-cart-btn" data-dish-id="${dish.dish_id}" 
                            data-dish-price="${dish.price}" data-dish-name="${dish.name}">أضف للعربة</button>
                    </div>
                </div>
            `;
            grid.appendChild(item);
        });

        section.appendChild(grid);
        container.appendChild(section);
    }
    
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', handleAddToCart);
    });
}

function handleAddToCart(event) {
    const button = event.target;
    const dishId = parseInt(button.getAttribute('data-dish-id'));
    const dishName = button.getAttribute('data-dish-name');
    const dishPrice = parseFloat(button.getAttribute('data-dish-price'));
    const restaurantId = document.getElementById('restaurant-id').value;

    let cart = getCart();        
    if (cart.length > 0 && cart[0].restaurant_id != restaurantId) {
        if (!confirm('سلة التسوق تحتوي على أصناف من مطعم آخر. هل تريد إفراغ السلة وبدء طلب جديد؟')) {
            return;
        }
        cart = [];   
    }

    const existingItem = cart.find(item => item.dish_id === dishId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            dish_id: dishId,
            name: dishName,
            price: dishPrice,
            quantity: 1,
            restaurant_id: restaurantId    
        });
    }

    saveCart(cart);
    alert(`${dishName} تم إضافته للعربة بنجاح!`);
}