// main.js - полностью исправленная версия
console.log('🎮 Загружаем исправленный main.js...');

const tg = window.Telegram.WebApp;

// Добавляем все необходимые глобальные переменные
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

// Заглушки для отсутствующих функций
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
        // Создаем тестовых игроков
        window.allPlayers = [{
            userId: 'demo_player_1',
            username: 'Демо Игрок 1',
            balance: 0.000000500,
            totalEarned: 0.000001000,
            totalClicks: 50,
            mineSpeed: 0.000000001,
            clickSpeed: 0.000000002,
            lastUpdate: new Date().toISOString()
        }, {
            userId: 'demo_player_2', 
            username: 'Демо Игрок 2',
            balance: 0.000000300,
            totalEarned: 0.000000800,
            totalClicks: 30,
            mineSpeed: 0.000000000,
            clickSpeed: 0.000000001,
            lastUpdate: new Date().toISOString()
        }];
    };
}

if (typeof window.saveAllPlayers === 'undefined') {
    window.saveAllPlayers = function() {
        console.log('💾 saveAllPlayers (заглушка)');
    };
}

if (typeof window.startLotteryAutoUpdate === 'undefined') {
    window.startLotteryAutoUpdate = function() {
        console.log('🎰 startLotteryAutoUpdate (заглушка)');
    };
}

if (typeof window.startClassicLotteryUpdate === 'undefined') {
    window.startClassicLotteryUpdate = function() {
        console.log('🎲 startClassicLotteryUpdate (заглушка)');
    };
}

if (typeof window.loadReferralStats === 'undefined') {
    window.loadReferralStats = function() {
        console.log('👥 loadReferralStats (заглушка)');
    };
}

if (typeof window.showNotification === 'undefined') {
    window.showNotification = function(message, type = 'info') {
        console.log('🔔 ' + type + ': ' + message);
        // Простая реализация уведомления
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#FF9800' : '#2196F3'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    };
}

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

function showSessionError() {
    document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; padding: 20px; text-align: center;">
            <h1 style="color: #f44336; margin-bottom: 20px;">❌ Ошибка доступа</h1>
            <p style="color: white; margin-bottom: 20px;">Приложение уже открыто в другой сессии Telegram.</p>
            <p style="color: #ccc; font-size: 14px;">Закройте другие вкладки с Sparkcoin и обновите страницу.</p>
        </div>
    `;
}

// Загрузка данных пользователя
function loadUserData() {
    const userId = getTelegramUserId();
    const username = getTelegramUsername();

    // Проверка сессии
    const currentSession = localStorage.getItem('sparkcoin_current_session');
    if (currentSession && currentSession !== userId) {
        showSessionError();
        return;
    }

    localStorage.setItem('sparkcoin_current_session', userId);

    // Загрузка данных из localStorage
    try {
        const savedData = localStorage.getItem('sparkcoin_user_data');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            if (parsedData.userId === userId) {
                window.userData = parsedData;
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
            // Инициализируем upgrades если нужно
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

    // Загружаем игроков
    if (typeof window.loadAllPlayers === 'function') {
        window.loadAllPlayers();
    }

    // Обновление интерфейса
    setTimeout(() => {
        if (typeof updateUI === 'function') {
            updateUI();
        } else {
            updateFallbackUI();
        }
        
        if (typeof updateShopUI === 'function') {
            updateShopUI();
        }
    }, 100);

    // Проверка подключения API
    setTimeout(() => {
        if (typeof checkApiConnection === 'function') {
            checkApiConnection();
        } else {
            window.updateApiStatus('connected', 'Локальный режим');
        }
    }, 500);

    // Запускаем системы лотереи
    setTimeout(() => {
        if (typeof startLotteryAutoUpdate === 'function') {
            startLotteryAutoUpdate();
        }
        if (typeof startClassicLotteryUpdate === 'function') {
            startClassicLotteryUpdate();
        }
        if (typeof loadReferralStats === 'function') {
            loadReferralStats();
        }
    }, 1000);

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
        balanceElement.textContent = window.userData.balance.toFixed(9) + ' S';
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

// Инициализация монетки
function initializeCoin() {
    console.log('🎯 Инициализация монетки...');
    
    const coin = document.getElementById('clickCoin');
    
    if (!coin) {
        console.log('⏳ Монетка не найдена, повтор через 1 секунду...');
        setTimeout(initializeCoin, 1000);
        return;
    }
    
    console.log('✅ Монетка найдена');
    
    // Очистка старых обработчиков
    coin.onclick = null;
    coin.ontouchstart = null;
    
    // Добавление новых обработчиков
    coin.addEventListener('click', function(event) {
        handleCoinEvent(event);
    });
    
    coin.addEventListener('touchstart', function(event) {
        handleCoinEvent(event);
    }, { passive: false });
    
    // Стили для мобильных
    coin.style.cursor = 'pointer';
    coin.style.webkitTapHighlightColor = 'transparent';
    coin.style.touchAction = 'manipulation';
    
    console.log('✅ Обработчики монетки установлены');
}

// Обработчик кликов по монетке
function handleCoinEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('💰 Клик по монетке:', event.type);
    
    // Проверяем наличие userData
    if (!window.userData) {
        console.error('❌ userData не определен');
        return false;
    }
    
    // Проверяем античит
    if (window.antiCheatBlocked) {
        console.log('⏸️ Античит заблокирован');
        return false;
    }
    
    // Проверяем кулдаун
    const now = Date.now();
    if (window.lastClickTime && (now - window.lastClickTime < 25)) {
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
    
    // Обновляем баланс
    window.userData.balance += clickPower;
    window.userData.totalEarned += clickPower;
    window.userData.totalClicks = (window.userData.totalClicks || 0) + 1;
    window.userData.lastUpdate = Date.now();
    
    console.log('💵 Баланс обновлен:', window.userData.balance.toFixed(9));
    
    // Обновляем интерфейс
    if (typeof updateUI === 'function') {
        updateUI();
    } else {
        updateFallbackUI();
    }
    
    // Сохраняем данные
    if (typeof saveUserData === 'function') {
        saveUserData();
    } else {
        saveFallbackData();
    }
    
    // Создаем попап
    createClickPopup(event, clickPower);
    
    // Анимация монетки
    const coin = event.currentTarget;
    coin.style.transform = 'scale(0.95)';
    setTimeout(() => {
        coin.style.transform = 'scale(1)';
    }, 100);
    
    return false;
}

// Аварийное сохранение данных
function saveFallbackData() {
    try {
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
        
        console.log('💾 Данные сохранены (аварийный режим)');
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

// Добавление CSS анимации
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
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Автоматическое восстановление подключения
function startConnectionMonitor() {
    setInterval(async () => {
        if (!window.apiConnected && typeof apiRequest === 'function') {
            try {
                await apiRequest('/health');
                if (typeof showNotification === 'function') {
                    showNotification('✅ Подключение восстановлено!', 'success', 2000);
                }
            } catch (error) {
                // Тихий повтор при ошибке
            }
        }
    }, 30000);
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
    } else {
        console.log('🌐 Режим веб-браузера');
    }
    
    // Добавляем анимацию
    addPopupAnimation();
    
    // Загружаем данные пользователя
    loadUserData();
    
    // Инициализируем монетку
    initializeCoin();
    
    // Запускаем монитор подключения
    startConnectionMonitor();
    
    // Запускаем обновление интерфейса
    const uiInterval = setInterval(() => {
        if (typeof updateUI === 'function') {
            updateUI();
        } else {
            updateFallbackUI();
        }
    }, 100);
    
    // Автосохранение
    const saveInterval = setInterval(() => {
        if (window.userData) {
            if (typeof saveUserData === 'function') {
                saveUserData();
            } else {
                saveFallbackData();
            }
        }
    }, 5000);
    
    // Пассивный майнинг
    const miningInterval = setInterval(() => {
        if (window.userData && typeof calculateMiningSpeed === 'function') {
            try {
                const miningSpeed = calculateMiningSpeed();
                if (miningSpeed > 0) {
                    window.userData.balance += miningSpeed;
                    window.userData.totalEarned += miningSpeed;
                    window.userData.lastUpdate = Date.now();
                    
                    if (typeof updateUI === 'function') {
                        updateUI();
                    }
                }
            } catch (error) {
                console.error('❌ Ошибка майнинга:', error);
            }
        }
    }, 1000);
    
    // Показываем главный экран
    setTimeout(() => {
        if (typeof showSection === 'function') {
            showSection('main');
        }
    }, 500);
    
    console.log('✅ Приложение успешно инициализировано');
    
    // Очистка при закрытии
    window.addEventListener('beforeunload', () => {
        clearInterval(uiInterval);
        clearInterval(saveInterval);
        clearInterval(miningInterval);
        if (window.userData) {
            try {
                localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
            } catch (error) {
                console.error('❌ Ошибка финального сохранения:', error);
            }
        }
    });
}

// Запуск приложения
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('🎮 Исправленный main.js загружен и готов к работе!');
