// main.js - полностью исправленная версия
console.log('🎮 Загружаем исправленный main.js...');

const tg = window.Telegram.WebApp;

// Глобальные переменные
window.apiConnected = false;
window.isOnline = navigator.onLine;
window.lastUpdateTime = Date.now();
window.accumulatedIncome = 0;
window.lastClickTime = 0;
window.antiCheatBlocked = false;
window.clickTimes = [];
window.antiCheatTimeout = null;
window.userData = null;
window.upgrades = {};
window.allPlayers = [];
window.isDataLoaded = false;

// Функция для обновления статуса API
window.updateApiStatus = function(status, message) {
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.className = `api-status ${status}`;
        apiStatus.textContent = `API: ${message}`;
    }
    window.apiConnected = status === 'connected';
    console.log(`📡 Статус API: ${status} - ${message}`);
};

// Базовые функции
function getTelegramUserId() {
    if (typeof tg === 'undefined') {
        return 'web_' + Math.random().toString(36).substr(2, 9);
    }
    
    const user = tg.initDataUnsafe?.user;
    if (user && user.username) {
        return 'tg_' + user.username.toLowerCase();
    } else if (user && user.id) {
        return 'tg_' + user.id;
    }
    return 'test_' + Math.random().toString(36).substr(2, 9);
}

function getTelegramUsername() {
    if (typeof tg === 'undefined') {
        return 'Веб-Игрок';
    }
    
    const user = tg.initDataUnsafe?.user;
    if (user) {
        if (user.username) {
            return '@' + user.username;
        } else if (user.first_name) {
            return user.first_name;
        }
    }
    return 'Игрок';
}

function createNewUserData(userId, username) {
    return {
        userId: userId,
        username: username,
        balance: 0.000000100,
        totalEarned: 0.000000100,
        totalClicks: 0,
        lastUpdate: Date.now(),
        joinedDate: new Date().toISOString(),
        lotteryWins: 0,
        totalBet: 0,
        telegramId: tg?.initDataUnsafe?.user?.id || null,
        transfers: {
            sent: 0,
            received: 0
        },
        referralEarnings: 0,
        referralsCount: 0,
        totalWinnings: 0,
        totalLosses: 0
    };
}

// Загрузка данных пользователя
function loadUserData() {
    const userId = getTelegramUserId();
    const username = getTelegramUsername();

    // Загрузка данных из localStorage
    try {
        const savedData = localStorage.getItem('sparkcoin_user_data');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            if (parsedData.userId === userId) {
                window.userData = createNewUserData(userId, username);
                Object.assign(window.userData, parsedData);
                window.lastUpdateTime = window.userData.lastUpdate || Date.now();
                console.log('✅ Данные пользователя загружены из localStorage');
            } else {
                window.userData = createNewUserData(userId, username);
                console.log('🆕 Созданы новые данные пользователя');
            }
        } else {
            window.userData = createNewUserData(userId, username);
            console.log('🆕 Созданы начальные данные пользователя');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        window.userData = createNewUserData(userId, username);
    }

    // Загрузка улучшений
    try {
        const savedUpgrades = localStorage.getItem('sparkcoin_upgrades_' + userId);
        if (savedUpgrades) {
            const upgradesData = JSON.parse(savedUpgrades);
            if (typeof window.upgrades === 'undefined') {
                window.upgrades = {};
            }
            for (const key in upgradesData) {
                window.upgrades[key] = window.upgrades[key] || {};
                window.upgrades[key].level = upgradesData[key];
            }
            console.log('✅ Улучшения загружены');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки улучшений:', error);
    }

    window.isDataLoaded = true;
    console.log('👤 Пользователь:', window.userData.username, 'Баланс:', window.userData.balance);
}

// Аварийное обновление UI
function updateFallbackUI() {
    if (!window.userData) return;
    
    const balanceElement = document.getElementById('balanceValue');
    const clickValueElement = document.getElementById('clickValue');
    const clickSpeedElement = document.getElementById('clickSpeed');
    const mineSpeedElement = document.getElementById('mineSpeed');
    
    if (balanceElement) {
        balanceElement.textContent = (window.userData.balance || 0.000000100).toFixed(9) + ' S';
    }
    
    if (clickValueElement) {
        clickValueElement.textContent = '0.000000001';
    }
    
    if (clickSpeedElement) {
        clickSpeedElement.textContent = '0.000000001 S/сек';
    }
    
    if (mineSpeedElement) {
        mineSpeedElement.textContent = '0.000000000 S/сек';
    }
}

// УЛУЧШЕННАЯ инициализация монетки
function initializeCoin() {
    console.log('🎯 Инициализация монетки...');
    
    const coin = document.getElementById('clickCoin');
    
    if (!coin) {
        console.log('⏳ Монетка не найдена, повтор через 1 секунду...');
        setTimeout(initializeCoin, 1000);
        return;
    }
    
    console.log('✅ Монетка найдена');
    
    // ПОЛНАЯ ОЧИСТКА ВСЕХ ОБРАБОТЧИКОВ
    const newCoin = coin.cloneNode(true);
    coin.parentNode.replaceChild(newCoin, coin);
    
    const freshCoin = document.getElementById('clickCoin');
    
    // ДОБАВЛЯЕМ ТОЛЬКО НАШИ ОБРАБОТЧИКИ
    freshCoin.addEventListener('click', handleCoinClick, true);
    freshCoin.addEventListener('touchstart', handleCoinClick, { 
        passive: false, 
        capture: true 
    });
    
    // Стили для предотвращения навигации
    freshCoin.style.cursor = 'pointer';
    freshCoin.style.webkitTapHighlightColor = 'transparent';
    freshCoin.style.touchAction = 'manipulation';
    freshCoin.style.userSelect = 'none';
    freshCoin.style.webkitUserSelect = 'none';
    
    // Убираем любые возможные href и onclick
    freshCoin.removeAttribute('href');
    freshCoin.removeAttribute('onclick');
    freshCoin.onclick = null;
    
    console.log('✅ Обработчики монетки установлены (полная очистка)');
}

// УЛУЧШЕННЫЙ обработчик кликов
function handleCoinClick(event) {
    // ПОЛНАЯ БЛОКИРОВКА ПОВЕДЕНИЯ ПО УМОЛЧАНИЮ
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    // Дополнительная блокировка для touch событий
    if (event.type === 'touchstart') {
        event.preventDefault();
    }
    
    console.log('💰 Клик по монетке:', event.type);
    
    // Проверяем наличие userData
    if (!window.userData || !window.isDataLoaded) {
        console.error('❌ userData не загружен');
        return false;
    }
    
    // Проверяем античит
    if (window.antiCheatBlocked) {
        console.log('⏸️ Античит заблокирован');
        return false;
    }
    
    // Проверяем кулдаун
    const now = Date.now();
    const cooldown = 25; // 25ms кулдаун
    if (window.lastClickTime && (now - window.lastClickTime < cooldown)) {
        console.log('⏳ Кулдаун');
        return false;
    }
    
    window.lastClickTime = now;
    
    // Вычисляем силу клика
    let clickPower = 0.000000001;
    if (typeof calculateClickPower === 'function') {
        try {
            clickPower = calculateClickPower();
        } catch (error) {
            console.error('❌ Ошибка calculateClickPower:', error);
        }
    }
    
    // НЕМЕДЛЕННОЕ обновление баланса
    window.userData.balance = (window.userData.balance || 0) + clickPower;
    window.userData.totalEarned = (window.userData.totalEarned || 0) + clickPower;
    window.userData.totalClicks = (window.userData.totalClicks || 0) + 1;
    window.userData.lastUpdate = Date.now();
    
    console.log('💵 Баланс обновлен:', window.userData.balance.toFixed(9));
    
    // НЕМЕДЛЕННОЕ обновление интерфейса
    updateBalanceImmediately();
    
    // Создаем попап
    createClickPopup(event, clickPower);
    
    // Анимация монетки
    const coin = document.getElementById('clickCoin');
    if (coin) {
        coin.style.transform = 'scale(0.95)';
        setTimeout(() => {
            coin.style.transform = 'scale(1)';
        }, 100);
    }
    
    // Быстрое сохранение (без блокировки интерфейса)
    setTimeout(() => {
        saveUserData();
    }, 0);
    
    return false;
}

// Быстрое обновление только баланса
function updateBalanceImmediately() {
    if (!window.userData) return;
    
    const balanceElement = document.getElementById('balanceValue');
    if (balanceElement) {
        balanceElement.textContent = (window.userData.balance || 0.000000100).toFixed(9) + ' S';
    }
    
    const clickValueElement = document.getElementById('clickValue');
    if (clickValueElement) {
        let clickPower = 0.000000001;
        if (typeof calculateClickPower === 'function') {
            try {
                clickPower = calculateClickPower();
            } catch (e) {}
        }
        clickValueElement.textContent = clickPower.toFixed(9);
    }
}

// Сохранение данных
function saveUserData() {
    try {
        if (!window.userData) return;
        
        window.userData.lastUpdate = Date.now();
        localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
        
        if (window.upgrades) {
            const upgradesData = {};
            for (const key in window.upgrades) {
                if (window.upgrades[key] && typeof window.upgrades[key].level !== 'undefined') {
                    upgradesData[key] = window.upgrades[key].level;
                }
            }
            localStorage.setItem('sparkcoin_upgrades_' + window.userData.userId, JSON.stringify(upgradesData));
        }
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
    }
}

// Создание попапа
function createClickPopup(event, amount) {
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
        animation: floatUp 1s ease-out forwards;
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

// Безопасное обновление UI
function safeUpdateUI() {
    if (!window.isDataLoaded || !window.userData) {
        return;
    }
    
    if (typeof updateUI === 'function') {
        updateUI();
    } else {
        updateFallbackUI();
    }
}

// Основная функция инициализации
function initializeApp() {
    console.log('🚀 Инициализация приложения...');
    
    // Инициализация Telegram Web App
    if (typeof tg !== 'undefined') {
        try {
            tg.expand();
            tg.enableClosingConfirmation();
            console.log('✅ Telegram Web App инициализирован');
        } catch (error) {
            console.log('⚠️ Ошибка инициализации Telegram:', error);
        }
    }
    
    // Загружаем данные пользователя
    loadUserData();
    
    // Инициализируем монетку
    initializeCoin();
    
    // Обновляем интерфейс
    setTimeout(() => {
        safeUpdateUI();
    }, 100);
    
    // Обновляем статус API
    window.updateApiStatus('connected', 'Локальный режим');
    
    console.log('✅ Приложение успешно инициализировано');
}

// Запуск приложения
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('🎮 Исправленный main.js загружен и готов к работе!');
