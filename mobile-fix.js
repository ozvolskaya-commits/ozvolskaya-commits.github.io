// mobile-fix.js - исправление для мобильных устройств
console.log('📱 Загружаем мобильный фикс...');

// Создаем отсутствующую функцию
if (typeof window.saveUserDataToAPI === 'undefined') {
    window.saveUserDataToAPI = function() {
        console.log('💾 saveUserDataToAPI вызвана (заглушка)');
        return Promise.resolve(true);
    };
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM загружен, настраиваем монетку...');
    
    setTimeout(function() {
        const coin = document.getElementById('clickCoin');
        
        if (!coin) {
            console.error('❌ Монетка не найдена!');
            return;
        }
        
        console.log('✅ Монетка найдена:', coin);
        
        // Убираем ВСЕ старые обработчики
        coin.onclick = null;
        coin.ontouchstart = null;
        coin.ontouchend = null;
        
        // Очищаем все event listeners
        const newCoin = coin.cloneNode(true);
        coin.parentNode.replaceChild(newCoin, coin);
        
        // Получаем новую монетку
        const freshCoin = document.getElementById('clickCoin');
        
        // Добавляем новые обработчики
        freshCoin.addEventListener('click', handleCoinClick);
        freshCoin.addEventListener('touchstart', handleCoinClick, { passive: false });
        
        // Стили для мобильных
        freshCoin.style.cursor = 'pointer';
        freshCoin.style.webkitTapHighlightColor = 'transparent';
        freshCoin.style.touchAction = 'manipulation';
        
        console.log('🎯 Новые обработчики установлены!');
        
    }, 1000);
});

function handleCoinClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('💰 Клик по монетке!', event.type);
    
    // Проверяем и создаем userData если нужно
    if (!window.userData) {
        window.userData = {
            userId: 'mobile_user',
            username: 'Мобильный Игрок',
            balance: 0.000000100,
            totalEarned: 0.000000100,
            totalClicks: 0,
            lastUpdate: Date.now()
        };
        console.log('📝 Создан новый userData');
    }
    
    // Вычисляем силу клика
    let clickPower = 0.000000001;
    if (window.calculateClickPower && typeof window.calculateClickPower === 'function') {
        clickPower = window.calculateClickPower();
    }
    
    // Обновляем баланс
    window.userData.balance += clickPower;
    window.userData.totalEarned += clickPower;
    window.userData.totalClicks++;
    window.userData.lastUpdate = Date.now();
    
    console.log('💵 Баланс обновлен:', window.userData.balance.toFixed(9));
    
    // Обновляем интерфейс
    updateMobileUI();
    
    // Сохраняем данные (без вызова saveUserDataToAPI)
    saveMobileData();
    
    // Создаем попап
    createMobilePopup(event, clickPower);
    
    return false;
}

function updateMobileUI() {
    // Обновляем баланс
    const balanceElement = document.getElementById('balanceValue');
    if (balanceElement) {
        balanceElement.textContent = window.userData.balance.toFixed(9) + ' S';
    }
    
    // Обновляем скорость клика если есть элемент
    const clickValueElement = document.getElementById('clickValue');
    if (clickValueElement) {
        let clickPower = 0.000000001;
        if (window.calculateClickPower) {
            clickPower = window.calculateClickPower();
        }
        clickValueElement.textContent = clickPower.toFixed(9);
    }
}

function saveMobileData() {
    try {
        // Сохраняем в localStorage
        localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
        
        // Сохраняем улучшения если они есть
        if (window.upgrades) {
            localStorage.setItem('sparkcoin_upgrades_' + window.userData.userId, JSON.stringify(window.upgrades));
        }
        
        console.log('💾 Данные сохранены в localStorage');
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
    }
}

function createMobilePopup(event, amount) {
    let x, y;
    
    if (event.touches && event.touches[0]) {
        x = event.touches[0].clientX;
        y = event.touches[0].clientY;
    } else {
        x = event.clientX;
        y = event.clientY;
    }
    
    const popup = document.createElement('div');
    popup.textContent = '+' + amount.toFixed(9);
    popup.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        color: #4CAF50;
        font-weight: bold;
        font-size: 18px;
        font-family: 'Courier New', monospace;
        z-index: 10000;
        pointer-events: none;
        animation: mobileFloatUp 1s ease-out forwards;
        transform: translate(-50%, -50%);
        text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    `;
    
    document.body.appendChild(popup);
    
    setTimeout(() => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    }, 1000);
}

// Добавляем CSS анимацию
if (!document.querySelector('#mobile-fix-style')) {
    const style = document.createElement('style');
    style.id = 'mobile-fix-style';
    style.textContent = `
        @keyframes mobileFloatUp {
            0% {
                transform: translate(-50%, -50%) scale(1);
                opacity: 1;
            }
            50% {
                transform: translate(-50%, -100%) scale(1.1);
                opacity: 0.8;
            }
            100% {
                transform: translate(-50%, -150%) scale(1.2);
                opacity: 0;
            }
        }
        
        .click-coin {
            cursor: pointer !important;
            -webkit-tap-highlight-color: transparent !important;
            touch-action: manipulation !important;
        }
        
        .click-coin:active {
            transform: scale(0.95) !important;
        }
    `;
    document.head.appendChild(style);
}

console.log('✅ Мобильный фикс загружен!');
