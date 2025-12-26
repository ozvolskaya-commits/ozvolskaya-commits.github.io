// api.js - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ ДЛЯ SPARKCOIN
console.log('🌐 API для Sparkcoin - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ');

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
        return getOfflineResponse(endpoint, options);
    }
};

// Улучшенные офлайн ответы
function getOfflineResponse(endpoint, options = {}) {
    const currentUserId = window.userData?.userId || 'default_user';
    const currentUsername = window.userData?.username || 'Текущий Игрок';
    const currentBalance = window.userData?.balance || 0.000000100;
    
    const offlineResponses = {
        '/api/health': {
            status: 'healthy',
            mode: 'offline',
            timestamp: new Date().toISOString()
        },
        
        '/api/sync/unified': {
            success: true,
            message: 'Синхронизировано в офлайн режиме',
            userId: currentUserId,
            bestBalance: currentBalance,
            offline: true,
            timestamp: new Date().toISOString()
        },
        
        '/api/transfer': {
            success: true,
            message: 'Перевод выполнен в офлайн режиме',
            offline: true
        },
        
        '/api/all_players': {
            success: true,
            players: [
                {
                    userId: currentUserId,
                    username: currentUsername,
                    balance: currentBalance,
                    totalEarned: window.userData?.totalEarned || 0.000000100,
                    totalClicks: window.userData?.totalClicks || 0,
                    lastUpdate: new Date().toISOString()
                },
                {
                    userId: 'demo_player_2',
                    username: 'Демо Игрок 2',
                    balance: 0.000000050,
                    totalEarned: 0.000000200,
                    totalClicks: 25,
                    lastUpdate: new Date().toISOString()
                }
            ],
            offline: true
        },
        
        '/api/leaderboard': {
            success: true,
            leaderboard: [
                {
                    userId: currentUserId,
                    username: currentUsername,
                    balance: currentBalance,
                    totalEarned: window.userData?.totalEarned || 0.000000100,
                    totalClicks: window.userData?.totalClicks || 0,
                    clickSpeed: window.calculateClickPower ? window.calculateClickPower() : 0.000000001,
                    mineSpeed: window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0.000000000,
                    totalSpeed: (window.calculateClickPower ? window.calculateClickPower() : 0.000000001) + 
                               (window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0.000000000),
                    upgrades: window.upgrades || {}
                },
                {
                    userId: 'demo_player_2',
                    username: 'Демо Игрок 2',
                    balance: 0.000000080,
                    totalEarned: 0.000000200,
                    totalClicks: 45,
                    clickSpeed: 0.000000002,
                    mineSpeed: 0.000000001,
                    totalSpeed: 0.000000003,
                    upgrades: { mouse1: 1, gpu1: 1 }
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
                timer: 60 - Math.floor((Date.now() / 1000) % 60),
                total_eagle: 0,
                total_tails: 0,
                participants_count: 0
            },
            offline: true
        },
        
        '/api/lottery/bet': {
            success: true,
            message: 'Ставка принята в офлайн режиме',
            bet_id: 'offline_' + Date.now(),
            offline: true
        },
        
        '/api/classic-lottery/status': {
            success: true,
            lottery: {
                bets: [],
                total_pot: 0,
                timer: 120 - Math.floor((Date.now() / 1000) % 120),
                participants_count: 0,
                history: []
            },
            offline: true
        },
        
        '/api/classic-lottery/bet': {
            success: true,
            message: 'Ставка принята в офлайн режиме',
            bet_id: 'offline_' + Date.now(),
            offline: true
        },
        
        '/api/referral/stats': {
            success: true,
            stats: {
                referralsCount: 0,
                totalEarnings: 0
            },
            referralCode: 'REF-' + currentUserId.slice(-8).toUpperCase(),
            offline: true
        },
        
        '/api/top/winners': {
            success: true,
            winners: [
                {
                    userId: currentUserId,
                    username: currentUsername,
                    totalWinnings: 0.000001000,
                    totalLosses: 0.000000200,
                    netWinnings: 0.000000800
                },
                {
                    userId: 'demo_player_2',
                    username: 'Демо Победитель',
                    totalWinnings: 0.000000500,
                    totalLosses: 0.000000100,
                    netWinnings: 0.000000400
                }
            ],
            offline: true
        }
    };

    if (options.method === 'POST') {
        return {
            success: true,
            message: 'Данные сохранены в офлайн режиме',
            userId: currentUserId,
            offline: true,
            timestamp: new Date().toISOString()
        };
    }
    
    for (const [key, value] of Object.entries(offlineResponses)) {
        if (endpoint.includes(key.replace('/:userId', '').replace('/:id', ''))) {
            return value;
        }
    }
    
    return { 
        success: true, 
        userId: currentUserId,
        offline: true,
        message: 'Офлайн режим',
        timestamp: new Date().toISOString()
    };
}

window.checkApiConnection = async function() {
    console.log('🔍 Проверка соединения с API...');
    try {
        const response = await window.apiRequest('/api/health');
        if (response && (response.status === 'healthy' || response.offline)) {
            console.log('✅ API подключено или работает в офлайн режиме!');
            window.updateApiStatus('connected', response.offline ? 'Офлайн режим' : 'Sparkcoin API');
            return true;
        }
    } catch (error) {
        console.log('📴 API недоступно');
        window.updateApiStatus('disconnected', 'Офлайн режим');
    }
    return false;
};

window.updateApiStatus = function(status, message) {
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.className = `api-status ${status}`;
        apiStatus.textContent = `API: ${message}`;
    }
    window.apiConnected = status === 'connected';
    console.log(`📡 Статус API: ${status} - ${message}`);
};

window.syncPlayerDataWithAPI = async function() {
    console.log('🔄 Синхронизация с API...');
    
    if (!window.userData || !window.isDataLoaded) {
        console.log('❌ Данные пользователя не загружены');
        return false;
    }
    
    try {
        const syncData = {
            userId: window.userData.userId,
            username: window.userData.username,
            balance: parseFloat(window.userData.balance),
            totalEarned: parseFloat(window.userData.totalEarned),
            totalClicks: window.userData.totalClicks,
            upgrades: window.getUpgradesForSync ? window.getUpgradesForSync() : (window.upgrades || {}),
            lastUpdate: Date.now(),
            telegramId: window.userData.telegramId,
            deviceId: window.generateDeviceId ? window.generateDeviceId() : 'unknown'
        };
        
        const response = await window.apiRequest('/api/sync/unified', {
            method: 'POST',
            body: JSON.stringify(syncData)
        });
        
        if (response && response.success) {
            console.log('✅ Данные синхронизированы с API');
            
            if (response.bestBalance && response.bestBalance > window.userData.balance) {
                console.log(`💰 Баланс обновлен: ${window.userData.balance} -> ${response.bestBalance}`);
                window.userData.balance = response.bestBalance;
                if (window.updateUI) window.updateUI();
            }
            
            return true;
        }
    } catch (error) {
        console.log('📴 Ошибка синхронизации, работаем локально');
    }
    
    return false;
};

window.loadAllPlayers = async function() {
    console.log('👥 Загрузка списка игроков...');
    try {
        const data = await window.apiRequest('/api/all_players');
        if (data && data.success) {
            window.allPlayers = data.players || [];
            console.log(`✅ Загружено ${window.allPlayers.length} игроков`);
            return window.allPlayers;
        }
    } catch (error) {
        console.log('📴 Ошибка загрузки игроков');
        window.allPlayers = [];
    }
    return [];
};

window.loadLeaderboard = async function() {
    console.log('🏆 Загрузка рейтинга...');
    try {
        const data = await window.apiRequest('/api/leaderboard');
        if (data && data.success) {
            console.log(`✅ Загружен рейтинг из ${data.leaderboard.length} игроков`);
            return data.leaderboard;
        }
    } catch (error) {
        console.log('📴 Ошибка загрузки рейтинга');
    }
    return [];
};

window.loadTopWinners = async function() {
    console.log('🎯 Загрузка топа победителей...');
    try {
        const data = await window.apiRequest('/api/top/winners?limit=50');
        if (data && data.success) {
            console.log(`✅ Загружено ${data.winners.length} победителей`);
            return data.winners;
        }
    } catch (error) {
        console.log('📴 Ошибка загрузки топа победителей');
    }
    return [];
};

window.loadLotteryStatus = async function() {
    console.log('🎰 Загрузка статуса командной лотереи...');
    try {
        const data = await window.apiRequest('/api/lottery/status');
        if (data && data.success) {
            console.log('✅ Статус лотереи загружен');
            return data.lottery;
        }
    } catch (error) {
        console.log('📴 Ошибка загрузки статуса лотереи');
    }
    return null;
};

window.loadClassicLotteryStatus = async function() {
    console.log('🎲 Загрузка статуса классической лотереи...');
    try {
        const data = await window.apiRequest('/api/classic-lottery/status');
        if (data && data.success) {
            console.log('✅ Статус классической лотереи загружен');
            return data.lottery;
        }
    } catch (error) {
        console.log('📴 Ошибка загрузки статуса лотереи');
    }
    return null;
};

window.loadReferralStats = async function() {
    console.log('👥 Загрузка реферальной статистики...');
    try {
        const userId = window.userData?.userId;
        if (!userId) {
            console.log('❌ Нет userID для загрузки рефералов');
            return null;
        }
        
        const data = await window.apiRequest(`/api/referral/stats/${userId}`);
        if (data && data.success) {
            console.log('✅ Реферальная статистика загружена');
            return data;
        }
    } catch (error) {
        console.log('📴 Ошибка загрузки реферальной статистики');
    }
    return null;
};

window.placeLotteryBet = async function(team, amount) {
    console.log(`🎯 Ставка в лотерею: ${team}, ${amount}`);
    
    if (!window.userData) {
        console.log('❌ Нет данных пользователя');
        return { success: false, error: 'Нет данных пользователя' };
    }
    
    try {
        const response = await window.apiRequest('/api/lottery/bet', {
            method: 'POST',
            body: JSON.stringify({
                userId: window.userData.userId,
                team: team,
                amount: amount,
                username: window.userData.username
            })
        });
        
        return response;
    } catch (error) {
        console.log('📴 Ошибка ставки в лотерею');
        return { success: false, error: 'Ошибка соединения' };
    }
};

window.placeClassicLotteryBet = async function(amount) {
    console.log(`🎲 Ставка в классическую лотерею: ${amount}`);
    
    if (!window.userData) {
        console.log('❌ Нет данных пользователя');
        return { success: false, error: 'Нет данных пользователя' };
    }
    
    try {
        const response = await window.apiRequest('/api/classic-lottery/bet', {
            method: 'POST',
            body: JSON.stringify({
                userId: window.userData.userId,
                amount: amount,
                username: window.userData.username
            })
        });
        
        return response;
    } catch (error) {
        console.log('📴 Ошибка ставки в классическую лотерею');
        return { success: false, error: 'Ошибка соединения' };
    }
};

if (typeof window.getUpgradesForSync === 'undefined') {
    window.getUpgradesForSync = function() {
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
    };
}

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
                
                const serverData = response.userData;
                
                if (serverData.balance > window.userData.balance) {
                    window.userData.balance = serverData.balance;
                }
                if (serverData.totalEarned > window.userData.totalEarned) {
                    window.userData.totalEarned = serverData.totalEarned;
                }
                if (serverData.totalClicks > window.userData.totalClicks) {
                    window.userData.totalClicks = serverData.totalClicks;
                }
                
                window.userData.userId = serverData.userId;
                window.userData.username = serverData.username;
                window.userData.lotteryWins = serverData.lotteryWins || 0;
                window.userData.totalBet = serverData.totalBet || 0;
                window.userData.referralEarnings = serverData.referralEarnings || 0;
                window.userData.referralsCount = serverData.referralsCount || 0;
                window.userData.totalWinnings = serverData.totalWinnings || 0;
                window.userData.totalLosses = serverData.totalLosses || 0;
                
                if (serverData.upgrades) {
                    console.log('🔄 Синхронизация улучшений с сервера:', serverData.upgrades);
                    for (const key in serverData.upgrades) {
                        const serverLevel = serverData.upgrades[key];
                        const localLevel = window.upgrades[key]?.level || window.upgrades[key] || 0;
                        
                        if (serverLevel > localLevel) {
                            console.log(`📈 Обновление улучшения ${key}: ${localLevel} -> ${serverLevel}`);
                            if (!window.upgrades[key] || typeof window.upgrades[key] === 'number') {
                                window.upgrades[key] = { level: serverLevel };
                            } else {
                                window.upgrades[key].level = serverLevel;
                            }
                        }
                    }
                }
                
                if (window.saveUserData) window.saveUserData();
                if (window.updateUI) window.updateUI();
                if (window.updateShopUI) window.updateShopUI();
                
                if (window.showNotification) {
                    window.showNotification('Данные синхронизированы с сервером!', 'success');
                }
                return true;
            }
            
        } catch (error) {
            console.log('📴 Ошибка загрузки данных:', error);
        }
        
        return false;
    };
}

if (typeof window.syncUserData === 'undefined') {
    window.syncUserData = async function(force = false) {
        console.log('🔄 Синхронизация данных...');
        
        if (!window.userData) return false;
        
        try {
            const syncData = {
                userId: window.userData.userId,
                username: window.userData.username,
                balance: parseFloat(window.userData.balance),
                totalEarned: parseFloat(window.userData.totalEarned),
                totalClicks: window.userData.totalClicks,
                upgrades: window.getUpgradesForSync(),
                lastUpdate: Date.now(),
                telegramId: window.userData.telegramId,
                deviceId: window.generateDeviceId ? window.generateDeviceId() : 'unknown'
            };
            
            const response = await window.apiRequest('/api/sync/unified', {
                method: 'POST',
                body: JSON.stringify(syncData)
            });
            
            if (response && response.success) {
                console.log('✅ Данные синхронизированы с сервером');
                
                if (response.userId && response.userId !== window.userData.userId) {
                    console.log(`🆔 Объединение записей: ${window.userData.userId} -> ${response.userId}`);
                    window.userData.userId = response.userId;
                    if (window.saveUserData) window.saveUserData();
                }
                
                if (response.bestBalance && response.bestBalance > window.userData.balance) {
                    console.log(`💰 Баланс обновлен: ${window.userData.balance} -> ${response.bestBalance}`);
                    window.userData.balance = response.bestBalance;
                    if (window.updateUI) window.updateUI();
                    if (window.saveUserData) window.saveUserData();
                }
                
                localStorage.setItem('last_sync_time', Date.now().toString());
                return true;
            }
            
        } catch (error) {
            console.log('📴 Ошибка синхронизации:', error);
        }
        
        return false;
    };
}

if (typeof window.showNotification === 'undefined') {
    window.showNotification = function(message, type = 'info', duration = 3000) {
        console.log(`🔔 ${type.toUpperCase()}: ${message}`);
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <h4>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'} ${type.charAt(0).toUpperCase() + type.slice(1)}</h4>
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
        }, duration);
    };
}

if (typeof window.calculateClickPower === 'undefined') {
    window.calculateClickPower = function() {
        let power = 0.000000001;
        
        if (window.upgrades) {
            for (const key in window.upgrades) {
                if (key.startsWith('mouse')) {
                    const level = window.upgrades[key]?.level || window.upgrades[key] || 0;
                    const upgrade = window.UPGRADES ? window.UPGRADES[key] : null;
                    if (upgrade && upgrade.baseBonus) {
                        power += level * upgrade.baseBonus;
                    }
                }
            }
        }
        
        return power;
    };
}

if (typeof window.calculateMiningSpeed === 'undefined') {
    window.calculateMiningSpeed = function() {
        let speed = 0.000000000;
        
        if (window.upgrades) {
            for (const key in window.upgrades) {
                if (key.startsWith('gpu') || key.startsWith('cpu')) {
                    const level = window.upgrades[key]?.level || window.upgrades[key] || 0;
                    const upgrade = window.UPGRADES ? window.UPGRADES[key] : null;
                    if (upgrade && upgrade.baseBonus) {
                        speed += level * upgrade.baseBonus;
                    }
                }
            }
        }
        
        return speed;
    };
}

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
            clickValueElement.textContent = window.calculateClickPower().toFixed(9);
        }
        
        if (clickSpeedElement) {
            clickSpeedElement.textContent = window.calculateClickPower().toFixed(9) + ' S/сек';
        }
        
        if (mineSpeedElement) {
            mineSpeedElement.textContent = window.calculateMiningSpeed().toFixed(9) + ' S/сек';
        }
    };
}

if (typeof window.updateBalanceImmediately === 'undefined') {
    window.updateBalanceImmediately = function() {
        if (!window.userData) return;
        
        const balanceElement = document.getElementById('balanceValue');
        if (balanceElement) {
            balanceElement.textContent = (window.userData.balance || 0.000000100).toFixed(9) + ' S';
        }
        
        const clickValueElement = document.getElementById('clickValue');
        if (clickValueElement) {
            clickValueElement.textContent = window.calculateClickPower().toFixed(9);
        }
    };
}

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
                    } else if (typeof window.upgrades[key] === 'number') {
                        upgradesData[key] = window.upgrades[key];
                    }
                }
                localStorage.setItem('sparkcoin_upgrades_' + window.userData.userId, JSON.stringify(upgradesData));
            }
            
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
        }
    };
}

if (typeof window.generateDeviceId === 'undefined') {
    window.generateDeviceId = function() {
        let deviceId = localStorage.getItem('sparkcoin_device_id');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('sparkcoin_device_id', deviceId);
        }
        return deviceId;
    };
}

setTimeout(() => {
    if (window.checkApiConnection) {
        window.checkApiConnection();
    }
}, 1000);

setInterval(() => {
    if (window.checkApiConnection) {
        window.checkApiConnection();
    }
}, 60000);

console.log('✅ API для Sparkcoin загружен! ВСЕ ФУНКЦИИ ОПРЕДЕЛЕНЫ И ИСПРАВЛЕНЫ');
