// core.js - полностью исправленная версия
console.log('🎮 Загружаем исправленный core.js...');

const tg = window.Telegram.WebApp;

// Добавляем все необходимые глобальные переменные из main.js
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

// Функция для обновления статуса API из main.js
window.updateApiStatus = function(status, message) {
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.className = `api-status ${status}`;
        apiStatus.textContent = `API: ${message}`;
    }
    window.apiConnected = status === 'connected';
    console.log(`📡 Статус API: ${status} - ${message}`);
};

// Заглушки для отсутствующих функций из main.js
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

// Загрузка данных пользователя из main.js
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

// УЛУЧШЕННЫЙ обработчик кликов из main.js
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

// Быстрое обновление только баланса из main.js
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

// Сохранение данных из main.js
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

// Создание попапа из main.js
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

// Добавление CSS анимации из main.js
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

// ========== BALANCE-FIX.JS ФУНКЦИИ ==========

class BalanceFixer {
    constructor() {
        this.balanceKey = 'sparkcoin_balance_fixed';
        this.lastSyncKey = 'sparkcoin_last_sync_fixed';
    }

    // ГАРАНТИРОВАННАЯ загрузка данных
    async loadUserDataGuaranteed() {
        console.log('📥 ГАРАНТИРОВАННАЯ загрузка данных...');
        
        const userId = this.getUnifiedUserId();
        const telegramId = this.getTelegramId();
        
        // 1. Пытаемся загрузить с сервера
        let serverData = await this.loadFromServer(telegramId, userId);
        
        if (serverData) {
            console.log('✅ Данные с сервера:', serverData.balance);
            this.applyServerData(serverData);
            return;
        }
        
        // 2. Загружаем из localStorage
        const localData = this.loadFromLocalStorage(userId);
        if (localData) {
            console.log('✅ Данные из localStorage:', localData.balance);
            window.userData = localData;
            return;
        }
        
        // 3. Создаем новые данные
        console.log('🆕 Создаем новые данные');
        window.userData = this.createNewUserData();
    }

    // Загрузка с сервера с приоритетом
    async loadFromServer(telegramId, userId) {
        try {
            // Сначала по telegramId
            if (telegramId) {
                const response = await apiRequest(`/api/sync/telegram/${telegramId}`);
                if (response && response.success && response.userData) {
                    console.log('✅ Найден по telegramId');
                    return response.userData;
                }
            }
            
            // Затем по userId
            const response = await apiRequest(`/api/sync/unified/${userId}`);
            if (response && response.success && response.userData) {
                console.log('✅ Найден по userId');
                return response.userData;
            }
        } catch (error) {
            console.log('📴 Сервер недоступен');
        }
        return null;
    }

    // Загрузка из localStorage с проверкой
    loadFromLocalStorage(userId) {
        try {
            const savedData = localStorage.getItem('sparkcoin_user_data');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                // Проверяем совпадение userId ИЛИ telegramId
                if (parsedData.userId === userId || parsedData.telegramId === this.getTelegramId()) {
                    return parsedData;
                }
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки из localStorage');
        }
        return null;
    }

    // Применяем серверные данные (сохраняем максимальный баланс)
    applyServerData(serverData) {
        const localData = this.loadFromLocalStorage(this.getUnifiedUserId());
        
        if (localData) {
            // Берем МАКСИМАЛЬНЫЙ баланс из всех источников
            serverData.balance = Math.max(serverData.balance, localData.balance);
            serverData.totalEarned = Math.max(serverData.totalEarned, localData.totalEarned);
            serverData.totalClicks = Math.max(serverData.totalClicks, localData.totalClicks);
        }
        
        window.userData = serverData;
        this.saveUserDataGuaranteed();
    }

    // ГАРАНТИРОВАННОЕ сохранение
    saveUserDataGuaranteed() {
        if (!window.userData) return;
        
        try {
            // Сохраняем в localStorage
            localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
            
            // Дублируем в отдельное хранилище для надежности
            localStorage.setItem(this.balanceKey, window.userData.balance.toString());
            localStorage.setItem(this.lastSyncKey, Date.now().toString());
            
            console.log('💾 Данные СОХРАНЕНЫ:', window.userData.balance);
            
            // Синхронизируем с сервером
            this.syncToServer();
            
        } catch (error) {
            console.error('❌ Критическая ошибка сохранения:', error);
        }
    }

    // Синхронизация с сервером
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

    // Восстановление баланса при загрузке
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

// ========== GAME.JS ФУНКЦИИ ==========

// Система пассивного дохода из game.js
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
    }, 1000);
}

// Автосохранение из game.js
function startAutoSave() {
    if (window.saveInterval) clearInterval(window.saveInterval);
    
    window.saveInterval = setInterval(() => {
        if (window.userData && window.isDataLoaded) {
            saveUserData();
            console.log('💾 Автосохранение выполнено');
        }
    }, 30000);
}

// Античит система из game.js
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
    }, 30000);
}

// Основная функция инициализации из main.js
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
    
    // Добавляем анимацию
    addPopupAnimation();
    
    // Загружаем данные пользователя
    loadUserData();
    
    // Инициализируем монетку
    initializeCoin();
    
    // Обновляем интерфейс
    setTimeout(() => {
        safeUpdateUI();
        if (typeof updateShopUI === 'function') {
            updateShopUI();
        }
    }, 100);
    
    // Показываем главный экран
    setTimeout(() => {
        if (typeof showSection === 'function') {
            showSection('main');
        }
    }, 500);
    
    // Запускаем системы из game.js
    startPassiveIncome();
    startAutoSave();
    
    console.log('✅ Приложение успешно инициализировано');
}

// Запуск приложения из main.js
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('🎮 Исправленный core.js загружен и готов к работе!');
