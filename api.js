// api.js - ОПТИМИЗИРОВАННЫЙ API КЛИЕНТ
console.log('🌐 Загружаем оптимизированный API клиент...');

window.CONFIG = {
    API_BASE_URL: 'https://b9339c3b-8a22-434d-b97a-a426ac75c328-00-2vzfhw3hnozb6.sisko.replit.dev',
    REQUEST_TIMEOUT: 10000,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000
};

// ========== ОСНОВНАЯ ФУНКЦИЯ ЗАПРОСА ==========
window.apiRequest = async function(endpoint, options = {}) {
    const url = `${window.CONFIG.API_BASE_URL}${endpoint}`;
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), window.CONFIG.REQUEST_TIMEOUT);
        requestOptions.signal = controller.signal;
        
        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            return data;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        return getOfflineResponse(endpoint, options);
    }
};

// ========== ОФЛАЙН РЕЖИМ ==========
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
                }
            ],
            offline: true
        },
        
        '/api/leaderboard': {
            success: true,
            leaderboard: [
                {
                    rank: 1,
                    username: currentUsername,
                    balance: currentBalance,
                    totalEarned: window.userData?.totalEarned || 0.000000100,
                    totalClicks: window.userData?.totalClicks || 0,
                    clickSpeed: window.calculateClickPower ? window.calculateClickPower() : 0.000000001,
                    mineSpeed: window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0.000000000,
                    totalSpeed: (window.calculateClickPower ? window.calculateClickPower() : 0.000000001) + 
                               (window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0.000000000)
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
                timer: Math.floor(Math.random() * 60) + 30,
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
                timer: Math.floor(Math.random() * 120) + 60,
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
            referralCode: 'REF-' + currentUserId.slice(-8).toUpperCase(),
            offline: true
        },
        
        '/api/top/winners': {
            success: true,
            winners: [
                {
                    username: currentUsername,
                    totalWinnings: 0.000001000,
                    totalLosses: 0.000000200,
                    netWinnings: 0.000000800
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

// ========== ФУНКЦИИ ПРОВЕРКИ СОЕДИНЕНИЯ ==========
window.checkApiConnection = async function() {
    try {
        const response = await window.apiRequest('/api/health');
        if (response && (response.status === 'healthy' || response.offline)) {
            window.updateApiStatus('connected', response.offline ? 'Офлайн режим' : 'Sparkcoin API');
            return true;
        }
    } catch (error) {
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
};

// ========== ОПТИМИЗИРОВАННАЯ СИНХРОНИЗАЦИЯ ==========
window.syncPlayerDataWithAPI = async function() {
    if (!window.userData || !window.isDataLoaded) {
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
            if (response.bestBalance && response.bestBalance > window.userData.balance) {
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

// ========== УТИЛИТЫ ДЛЯ РАБОТЫ С ДАННЫМИ ==========
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
        return upgradesData;
    };
}

if (typeof window.loadSyncedData === 'undefined') {
    window.loadSyncedData = async function() {
        try {
            const userId = window.userData?.userId;
            if (!userId) return false;
            
            const response = await window.apiRequest(`/api/sync/unified/${userId}`);
            
            if (response && response.success && response.userData) {
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
                
                window.userData.userId = serverData.userId || window.userData.userId;
                window.userData.username = serverData.username || window.userData.username;
                window.userData.lotteryWins = serverData.lotteryWins || 0;
                window.userData.totalBet = serverData.totalBet || 0;
                window.userData.referralEarnings = serverData.referralEarnings || 0;
                window.userData.referralsCount = serverData.referralsCount || 0;
                window.userData.totalWinnings = serverData.totalWinnings || 0;
                window.userData.totalLosses = serverData.totalLosses || 0;
                
                if (serverData.upgrades) {
                    for (const key in serverData.upgrades) {
                        const serverLevel = serverData.upgrades[key];
                        const localLevel = window.upgrades[key]?.level || window.upgrades[key] || 0;
                        
                        if (serverLevel > localLevel) {
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
                if (response.userId && response.userId !== window.userData.userId) {
                    window.userData.userId = response.userId;
                    if (window.saveUserData) window.saveUserData();
                }
                
                if (response.bestBalance && response.bestBalance > window.userData.balance) {
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

// ========== ПОЛИФИЛЛЫ ДЛЯ ОТСУТСТВУЮЩИХ ФУНКЦИЙ ==========
if (typeof window.showNotification === 'undefined') {
    window.showNotification = function(message, type = 'info', duration = 3000) {
        console.log(`🔔 ${type.toUpperCase()}: ${message}`);
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

// ========== АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ ==========
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

console.log('✅ Оптимизированный API клиент загружен!');
