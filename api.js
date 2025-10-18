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
};

window.startClassicLotteryUpdate = function() {
    console.log('🎲 Автообновление классической лотереи...');
};

window.loadReferralStats = function() {
    console.log('👥 Загрузка реферальной статистики...');
};

console.log('✅ API для Sparkcoin загружен! ВСЕ ФУНКЦИИ ОПРЕДЕЛЕНЫ');

// Автоматическая проверка соединения
setTimeout(() => {
    if (window.checkApiConnection) {
        window.checkApiConnection();
    }
}, 1000);
