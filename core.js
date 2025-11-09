// core.js - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ ДЛЯ SPARKCOIN
console.log('🎮 Загружаем core.js - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ...');

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

// Сохраняем UPGRADES глобально для доступа из других файлов
window.UPGRADES = UPGRADES;

// ========== ИСПРАВЛЕННЫЕ ФУНКЦИИ ДЛЯ УНИКАЛЬНЫХ ID ==========

// ГЕНЕРАЦИЯ УНИКАЛЬНОГО USER ID
function generateUniqueUserId() {
    // Для Telegram пользователей
    if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user) {
        const user = Telegram.WebApp.initDataUnsafe.user;
        if (user.id) {
            const tgId = `tg_${user.id}`;
            console.log('🔑 Telegram User ID:', tgId);
            return tgId;
        }
        if (user.username) {
            const tgUsernameId = `tg_${user.username.toLowerCase()}`;
            console.log('🔑 Telegram Username ID:', tgUsernameId);
            return tgUsernameId;
        }
    }
    
    // Для веб-пользователей - генерируем уникальный ID и сохраняем его
    let webUserId = localStorage.getItem('sparkcoin_web_user_id');
    if (!webUserId) {
        webUserId = 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sparkcoin_web_user_id', webUserId);
        console.log('🆕 Сгенерирован новый Web User ID:', webUserId);
    } else {
        console.log('🔑 Используется существующий Web User ID:', webUserId);
    }
    
    return webUserId;
}

// ПОЛУЧЕНИЕ TELEGRAM ID (только для Telegram)
function getTelegramId() {
    return (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user?.id) 
        ? Telegram.WebApp.initDataUnsafe.user.id.toString() 
        : null;
}

// ПОЛУЧЕНИЕ ИМЕНИ ПОЛЬЗОВАТЕЛЯ
function getUsername() {
    if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user) {
        const user = Telegram.WebApp.initDataUnsafe.user;
        if (user.username) return '@' + user.username;
        if (user.first_name) return user.first_name;
        if (user.id) return `User${user.id}`;
    }
    
    // Для веб-пользователей
    let webUsername = localStorage.getItem('sparkcoin_web_username');
    if (!webUsername) {
        webUsername = 'WebUser_' + Math.random().toString(36).substr(2, 6);
        localStorage.setItem('sparkcoin_web_username', webUsername);
        console.log('🆕 Сгенерировано новое имя:', webUsername);
    }
    
    return webUsername;
}

// ГЕНЕРАЦИЯ УНИКАЛЬНОГО DEVICE ID
function generateDeviceId() {
    let deviceId = localStorage.getItem('sparkcoin_device_id');
    if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sparkcoin_device_id', deviceId);
        console.log('📱 Сгенерирован новый Device ID:', deviceId);
    }
    return deviceId;
}

// СОЗДАНИЕ НОВЫХ ДАННЫХ ПОЛЬЗОВАТЕЛЯ
function createNewUserData() {
    const userId = generateUniqueUserId();
    const username = getUsername();
    const telegramId = getTelegramId();

    console.log('🆕 Создаем новые данные для:', { userId, username, telegramId });

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
        version: '1.0.0'
    };

    console.log('✅ Новый пользователь создан:', newUserData);
    return newUserData;
}

// ========== ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ ==========

async function loadUserData() {
    const userId = generateUniqueUserId();
    const username = getUsername();
    const telegramId = getTelegramId();

    console.log('📥 Загрузка данных для:', { userId, username, telegramId });

    try {
        // Пытаемся загрузить из localStorage
        const savedData = localStorage.getItem('sparkcoin_user_data');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            
            // Проверяем, что данные принадлежат текущему пользователю
            const isSameUser = parsedData.userId === userId || 
                (telegramId && parsedData.telegramId === telegramId) ||
                (!telegramId && parsedData.userId && parsedData.userId.startsWith('web_'));
            
            if (isSameUser) {
                window.userData = parsedData;
                console.log('✅ Данные загружены из localStorage для пользователя:', userId);
                
                // Обновляем username если нужно
                if (window.userData.username !== username) {
                    console.log('🔄 Обновляем имя пользователя:', window.userData.username, '->', username);
                    window.userData.username = username;
                }
                
                // Обновляем deviceId если нужно
                if (!window.userData.deviceId) {
                    window.userData.deviceId = generateDeviceId();
                }
            } else {
                // Данные принадлежат другому пользователю - создаем новые
                console.log('🔄 Данные принадлежат другому пользователю, создаем новые');
                console.log('❌ Сохраненный userId:', parsedData.userId, 'Текущий userId:', userId);
                window.userData = createNewUserData();
            }
        } else {
            // Нет сохраненных данных - создаем новые
            window.userData = createNewUserData();
            console.log('🆕 Созданы начальные данные пользователя');
        }
        
        // Загружаем улучшения
        await loadUpgradesData(userId);
        
        window.isDataLoaded = true;
        console.log('👤 Пользователь загружен:', window.userData.username, 'Баланс:', window.userData.balance);
        
        // Синхронизируем с сервером
        setTimeout(() => syncToServer(), 2000);
        
    } catch (error) {
        console.error('❌ Критическая ошибка загрузки данных:', error);
        window.userData = createNewUserData();
        window.upgrades = {};
        window.isDataLoaded = true;
    }
}

// ЗАГРУЗКА ДАННЫХ УЛУЧШЕНИЙ
async function loadUpgradesData(userId) {
    try {
        const savedUpgrades = localStorage.getItem('sparkcoin_upgrades_' + userId);
        if (savedUpgrades) {
            const upgradesData = JSON.parse(savedUpgrades);
            window.upgrades = upgradesData;
            window.userData.upgrades = upgradesData;
            console.log('✅ Улучшения загружены:', Object.keys(upgradesData).length, 'шт');
        } else {
            window.upgrades = {};
            window.userData.upgrades = {};
            console.log('🆕 Созданы пустые улучшения');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки улучшений:', error);
        window.upgrades = {};
        window.userData.upgrades = {};
    }
}

// ========== СИНХРОНИЗАЦИЯ С СЕРВЕРОМ ==========

async function syncToServer() {
    if (!window.userData) {
        console.log('❌ Нет данных пользователя для синхронизации');
        return false;
    }
    
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
            version: window.userData.version || '1.0.0'
        };
        
        console.log('🔄 Синхронизация на сервер для пользователя:', syncData.userId);
        
        const response = await apiRequest('/api/sync/unified', {
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
            
            // Если серверный баланс больше - используем его
            if (response.bestBalance && response.bestBalance > window.userData.balance) {
                console.log(`💰 Баланс обновлен: ${window.userData.balance} -> ${response.bestBalance}`);
                window.userData.balance = response.bestBalance;
                updateUI();
            }
            
            window.lastSyncTime = Date.now();
            return true;
        }
    } catch (error) {
        console.log('📴 Ошибка синхронизации с сервером:', error);
    }
    return false;
}

// ПОЛУЧЕНИЕ УЛУЧШЕНИЙ ДЛЯ СИНХРОНИЗАЦИИ
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
    console.log('🔄 Улучшения для синхронизации:', upgradesData);
    return upgradesData;
}

// ========== ОСНОВНЫЕ ФУНКЦИИ ИГРЫ ==========

// ИНИЦИАЛИЗАЦИЯ МОНЕТКИ
function initializeCoin() {
    console.log('🎯 Инициализация монетки...');
    
    const coin = document.getElementById('clickCoin');
    if (!coin) {
        console.log('⏳ Монетка не найдена, повтор через 1 секунду...');
        setTimeout(initializeCoin, 1000);
        return;
    }
    
    // Клонируем и заменяем монетку для сброса событий
    const newCoin = coin.cloneNode(true);
    coin.parentNode.replaceChild(newCoin, coin);
    
    const freshCoin = document.getElementById('clickCoin');
    
    // Добавляем обработчики событий
    freshCoin.addEventListener('click', handleCoinClick);
    freshCoin.addEventListener('touchstart', handleCoinClick, { passive: false });
    
    // Настраиваем стили для мобильных устройств
    freshCoin.style.cursor = 'pointer';
    freshCoin.style.webkitTapHighlightColor = 'transparent';
    freshCoin.style.touchAction = 'manipulation';
    freshCoin.style.userSelect = 'none';
    freshCoin.style.webkitUserSelect = 'none';
    
    console.log('✅ Обработчики монетки установлены');
}

// ОБРАБОТКА КЛИКА ПО МОНЕТКЕ
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
    
    const now = Date.now();
    
    // Проверка кулдауна
    if (window.lastClickTime && (now - window.lastClickTime < CONFIG.CLICK_COOLDOWN)) {
        return false;
    }
    
    // Античит система
    window.clickTimes.push(now);
    window.clickTimes = window.clickTimes.filter(time => now - time < CONFIG.ANTI_CHEAT_WINDOW);
    
    if (window.clickTimes.length > CONFIG.ANTI_CHEAT_CLICKS) {
        triggerAntiCheat();
        return false;
    }
    
    window.lastClickTime = now;
    
    // Начисление дохода
    const clickPower = calculateClickPower();
    window.userData.balance = parseFloat(window.userData.balance) + clickPower;
    window.userData.totalEarned = parseFloat(window.userData.totalEarned) + clickPower;
    window.userData.totalClicks = (window.userData.totalClicks || 0) + 1;
    window.userData.lastUpdate = Date.now();
    
    // Обновление интерфейса
    updateBalanceImmediately();
    createClickPopup(event, clickPower);
    
    // Анимация монетки
    const coin = document.getElementById('clickCoin');
    if (coin) {
        coin.style.transform = 'scale(0.95)';
        setTimeout(() => coin.style.transform = 'scale(1)', 100);
    }
    
    // Сохранение данных
    saveUserData();
    
    return false;
}

// АКТИВАЦИЯ АНТИЧИТ СИСТЕМЫ
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

// РАСЧЕТ СИЛЫ КЛИКА
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

// РАСЧЕТ СКОРОСТИ МАЙНИНГА
function calculateMiningSpeed() {
    let speed = CONFIG.BASE_MINING_SPEED;
    
    if (window.upgrades) {
        for (const key in window.upgrades) {
            if (key.startsWith('gpu') || key.startsWith('cpu')) {
                const level = window.upgrades[key]?.level || window.upgrades[key] || 0;
                const upgrade = UPGRADES[key];
                if (upgrade && upgrade.type === 'mining') {
                    speed += level * upgrade.baseBonus;
                }
            }
        }
    }
    
    return speed;
}

// ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
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
    console.log('🔄 Интерфейс обновлен');
}

// СИСТЕМА УЛУЧШЕНИЙ
function buyUpgrade(upgradeId) {
    if (!window.userData || !UPGRADES[upgradeId]) {
        showNotification('Ошибка покупки улучшения', 'error');
        return;
    }
    
    const upgrade = UPGRADES[upgradeId];
    const currentLevel = window.upgrades[upgradeId] || 0;
    const price = upgrade.basePrice * Math.pow(2, currentLevel);
    
    console.log(`🛒 Покупка ${upgradeId}: уровень ${currentLevel}, цена ${price}`);
    
    if (parseFloat(window.userData.balance) >= price) {
        window.userData.balance = parseFloat(window.userData.balance) - price;
        window.upgrades[upgradeId] = currentLevel + 1;
        window.userData.upgrades = window.upgrades;
        
        updateUI();
        updateShopUI();
        saveUserData();
        
        showNotification(`Улучшение "${upgrade.name}" куплено! Уровень: ${currentLevel + 1}`, 'success');
        
        // Синхронизация после покупки
        setTimeout(() => syncToServer(), 1000);
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
    
    console.log('🛒 Интерфейс магазина обновлен');
}

// ПАССИВНЫЙ ДОХОД
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
    
    console.log('⛏️ Система пассивного дохода запущена');
}

// СОХРАНЕНИЕ ДАННЫХ
function saveUserData() {
    try {
        if (!window.userData) return;
        
        window.userData.lastUpdate = Date.now();
        window.userData.upgrades = window.upgrades;
        
        localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
        localStorage.setItem('sparkcoin_upgrades_' + window.userData.userId, JSON.stringify(window.upgrades));
        
        // Синхронизируем с сервером каждые 10 сохранений или раз в 30 секунд
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

// АВТОСОХРАНЕНИЕ
function startAutoSave() {
    if (window.saveInterval) clearInterval(window.saveInterval);
    
    window.saveInterval = setInterval(() => {
        if (window.userData && window.isDataLoaded) {
            saveUserData();
            console.log('💾 Автосохранение выполнено');
        }
    }, CONFIG.SAVE_INTERVAL);
    
    console.log('💾 Система автосохранения запущена');
}

// ПЕРИОДИЧЕСКАЯ СИНХРОНИЗАЦИЯ
function startAutoSync() {
    setInterval(() => {
        if (window.userData && window.isDataLoaded) {
            syncToServer();
        }
    }, CONFIG.SYNC_INTERVAL);
    
    console.log('🔄 Система автоматической синхронизации запущена');
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

// СОЗДАНИЕ ПОПАПА КЛИКА
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

// УВЕДОМЛЕНИЯ
function showNotification(message, type = 'info') {
    console.log(`🔔 ${type.toUpperCase()}: ${message}`);
    
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <h4>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'} ${type.charAt(0).toUpperCase() + type.slice(1)}</h4>
        <p>${message}</p>
    `;
    
    document.body.appendChild(notification);
    
    // Показываем с анимацией
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Убираем через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }, 3000);
}

// ДОБАВЛЕНИЕ CSS АНИМАЦИИ
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
        console.log('🎨 CSS анимации добавлены');
    }
}

// ФУНКЦИЯ ДЛЯ ОТЛАДКИ
function debugInfo() {
    console.log('🐛 ДЕБАГ ИНФОРМАЦИЯ:');
    console.log('👤 UserData:', window.userData);
    console.log('🛒 Upgrades:', window.upgrades);
    console.log('📱 Device ID:', generateDeviceId());
    console.log('🔗 API Connected:', window.apiConnected);
    console.log('💾 Data Loaded:', window.isDataLoaded);
    console.log('⛏️ Mining Speed:', calculateMiningSpeed());
    console.log('🖱️ Click Power:', calculateClickPower());
}

// ========== ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ==========

async function initializeApp() {
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
    
    // Добавляем CSS анимации
    addPopupAnimation();
    
    // Загружаем данные пользователя
    await loadUserData();
    
    // Инициализируем монетку
    initializeCoin();
    
    // Обновляем интерфейс
    setTimeout(() => {
        updateUI();
        updateShopUI();
    }, 100);
    
    // Показываем главный экран
    setTimeout(() => {
        if (typeof showSection === 'function') {
            showSection('main');
        }
    }, 500);
    
    // Запускаем системы
    startPassiveIncome();
    startAutoSave();
    startAutoSync();
    
    // Проверяем соединение с API
    setTimeout(() => {
        if (window.checkApiConnection) {
            window.checkApiConnection();
        }
    }, 2000);
    
    console.log('✅ Приложение успешно инициализировано');
    
    // Дебаг информация
    setTimeout(debugInfo, 3000);
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
window.debugInfo = debugInfo;

// Для совместимости с другими файлами
window.syncUserData = syncToServer;
window.loadSyncedData = async function() {
    console.log('📥 Загрузка синхронизированных данных...');
    return await syncToServer();
};

// Запуск приложения
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('🎮 core.js загружен! ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ С УНИКАЛЬНЫМИ ПОЛЬЗОВАТЕЛЯМИ.');
