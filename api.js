// ==================== ФУНКЦИИ API ====================

let apiConnected = false;

function updateApiStatus(status, message) {
    const apiStatus = document.getElementById('apiStatus');
    apiStatus.className = `api-status ${status}`;
    apiStatus.textContent = `API: ${message}`;
    apiConnected = status === 'connected';
}

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function apiRequestWithRetry(endpoint, options = {}, retries = CONFIG.MAX_RETRIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            updateApiStatus('connected', 'Подключен');
            return data;
            
        } catch (error) {
            console.warn(`API Request attempt ${attempt} failed for ${endpoint}:`, error);
            
            if (attempt < retries) {
                const delay = CONFIG.RETRY_DELAY * attempt;
                updateApiStatus('syncing', `Повтор ${attempt}/${retries}...`);
                await wait(delay);
            } else {
                updateApiStatus('disconnected', 'Ошибка подключения');
                throw new Error(`Все попытки подключения исчерпаны: ${error.message}`);
            }
        }
    }
}

async function apiRequest(endpoint, options = {}) {
    try {
        return await apiRequestWithRetry(endpoint, options);
    } catch (error) {
        try {
            const quickResponse = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                signal: AbortSignal.timeout(5000)
            });
            
            if (quickResponse.ok) {
                const data = await quickResponse.json();
                updateApiStatus('connected', 'Подключен');
                return data;
            }
        } catch (finalError) {
            console.error('Final API attempt failed:', finalError);
        }
        
        return createFallbackResponse(endpoint, options);
    }
}

function createFallbackResponse(endpoint, options) {
    console.log(`Using fallback for: ${endpoint}`);
    
    switch(endpoint) {
        case '/health':
            return { status: 'healthy', mode: 'fallback' };
        
        case `/player/${userData.userId}`:
            if (options.method === 'POST') {
                return { success: true, message: 'Data saved in fallback mode' };
            } else {
                return { 
                    success: true, 
                    player: userData 
                };
            }
        
        case '/leaderboard':
            const type = new URLSearchParams(endpoint.split('?')[1]).get('type') || 'balance';
            return {
                success: true,
                leaderboard: [],
                type: type
            };
        
        case '/all_players':
            return {
                success: true,
                players: []
            };
        
        case '/lottery/status':
            return {
                success: true,
                lottery: getFallbackLotteryData()
            };
        
        case '/lottery/bet':
            if (options.method === 'POST') {
                return { success: true, message: 'Bet placed in fallback mode' };
            }
            break;
        
        case '/classic-lottery/status':
            return {
                success: true,
                lottery: getFallbackClassicLotteryData()
            };
        
        case '/classic-lottery/bet':
            if (options.method === 'POST') {
                return { success: true, message: 'Bet placed in fallback mode' };
            }
            break;
        
        case `/referral/stats/${userData.userId}`:
            return {
                success: true,
                stats: {
                    referralsCount: 0,
                    totalEarnings: 0
                },
                referralCode: userData.referralCode || 'FALLBACK-' + userData.userId.slice(-8)
            };
        
        case '/top/winners':
            return {
                success: true,
                winners: []
            };
    }
    
    return { success: false, error: 'Service temporarily unavailable' };
}

function getFallbackLotteryData() {
    return {
        eagle: [],
        tails: [],
        last_winner: null,
        timer: 60,
        total_eagle: 0,
        total_tails: 0,
        participants_count: 0
    };
}

function getFallbackClassicLotteryData() {
    return {
        bets: [],
        total_pot: 0,
        timer: 120,
        participants_count: 0,
        history: []
    };
}

async function checkApiConnection() {
    try {
        updateApiStatus('syncing', 'Проверка...');
        await apiRequest('/health');
        return true;
    } catch (error) {
        console.warn('API check failed, but continuing in resilient mode');
        return false;
    }
}

async function syncPlayerDataWithAPI() {
    try {
        const data = await apiRequest(`/player/${userData.userId}`);
        
        if (data.success && data.player) {
            const apiData = data.player;
            
            if (!userData.lastUpdate || (apiData.lastUpdate && new Date(apiData.lastUpdate) > new Date(userData.lastUpdate))) {
                userData.balance = apiData.balance || 0.000000100;
                userData.totalEarned = apiData.totalEarned || 0.000000100;
                userData.totalClicks = apiData.totalClicks || 0;
                userData.lotteryWins = apiData.lotteryWins || 0;
                userData.totalBet = apiData.totalBet || 0;
                userData.transfers = apiData.transfers || { sent: 0, received: 0 };
                userData.referralEarnings = apiData.referralEarnings || 0;
                userData.referralsCount = apiData.referralsCount || 0;
                userData.totalWinnings = apiData.totalWinnings || 0;
                userData.totalLosses = apiData.totalLosses || 0;
                
                if (apiData.upgrades && Object.keys(apiData.upgrades).length > 0) {
                    for (const key in apiData.upgrades) {
                        if (upgrades[key] && apiData.upgrades[key]) {
                            upgrades[key].level = apiData.upgrades[key].level || 0;
                        }
                    }
                }
                
                updateUI();
                updateShopUI();
            }
        }
    } catch (error) {
        console.warn('Ошибка синхронизации с API:', error);
    }
}

async function saveUserDataToAPI() {
    try {
        const saveData = {
            username: userData.username || 'Player',
            balance: userData.balance || 0.000000100,
            totalEarned: userData.totalEarned || 0.000000100,
            totalClicks: userData.totalClicks || 0,
            lotteryWins: userData.lotteryWins || 0,
            totalBet: userData.totalBet || 0,
            transfers: userData.transfers || { sent: 0, received: 0 },
            upgrades: {},
            referralEarnings: userData.referralEarnings || 0,
            referralsCount: userData.referralsCount || 0,
            totalWinnings: userData.totalWinnings || 0,
            totalLosses: userData.totalLosses || 0,
            lastUpdate: new Date().toISOString()
        };
        
        for (const key in upgrades) {
            if (upgrades[key]) {
                saveData.upgrades[key] = { 
                    level: upgrades[key].level || 0 
                };
            }
        }
        
        await apiRequest(`/player/${userData.userId}`, {
            method: 'POST',
            body: JSON.stringify(saveData)
        });
        
    } catch (error) {
        console.warn('Ошибка сохранения в API:', error);
    }
}
