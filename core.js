// core.js - ПОЛНАЯ ОБЪЕДИНЕННАЯ ВЕРСИЯ БЕЗ УДАЛЕНИЙ
console.log('🎮 Загружаем core.js - полная объединенная версия...');

const tg = window.Telegram?.WebApp;

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
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
window.incomeInterval = null;
window.saveInterval = null;

// ========== КОНФИГУРАЦИЯ ==========
const CONFIG = {
    CLICK_COOLDOWN: 100,
    ANTI_CHEAT_CLICKS: 20,
    ANTI_CHEAT_WINDOW: 2000,
    ANTI_CHEAT_BLOCK_TIME: 30000,
    INCOME_INTERVAL: 1000,
    SAVE_INTERVAL: 30000,
    BASE_CLICK_POWER: 0.000000001,
    BASE_MINING_SPEED: 0.000000000
};

// ========== УЛУЧШЕНИЯ ==========
const UPGRADES = {
    gpu1: { name: "Интегрированная видеокарта", basePrice: 0.000000016, baseBonus: 0.000000001, type: "mining" },
    gpu2: { name: "Видеокарта-затычка", basePrice: 0.000000256, baseBonus: 0.000000008, type: "mining" },
    gpu3: { name: "Видеокарта Mining V100", basePrice: 0.000004096, baseBonus: 0.000000064, type: "mining" },
    gpu4: { name: "Супер мощная видеокарта Mining V1000", basePrice: 0.000065536, baseBonus: 0.000000512, type: "mining" },
    gpu5: { name: "Квантовая видеокарта Mining Q100", basePrice: 0.001048576, baseBonus: 0.000004096, type: "mining" },
    gpu6: { name: "Видеокарта Думатель 42", basePrice: 0.016777216, baseBonus: 0.000032768, type: "mining" },
    gpu7: { name: "Видеокарта Blue Earth 54", basePrice: 0.268435456, baseBonus: 0.000262144, type: "mining" },
    gpu8: { name: "Видеокарта Big Bang", basePrice: 4.294967296, baseBonus: 0.002097152, type: "mining" },

    cpu1: { name: "Обычный процессор", basePrice: 0.000000032, baseBonus: 0.000000001, type: "mining" },
    cpu2: { name: "Процессор Miner X100", basePrice: 0.000000512, baseBonus: 0.000000008, type: "mining" },
    cpu3: { name: "Супер процессор Miner X1000", basePrice: 0.000008192, baseBonus: 0.000000064, type: "mining" },
    cpu4: { name: "Квантовый процессор Miner X10000", basePrice: 0.000131072, baseBonus: 0.000000512, type: "mining" },
    cpu5: { name: "Кроховселенный процессор", basePrice: 0.002097152, baseBonus: 0.000004096, type: "mining" },
    cpu6: { name: "Минивселенный процессор", basePrice: 0.033554432, baseBonus: 0.000032768, type: "mining" },
    cpu7: { name: "Микровселенный процессор", basePrice: 0.536870912, baseBonus: 0.000262144, type: "mining" },
    cpu8: { name: "Мультивселенный процессор", basePrice: 8.589934592, baseBonus: 0.002097152, type: "mining" },

    mouse1: { name: "Обычная мышка", basePrice: 0.000000064, baseBonus: 0.000000004, type: "click" },
    mouse2: { name: "Мышка с автокликером", basePrice: 0.000001024, baseBonus: 0.000000008, type: "click" },
    mouse3: { name: "Мышка с макросами", basePrice: 0.000016384, baseBonus: 0.000000064, type: "click" },
    mouse4: { name: "Мышка программиста", basePrice: 0.000262144, baseBonus: 0.000000512, type: "click" },
    mouse5: { name: "Мышка Сатоси Накамото", basePrice: 0.004194304, baseBonus: 0.000004096, type: "click" },
    mouse6: { name: "Мышка хакера", basePrice: 0.067108864, baseBonus: 0.000032768, type: "click" },
    mouse7: { name: "Мышка Сноулена", basePrice: 1.073741824, baseBonus: 0.000262144, type: "click" },
    mouse8: { name: "Мышка Админа", basePrice: 17.179869184, baseBonus: 0.002097152, type: "click" }
};

// ========== API ФУНКЦИИ (ЗАГЛУШКИ) ==========
if (typeof window.apiRequest === 'undefined') {
    window.apiRequest = async function(url, options = {}) {
        console.log('📡 API Request (заглушка):', url);
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: false, error: 'API недоступно в локальном режиме' };
    };
}

if (typeof window.checkApiConnection === 'undefined') {
    window.checkApiConnection = function() {
        console.log('📡 checkApiConnection (заглушка)');
        window.updateApiStatus('connected', 'Локальный режим');
        return true;
    };
}

if (typeof window.saveUserDataToAPI === 'undefined') {
    window.saveUserDataToAPI = function() {
        console.log('💾 saveUserDataToAPI (заглушка)');
        return Promise.resolve(true);
    };
}

if (typeof window.syncPlayerDataWithAPI === 'undefined') {
    window.syncPlayerDataWithAPI = function() {
        console.log('🔄 syncPlayerDataWithAPI (заглушка)');
        return Promise.resolve(true);
    };
}

if (typeof window.loadAllPlayers === 'undefined') {
    window.loadAllPlayers = function() {
        console.log('👥 loadAllPlayers (заглушка)');
        window.allPlayers = [{
            userId: 'demo_player_1',
            username: 'Демо Игрок 1',
            balance: 0.000000500,
            totalEarned: 0.000001000,
            totalClicks: 50,
            mineSpeed: 0.000000001,
            clickSpeed: 0.000000002,
            lastUpdate: new Date().toISOString()
        }];
    };
}

// ========== ФУНКЦИИ ИЗ MAIN.JS ==========

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

// Базовые функции из main.js
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

function getTelegramUsername_main() {
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

function createNewUserData_main(userId, username) {
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

// Загрузка данных пользователя из main.js
function loadUserData_main() {
    const userId = getTelegramUserId();
    const username = getTelegramUsername_main();

    try {
        const savedData = localStorage.getItem('sparkcoin_user_data');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            if (parsedData.userId === userId) {
                window.userData = createNewUserData_main(userId, username);
                Object.assign(window.userData, parsedData);
                window.lastUpdateTime = window.userData.lastUpdate || Date.now();
                console.log('✅ Данные пользователя загружены из localStorage (main)');
            } else {
                window.userData = createNewUserData_main(userId, username);
                console.log('🆕 Созданы новые данные пользователя (main)');
            }
        } else {
            window.userData = createNewUserData_main(userId, username);
            console.log('🆕 Созданы начальные данные пользователя (main)');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки данных (main):', error);
        window.userData = createNewUserData_main(userId, username);
    }

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
            console.log('✅ Улучшения загружены (main)');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки улучшений (main):', error);
    }

    window.isDataLoaded = true;
    console.log('👤 Пользователь (main):', window.userData.username, 'Баланс:', window.userData.balance);
}

// Аварийное обновление UI из main.js
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

// УЛУЧШЕННАЯ инициализация монетки из main.js
function initializeCoin_main() {
    console.log('🎯 Инициализация монетки (main)...');
    
    const coin = document.getElementById('clickCoin');
    
    if (!coin) {
        console.log('⏳ Монетка не найдена, повтор через 1 секунду...');
        setTimeout(initializeCoin_main, 1000);
        return;
    }
    
    console.log('✅ Монетка найдена (main)');
    
    const newCoin = coin.cloneNode(true);
    coin.parentNode.replaceChild(newCoin, coin);
    
    const freshCoin = document.getElementById('clickCoin');
    
    freshCoin.addEventListener('click', handleCoinClick_main, true);
    freshCoin.addEventListener('touchstart', handleCoinClick_main, { 
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
    
    console.log('✅ Обработчики монетки установлены (main)');
}

// УЛУЧШЕННЫЙ обработчик кликов из main.js
function handleCoinClick_main(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    if (event.type === 'touchstart') {
        event.preventDefault();
    }
    
    console.log('💰 Клик по монетке (main):', event.type);
    
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
        console.log('⏳ Кулдаун');
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
    
    console.log('💵 Баланс обновлен (main):', window.userData.balance.toFixed(9));
    
    updateBalanceImmediately_main();
    createClickPopup_main(event, clickPower);
    
    const coin = document.getElementById('clickCoin');
    if (coin) {
        coin.style.transform = 'scale(0.95)';
        setTimeout(() => {
            coin.style.transform = 'scale(1)';
        }, 100);
    }
    
    setTimeout(() => {
        saveUserData_main();
    }, 0);
    
    return false;
}

// Быстрое обновление только баланса из main.js
function updateBalanceImmediately_main() {
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

// Сохранение данных из main.js
function saveUserData_main() {
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
        console.error('❌ Ошибка сохранения (main):', error);
    }
}

// Создание попапа из main.js
function createClickPopup_main(event, amount) {
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

// Добавление CSS анимации из main.js
function addPopupAnimation_main() {
    if (!document.querySelector('#popup-animation')) {
        const style = document.createElement('style');
        style.id = 'popup-animation';
        style.textContent = `
            @keyframes floatUp {
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
        `;
        document.head.appendChild(style);
    }
}

// Безопасное обновление UI из main.js
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

// ========== ФУНКЦИИ ИЗ GAME.JS ==========

// Получение UserID из game.js
function getUnifiedUserId() {
    if (typeof tg !== 'undefined' && tg?.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        if (user.id) return `tg_${user.id}`;
        if (user.username) return `tg_${user.username.toLowerCase()}`;
    }
    
    let webId = localStorage.getItem('sparkcoin_unified_user_id');
    if (!webId) {
        webId = 'web_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sparkcoin_unified_user_id', webId);
    }
    return webId;
}

function getTelegramId() {
    return typeof tg !== 'undefined' && tg?.initDataUnsafe?.user?.id ? tg.initDataUnsafe.user.id.toString() : null;
}

function getTelegramUsername_game() {
    if (typeof tg === 'undefined') return 'Веб-Игрок';
    
    const user = tg?.initDataUnsafe?.user;
    if (user) {
        if (user.username) return '@' + user.username;
        if (user.first_name) return user.first_name;
        if (user.id) return `User${user.id}`;
    }
    return 'Игрок';
}

// Создание новых данных пользователя из game.js
function createNewUserData_game() {
    const userId = getUnifiedUserId();
    const username = getTelegramUsername_game();
    const telegramId = getTelegramId();

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
        transfers: { sent: 0, received: 0 },
        referralEarnings: 0,
        referralsCount: 0,
        totalWinnings: 0,
        totalLosses: 0,
        upgrades: {},
        lastDeviceId: window.multiSessionDetector ? window.multiSessionDetector.generateDeviceId() : 'unknown'
    };
}

// Загрузка данных пользователя из game.js
async function loadUserData_game() {
    const userId = getUnifiedUserId();
    const username = getTelegramUsername_game();
    const telegramId = getTelegramId();

    console.log('📥 Загрузка данных для (game):', { userId, username, telegramId });

    try {
        let serverData = null;
        if (telegramId) {
            serverData = await loadFromServerByTelegramId(telegramId);
        }
        if (!serverData) {
            serverData = await loadFromServer(userId);
        }

        if (serverData) {
            window.userData = serverData;
            window.upgrades = serverData.upgrades || {};
            console.log('✅ Данные загружены с сервера (game). Баланс:', window.userData.balance);
        } else {
            const savedData = localStorage.getItem('sparkcoin_user_data');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                if (parsedData.userId === userId || parsedData.telegramId === telegramId) {
                    window.userData = createNewUserData_game();
                    Object.assign(window.userData, parsedData);
                    window.userData.userId = userId;
                    window.userData.telegramId = telegramId;
                    console.log('✅ Данные загружены из localStorage (game)');
                } else {
                    window.userData = createNewUserData_game();
                    console.log('🆕 Созданы новые данные (game)');
                }
            } else {
                window.userData = createNewUserData_game();
                console.log('🆕 Созданы начальные данные (game)');
            }
            
            try {
                const savedUpgrades = localStorage.getItem('sparkcoin_upgrades_' + userId);
                if (savedUpgrades) {
                    window.upgrades = JSON.parse(savedUpgrades);
                    window.userData.upgrades = window.upgrades;
                } else {
                    window.upgrades = {};
                    window.userData.upgrades = {};
                }
            } catch (error) {
                console.error('❌ Ошибка загрузки улучшений (game):', error);
                window.upgrades = {};
                window.userData.upgrades = {};
            }
            
            setTimeout(() => syncToServer_game(), 1000);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки данных (game):', error);
        window.userData = createNewUserData_game();
        window.upgrades = {};
    }

    window.isDataLoaded = true;
    console.log('👤 Пользователь загружен (game):', window.userData.username);
}

// Серверные функции из game.js
async function loadFromServer(userId) {
    try {
        const response = await window.apiRequest(`/api/sync/unified/${userId}`);
        if (response && response.success && response.userData) {
            return response.userData;
        }
    } catch (error) {
        console.log('📴 Сервер недоступен для userId');
    }
    return null;
}

async function loadFromServerByTelegramId(telegramId) {
    try {
        const response = await window.apiRequest(`/api/sync/telegram/${telegramId}`);
        if (response && response.success && response.userData) {
            console.log('✅ Найден пользователь по telegramId:', telegramId);
            return response.userData;
        }
    } catch (error) {
        console.log('📴 Сервер недоступен для telegramId');
    }
    return null;
}

async function syncToServer_game() {
    if (!window.userData) return false;
    
    try {
        const syncData = {
            userId: window.userData.userId,
            username: window.userData.username,
            balance: parseFloat(window.userData.balance),
            totalEarned: parseFloat(window.userData.totalEarned),
            totalClicks: window.userData.totalClicks,
            upgrades: window.upgrades,
            lastUpdate: Date.now(),
            telegramId: window.userData.telegramId,
            deviceId: window.multiSessionDetector ? window.multiSessionDetector.generateDeviceId() : 'unknown'
        };
        
        console.log('🔄 Синхронизация на сервер (game):', syncData.userId);
        
        const response = await window.apiRequest('/api/sync/unified', {
            method: 'POST',
            body: JSON.stringify(syncData)
        });
        
        if (response && response.success) {
            console.log('✅ Данные синхронизированы на сервер (game)');
            if (response.userId && response.userId !== window.userData.userId) {
                console.log(`🆔 Объединение записей: ${window.userData.userId} -> ${response.userId}`);
                window.userData.userId = response.userId;
                saveUserData_game();
            }
            return true;
        }
    } catch (error) {
        console.log('📴 Ошибка синхронизации с сервером (game)');
    }
    return false;
}

// Инициализация монетки из game.js
function initializeCoin_game() {
    console.log('🎯 Инициализация монетки (game)...');
    
    const coin = document.getElementById('clickCoin');
    if (!coin) {
        setTimeout(initializeCoin_game, 1000);
        return;
    }
    
    const newCoin = coin.cloneNode(true);
    coin.parentNode.replaceChild(newCoin, coin);
    
    const freshCoin = document.getElementById('clickCoin');
    
    freshCoin.addEventListener('click', handleCoinClick_game);
    freshCoin.addEventListener('touchstart', handleCoinClick_game, { passive: false });
    
    freshCoin.style.cursor = 'pointer';
    freshCoin.style.webkitTapHighlightColor = 'transparent';
    freshCoin.style.touchAction = 'manipulation';
    freshCoin.style.userSelect = 'none';
    freshCoin.style.webkitUserSelect = 'none';
    
    console.log('✅ Обработчики монетки установлены (game)');
}

// Обработка клика из game.js
function handleCoinClick_game(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!window.userData || !window.isDataLoaded) {
        console.error('❌ userData не загружен');
        return false;
    }
    
    if (window.antiCheatBlocked) {
        console.log('⏸️ Античит заблокирован');
        return false;
    }
    
    const now = Date.now();
    if (window.lastClickTime && (now - window.lastClickTime < CONFIG.CLICK_COOLDOWN)) {
        return false;
    }
    
    window.clickTimes.push(now);
    window.clickTimes = window.clickTimes.filter(time => now - time < CONFIG.ANTI_CHEAT_WINDOW);
    
    if (window.clickTimes.length > CONFIG.ANTI_CHEAT_CLICKS) {
        triggerAntiCheat_game();
        return false;
    }
    
    window.lastClickTime = now;
    
    const clickPower = calculateClickPower();
    window.userData.balance = parseFloat(window.userData.balance) + clickPower;
    window.userData.totalEarned = parseFloat(window.userData.totalEarned) + clickPower;
    window.userData.totalClicks = (window.userData.totalClicks || 0) + 1;
    window.userData.lastUpdate = Date.now();
    
    updateBalanceImmediately_game();
    createClickPopup_game(event, clickPower);
    
    const coin = document.getElementById('clickCoin');
    if (coin) {
        coin.style.transform = 'scale(0.95)';
        setTimeout(() => coin.style.transform = 'scale(1)', 100);
    }
    
    saveUserData_game();
    
    return false;
}

function triggerAntiCheat_game() {
    console.log('🚫 Античит активирован (game)!');
    window.antiCheatBlocked = true;
    
    const antiCheat = document.getElementById('antiCheat');
    if (antiCheat) {
        antiCheat.style.display = 'flex';
    }
    
    showNotification_game('Обнаружена подозрительная активность! Игра приостановлена на 30 секунд.', 'warning');
    
    window.antiCheatTimeout = setTimeout(() => {
        window.antiCheatBlocked = false;
        window.clickTimes = [];
        if (antiCheat) antiCheat.style.display = 'none';
        showNotification_game('Античит деактивирован. Можете продолжать играть.', 'success');
    }, CONFIG.ANTI_CHEAT_BLOCK_TIME);
}

// Обновление UI из game.js
function updateBalanceImmediately_game() {
    if (!window.userData) return;
    
    const balanceElement = document.getElementById('balanceValue');
    const clickValueElement = document.getElementById('clickValue');
    const clickSpeedElement = document.getElementById('clickSpeed');
    const mineSpeedElement = document.getElementById('mineSpeed');
    
    if (balanceElement) {
        balanceElement.textContent = parseFloat(window.userData.balance).toFixed(9) + ' S';
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

function updateUI_game() {
    updateBalanceImmediately_game();
}

// Расчет силы клика из game.js
function calculateClickPower() {
    let basePower = CONFIG.BASE_CLICK_POWER;
    
    for (const key in window.upgrades) {
        if (key.startsWith('mouse') && window.upgrades[key] > 0) {
            const upgrade = UPGRADES[key];
            if (upgrade && upgrade.type === 'click') {
                basePower += window.upgrades[key] * upgrade.baseBonus;
            }
        }
    }
    
    return basePower;
}

// Расчет скорости майнинга из game.js
function calculateMiningSpeed() {
    let speed = CONFIG.BASE_MINING_SPEED;
    
    for (const key in window.upgrades) {
        if ((key.startsWith('gpu') || key.startsWith('cpu')) && window.upgrades[key] > 0) {
            const upgrade = UPGRADES[key];
            if (upgrade && upgrade.type === 'mining') {
                speed += window.upgrades[key] * upgrade.baseBonus;
            }
        }
    }
    
    return speed;
}

// Система улучшений из game.js
function buyUpgrade_game(upgradeId) {
    if (!window.userData || !UPGRADES[upgradeId]) {
        showNotification_game('Ошибка покупки улучшения', 'error');
        return;
    }
    
    const upgrade = UPGRADES[upgradeId];
    const currentLevel = window.upgrades[upgradeId] || 0;
    const price = upgrade.basePrice * Math.pow(2, currentLevel);
    
    if (parseFloat(window.userData.balance) >= price) {
        window.userData.balance = parseFloat(window.userData.balance) - price;
        window.upgrades[upgradeId] = currentLevel + 1;
        window.userData.upgrades = window.upgrades;
        
        updateUI_game();
        updateShopUI_game();
        saveUserData_game();
        
        showNotification_game(`Улучшение "${upgrade.name}" куплено!`, 'success');
    } else {
        showNotification_game('Недостаточно средств для покупки', 'error');
    }
}

function updateShopUI_game() {
    if (!window.userData) return;
    
    for (const upgradeId in UPGRADES) {
        const upgrade = UPGRADES[upgradeId];
        const currentLevel = window.upgrades[upgradeId] || 0;
        const price = upgrade.basePrice * Math.pow(2, currentLevel);
        
        const ownedElement = document.getElementById(upgradeId + '-owned');
        const priceElement = document.getElementById(upgradeId + '-price');
        
        if (ownedElement) ownedElement.textContent = currentLevel;
        if (priceElement) priceElement.textContent = price.toFixed(9);
        
        const buyButton = document.querySelector(`button[onclick="buyUpgrade('${upgradeId}')"]`);
        if (buyButton) {
            const canAfford = parseFloat(window.userData.balance) >= price;
            buyButton.disabled = !canAfford;
            buyButton.textContent = canAfford ? 'Купить' : 'Недостаточно средств';
            buyButton.style.opacity = canAfford ? '1' : '0.6';
        }
    }
}

// Пассивный доход из game.js
function startPassiveIncome_game() {
    if (window.incomeInterval) clearInterval(window.incomeInterval);
    
    window.incomeInterval = setInterval(() => {
        if (window.userData && window.isDataLoaded) {
            const miningSpeed = calculateMiningSpeed();
            if (miningSpeed > 0) {
                window.userData.balance = parseFloat(window.userData.balance) + miningSpeed;
                window.userData.totalEarned = parseFloat(window.userData.totalEarned) + miningSpeed;
                updateUI_game();
                
                window.accumulatedIncome += miningSpeed;
                if (window.accumulatedIncome >= 0.000000100) {
                    saveUserData_game();
                    window.accumulatedIncome = 0;
                }
            }
        }
    }, CONFIG.INCOME_INTERVAL);
}

// Сохранение данных из game.js
function saveUserData_game() {
    try {
        if (!window.userData) return;
        
        window.userData.lastUpdate = Date.now();
        window.userData.upgrades = window.upgrades;
        
        localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
        localStorage.setItem('sparkcoin_upgrades_' + window.userData.userId, JSON.stringify(window.upgrades));
        
        setTimeout(() => syncToServer_game(), 500);
        
    } catch (error) {
        console.error('❌ Ошибка сохранения (game):', error);
    }
}

// Автосохранение из game.js
function startAutoSave_game() {
    if (window.saveInterval) clearInterval(window.saveInterval);
    
    window.saveInterval = setInterval(() => {
        if (window.userData && window.isDataLoaded) {
            saveUserData_game();
            console.log('💾 Автосохранение выполнено (game)');
        }
    }, CONFIG.SAVE_INTERVAL);
}

// Вспомогательные функции из game.js
function createClickPopup_game(event, amount) {
    let x, y;
    
    if (event.touches && event.touches[0]) {
        x = event.touches[0].clientX;
        y = event.touches[0].clientY;
    } else {
        x = event.clientX;
        y = event.clientY;
    }
    
    const popup = document.createElement('div');
    popup.className = 'click-popup';
    popup.textContent = '+' + amount.toFixed(9);
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    
    document.body.appendChild(popup);
    
    setTimeout(() => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    }, 1000);
}

function showNotification_game(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    
    console.log('🔔 ' + type + ': ' + message);
}

// ========== BALANCE-FIX.JS ФУНКЦИИ ==========

class BalanceFixer {
    constructor() {
        this.balanceKey = 'sparkcoin_balance_fixed';
        this.lastSyncKey = 'sparkcoin_last_sync_fixed';
    }

    async loadUserDataGuaranteed() {
        console.log('📥 ГАРАНТИРОВАННАЯ загрузка данных...');
        
        const userId = this.getUnifiedUserId();
        const telegramId = this.getTelegramId();
        
        let serverData = await this.loadFromServer(telegramId, userId);
        
        if (serverData) {
            console.log('✅ Данные с сервера:', serverData.balance);
            this.applyServerData(serverData);
            return;
        }
        
        const localData = this.loadFromLocalStorage(userId);
        if (localData) {
            console.log('✅ Данные из localStorage:', localData.balance);
            window.userData = localData;
            return;
        }
        
        console.log('🆕 Создаем новые данные');
        window.userData = this.createNewUserData();
    }

    async loadFromServer(telegramId, userId) {
        try {
            if (telegramId) {
                const response = await apiRequest(`/api/sync/telegram/${telegramId}`);
                if (response && response.success && response.userData) {
                    return response.userData;
                }
            }
            
            const response = await apiRequest(`/api/sync/unified/${userId}`);
            if (response && response.success && response.userData) {
                return response.userData;
            }
        } catch (error) {
            console.log('📴 Сервер недоступен');
        }
        return null;
    }

    loadFromLocalStorage(userId) {
        try {
            const savedData = localStorage.getItem('sparkcoin_user_data');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                if (parsedData.userId === userId || parsedData.telegramId === this.getTelegramId()) {
                    return parsedData;
                }
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки из localStorage');
        }
        return null;
    }

    applyServerData(serverData) {
        const localData = this.loadFromLocalStorage(this.getUnifiedUserId());
        
        if (localData) {
            serverData.balance = Math.max(serverData.balance, localData.balance);
            serverData.totalEarned = Math.max(serverData.totalEarned, localData.totalEarned);
            serverData.totalClicks = Math.max(serverData.totalClicks, localData.totalClicks);
        }
        
        window.userData = serverData;
        this.saveUserDataGuaranteed();
    }

    saveUserDataGuaranteed() {
        if (!window.userData) return;
        
        try {
            localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
            localStorage.setItem(this.balanceKey, window.userData.balance.toString());
            localStorage.setItem(this.lastSyncKey, Date.now().toString());
            
            console.log('💾 Данные СОХРАНЕНЫ:', window.userData.balance);
            this.syncToServer();
            
        } catch (error) {
            console.error('❌ Критическая ошибка сохранения:', error);
        }
    }

    async syncToServer() {
        if (!window.userData) return;
        
        try {
            const syncData = {
                userId: window.userData.userId,
                telegramId: window.userData.telegramId,
                username: window.userData.username,
                balance: window.userData.balance,
                totalEarned: window.userData.totalEarned,
                totalClicks: window.userData.totalClicks,
                upgrades: window.upgrades,
                deviceId: window.hardSessionBlocker ? window.hardSessionBlocker.generateSuperDeviceId() : 'unknown'
            };
            
            const response = await apiRequest('/api/sync/unified', {
                method: 'POST',
                body: JSON.stringify(syncData)
            });
            
            if (response && response.success) {
                console.log('✅ Синхронизировано с сервером');
            }
        } catch (error) {
            console.log('📴 Ошибка синхронизации');
        }
    }

    restoreBalance() {
        const savedBalance = localStorage.getItem(this.balanceKey);
        if (savedBalance && window.userData) {
            const balance = parseFloat(savedBalance);
            if (balance > window.userData.balance) {
                console.log('💰 ВОССТАНАВЛИВАЕМ баланс:', balance);
                window.userData.balance = balance;
            }
        }
    }

    getUnifiedUserId() {
        if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user?.id) {
            return `tg_${Telegram.WebApp.initDataUnsafe.user.id}`;
        }
        return localStorage.getItem('sparkcoin_unified_user_id') || 'web_user';
    }

    getTelegramId() {
        if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user?.id) {
            return Telegram.WebApp.initDataUnsafe.user.id.toString();
        }
        return null;
    }

    createNewUserData() {
        return {
            userId: this.getUnifiedUserId(),
            username: this.getTelegramUsername(),
            balance: 0.000000100,
            totalEarned: 0.000000100,
            totalClicks: 0,
            lastUpdate: Date.now(),
            telegramId: this.getTelegramId()
        };
    }

    getTelegramUsername() {
        if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user) {
            const user = Telegram.WebApp.initDataUnsafe.user;
            return user.username ? `@${user.username}` : user.first_name || 'Игрок';
        }
        return 'Веб-Игрок';
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ И ВЫБОР РАБОЧИХ ФУНКЦИЙ ==========

// Выбираем какие функции использовать (приоритет game.js)
window.calculateClickPower = calculateClickPower;
window.calculateMiningSpeed = calculateMiningSpeed;
window.buyUpgrade = buyUpgrade_game;
window.updateUI = updateUI_game;
window.updateShopUI = updateShopUI_game;

// Инициализация баланс фиксера
window.balanceFixer = new BalanceFixer();

// Основная инициализация приложения
async function initializeApp() {
    console.log('🚀 Инициализация приложения...');
    
    if (typeof tg !== 'undefined') {
        try {
            tg.expand();
            tg.enableClosingConfirmation();
            console.log('✅ Telegram Web App инициализирован');
        } catch (error) {
            console.log('⚠️ Ошибка инициализации Telegram:', error);
        }
    }
    
    addPopupAnimation_main();
    
    // Используем game.js версию загрузки данных
    await loadUserData_game();
    
    // Используем main.js версию инициализации монетки (более надежная)
    initializeCoin_main();
    
    setTimeout(() => {
        updateUI_game();
        updateShopUI_game();
    }, 100);
    
    setTimeout(() => {
        if (typeof showSection === 'function') {
            showSection('main');
        }
    }, 500);
    
    startPassiveIncome_game();
    startAutoSave_game();
    
    // Инициализация баланс фиксера
    await window.balanceFixer.loadUserDataGuaranteed();
    window.balanceFixer.restoreBalance();
    
    setInterval(() => {
        if (window.userData) {
            window.balanceFixer.saveUserDataGuaranteed();
        }
    }, 5000);
    
    console.log('✅ Приложение успешно инициализировано');
}

// Запуск приложения
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('🎮 core.js загружен! Все три файла объединены без удаления функциональности.');
