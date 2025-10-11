// api.js - для домена sparkcoin.ru с исправленным URL
console.log('🌐 API для sparkcoin.ru');

window.CONFIG = {
    API_BASE_URL: 'https://b9339c3b-8a22-434d-b97a-a426ac75c328-00-2vzfhw3hnozb6.sisko.replit.dev'
};

window.apiRequest = async function(endpoint, options = {}) {
    // УБИРАЕМ ДВОЙНОЙ СЛЕШ - исправляем endpoint
    let cleanEndpoint = endpoint;
    if (cleanEndpoint.startsWith('/')) {
        cleanEndpoint = cleanEndpoint.substring(1);
    }
    
    const url = `${window.CONFIG.API_BASE_URL}/${cleanEndpoint}`;
    console.log(`🔄 API запрос: ${url}`);
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            mode: 'cors',
            credentials: 'omit'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ API ответ: ${cleanEndpoint}`, data);
            return data;
        } else {
            console.warn(`⚠️ API ошибка: ${response.status} ${cleanEndpoint}`);
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.log('📴 API недоступно, используем офлайн режим:', error.message);
        return getOfflineResponse(cleanEndpoint);
    }
};

function getOfflineResponse(endpoint) {
    const offlineResponses = {
        'api/health': { 
            status: 'healthy', 
            offline: true,
            timestamp: new Date().toISOString()
        },
        'api/player/': { 
            success: true, 
            player: getDefaultPlayerData(),
            offline: true
        },
        'api/all_players': { 
            success: true, 
            players: getOfflinePlayers(),
            offline: true
        },
        'api/leaderboard': { 
            success: true, 
            leaderboard: getOfflineLeaderboard(),
            offline: true
        },
        'api/lottery/status': {
            success: true,
            lottery: getOfflineLottery(),
            offline: true
        },
        'api/classic-lottery/status': {
            success: true,
            lottery: getOfflineClassicLottery(),
            offline: true
        },
        'api/referral/stats/': {
            success: true,
            stats: { referralsCount: 0, totalEarnings: 0 },
            referralCode: 'SPARK-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
            offline: true
        },
        'api/top/winners': {
            success: true,
            winners: getOfflineWinners(),
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

function getDefaultPlayerData() {
    const userId = 'spark_user_' + Math.random().toString(36).substr(2, 8);
    return {
        userId: userId,
        username: 'Игрок Sparkcoin',
        balance: 0.000000100,
        totalEarned: 0.000000100,
        totalClicks: 0,
        lastUpdate: new Date().toISOString(),
        upgrades: {},
        lotteryWins: 0,
        totalBet: 0,
        transfers: { sent: 0, received: 0 },
        referralEarnings: 0,
        referralsCount: 0,
        totalWinnings: 0,
        totalLosses: 0
    };
}

function getOfflinePlayers() {
    return [
        {
            userId: 'demo1',
            username: 'Демо Игрок 1',
            balance: 0.000000500
        },
        {
            userId: 'demo2', 
            username: 'Демо Игрок 2',
            balance: 0.000000300
        },
        {
            userId: 'demo3',
            username: 'Демо Игрок 3', 
            balance: 0.000000200
        }
    ];
}

function getOfflineLeaderboard() {
    return [
        {
            rank: 1,
            username: '👑 Топ Игрок',
            balance: 0.000001000,
            mineSpeed: 0.000000010,
            clickSpeed: 0.000000005,
            totalEarned: 0.000002000,
            totalClicks: 150
        },
        {
            rank: 2,
            username: '🥈 Второй Игрок',
            balance: 0.000000800,
            mineSpeed: 0.000000008,
            clickSpeed: 0.000000004,
            totalEarned: 0.000001500,
            totalClicks: 120
        },
        {
            rank: 3,
            username: '🥉 Третий Игрок',
            balance: 0.000000600,
            mineSpeed: 0.000000006,
            clickSpeed: 0.000000003,
            totalEarned: 0.000001200,
            totalClicks: 100
        }
    ];
}

function getOfflineLottery() {
    return {
        eagle: [
            {
                userId: 'player1',
                username: 'Игрок Орлов',
                amount: 0.000000100,
                timestamp: new Date().toISOString()
            }
        ],
        tails: [
            {
                userId: 'player2', 
                username: 'Игрок Решек',
                amount: 0.000000150,
                timestamp: new Date().toISOString()
            }
        ],
        last_winner: {
            team: 'eagle',
            username: 'Победитель',
            prize: 0.000000250,
            timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        timer: 45,
        total_eagle: 0.000000100,
        total_tails: 0.000000150,
        participants_count: 2
    };
}

function getOfflineClassicLottery() {
    return {
        bets: [
            {
                userId: 'classic1',
                username: 'Участник 1',
                amount: 0.000000100,
                timestamp: new Date().toISOString()
            }
        ],
        total_pot: 0.000000100,
        timer: 90,
        participants_count: 1,
        history: [
            {
                winner: 'Победитель',
                prize: 0.000000500,
                participants: 5,
                timestamp: new Date(Date.now() - 7200000).toISOString()
            }
        ]
    };
}

function getOfflineWinners() {
    return [
        {
            username: 'Чемпион',
            totalWinnings: 0.000001500,
            totalLosses: 0.000000300,
            netWinnings: 0.000001200
        },
        {
            username: 'Удачник',
            totalWinnings: 0.000001000,
            totalLosses: 0.000000200,
            netWinnings: 0.000000800
        },
        {
            username: 'Счастливчик',
            totalWinnings: 0.000000800,
            totalLosses: 0.000000100,
            netWinnings: 0.000000700
        }
    ];
}

// Проверка соединения при загрузке
window.checkApiConnection = async function() {
    try {
        const response = await fetch(`${window.CONFIG.API_BASE_URL}/api/health`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ API подключено:', data);
            window.updateApiStatus('connected', 'Sparkcoin.ru');
            return true;
        }
    } catch (error) {
        console.log('📴 API недоступно, работаем в офлайн режиме');
        window.updateApiStatus('disconnected', 'Офлайн режим');
    }
    return false;
};

console.log('✅ API для sparkcoin.ru загружен!');
