// game.js - полностью исправленная версия с мультисессией
console.log('🎮 Загружаем исправленный game.js...');

const tg = window.Telegram?.WebApp;

// Конфигурация
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

// Улучшения (полная версия)
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
window.incomeInterval = null;
window.saveInterval = null;

// РАСЧЕТЫ УЛУЧШЕНИЙ - ПЕРЕМЕЩАЕМ ВВЕРХ ДО ИХ ИСПОЛЬЗОВАНИЯ

// Расчет силы клика
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

// Расчет скорости майнинга
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

// ЕДИНАЯ функция получения userID
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

function getTelegramUsername() {
    if (typeof tg === 'undefined') return 'Веб-Игрок';
    
    const user = tg?.initDataUnsafe?.user;
    if (user) {
        if (user.username) return '@' + user.username;
        if (user.first_name) return user.first_name;
        if (user.id) return `User${user.id}`;
    }
    return 'Игрок';
}

function createNewUserData() {
    const userId = getUnifiedUserId();
    const username = getTelegramUsername();
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

// Загрузка данных пользователя
async function loadUserData() {
    const userId = getUnifiedUserId();
    const username = getTelegramUsername();
    const telegramId = getTelegramId();

    console.log('📥 Загрузка данных для:', { userId, username, telegramId });

    try {
        // Сначала пробуем сервер
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
            console.log('✅ Данные загружены с сервера. Баланс:', window.userData.balance);
        } else {
            // Загружаем из localStorage
            const savedData = localStorage.getItem('sparkcoin_user_data');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                if (parsedData.userId === userId || parsedData.telegramId === telegramId) {
                    window.userData = createNewUserData();
                    Object.assign(window.userData, parsedData);
                    window.userData.userId = userId;
                    window.userData.telegramId = telegramId;
                    console.log('✅ Данные загружены из localStorage');
                } else {
                    window.userData = createNewUserData();
                    console.log('🆕 Созданы новые данные (несовпадение ID)');
                }
            } else {
                window.userData = createNewUserData();
                console.log('🆕 Созданы начальные данные');
            }
            
            // Загружаем улучшения
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
                console.error('❌ Ошибка загрузки улучшений:', error);
                window.upgrades = {};
                window.userData.upgrades = {};
            }
            
            setTimeout(() => syncToServer(), 1000);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        window.userData = createNewUserData();
        window.upgrades = {};
    }

    window.isDataLoaded = true;
    console.log('👤 Пользователь загружен:', window.userData.username);
}

// Серверные функции
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

async function syncToServer() {
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
        
        console.log('🔄 Синхронизация на сервер:', syncData.userId);
        
        const response = await window.apiRequest('/api/sync/unified', {
            method: 'POST',
            body: JSON.stringify(syncData)
        });
        
        if (response && response.success) {
            console.log('✅ Данные синхронизированы на сервер');
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

// Инициализация монетки
function initializeCoin() {
    console.log('🎯 Инициализация монетки...');
    
    const coin = document.getElementById('clickCoin');
    if (!coin) {
        setTimeout(initializeCoin, 1000);
        return;
    }
    
    // Очищаем старые обработчики
    const newCoin = coin.cloneNode(true);
    coin.parentNode.replaceChild(newCoin, coin);
    
    const freshCoin = document.getElementById('clickCoin');
    
    // Добавляем новые обработчики
    freshCoin.addEventListener('click', handleCoinClick);
    freshCoin.addEventListener('touchstart', handleCoinClick, { passive: false });
    
    // Стили для отзывчивости
    freshCoin.style.cursor = 'pointer';
    freshCoin.style.webkitTapHighlightColor = 'transparent';
    freshCoin.style.touchAction = 'manipulation';
    freshCoin.style.userSelect = 'none';
    freshCoin.style.webkitUserSelect = 'none';
    
    console.log('✅ Обработчики монетки установлены');
}

// Обработка клика
function handleCoinClick(event) {
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
    
    // Anti-cheat проверка
    const now = Date.now();
    if (window.lastClickTime && (now - window.lastClickTime < CONFIG.CLICK_COOLDOWN)) {
        return false;
    }
    
    window.clickTimes.push(now);
    window.clickTimes = window.clickTimes.filter(time => now - time < CONFIG.ANTI_CHEAT_WINDOW);
    
    if (window.clickTimes.length > CONFIG.ANTI_CHEAT_CLICKS) {
        triggerAntiCheat();
        return false;
    }
    
    window.lastClickTime = now;
    
    // Начисление за клик
    const clickPower = calculateClickPower();
    window.userData.balance = parseFloat(window.userData.balance) + clickPower;
    window.userData.totalEarned = parseFloat(window.userData.totalEarned) + clickPower;
    window.userData.totalClicks = (window.userData.totalClicks || 0) + 1;
    window.userData.lastUpdate = Date.now();
    
    // Обновление UI
    updateBalanceImmediately();
    createClickPopup(event, clickPower);
    
    // Анимация монетки
    const coin = document.getElementById('clickCoin');
    if (coin) {
        coin.style.transform = 'scale(0.95)';
        setTimeout(() => coin.style.transform = 'scale(1)', 100);
    }
    
    // Автосохранение
    saveUserData();
    
    return false;
}

function triggerAntiCheat() {
    console.log('🚫 Античит активирован!');
    window.antiCheatBlocked = true;
    
    const antiCheat = document.getElementById('antiCheat');
    if (antiCheat) {
        antiCheat.style.display = 'flex';
    }
    
    showNotification('Обнаружена подозрительная активность! Игра приостановлена на 30 секунд.', 'warning');
    
    window.antiCheatTimeout = setTimeout(() => {
        window.antiCheatBlocked = false;
        window.clickTimes = [];
        if (antiCheat) antiCheat.style.display = 'none';
        showNotification('Античит деактивирован. Можете продолжать играть.', 'success');
    }, CONFIG.ANTI_CHEAT_BLOCK_TIME);
}

// Обновление UI
function updateBalanceImmediately() {
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

function updateUI() {
    updateBalanceImmediately();
}

// Система улучшений
function buyUpgrade(upgradeId) {
    if (!window.userData || !UPGRADES[upgradeId]) {
        showNotification('Ошибка покупки улучшения', 'error');
        return;
    }
    
    const upgrade = UPGRADES[upgradeId];
    const currentLevel = window.upgrades[upgradeId] || 0;
    const price = upgrade.basePrice * Math.pow(2, currentLevel);
    
    if (parseFloat(window.userData.balance) >= price) {
        window.userData.balance = parseFloat(window.userData.balance) - price;
        window.upgrades[upgradeId] = currentLevel + 1;
        window.userData.upgrades = window.upgrades;
        
        updateUI();
        updateShopUI();
        saveUserData();
        
        showNotification(`Улучшение "${upgrade.name}" куплено!`, 'success');
    } else {
        showNotification('Недостаточно средств для покупки', 'error');
    }
}

function updateShopUI() {
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

// Пассивный доход
function startPassiveIncome() {
    if (window.incomeInterval) clearInterval(window.incomeInterval);
    
    window.incomeInterval = setInterval(() => {
        if (window.userData && window.isDataLoaded) {
            const miningSpeed = calculateMiningSpeed();
            if (miningSpeed > 0) {
                window.userData.balance = parseFloat(window.userData.balance) + miningSpeed;
                window.userData.totalEarned = parseFloat(window.userData.totalEarned) + miningSpeed;
                updateUI();
                
                // Автосохранение при значительном доходе
                window.accumulatedIncome += miningSpeed;
                if (window.accumulatedIncome >= 0.000000100) {
                    saveUserData();
                    window.accumulatedIncome = 0;
                }
            }
        }
    }, CONFIG.INCOME_INTERVAL);
}

// Сохранение данных
function saveUserData() {
    try {
        if (!window.userData) return;
        
        window.userData.lastUpdate = Date.now();
        window.userData.upgrades = window.upgrades;
        
        localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
        localStorage.setItem('sparkcoin_upgrades_' + window.userData.userId, JSON.stringify(window.upgrades));
        
        // Автосинхронизация с сервером
        setTimeout(() => syncToServer(), 500);
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
    }
}

// Автосохранение
function startAutoSave() {
    if (window.saveInterval) clearInterval(window.saveInterval);
    
    window.saveInterval = setInterval(() => {
        if (window.userData && window.isDataLoaded) {
            saveUserData();
            console.log('💾 Автосохранение выполнено');
        }
    }, CONFIG.SAVE_INTERVAL);
}

// Вспомогательные функции
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

function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    
    console.log('🔔 ' + type + ': ' + message);
}

// Глобальные функции для синхронизации
window.getUpgradesForSync = function() {
    return window.upgrades || {};
};

// Делаем функции глобальными для использования в других файлах
window.calculateClickPower = calculateClickPower;
window.calculateMiningSpeed = calculateMiningSpeed;
window.buyUpgrade = buyUpgrade;

// Основная инициализация
async function initializeApp() {
    console.log('🚀 Инициализация приложения...');
    
    // Проверка мультисессии
    if (window.multiSessionDetector) {
        const status = window.multiSessionDetector.getStatus();
        if (status.isBlocked) {
            console.log('🚫 Сессия заблокирована');
            window.location.href = 'multisession-warning.html';
            return;
        }
    }
    
    // Инициализация Telegram
    if (typeof tg !== 'undefined') {
        try {
            tg.expand();
            tg.enableClosingConfirmation();
            console.log('✅ Telegram Web App инициализирован');
        } catch (error) {
            console.log('⚠️ Ошибка инициализации Telegram');
        }
    }
    
    // Мониторинг мультисессии
    setTimeout(() => {
        if (window.multiSessionDetector) {
            window.multiSessionDetector.startMonitoring();
        }
    }, 3000);
    
    // Загрузка данных
    await loadUserData();
    initializeCoin();
    
    // Запуск систем
    setTimeout(() => {
        updateUI();
        updateShopUI();
    }, 100);
    
    setTimeout(() => {
        if (typeof showSection === 'function') showSection('main');
    }, 500);
    
    startPassiveIncome();
    startAutoSave();
    
    console.log('✅ Приложение полностью инициализировано');
}

// Запуск приложения
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('🎮 game.js загружен и готов к работе!');
