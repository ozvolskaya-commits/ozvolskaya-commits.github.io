// mobile-fix.js - полностью независимый фикс для мобильных устройств
console.log('📱 Загружаем независимый мобильный фикс...');

// Создаем все необходимые функции чтобы не зависеть от других скриптов
window.mobileClickPower = 0.000000001;
window.mobileUserData = null;
window.mobileUpgrades = {};

// Инициализация мобильных данных
function initMobileData() {
    // Загружаем данные из localStorage
    try {
        const savedData = localStorage.getItem('sparkcoin_user_data');
        if (savedData) {
            window.mobileUserData = JSON.parse(savedData);
            console.log('📂 Данные загружены из localStorage');
        }
    } catch (e) {
        console.log('❌ Ошибка загрузки данных:', e);
    }
    
    // Если данных нет - создаем новые
    if (!window.mobileUserData) {
        window.mobileUserData = {
            userId: 'mobile_user_' + Date.now(),
            username: 'Мобильный Игрок',
            balance: 0.000000100,
            totalEarned: 0.000000100,
            totalClicks: 0,
            lastUpdate: Date.now(),
            lotteryWins: 0,
            totalBet: 0,
            transfers: { sent: 0, received: 0 }
        };
        console.log('📝 Созданы новые данные');
    }
    
    // Загружаем улучшения
    try {
        const savedUpgrades = localStorage.getItem('sparkcoin_upgrades_' + window.mobileUserData.userId);
        if (savedUpgrades) {
            window.mobileUpgrades = JSON.parse(savedUpgrades);
        }
    } catch (e) {
        console.log('❌ Ошибка загрузки улучшений:', e);
    }
    
    // Обновляем интерфейс
    updateMobileUI();
}

// Функция для клика по монетке
function handleMobileCoinClick(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    console.log('💰 Мобильный клик!', event.type);
    
    // Вычисляем силу клика
    let clickPower = calculateMobileClickPower();
    
    // Обновляем баланс
    window.mobileUserData.balance += clickPower;
    window.mobileUserData.totalEarned += clickPower;
    window.mobileUserData.totalClicks++;
    window.mobileUserData.lastUpdate = Date.now();
    
    console.log('💵 Баланс:', window.mobileUserData.balance.toFixed(9));
    
    // Обновляем интерфейс
    updateMobileUI();
    
    // Сохраняем данные
    saveMobileData();
    
    // Создаем попап
    createMobilePopup(event, clickPower);
    
    // Анимация монетки
    const coin = event.currentTarget;
    coin.style.transform = 'scale(0.95)';
    setTimeout(() => {
        coin.style.transform = 'scale(1)';
    }, 100);
    
    return false;
}

// Вычисление силы клика
function calculateMobileClickPower() {
    let power = 0.000000001;
    
    // Если есть оригинальная функция - используем её
    if (window.calculateClickPower && typeof window.calculateClickPower === 'function') {
        try {
            power = window.calculateClickPower();
        } catch (e) {
            console.log('⚠️ Ошибка calculateClickPower, используем базовую');
        }
    }
    
    return power;
}

// Обновление интерфейса
function updateMobileUI() {
    // Баланс
    const balanceElement = document.getElementById('balanceValue');
    if (balanceElement) {
        balanceElement.textContent = (window.mobileUserData.balance || 0.000000100).toFixed(9) + ' S';
    }
    
    // Сила клика
    const clickValueElement = document.getElementById('clickValue');
    if (clickValueElement) {
        const clickPower = calculateMobileClickPower();
        clickValueElement.textContent = clickPower.toFixed(9);
    }
    
    // Скорость клика
    const clickSpeedElement = document.getElementById('clickSpeed');
    if (clickSpeedElement) {
        const clickPower = calculateMobileClickPower();
        clickSpeedElement.textContent = clickPower.toFixed(9) + ' S/сек';
    }
    
    // Скорость майнинга
    const mineSpeedElement = document.getElementById('mineSpeed');
    if (mineSpeedElement) {
        const mineSpeed = calculateMobileMineSpeed();
        mineSpeedElement.textContent = mineSpeed.toFixed(9) + ' S/сек';
    }
}

// Вычисление скорости майнинга
function calculateMobileMineSpeed() {
    let speed = 0;
    
    // Если есть оригинальная функция - используем её
    if (window.calculateMiningSpeed && typeof window.calculateMiningSpeed === 'function') {
        try {
            speed = window.calculateMiningSpeed();
        } catch (e) {
            console.log('⚠️ Ошибка calculateMiningSpeed');
        }
    }
    
    return speed;
}

// Сохранение данных
function saveMobileData() {
    try {
        // Сохраняем основные данные
        localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.mobileUserData));
        
        // Сохраняем улучшения
        localStorage.setItem('sparkcoin_upgrades_' + window.mobileUserData.userId, JSON.stringify(window.mobileUpgrades));
        
        console.log('💾 Мобильные данные сохранены');
    } catch (error) {
        console.error('❌ Ошибка сохранения мобильных данных:', error);
    }
}

// Создание попапа
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
    popup.className = 'mobile-click-popup';
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

// Инициализация монетки
function initMobileCoin() {
    console.log('🎯 Инициализация мобильной монетки...');
    
    const coin = document.getElementById('clickCoin');
    
    if (!coin) {
        console.log('⏳ Монетка не найдена, пробуем через 1 секунду...');
        setTimeout(initMobileCoin, 1000);
        return;
    }
    
    console.log('✅ Монетка найдена!');
    
    // Полностью очищаем старые обработчики
    coin.replaceWith(coin.cloneNode(true));
    const newCoin = document.getElementById('clickCoin');
    
    // Добавляем ТОЛЬКО наши обработчики
    newCoin.addEventListener('click', handleMobileCoinClick, true);
    newCoin.addEventListener('touchstart', handleMobileCoinClick, { 
        passive: false, 
        capture: true 
    });
    
    // Стили для мобильных
    newCoin.style.cursor = 'pointer';
    newCoin.style.webkitTapHighlightColor = 'transparent';
    newCoin.style.touchAction = 'manipulation';
    newCoin.style.userSelect = 'none';
    newCoin.style.webkitUserSelect = 'none';
    
    // Убираем атрибуты
    newCoin.removeAttribute('href');
    newCoin.removeAttribute('onclick');
    newCoin.onclick = null;
    
    console.log('🎯 Мобильная монетка готова!');
}

// Добавляем CSS
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
            transition: transform 0.1s ease !important;
            user-select: none !important;
            -webkit-user-select: none !important;
        }
        
        .mobile-click-popup {
            pointer-events: none !important;
        }
    `;
    document.head.appendChild(style);
}

// Запускаем когда страница загрузится
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 DOM загружен, запускаем мобильный фикс...');
        setTimeout(() => {
            initMobileData();
            initMobileCoin();
        }, 500);
    });
} else {
    console.log('⚡ Страница уже загружена, запускаем мобильный фикс...');
    setTimeout(() => {
        initMobileData();
        initMobileCoin();
    }, 500);
}

console.log('✅ Независимый мобильный фикс загружен!');
