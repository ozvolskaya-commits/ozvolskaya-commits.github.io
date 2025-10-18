// game.js - исправленная игровая логика с системой мультисессии
console.log('🎮 Загружаем исправленный game.js...');

const tg = window.Telegram.WebApp;

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

// ЕДИНАЯ функция получения userID на основе Telegram ID
function getUnifiedUserId() {
    // Для Telegram Web App ВСЕГДА используем telegram.id как основной идентификатор
    if (typeof tg !== 'undefined' && tg.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        
        // ВАЖНО: Используем ТОЛЬКО telegram.id, он одинаковый на всех устройствах
        if (user.id) {
            return `tg_${user.id}`; // Единый формат для всех устройств
        }
        
        // Если нет id, пробуем username (менее надежно)
        if (user.username) {
            return `tg_${user.username.toLowerCase()}`;
        }
    }
    
    // Для веб-версии используем сохраненный ID
    let webId = localStorage.getItem('sparkcoin_unified_user_id');
    if (!webId) {
        webId = 'web_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sparkcoin_unified_user_id', webId);
    }
    return webId;
}

// Получаем Telegram ID для синхронизации
function getTelegramId() {
    if (typeof tg !== 'undefined' && tg.initDataUnsafe?.user?.id) {
        return tg.initDataUnsafe.user.id.toString();
    }
    return null;
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
        } else if (user.id) {
            return `User${user.id}`;
        }
    }
    return 'Игрок';
}

function createNewUserData() {
    const userId = getUnifiedUserId();
    const username = getTelegramUsername();
    const telegramId = getTelegramId();

    console.log('🆔 Создание данных:', { userId, username, telegramId });

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
        telegramId: telegramId,
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

// Загрузка данных пользователя с приоритетом серверных данных
async function loadUserData() {
    const userId = getUnifiedUserId();
    const username = getTelegramUsername();
    const telegramId = getTelegramId();

    console.log('📥 Загрузка данных для:', { userId, username, telegramId });

    try {
        // ПЕРВОЕ: пытаемся загрузить с сервера по telegramId
        console.log('🔍 Поиск данных на сервере...');
        let serverData = null;
        
        if (telegramId) {
            serverData = await loadFromServerByTelegramId(telegramId);
        }
        
        // Если не нашли по telegramId, ищем по userId
        if (!serverData) {
            serverData = await loadFromServer(userId);
        }

        if (serverData) {
            window.userData = serverData;
            console.log('✅ Данные загружены с сервера. Баланс:', window.userData.balance);
        } else {
            // ВТОРОЕ: загружаем из localStorage
            const savedData = localStorage.getItem('sparkcoin_user_data');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                // Проверяем совпадение по userId ИЛИ telegramId
                if (parsedData.userId === userId || parsedData.telegramId === telegramId) {
                    window.userData = createNewUserData();
                    Object.assign(window.userData, parsedData);
                    // Обновляем userId на правильный
                    window.userData.userId = userId;
                    window.userData.telegramId = telegramId;
                    console.log('✅ Данные загружены из localStorage');
                } else {
                    window.userData = createNewUserData();
                    console.log('🆕 Созданы новые данные пользователя (несовпадение ID)');
                }
            } else {
                window.userData = createNewUserData();
                console.log('🆕 Созданы начальные данные пользователя');
            }
            
            // Синхронизируем локальные данные на сервер
            setTimeout(() => syncToServer(), 1000);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        window.userData = createNewUserData();
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
    console.log('👤 Пользователь загружен:', window.userData.username, 'Баланс:', window.userData.balance);
}

// Загрузка данных с сервера по userId
async function loadFromServer(userId) {
    try {
        const response = await window.apiRequest(`/api/sync/unified/${userId}`);
        if (response && response.success && response.userData) {
            return response.userData;
        }
    } catch (error) {
        console.log('📴 Сервер недоступен для userId:', error);
    }
    return null;
}

// Загрузка данных с сервера по telegramId
async function loadFromServerByTelegramId(telegramId) {
    try {
        const response = await window.apiRequest(`/api/sync/telegram/${telegramId}`);
        if (response && response.success && response.userData) {
            console.log('✅ Найден пользователь по telegramId:', telegramId);
            return response.userData;
        }
    } catch (error) {
        console.log('📴 Сервер недоступен для telegramId:', error);
    }
    return null;
}

// Синхронизация на сервер
async function syncToServer() {
    if (!window.userData) return false;
    
    try {
        const syncData = {
            userId: window.userData.userId,
            username: window.userData.username,
            balance: window.userData.balance,
            totalEarned: window.userData.totalEarned,
            totalClicks: window.userData.totalClicks,
            upgrades: window.upgrades,
            lastUpdate: Date.now(),
            telegramId: window.userData.telegramId
        };
        
        console.log('🔄 Синхронизация на сервер:', syncData.userId, syncData.telegramId);
        
        const response = await window.apiRequest('/api/sync/unified', {
            method: 'POST',
            body: JSON.stringify(syncData)
        });
        
        if (response && response.success) {
            console.log('✅ Данные синхронизированы на сервер');
            
            // Если сервер вернул другой userId (при объединении записей)
            if (response.userId && response.userId !== window.userData.userId) {
                console.log(`🆔 Объединение записей: ${window.userData.userId} -> ${response.userId}`);
                window.userData.userId = response.userId;
                saveUserData();
            }
            
            return true;
        }
    } catch (error) {
        console.log('📴 Ошибка синхронизации с сервером');
    }
    return false;
}

function initializeCoin() {
    console.log('🎯 Инициализация монетки...');
    
    const coin = document.getElementById('clickCoin');
    
    if (!coin) {
        console.log('⏳ Монетка не найдена, повтор через 1 секунду...');
        setTimeout(initializeCoin, 1000);
        return;
    }
    
    console.log('✅ Монетка найдена');
    
    const newCoin = coin.cloneNode(true);
    coin.parentNode.replaceChild(newCoin, coin);
    
    const freshCoin = document.getElementById('clickCoin');
    
    freshCoin.addEventListener('click', handleCoinClick, true);
    freshCoin.addEventListener('touchstart', handleCoinClick, { 
        passive: false, 
        capture: true 
    });
    
    freshCoin.style.cursor = 'pointer';
    freshCoin.style.webkitTapHighlightColor = 'transparent';
    freshCoin.style.touchAction = 'manipulation';
    freshCoin.style.userSelect = 'none';
    freshCoin.style.webkitUserSelect = 'none';
    
    freshCoin.removeAttribute('href');
    freshCoin.removeAttribute('onclick');
    freshCoin.onclick = null;
    
    console.log('✅ Обработчики монетки установлены');
}

function handleCoinClick(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    if (event.type === 'touchstart') {
        event.preventDefault();
    }
    
    if (!window.userData || !window.isDataLoaded) {
        console.error('❌ userData не загружен');
        return false;
    }
    
    if (window.antiCheatBlocked) {
        console.log('⏸️ Античит заблокирован');
        return false;
    }
    
    const now = Date.now();
    const cooldown = 25;
    if (window.lastClickTime && (now - window.lastClickTime < cooldown)) {
        return false;
    }
    
    window.lastClickTime = now;
    
    let clickPower = 0.000000001;
    if (typeof calculateClickPower === 'function') {
        try {
            clickPower = calculateClickPower();
        } catch (error) {
            console.error('❌ Ошибка calculateClickPower:', error);
        }
    }
    
    window.userData.balance = (window.userData.balance || 0) + clickPower;
    window.userData.totalEarned = (window.userData.totalEarned || 0) + clickPower;
    window.userData.totalClicks = (window.userData.totalClicks || 0) + 1;
    window.userData.lastUpdate = Date.now();
    
    updateBalanceImmediately();
    createClickPopup(event, clickPower);
    
    const coin = document.getElementById('clickCoin');
    if (coin) {
        coin.style.transform = 'scale(0.95)';
        setTimeout(() => {
            coin.style.transform = 'scale(1)';
        }, 100);
    }
    
    setTimeout(() => {
        saveUserData();
    }, 0);
    
    return false;
}

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
        
        // Автосинхронизация с сервером
        setTimeout(() => syncToServer(), 500);
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
    }
}

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

function calculateMiningSpeed() {
    let speed = 0.000000000;
    
    for (const key in window.upgrades) {
        if ((key.startsWith('gpu') || key.startsWith('cpu')) && window.upgrades[key]) {
            const level = window.upgrades[key].level || 0;
            const upgrade = UPGRADES[key];
            if (upgrade) {
                speed += level * upgrade.baseBonus;
            }
        }
    }
    
    return speed;
}

function updateUI() {
    if (!window.userData) return;
    
    const balanceElement = document.getElementById('balanceValue');
    const clickValueElement = document.getElementById('clickValue');
    const clickSpeedElement = document.getElementById('clickSpeed');
    const mineSpeedElement = document.getElementById('mineSpeed');
    
    if (balanceElement) {
        balanceElement.textContent = (window.userData.balance || 0.000000100).toFixed(9) + ' S';
    }
    
    if (clickValueElement) {
        clickValueElement.textContent = calculateClickPower().toFixed(9);
    }
    
    if (clickSpeedElement) {
        clickSpeedElement.textContent = calculateClickPower().toFixed(9) + ' S/сек';
    }
    
    if (mineSpeedElement) {
        mineSpeedElement.textContent = calculateMiningSpeed().toFixed(9) + ' S/сек';
    }
}

function buyUpgrade(upgradeId) {
    if (!window.userData || !UPGRADES[upgradeId]) return;
    
    const upgrade = UPGRADES[upgradeId];
    const currentLevel = window.upgrades[upgradeId] || 0;
    const price = upgrade.basePrice * Math.pow(2, currentLevel);
    
    if (window.userData.balance >= price) {
        window.userData.balance -= price;
        window.upgrades[upgradeId] = currentLevel + 1;
        
        updateUI();
        updateShopUI();
        saveUserData();
        
        showNotification(`Улучшение "${upgrade.name}" куплено!`, 'success');
    } else {
        showNotification('Недостаточно средств', 'error');
    }
}

function updateShopUI() {
    for (const upgradeId in UPGRADES) {
        const upgrade = UPGRADES[upgradeId];
        const currentLevel = window.upgrades[upgradeId] || 0;
        const price = upgrade.basePrice * Math.pow(2, currentLevel);
        
        const ownedElement = document.getElementById(upgradeId + '-owned');
        const priceElement = document.getElementById(upgradeId + '-price');
        
        if (ownedElement) ownedElement.textContent = currentLevel;
        if (priceElement) priceElement.textContent = price.toFixed(9);
        
        const buyButton = document.querySelector(`[onclick="buyUpgrade('${upgradeId}')"]`);
        if (buyButton) {
            if (window.userData && window.userData.balance >= price) {
                buyButton.disabled = false;
                buyButton.textContent = 'Купить';
            } else {
                buyButton.disabled = true;
                buyButton.textContent = 'Недостаточно средств';
            }
        }
    }
}

function showNotification(message, type = 'info') {
    console.log('🔔 ' + type + ': ' + message);
    
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Основная функция инициализации с проверкой мультисессии
async function initializeApp() {
    console.log('🚀 Инициализация приложения...');
    
    // ПРОВЕРКА МУЛЬТИСЕССИИ ПЕРЕД ЗАГРУЗКОЙ
    if (window.multiSessionDetector) {
        const status = window.multiSessionDetector.getStatus();
        if (status.isBlocked) {
            console.log('🚫 Сессия заблокирована, перенаправляем...');
            window.location.href = 'multisession-warning.html';
            return;
        }
    }
    
    if (typeof tg !== 'undefined') {
        try {
            tg.expand();
            tg.enableClosingConfirmation();
            console.log('✅ Telegram Web App инициализирован');
        } catch (error) {
            console.log('⚠️ Ошибка инициализации Telegram:', error);
        }
    }
    
    // Запускаем мониторинг мультисессии
    setTimeout(() => {
        if (window.multiSessionDetector) {
            const status = window.multiSessionDetector.getStatus();
            if (status.isMultiSession && status.timeSinceLastActivity < 15000) {
                console.log('🚨 Обнаружена мультисессия, перенаправляем...');
                window.location.href = 'multisession-warning.html';
                return;
            }
            window.multiSessionDetector.startMonitoring();
        }
    }, 3000);
    
    await loadUserData();
    initializeCoin();
    
    setTimeout(() => {
        updateUI();
        updateShopUI();
    }, 100);
    
    setTimeout(() => {
        if (typeof showSection === 'function') {
            showSection('main');
        }
    }, 500);
    
    console.log('✅ Приложение инициализировано');
}

// Запуск приложения
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('🎮 game.js загружен и готов к работе!');
