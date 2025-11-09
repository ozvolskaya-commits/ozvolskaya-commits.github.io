// api.js - полностью исправленная версия
console.log('🌐 API для Sparkcoin - НОВАЯ ВЕРСИЯ');

window.CONFIG = {
    API_BASE_URL: 'https://b9339c3b-8a22-434d-b97a-a426ac75c328-00-2vzfhw3hnozb6.sisko.replit.dev'
};

// Основная функция API запросов
window.apiRequest = async function(endpoint, options = {}) {
    const url = `${window.CONFIG.API_BASE_URL}${endpoint}`;
    console.log(`🔄 API запрос: ${url}`);
    
    const requestOptions = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        mode: 'cors',
        credentials: 'omit'
    };
    
    if (options.body) {
        requestOptions.body = options.body;
    }
    
    try {
        const response = await fetch(url, requestOptions);
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ API ответ: ${endpoint}`, data);
            return data;
        } else {
            console.warn(`⚠️ API ошибка: ${response.status} ${endpoint}`);
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.log('📴 API недоступно, используем офлайн режим:', error.message);
        return getOfflineResponse(endpoint);
    }
};

// Офлайн ответы
function getOfflineResponse(endpoint) {
    const offlineResponses = {
        '/api/top/winners': {
            success: true,
            winners: [
                {
                    username: 'Офлайн Чемпион',
                    totalWinnings: 0.000001000,
                    totalLosses: 0.000000200,
                    netWinnings: 0.000000800
                }
            ],
            offline: true
        },
        '/api/health': {
            status: 'healthy',
            offline: true
        },
        '/api/sync/unified': {
            success: true,
            message: 'Синхронизировано в офлайн режиме',
            offline: true
        },
        '/api/sync/telegram': {
            success: true,
            message: 'Офлайн режим',
            offline: true
        },
        '/api/all_players': {
            success: true,
            players: [
                {
                    userId: 'demo1',
                    username: 'Демо Игрок 1',
                    balance: 0.000000500,
                    totalEarned: 0.000001000,
                    totalClicks: 50
                },
                {
                    userId: 'demo2', 
                    username: 'Демо Игрок 2',
                    balance: 0.000000300,
                    totalEarned: 0.000000800,
                    totalClicks: 30
                }
            ],
            offline: true
        },
        '/api/leaderboard': {
            success: true,
            leaderboard: [
                {
                    rank: 1,
                    username: '👑 Топ Игрок',
                    balance: 0.000001000,
                    totalEarned: 0.000002000,
                    totalClicks: 150,
                    clickSpeed: 0.000000005,
                    mineSpeed: 0.000000010,
                    totalSpeed: 0.000000015
                }
            ],
            offline: true
        },
        '/api/lottery/status': {
            success: true,
            lottery: {
                eagle: [],
                tails: [],
                last_winner: null,
                timer: 60,
                total_eagle: 0,
                total_tails: 0,
                participants_count: 0
            },
            offline: true
        },
        '/api/classic-lottery/status': {
            success: true,
            lottery: {
                bets: [],
                total_pot: 0,
                timer: 120,
                participants_count: 0,
                history: []
            },
            offline: true
        },
        '/api/referral/stats': {
            success: true,
            stats: {
                referralsCount: 0,
                totalEarnings: 0
            },
            referralCode: 'REF-OFFLINE',
            offline: true
        }
    };
    
    for (const [key, value] of Object.entries(offlineResponses)) {
        if (endpoint.includes(key.replace('/:userId', ''))) {
            return value;
        }
    }
    
    return { 
        success: true, 
        offline: true,
        message: 'Офлайн режим'
    };
}

// Функция проверки соединения
window.checkApiConnection = async function() {
    console.log('🔍 Проверка соединения с API...');
    try {
        const response = await window.apiRequest('/api/health');
        if (response && response.status === 'healthy') {
            console.log('✅ API подключено!');
            window.updateApiStatus('connected', 'Sparkcoin API');
            return true;
        }
    } catch (error) {
        console.log('📴 API недоступно');
        window.updateApiStatus('disconnected', 'Офлайн режим');
    }
    return false;
};

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

// Функция синхронизации данных с API
window.syncPlayerDataWithAPI = async function() {
    console.log('🔄 Синхронизация с API...');
    
    if (!window.userData || !window.isDataLoaded) {
        console.log('❌ Данные пользователя не загружены');
        return false;
    }
    
    try {
        const response = await window.apiRequest(`/api/player/${window.userData.userId}`, {
            method: 'POST',
            body: JSON.stringify(window.userData)
        });
        
        if (response && response.success) {
            console.log('✅ Данные синхронизированы с API');
            return true;
        }
    } catch (error) {
        console.log('📴 Ошибка синхронизации, работаем локально');
    }
    
    return false;
};

window.saveUserDataToAPI = window.syncPlayerDataWithAPI;

// Функция загрузки всех игроков
window.loadAllPlayers = async function() {
    console.log('👥 Загрузка списка игроков...');
    try {
        const data = await window.apiRequest('/api/all_players');
        if (data && data.success) {
            window.allPlayers = data.players || [];
            console.log(`✅ Загружено ${window.allPlayers.length} игроков`);
        }
    } catch (error) {
        console.log('📴 Ошибка загрузки игроков');
        window.allPlayers = [];
    }
};

// Заглушки для функций лотереи
window.startLotteryAutoUpdate = function() {
    console.log('🎰 Автообновление лотереи...');
    // Здесь будет реальная логика автообновления
    setInterval(async () => {
        try {
            if (typeof updateLotteryStatus === 'function') {
                await updateLotteryStatus();
            }
        } catch (error) {
            console.log('Ошибка автообновления лотереи:', error);
        }
    }, 5000);
};

window.startClassicLotteryUpdate = function() {
    console.log('🎲 Автообновление классической лотереи...');
    // Здесь будет реальная логика автообновления
    setInterval(async () => {
        try {
            if (typeof updateClassicLotteryStatus === 'function') {
                await updateClassicLotteryStatus();
            }
        } catch (error) {
            console.log('Ошибка автообновления классической лотереи:', error);
        }
    }, 5000);
};

window.loadReferralStats = function() {
    console.log('👥 Загрузка реферальной статистики...');
    if (typeof updateReferralStats === 'function') {
        updateReferralStats();
    }
};

// Вспомогательные функции для лотерей
async function updateLotteryStatus() {
    try {
        const data = await window.apiRequest('/api/lottery/status');
        if (data && data.success) {
            // Обновляем UI лотереи
            updateLotteryUI(data.lottery);
        }
    } catch (error) {
        console.log('Ошибка обновления статуса лотереи');
    }
}

async function updateClassicLotteryStatus() {
    try {
        const data = await window.apiRequest('/api/classic-lottery/status');
        if (data && data.success) {
            // Обновляем UI классической лотереи
            updateClassicLotteryUI(data.lottery);
        }
    } catch (error) {
        console.log('Ошибка обновления статуса классической лотереи');
    }
}

function updateLotteryUI(lottery) {
    // Обновляем таймер
    const timerElement = document.getElementById('lotteryTimer');
    if (timerElement) {
        timerElement.textContent = lottery.timer;
    }
    
    // Обновляем статистику команд
    const eagleChanceElement = document.getElementById('eagleChance');
    const tailsChanceElement = document.getElementById('tailsChance');
    const eagleTotalElement = document.getElementById('eagleTotal');
    const tailsTotalElement = document.getElementById('tailsTotal');
    
    if (eagleChanceElement && tailsChanceElement) {
        const total = lottery.total_eagle + lottery.total_tails;
        const eagleChance = total > 0 ? (lottery.total_eagle / total * 100).toFixed(1) : 50;
        const tailsChance = total > 0 ? (lottery.total_tails / total * 100).toFixed(1) : 50;
        
        eagleChanceElement.textContent = eagleChance + '%';
        tailsChanceElement.textContent = tailsChance + '%';
    }
    
    if (eagleTotalElement) eagleTotalElement.textContent = lottery.total_eagle.toFixed(9) + ' S';
    if (tailsTotalElement) tailsTotalElement.textContent = lottery.total_tails.toFixed(9) + ' S';
}

function updateClassicLotteryUI(lottery) {
    // Обновляем таймер
    const timerElement = document.getElementById('classicTimer');
    if (timerElement) {
        timerElement.textContent = lottery.timer;
    }
    
    // Обновляем банк
    const potElement = document.getElementById('lotteryPot');
    if (potElement) {
        potElement.textContent = lottery.total_pot.toFixed(9);
    }
    
    // Обновляем участников
    const participantsElement = document.getElementById('lotteryParticipants');
    if (participantsElement) {
        participantsElement.textContent = lottery.participants_count;
    }
}

// ========== API-FIX.JS ФУНКЦИИ ==========

// Функция для получения улучшений для синхронизации
if (typeof window.getUpgradesForSync === 'undefined') {
    window.getUpgradesForSync = function() {
        const upgradesData = {};
        if (window.upgrades) {
            for (const key in window.upgrades) {
                if (window.upgrades[key] && typeof window.upgrades[key].level !== 'undefined') {
                    upgradesData[key] = window.upgrades[key].level;
                }
            }
        }
        return upgradesData;
    };
}

// Функция для загрузки синхронизированных данных
if (typeof window.loadSyncedData === 'undefined') {
    window.loadSyncedData = async function() {
        console.log('📥 Загрузка синхронизированных данных...');
        
        try {
            const userId = window.userData?.userId;
            if (!userId) {
                console.log('❌ Нет userID для загрузки');
                return false;
            }
            
            const response = await window.apiRequest(`/api/sync/unified/${userId}`);
            
            if (response && response.success && response.userData) {
                console.log('✅ Данные загружены с сервера');
                
                // ОБЪЕДИНЯЕМ данные, сохраняя локальный прогресс
                const serverData = response.userData;
                
                // Используем максимальные значения
                window.userData.balance = Math.max(window.userData.balance, serverData.balance);
                window.userData.totalEarned = Math.max(window.userData.totalEarned, serverData.totalEarned);
                window.userData.totalClicks = Math.max(window.userData.totalClicks, serverData.totalClicks);
                
                // Обновляем другие данные с сервера
                window.userData.userId = serverData.userId;
                window.userData.username = serverData.username;
                window.userData.lotteryWins = serverData.lotteryWins;
                window.userData.totalBet = serverData.totalBet;
                window.userData.referralEarnings = serverData.referralEarnings;
                window.userData.referralsCount = serverData.referralsCount;
                window.userData.totalWinnings = serverData.totalWinnings;
                window.userData.totalLosses = serverData.totalLosses;
                
                // СИНХРОНИЗИРУЕМ УЛУЧШЕНИЯ
                if (serverData.upgrades) {
                    console.log('🔄 Синхронизация улучшений с сервера:', serverData.upgrades);
                    for (const key in serverData.upgrades) {
                        const serverLevel = serverData.upgrades[key];
                        const localLevel = window.upgrades[key]?.level || 0;
                        
                        // Берем максимальный уровень
                        if (serverLevel > localLevel) {
                            console.log(`📈 Обновление улучшения ${key}: ${localLevel} -> ${serverLevel}`);
                            if (!window.upgrades[key]) {
                                window.upgrades[key] = {};
                            }
                            window.upgrades[key].level = serverLevel;
                        }
                    }
                }
                
                saveUserData();
                updateUI();
                updateShopUI();
                
                showNotification('Данные синхронизированы с сервером!', 'success');
                return true;
            }
            
        } catch (error) {
            console.log('📴 Ошибка загрузки данных:', error);
        }
        
        return false;
    };
}

// Функция для синхронизации данных
if (typeof window.syncUserData === 'undefined') {
    window.syncUserData = async function(force = false) {
        console.log('🔄 Синхронизация данных...');
        
        if (!window.userData) return false;
        
        try {
            const syncData = {
                userId: window.userData.userId,
                username: window.userData.username,
                balance: window.userData.balance,
                totalEarned: window.userData.totalEarned,
                totalClicks: window.userData.totalClicks,
                upgrades: window.getUpgradesForSync(),
                lastUpdate: Date.now(),
                telegramId: window.userData.telegramId,
                deviceId: window.multiSessionDetector ? window.multiSessionDetector.generateDeviceId() : 'unknown'
            };
            
            const response = await window.apiRequest('/api/sync/unified', {
                method: 'POST',
                body: JSON.stringify(syncData)
            });
            
            if (response && response.success) {
                console.log('✅ Данные синхронизированы с сервером');
                
                // Если сервер вернул другой userId (при объединении записей)
                if (response.userId && response.userId !== window.userData.userId) {
                    console.log(`🆔 Объединение записей: ${window.userData.userId} -> ${response.userId}`);
                    window.userData.userId = response.userId;
                    saveUserData();
                }
                
                // Если серверный баланс больше - используем его
                if (response.bestBalance > window.userData.balance) {
                    console.log(`💰 Баланс обновлен: ${window.userData.balance} -> ${response.bestBalance}`);
                    window.userData.balance = response.bestBalance;
                    updateUI();
                    saveUserData();
                }
                
                localStorage.setItem('last_sync_time', Date.now());
                return true;
            }
            
        } catch (error) {
            console.log('📴 Ошибка синхронизации:', error);
        }
        
        return false;
    };
}

// Функция для уведомлений (если не определена)
if (typeof window.showNotification === 'undefined') {
    window.showNotification = function(message, type = 'info', duration = 3000) {
        console.log(`🔔 ${type.toUpperCase()}: ${message}`);
        
        // Создаем простое уведомление
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
        }, duration);
    };
}

// Функция для расчета силы клика (если не определена)
if (typeof window.calculateClickPower === 'undefined') {
    window.calculateClickPower = function() {
        let power = 0.000000001;
        
        if (window.upgrades) {
            for (const key in window.upgrades) {
                if (key.startsWith('mouse') && window.upgrades[key]) {
                    const level = window.upgrades[key].level || 0;
                    const upgrade = UPGRADES[key];
                    if (upgrade) {
                        power += level * upgrade.baseBonus;
                    }
                }
            }
        }
        
        return power;
    };
}

// Функция для расчета скорости майнинга (если не определена)
if (typeof window.calculateMiningSpeed === 'undefined') {
    window.calculateMiningSpeed = function() {
        let speed = 0.000000000;
        
        if (window.upgrades) {
            for (const key in window.upgrades) {
                if ((key.startsWith('gpu') || key.startsWith('cpu')) && window.upgrades[key]) {
                    const level = window.upgrades[key].level || 0;
                    const upgrade = UPGRADES[key];
                    if (upgrade) {
                        speed += level * upgrade.baseBonus;
                    }
                }
            }
        }
        
        return speed;
    };
}

// Функция для обновления магазина (если не определена)
if (typeof window.updateShopUI === 'undefined') {
    window.updateShopUI = function() {
        console.log('🛒 Обновляем интерфейс магазина');
        if (window.updateShopUIFixed) {
            window.updateShopUIFixed();
        } else {
            // Базовая реализация
            for (const upgradeId in UPGRADES) {
                const upgrade = UPGRADES[upgradeId];
                const currentLevel = window.upgrades[upgradeId]?.level || 0;
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
                        buyButton.style.opacity = '1';
                    } else {
                        buyButton.disabled = true;
                        buyButton.textContent = 'Недостаточно средств';
                        buyButton.style.opacity = '0.6';
                    }
                }
            }
        }
    };
}

// Функция для обновления UI (если не определена)
if (typeof window.updateUI === 'undefined') {
    window.updateUI = function() {
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
    };
}

// Функция для сохранения данных (если не определена)
if (typeof window.saveUserData === 'undefined') {
    window.saveUserData = function() {
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
    };
}

// Функция для покупки улучшений (если не определена)
if (typeof window.buyUpgrade === 'undefined') {
    window.buyUpgrade = function(upgradeId) {
        if (!window.userData || !UPGRADES[upgradeId]) {
            showNotification('Ошибка данных', 'error');
            return;
        }
        
        const upgrade = UPGRADES[upgradeId];
        const currentLevel = window.upgrades[upgradeId]?.level || 0;
        const price = upgrade.basePrice * Math.pow(2, currentLevel);
        
        console.log(`🛒 Покупка ${upgradeId}: уровень ${currentLevel}, цена ${price}`);
        
        if (window.userData.balance >= price) {
            window.userData.balance -= price;
            if (!window.upgrades[upgradeId]) {
                window.upgrades[upgradeId] = { level: 0 };
            }
            window.upgrades[upgradeId].level = currentLevel + 1;
            
            updateUI();
            updateShopUI();
            saveUserData();
            
            setTimeout(() => window.syncUserData(), 1000);
            
            showNotification(`Улучшение "${upgrade.name}" куплено! Уровень: ${currentLevel + 1}`, 'success');
        } else {
            showNotification('Недостаточно средств', 'error');
        }
    };
}

// Функция для обновления баланса (если не определена)
if (typeof window.updateBalanceImmediately === 'undefined') {
    window.updateBalanceImmediately = function() {
        if (!window.userData) return;
        
        const balanceElement = document.getElementById('balanceValue');
        if (balanceElement) {
            balanceElement.textContent = (window.userData.balance || 0.000000100).toFixed(9) + ' S';
        }
        
        const clickValueElement = document.getElementById('clickValue');
        if (clickValueElement) {
            clickValueElement.textContent = calculateClickPower().toFixed(9);
        }
    };
}

console.log('✅ API для Sparkcoin загружен! ВСЕ ФУНКЦИИ ОПРЕДЕЛЕНЫ');

// Автоматическая проверка соединения
setTimeout(() => {
    if (window.checkApiConnection) {
        window.checkApiConnection();
    }
}, 1000);
