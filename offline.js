// offline.js - полный офлайн режим для Sparkcoin
console.log('🎮 Активирован офлайн режим Sparkcoin');

// Переопределяем API функции
window.apiRequest = async function(endpoint, options = {}) {
    console.log(`📡 Офлайн запрос: ${endpoint}`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const responses = {
        '/health': { status: 'healthy', mode: 'offline' },
        '/player/:userId': { success: true, player: getDefaultPlayerData() },
        '/all_players': { success: true, players: [getDefaultPlayerData()] },
        '/leaderboard': { 
            success: true, 
            leaderboard: [{
                rank: 1,
                username: '👑 Вы', 
                balance: window.userData?.balance || 0.000000100
            }] 
        },
        '/lottery/status': {
            success: true,
            lottery: {
                eagle: [], tails: [], timer: 45, total_eagle: 0, total_tails: 0
            }
        },
        '/classic-lottery/status': {
            success: true,
            lottery: {
                bets: [], total_pot: 0, timer: 90, participants_count: 0
            }
        },
        '/referral/stats/:userId': {
            success: true,
            stats: { referralsCount: 0, totalEarnings: 0 },
            referralCode: 'GITHUB-' + Date.now().toString(36).toUpperCase()
        },
        '/top/winners': { success: true, winners: [] }
    };
    
    if (options.method === 'POST') {
        return { success: true, message: 'Сохранено в офлайн режиме' };
    }
    
    for (const [key, value] of Object.entries(responses)) {
        if (endpoint.includes(key.replace('/:userId', ''))) {
            return value;
        }
    }
    
    return { success: true, offline: true };
};

function getDefaultPlayerData() {
    return {
        userId: 'github_player',
        username: 'GitHub Игрок',
        balance: 0.000000100,
        totalEarned: 0.000000100,
        totalClicks: 0,
        lastUpdate: new Date().toISOString()
    };
}

// Обновляем статус
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        const apiStatus = document.getElementById('apiStatus');
        if (apiStatus) {
            apiStatus.textContent = 'API: GitHub Режим';
            apiStatus.className = 'api-status connected';
        }
    }, 1000);
});
