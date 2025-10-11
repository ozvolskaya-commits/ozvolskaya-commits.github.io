// api.js - упрощенная версия для GitHub Pages
const CONFIG = {
    API_BASE_URL: 'https://b9339c3b-8a22-434d-b97a-a426ac75c328-00-2vzfhw3hnozb6.sisko.replit.dev'
};

async function apiRequest(endpoint, options = {}) {
    console.log(`🔄 API запрос: ${endpoint}`);
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (response.ok) {
            return await response.json();
        }
    } catch (error) {
        console.log('📴 API недоступно, используем офлайн режим');
    }
    
    // Офлайн заглушки
    return {
        '/health': { status: 'healthy', offline: true },
        '/player/:userId': { success: true, player: getDefaultPlayerData() },
        '/all_players': { success: true, players: [] },
        '/leaderboard': { success: true, leaderboard: getOfflineLeaderboard() },
        '/lottery/status': getOfflineLottery(),
        '/classic-lottery/status': getOfflineClassicLottery(),
        '/referral/stats/:userId': getOfflineReferral()
    }[endpoint] || { success: true, offline: true };
}

function getDefaultPlayerData() {
    return {
        userId: 'github_user',
        username: 'GitHub Игрок', 
        balance: 0.000000100,
        totalEarned: 0.000000100,
        totalClicks: 0,
        lastUpdate: new Date().toISOString()
    };
}

function getOfflineLeaderboard() {
    return [{
        rank: 1,
        username: '👑 Вы',
        balance: 0.000000100,
        mineSpeed: 0.000000000,
        clickSpeed: 0.000000001
    }];
}

function getOfflineLottery() {
    return {
        success: true,
        lottery: {
            eagle: [], tails: [], timer: 60, total_eagle: 0, total_tails: 0
        }
    };
}

function getOfflineClassicLottery() {
    return {
        success: true, 
        lottery: {
            bets: [], total_pot: 0, timer: 120, participants_count: 0
        }
    };
}

function getOfflineReferral() {
    return {
        success: true,
        stats: { referralsCount: 0, totalEarnings: 0 },
        referralCode: 'GH-' + Math.random().toString(36).substr(2, 6).toUpperCase()
    };
}
