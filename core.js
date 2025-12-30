[file name]: core.js
[file content begin]
// core.js - ОПТИМИЗИРОВАННАЯ ВЕРСИЯ С МНОГОЯЗЫЧНОЙ ПОДДЕРЖКОЙ
console.log('🎮 Загружаем оптимизированный core.js...');

const tg = window.Telegram?.WebApp;
const SUPPORTED_LANGUAGES = ['ru', 'en'];
let CURRENT_LANG = 'ru';

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
window.apiConnected = false;
window.isOnline = navigator.onLine;
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
window.syncCounter = 0;
window.lastSyncTime = 0;

// ========== КОНФИГУРАЦИЯ ==========
const CONFIG = {
    CLICK_COOLDOWN: 100,
    ANTI_CHEAT_CLICKS: 20,
    ANTI_CHEAT_WINDOW: 2000,
    ANTI_CHEAT_BLOCK_TIME: 30000,
    INCOME_INTERVAL: 1000,
    SAVE_INTERVAL: 30000,
    SYNC_INTERVAL: 60000,
    BASE_CLICK_POWER: 0.000000001,
    BASE_MINING_SPEED: 0.000000000,
    MAX_SYNC_RETRIES: 3,
    SYNC_RETRY_DELAY: 2000
};

// ========== ЛОКАЛИЗАЦИЯ ==========
const LOCALIZATION = {
    ru: {
        loading: "Загрузка...",
        error: "Ошибка",
        success: "Успех",
        warning: "Внимание",
        info: "Информация",
        antiCheatBlocked: "Античит система заблокирована",
        multisessionDetected: "Обнаружена мультисессия",
        insufficientFunds: "Недостаточно средств",
        upgradePurchased: "Улучшение куплено",
        syncSuccess: "Синхронизация успешна",
        syncFailed: "Ошибка синхронизации",
        clickPower: "Сила клика",
        miningSpeed: "Скорость майнинга",
        balance: "Баланс"
    },
    en: {
        loading: "Loading...",
        error: "Error",
        success: "Success",
        warning: "Warning",
        info: "Info",
        antiCheatBlocked: "Anti-cheat system blocked",
        multisessionDetected: "Multi-session detected",
        insufficientFunds: "Insufficient funds",
        upgradePurchased: "Upgrade purchased",
        syncSuccess: "Sync successful",
        syncFailed: "Sync failed",
        clickPower: "Click power",
        miningSpeed: "Mining speed",
        balance: "Balance"
    }
};

// ========== УЛУЧШЕНИЯ ==========
const UPGRADES = {
    gpu1: { name: "Интегрированная видеокарта", name_en: "Integrated Graphics Card", basePrice: 0.000000016, baseBonus: 0.000000001, type: "mining" },
    gpu2: { name: "Видеокарта-затычка", name_en: "Basic Graphics Card", basePrice: 0.000000256, baseBonus: 0.000000008, type: "mining" },
    gpu3: { name: "Видеокарта Mining V100", name_en: "Mining V100 Graphics Card", basePrice: 0.000004096, baseBonus: 0.000000064, type: "mining" },
    gpu4: { name: "Супер мощная видеокарта Mining V1000", name_en: "Super Mining V1000 Graphics Card", basePrice: 0.000065536, baseBonus: 0.000000512, type: "mining" },
    gpu5: { name: "Квантовая видеокарта Mining Q100", name_en: "Quantum Mining Q100 Graphics Card", basePrice: 0.001048576, baseBonus: 0.000004096, type: "mining" },
    gpu6: { name: "Видеокарта Думатель 42", name_en: "Thinker 42 Graphics Card", basePrice: 0.016777216, baseBonus: 0.000032768, type: "mining" },
    gpu7: { name: "Видеокарта Blue Earth 54", name_en: "Blue Earth 54 Graphics Card", basePrice: 0.268435456, baseBonus: 0.000262144, type: "mining" },
    gpu8: { name: "Видеокарта Big Bang", name_en: "Big Bang Graphics Card", basePrice: 4.294967296, baseBonus: 0.002097152, type: "mining" },

    cpu1: { name: "Обычный процессор", name_en: "Standard Processor", basePrice: 0.000000032, baseBonus: 0.000000001, type: "mining" },
    cpu2: { name: "Процессор Miner X100", name_en: "Miner X100 Processor", basePrice: 0.000000512, baseBonus: 0.000000008, type: "mining" },
    cpu3: { name: "Супер процессор Miner X1000", name_en: "Super Miner X1000 Processor", basePrice: 0.000008192, baseBonus: 0.000000064, type: "mining" },
    cpu4: { name: "Квантовый процессор Miner X10000", name_en: "Quantum Miner X10000 Processor", basePrice: 0.000131072, baseBonus: 0.000000512, type: "mining" },
    cpu5: { name: "Кроховселенный процессор", name_en: "Microverse Processor", basePrice: 0.002097152, baseBonus: 0.000004096, type: "mining" },
    cpu6: { name: "Минивселенный процессор", name_en: "Miniverse Processor", basePrice: 0.033554432, baseBonus: 0.000032768, type: "mining" },
    cpu7: { name: "Микровселенный процессор", name_en: "Nanoverse Processor", basePrice: 0.536870912, baseBonus: 0.000262144, type: "mining" },
    cpu8: { name: "Мультивселенный процессор", name_en: "Multiverse Processor", basePrice: 8.589934592, baseBonus: 0.002097152, type: "mining" },

    mouse1: { name: "Обычная мышка", name_en: "Standard Mouse", basePrice: 0.000000064, baseBonus: 0.000000004, type: "click" },
    mouse2: { name: "Мышка с автокликером", name_en: "Auto-clicker Mouse", basePrice: 0.000001024, baseBonus: 0.000000008, type: "click" },
    mouse3: { name: "Мышка с макросами", name_en: "Macro Mouse", basePrice: 0.000016384, baseBonus: 0.000000064, type: "click" },
    mouse4: { name: "Мышка программиста", name_en: "Programmer's Mouse", basePrice: 0.000262144, baseBonus: 0.000000512, type: "click" },
    mouse5: { name: "Мышка Сатоси Накамото", name_en: "Satoshi Nakamoto Mouse", basePrice: 0.004194304, baseBonus: 0.000004096, type: "click" },
    mouse6: { name: "Мышка хакера", name_en: "Hacker's Mouse", basePrice: 0.067108864, baseBonus: 0.000032768, type: "click" },
    mouse7: { name: "Мышка Сноулена", name_en: "Snowden's Mouse", basePrice: 1.073741824, baseBonus: 0.000262144, type: "click" },
    mouse8: { name: "Мышка Админа", name_en: "Admin's Mouse", basePrice: 17.179869184, baseBonus: 0.002097152, type: "click" }
};

window.UPGRADES = UPGRADES;

// ========== УТИЛИТЫ ЯЗЫКА ==========
function setLanguage(lang) {
    if (SUPPORTED_LANGUAGES.includes(lang)) {
        CURRENT_LANG = lang;
        localStorage.setItem('sparkcoin_language', lang);
        updateLanguageUI();
    }
}

function getText(key) {
    return LOCALIZATION[CURRENT_LANG][key] || key;
}

function updateLanguageUI() {
    // Обновляем текст интерфейса
    const elements = document.querySelectorAll('[data-lang]');
    elements.forEach(element => {
        const key = element.getAttribute('data-lang');
        if (LOCALIZATION[CURRENT_LANG][key]) {
            element.textContent = LOCALIZATION[CURRENT_LANG][key];
        }
    });
}

// ========== ОПТИМИЗИРОВАННЫЕ ФУНКЦИИ ID ==========
function generateUniqueUserId() {
    if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user) {
        const user = Telegram.WebApp.initDataUnsafe.user;
        if (user.id) return `tg_${user.id}`;
        if (user.username) return `tg_${user.username.toLowerCase()}`;
    }
    
    let webUserId = localStorage.getItem('sparkcoin_web_user_id');
    if (!webUserId) {
        webUserId = 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sparkcoin_web_user_id', webUserId);
    }
    return webUserId;
}

function getTelegramId() {
    return (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user?.id) 
        ? Telegram.WebApp.initDataUnsafe.user.id.toString() 
        : null;
}

function getUsername() {
    if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user) {
        const user = Telegram.WebApp.initDataUnsafe.user;
        if (user.username) return '@' + user.username;
        if (user.first_name) return user.first_name;
        if (user.id) return `User${user.id}`;
    }
    
    let webUsername = localStorage.getItem('sparkcoin_web_username');
    if (!webUsername) {
        webUsername = 'WebUser_' + Math.random().toString(36).substr(2, 6);
        localStorage.setItem('sparkcoin_web_username', webUsername);
    }
    return webUsername;
}

function generateDeviceId() {
    let deviceId = localStorage.getItem('sparkcoin_device_id');
    if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sparkcoin_device_id', deviceId);
    }
    return deviceId;
}

function createNewUserData() {
    const userId = generateUniqueUserId();
    const username = getUsername();
    const telegramId = getTelegramId();

    const newUserData = {
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
        deviceId: generateDeviceId(),
        version: '2.0.0',
        language: CURRENT_LANG
    };

    return newUserData;
}

// ========== ОПТИМИЗИРОВАННАЯ ЗАГРУЗКА ДАННЫХ ==========
async function loadUserData() {
    const userId = generateUniqueUserId();
    const username = getUsername();
    const telegramId = getTelegramId();

    try {
        const savedData = localStorage.getItem('sparkcoin_user_data');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            const isSameUser = parsedData.userId === userId || 
                (telegramId && parsedData.telegramId === telegramId) ||
                (!telegramId && parsedData.userId && parsedData.userId.startsWith('web_'));
            
            if (isSameUser) {
                window.userData = parsedData;
                if (window.userData.username !== username) {
                    window.userData.username = username;
                }
                if (!window.userData.deviceId) {
                    window.userData.deviceId = generateDeviceId();
                }
            } else {
                window.userData = createNewUserData();
            }
        } else {
            window.userData = createNewUserData();
        }
        
        await loadUpgradesData(userId);
        window.isDataLoaded = true;
        setTimeout(() => syncToServer(), 2000);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        window.userData = createNewUserData();
        window.upgrades = {};
        window.isDataLoaded = true;
    }
}

async function loadUpgradesData(userId) {
    try {
        const savedUpgrades = localStorage.getItem('sparkcoin_upgrades_' + userId);
        if (savedUpgrades) {
            const upgradesData = JSON.parse(savedUpgrades);
            window.upgrades = upgradesData;
            window.userData.upgrades = upgradesData;
        } else {
            window.upgrades = {};
            window.userData.upgrades = {};
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки улучшений:', error);
        window.upgrades = {};
        window.userData.upgrades = {};
    }
}

// ========== ОПТИМИЗИРОВАННАЯ СИНХРОНИЗАЦИЯ ==========
async function syncToServer(retryCount = 0) {
    if (!window.userData) return false;
    
    try {
        const syncData = {
            userId: window.userData.userId,
            username: window.userData.username,
            balance: parseFloat(window.userData.balance),
            totalEarned: parseFloat(window.userData.totalEarned),
            totalClicks: window.userData.totalClicks,
            upgrades: getUpgradesForSync(),
            lastUpdate: Date.now(),
            telegramId: window.userData.telegramId,
            deviceId: generateDeviceId(),
            version: window.userData.version || '2.0.0'
        };
        
        const response = await apiRequest('/api/sync/unified', {
            method: 'POST',
            body: JSON.stringify(syncData)
        });
        
        if (response && response.success) {
            if (response.userId && response.userId !== window.userData.userId) {
                window.userData.userId = response.userId;
                saveUserData();
            }
            
            if (response.bestBalance && response.bestBalance > window.userData.balance) {
                window.userData.balance = response.bestBalance;
                updateUI();
            }
            
            window.lastSyncTime = Date.now();
            return true;
        } else if (retryCount < CONFIG.MAX_SYNC_RETRIES) {
            setTimeout(() => syncToServer(retryCount + 1), CONFIG.SYNC_RETRY_DELAY);
        }
    } catch (error) {
        if (retryCount < CONFIG.MAX_SYNC_RETRIES) {
            setTimeout(() => syncToServer(retryCount + 1), CONFIG.SYNC_RETRY_DELAY);
        }
    }
    return false;
}

function getUpgradesForSync() {
    const upgradesData = {};
    if (window.upgrades) {
        for (const key in window.upgrades) {
            if (window.upgrades[key] && typeof window.upgrades[key].level !== 'undefined') {
                upgradesData[key] = window.upgrades[key].level;
            } else if (typeof window.upgrades[key] === 'number') {
                upgradesData[key] = window.upgrades[key];
            }
        }
    }
    return upgradesData;
}

// ========== ОПТИМИЗИРОВАННЫЕ ИГРОВЫЕ ФУНКЦИИ ==========
function initializeCoin() {
    const coin = document.getElementById('clickCoin');
    if (!coin) {
        setTimeout(initializeCoin, 1000);
        return;
    }
    
    const newCoin = coin.cloneNode(true);
    coin.parentNode.replaceChild(newCoin, coin);
    
    const freshCoin = document.getElementById('clickCoin');
    freshCoin.addEventListener('click', handleCoinClick);
    freshCoin.addEventListener('touchstart', handleCoinClick, { passive: false });
    
    freshCoin.style.cursor = 'pointer';
    freshCoin.style.webkitTapHighlightColor = 'transparent';
    freshCoin.style.touchAction = 'manipulation';
    freshCoin.style.userSelect = 'none';
    freshCoin.style.webkitUserSelect = 'none';
}

function handleCoinClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!window.userData || !window.isDataLoaded) return false;
    if (window.antiCheatBlocked) return false;
    
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
    const clickPower = calculateClickPower();
    
    window.userData.balance = parseFloat(window.userData.balance) + clickPower;
    window.userData.totalEarned = parseFloat(window.userData.totalEarned) + clickPower;
    window.userData.totalClicks = (window.userData.totalClicks || 0) + 1;
    window.userData.lastUpdate = Date.now();
    
    updateBalanceImmediately();
    createClickPopup(event, clickPower);
    
    const coin = document.getElementById('clickCoin');
    if (coin) {
        coin.style.transform = 'scale(0.95)';
        setTimeout(() => coin.style.transform = 'scale(1)', 100);
    }
    
    saveUserData();
    return false;
}

function triggerAntiCheat() {
    window.antiCheatBlocked = true;
    
    const antiCheat = document.getElementById('antiCheat');
    if (antiCheat) {
        antiCheat.style.display = 'flex';
    }
    
    showNotification(getText('antiCheatBlocked'), 'warning');
    
    window.antiCheatTimeout = setTimeout(() => {
        window.antiCheatBlocked = false;
        window.clickTimes = [];
        if (antiCheat) antiCheat.style.display = 'none';
        showNotification('Античит деактивирован', 'success');
    }, CONFIG.ANTI_CHEAT_BLOCK_TIME);
}

function calculateClickPower() {
    let basePower = CONFIG.BASE_CLICK_POWER;
    
    if (window.upgrades) {
        for (const key in window.upgrades) {
            if (key.startsWith('mouse')) {
                const level = window.upgrades[key]?.level || window.upgrades[key] || 0;
                const upgrade = UPGRADES[key];
                if (upgrade && upgrade.type === 'click') {
                    basePower += level * upgrade.baseBonus;
                }
            }
        }
    }
    
    return basePower;
}

window.calculateMiningSpeed = function() {
    let speed = 0.000000000;
    
    if (!window.upgrades || !window.UPGRADES) return speed;
    
    try {
        for (let i = 1; i <= 8; i++) {
            const gpuKey = `gpu${i}`;
            const cpuKey = `cpu${i}`;
            
            [gpuKey, cpuKey].forEach(key => {
                if (window.upgrades[key]) {
                    const upgradeData = window.upgrades[key];
                    const level = (upgradeData && typeof upgradeData.level !== 'undefined') ? upgradeData.level : 
                                 (typeof upgradeData === 'number' ? upgradeData : 0);
                    
                    const upgrade = window.UPGRADES[key];
                    if (upgrade && upgrade.baseBonus) {
                        speed += level * upgrade.baseBonus;
                    }
                }
            });
        }
        
        if (isNaN(speed) || !isFinite(speed) || speed < 0) {
            speed = 0.000000000;
        }
    } catch (error) {
        console.error('❌ Ошибка расчета скорости майнинга:', error);
        speed = 0.000000000;
    }
    
    return speed;
};

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
        const miningSpeed = calculateMiningSpeed();
        const validSpeed = isNaN(miningSpeed) ? 0.000000000 : miningSpeed;
        mineSpeedElement.textContent = validSpeed.toFixed(9) + ' S/сек';
    }
}

function updateUI() {
    updateBalanceImmediately();
}

// ========== СИСТЕМА УЛУЧШЕНИЙ ==========
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
        
        showNotification(getText('upgradePurchased'), 'success');
        setTimeout(() => syncToServer(), 1000);
    } else {
        showNotification(getText('insufficientFunds'), 'error');
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
            buyButton.textContent = canAfford ? 
                (CURRENT_LANG === 'en' ? 'Buy' : 'Купить') : 
                (CURRENT_LANG === 'en' ? 'Insufficient funds' : 'Недостаточно средств');
            buyButton.style.opacity = canAfford ? '1' : '0.6';
        }
    }
}

// ========== ПАССИВНЫЙ ДОХОД И СОХРАНЕНИЕ ==========
function startPassiveIncome() {
    if (window.incomeInterval) clearInterval(window.incomeInterval);
    
    window.incomeInterval = setInterval(() => {
        if (window.userData && window.isDataLoaded) {
            const miningSpeed = calculateMiningSpeed();
            if (miningSpeed > 0) {
                window.userData.balance = parseFloat(window.userData.balance) + miningSpeed;
                window.userData.totalEarned = parseFloat(window.userData.totalEarned) + miningSpeed;
                updateUI();
                
                window.accumulatedIncome += miningSpeed;
                if (window.accumulatedIncome >= 0.000000100) {
                    saveUserData();
                    window.accumulatedIncome = 0;
                }
            }
        }
    }, CONFIG.INCOME_INTERVAL);
}

function saveUserData() {
    try {
        if (!window.userData) return;
        
        window.userData.lastUpdate = Date.now();
        window.userData.upgrades = window.upgrades;
        
        localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
        localStorage.setItem('sparkcoin_upgrades_' + window.userData.userId, JSON.stringify(window.upgrades));
        
        if (!window.syncCounter) window.syncCounter = 0;
        window.syncCounter++;
        
        if (window.syncCounter >= 10 || !window.lastSyncTime || Date.now() - window.lastSyncTime > 30000) {
            setTimeout(() => syncToServer(), 1000);
            window.syncCounter = 0;
            window.lastSyncTime = Date.now();
        }
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
    }
}

function startAutoSave() {
    if (window.saveInterval) clearInterval(window.saveInterval);
    
    window.saveInterval = setInterval(() => {
        if (window.userData && window.isDataLoaded) {
            saveUserData();
        }
    }, CONFIG.SAVE_INTERVAL);
}

function startAutoSync() {
    setInterval(() => {
        if (window.userData && window.isDataLoaded) {
            syncToServer();
        }
    }, CONFIG.SYNC_INTERVAL);
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
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
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <h4>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'} ${getText(type)}</h4>
        <p>${message}</p>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }, 3000);
}

function addPopupAnimation() {
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
            
            .click-popup {
                position: fixed !important;
                color: #4CAF50;
                font-weight: bold;
                font-size: 18px;
                pointer-events: none;
                animation: floatUp 1s ease-out forwards;
                font-family: 'Courier New', monospace;
                z-index: 10000;
                text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                -webkit-user-select: none;
                user-select: none;
                transform: translate(-50%, -50%);
            }
        `;
        document.head.appendChild(style);
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ==========
async function initializeApp() {
    // Устанавливаем язык
    const savedLang = localStorage.getItem('sparkcoin_language');
    if (savedLang && SUPPORTED_LANGUAGES.includes(savedLang)) {
        CURRENT_LANG = savedLang;
    } else if (navigator.language.startsWith('en')) {
        CURRENT_LANG = 'en';
    }
    
    // Инициализация Telegram Web App
    if (typeof tg !== 'undefined') {
        try {
            tg.expand();
            tg.enableClosingConfirmation();
        } catch (error) {
            console.log('⚠️ Ошибка инициализации Telegram:', error);
        }
    }
    
    addPopupAnimation();
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
    
    startPassiveIncome();
    startAutoSave();
    startAutoSync();
    
    setTimeout(() => {
        if (window.checkApiConnection) {
            window.checkApiConnection();
        }
    }, 2000);
}

// ========== ГЛОБАЛЬНЫЕ ФУНКЦИИ ==========
window.calculateClickPower = calculateClickPower;
window.calculateMiningSpeed = calculateMiningSpeed;
window.buyUpgrade = buyUpgrade;
window.updateUI = updateUI;
window.updateShopUI = updateShopUI;
window.saveUserData = saveUserData;
window.getUpgradesForSync = getUpgradesForSync;
window.generateDeviceId = generateDeviceId;
window.showNotification = showNotification;
window.setLanguage = setLanguage;
window.getText = getText;

window.syncUserData = syncToServer;
window.loadSyncedData = async function() {
    return await syncToServer();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('🎮 core.js оптимизирован и загружен!');
