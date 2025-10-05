// ==================== КОНФИГУРАЦИЯ ====================

const CONFIG = {
    API_BASE_URL: 'https://b9339c3b-8a22-434d-b97a-a426ac75c328-00-2vzfhw3hnozb6.sisko.replit.dev',
    MAX_RETRIES: 5,
    RETRY_DELAY: 1000,
    AUTO_SAVE_INTERVAL: 30000
};

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================

let userData = {
    userId: '',
    username: 'Player',
    balance: 0.000000100,
    totalEarned: 0.000000100,
    totalClicks: 0,
    lotteryWins: 0,
    totalBet: 0,
    transfers: { sent: 0, received: 0 },
    referralEarnings: 0,
    referralsCount: 0,
    totalWinnings: 0,
    totalLosses: 0,
    lastUpdate: ''
};

let upgrades = {};
let apiConnected = false;
let isOnline = navigator.onLine;
let pendingRequests = [];
let syncInProgress = false;
let lastSuccessfulRequest = Date.now();
let connectionRetries = 0;
const dataCache = new Map();
const CACHE_TTL = 60000;

// ==================== СИСТЕМА УЛУЧШЕНИЙ ====================

function initializeUpgrades() {
    // GPU улучшения
    for (let i = 1; i <= 8; i++) {
        upgrades[`gpu${i}`] = {
            level: 0,
            basePrice: Math.pow(10, i) * 0.000000001,
            priceGrowth: 1.5,
            speedBonus: Math.pow(8, i - 1) * 0.000000001,
            name: `GPU Tier ${i}`,
            description: `Увеличивает скорость майнинга`
        };
    }
    
    // CPU улучшения
    for (let i = 1; i <= 8; i++) {
        upgrades[`cpu${i}`] = {
            level: 0,
            basePrice: Math.pow(10, i) * 0.000000001,
            priceGrowth: 1.5,
            speedBonus: Math.pow(8, i - 1) * 0.000000001,
            name: `CPU Tier ${i}`,
            description: `Увеличивает скорость майнинга`
        };
    }
    
    // Mouse улучшения (для кликов)
    for (let i = 1; i <= 8; i++) {
        upgrades[`mouse${i}`] = {
            level: 0,
            basePrice: Math.pow(10, i) * 0.000000001,
            priceGrowth: 1.8,
            clickBonus: Math.pow(4, i) * 0.000000001,
            name: `Mouse Tier ${i}`,
            description: `Увеличивает доход с кликов`
        };
    }
}

function calculateMineSpeed() {
    let speed = 0.000000000;
    
    for (let i = 1; i <= 8; i++) {
        const gpu = upgrades[`gpu${i}`];
        const cpu = upgrades[`cpu${i}`];
        
        if (gpu && gpu.level > 0) {
            speed += gpu.level * gpu.speedBonus;
        }
        if (cpu && cpu.level > 0) {
            speed += cpu.level * cpu.speedBonus;
        }
    }
    
    return speed;
}

function calculateClickSpeed() {
    let speed = 0.000000001;
    
    for (let i = 1; i <= 8; i++) {
        const mouse = upgrades[`mouse${i}`];
        if (mouse && mouse.level > 0) {
            speed += mouse.level * mouse.clickBonus;
        }
    }
    
    return speed;
}

function getUpgradePrice(upgradeKey) {
    const upgrade = upgrades[upgradeKey];
    if (!upgrade) return 0;
    
    return upgrade.basePrice * Math.pow(upgrade.priceGrowth, upgrade.level);
}

function buyUpgrade(upgradeKey) {
    const upgrade = upgrades[upgradeKey];
    if (!upgrade) return false;
    
    const price = getUpgradePrice(upgradeKey);
    
    if (userData.balance >= price) {
        userData.balance -= price;
        upgrade.level++;
        
        updateUI();
        updateShopUI();
        saveUserData();
        
        showNotification(`Улучшение ${upgrade.name} куплено!`, 'success');
        return true;
    } else {
        showNotification('Недостаточно средств!', 'error');
        return false;
    }
}

// ==================== СИСТЕМА API ====================

// Обработчики онлайн/офлайн статуса
window.addEventListener('online', () => {
    console.log('📡 Соединение восстановлено');
    isOnline = true;
    updateApiStatus('syncing', 'Восстановление...');
    processPendingRequests();
    syncAllData();
});

window.addEventListener('offline', () => {
    console.log('📡 Соединение потеряно');
    isOnline = false;
    updateApiStatus('disconnected', 'Офлайн режим');
    showNotification('Работаем в автономном режиме', 'warning');
});

function updateApiStatus(status, message) {
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.className = `api-status ${status}`;
        apiStatus.textContent = `API: ${message}`;
    }
    apiConnected = status === 'connected';
}

function showNotification(message, type = 'info') {
    if (!isOnline && type !== 'warning') return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        background: ${type === 'warning' ? '#ff9800' : type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 4px;
        z-index: 10000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

async function wait(ms, reason = '') {
    if (reason) {
        console.log(`⏳ Ожидание ${ms}ms: ${reason}`);
    }
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Улучшенная система ретраев
async function apiRequestWithRetry(endpoint, options = {}, retries = CONFIG.MAX_RETRIES) {
    const cacheKey = `${endpoint}_${JSON.stringify(options.body || '')}`;
    
    // Для GET запросов проверяем кэш
    if ((options.method === 'GET' || !options.method) && !options.forceRefresh) {
        const cached = getCachedData(cacheKey);
        if (cached) {
            console.log(`📦 Используем кэш для: ${endpoint}`);
            updateApiStatus('connected', 'Кэш');
            return cached.data;
        }
    }
    
    // Если офлайн и есть кэш - возвращаем кэш
    if (!isOnline) {
        const cached = getCachedData(cacheKey);
        if (cached) {
            updateApiStatus('disconnected', 'Офлайн (кэш)');
            return { ...cached.data, _cached: true, _offline: true };
        }
        throw new Error('OFFLINE: No cached data available');
    }
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const timeoutMs = Math.min(10000 + (attempt * 2000), 30000);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            console.log(`🔄 Попытка ${attempt}/${retries} для ${endpoint}`);
            updateApiStatus('syncing', `Запрос... (${attempt}/${retries})`);

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
            
            // Кэшируем успешные ответы
            if (options.method === 'GET' || !options.method) {
                cacheData(cacheKey, data, getCacheTTL(endpoint));
            }
            
            connectionRetries = 0;
            lastSuccessfulRequest = Date.now();
            updateApiStatus('connected', 'Подключен');
            
            console.log(`✅ Успех: ${endpoint}`);
            return data;
            
        } catch (error) {
            console.warn(`❌ Попытка ${attempt} провалена для ${endpoint}:`, error);
            
            if (attempt < retries) {
                const delay = CONFIG.RETRY_DELAY * attempt;
                updateApiStatus('syncing', `Повтор ${attempt}/${retries}...`);
                await wait(delay, `Retry ${attempt} for ${endpoint}`);
            } else {
                connectionRetries++;
                updateApiStatus('disconnected', getErrorMessage(error));
                throw error;
            }
        }
    }
}

function getCacheTTL(endpoint) {
    const ttls = {
        '/health': 10000,
        '/leaderboard': 30000,
        '/all_players': 60000,
        '/lottery/status': 15000,
        '/classic-lottery/status': 15000,
        '/referral/stats/': 30000
    };
    
    for (const [key, ttl] of Object.entries(ttls)) {
        if (endpoint.includes(key)) {
            return ttl;
        }
    }
    
    return CACHE_TTL;
}

function getErrorMessage(error) {
    if (error.name === 'AbortError') {
        return 'Таймаут запроса';
    } else if (error.message.includes('Failed to fetch')) {
        return 'Нет соединения';
    } else if (error.message.includes('OFFLINE')) {
        return 'Офлайн режим';
    } else {
        return 'Ошибка подключения';
    }
}

// Основная функция запроса
async function apiRequest(endpoint, options = {}, useFallback = true) {
    if (syncInProgress && options.method === 'POST') {
        return addToPendingQueue(endpoint, options);
    }
    
    try {
        return await apiRequestWithRetry(endpoint, options);
    } catch (error) {
        console.warn(`Основной запрос провален для ${endpoint}:`, error);
        
        if (!useFallback) throw error;
        
        // Быстрая проверка соединения
        if (isOnline) {
            try {
                const quickCheck = await fetch(`${CONFIG.API_BASE_URL}/health`, {
                    signal: AbortSignal.timeout(2000)
                });
                
                if (quickCheck.ok) {
                    updateApiStatus('connected', 'Подключен');
                    return await apiRequestWithRetry(endpoint, options);
                }
            } catch (quickError) {
                console.log('Быстрая проверка тоже провалилась');
                isOnline = false;
            }
        }
        
        // Используем fallback
        const fallbackResponse = createFallbackResponse(endpoint, options);
        
        // Для POST запросов добавляем в очередь на отправку
        if (options.method === 'POST') {
            addToPendingQueue(endpoint, options);
        }
        
        return { ...fallbackResponse, _fallback: true };
    }
}

function createFallbackResponse(endpoint, options) {
    console.log(`🔄 Используем fallback для: ${endpoint}`);
    
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
            return {
                success: true,
                leaderboard: [],
                type: 'balance'
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
        
        case '/classic-lottery/status':
            return {
                success: true,
                lottery: getFallbackClassicLotteryData()
            };
        
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

// Система кэширования
function cacheData(key, data, ttl = CACHE_TTL) {
    dataCache.set(key, {
        data,
        timestamp: Date.now(),
        ttl
    });
}

function getCachedData(key) {
    const cached = dataCache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    const age = now - cached.timestamp;
    
    if (age < cached.ttl) {
        return cached;
    }
    
    dataCache.delete(key);
    return null;
}

// Система очереди запросов
function addToPendingQueue(endpoint, options) {
    const request = {
        endpoint,
        options,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9),
        attempts: 0
    };
    
    pendingRequests.push(request);
    savePendingRequests();
    
    if (pendingRequests.length > 100) {
        pendingRequests = pendingRequests.slice(-100);
    }
    
    return { 
        success: true, 
        message: 'Данные поставлены в очередь для отправки',
        queued: true 
    };
}

async function processPendingRequests() {
    if (pendingRequests.length === 0 || !isOnline || syncInProgress) return;
    
    syncInProgress = true;
    updateApiStatus('syncing', 'Синхронизация...');
    
    try {
        const successfulRequests = [];
        
        for (const request of [...pendingRequests]) {
            if (request.attempts >= 3) {
                successfulRequests.push(request.id);
                continue;
            }
            
            try {
                await apiRequest(request.endpoint, request.options, false);
                successfulRequests.push(request.id);
                request.attempts++;
                
                await wait(100, 'Processing pending requests');
                
            } catch (error) {
                console.warn(`Не удалось отправить отложенный запрос:`, error);
                request.attempts++;
                if (request.attempts >= 3) {
                    successfulRequests.push(request.id);
                }
                break;
            }
        }
        
        pendingRequests = pendingRequests.filter(req => 
            !successfulRequests.includes(req.id)
        );
        savePendingRequests();
        
    } finally {
        syncInProgress = false;
        if (isOnline) {
            updateApiStatus('connected', 'Подключен');
        }
    }
}

function savePendingRequests() {
    try {
        localStorage.setItem('pendingApiRequests', JSON.stringify({
            requests: pendingRequests,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.warn('Не удалось сохранить очередь запросов:', error);
    }
}

function loadPendingRequests() {
    try {
        const saved = localStorage.getItem('pendingApiRequests');
        if (saved) {
            const data = JSON.parse(saved);
            if (Date.now() - data.timestamp < 86400000) {
                pendingRequests = data.requests || [];
            }
        }
    } catch (error) {
        console.warn('Не удалось загрузить очередь запросов:', error);
    }
}

// ==================== СИСТЕМА ДАННЫХ ПОЛЬЗОВАТЕЛЯ ====================

async function saveUserDataToAPI(immediate = false) {
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
        
        const result = await apiRequest(`/player/${userData.userId}`, {
            method: 'POST',
            body: JSON.stringify(saveData)
        });
        
        if (result.success) {
            console.log('✅ Данные успешно сохранены в API');
            return true;
        } else {
            console.warn('⚠️ Не удалось сохранить данные в API:', result.error);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Ошибка сохранения в API:', error);
        return false;
    }
}

async function saveUserData() {
    try {
        const saveData = {
            userId: userData.userId,
            username: userData.username,
            balance: userData.balance,
            totalEarned: userData.totalEarned,
            totalClicks: userData.totalClicks,
            upgrades: upgrades,
            lastUpdate: new Date().toISOString(),
            lotteryWins: userData.lotteryWins,
            totalBet: userData.totalBet,
            transfers: userData.transfers,
            referralEarnings: userData.referralEarnings,
            referralsCount: userData.referralsCount,
            totalWinnings: userData.totalWinnings,
            totalLosses: userData.totalLosses
        };
        
        localStorage.setItem('sparkcoin_user_data', JSON.stringify(saveData));
        console.log('💾 Данные сохранены в localStorage');
        
        saveUserDataToAPI().catch(error => {
            console.warn('⚠️ Фоновая синхронизация с API не удалась:', error);
        });
        
    } catch (error) {
        console.error('❌ Ошибка сохранения данных:', error);
    }
}

async function loadUserData() {
    try {
        const savedData = localStorage.getItem('sparkcoin_user_data');
        
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            
            userData.userId = parsedData.userId || userData.userId;
            userData.username = parsedData.username || userData.username;
            userData.balance = parseFloat(parsedData.balance) || 0.000000100;
            userData.totalEarned = parseFloat(parsedData.totalEarned) || 0.000000100;
            userData.totalClicks = parseInt(parsedData.totalClicks) || 0;
            userData.lotteryWins = parseInt(parsedData.lotteryWins) || 0;
            userData.totalBet = parseFloat(parsedData.totalBet) || 0;
            userData.transfers = parsedData.transfers || { sent: 0, received: 0 };
            userData.referralEarnings = parseFloat(parsedData.referralEarnings) || 0;
            userData.referralsCount = parseInt(parsedData.referralsCount) || 0;
            userData.totalWinnings = parseFloat(parsedData.totalWinnings) || 0;
            userData.totalLosses = parseFloat(parsedData.totalLosses) || 0;
            
            if (parsedData.upgrades) {
                for (const key in parsedData.upgrades) {
                    if (upgrades[key]) {
                        upgrades[key].level = parseInt(parsedData.upgrades[key].level) || 0;
                    }
                }
            }
            
            console.log('📂 Данные загружены из localStorage');
            
            updateUI();
            updateShopUI();
            
            syncPlayerDataWithAPI().catch(error => {
                console.warn('⚠️ Фоновая синхронизация с API не удалась:', error);
            });
            
            return true;
        }
        
        await syncPlayerDataWithAPI();
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        initializeDefaultData();
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
                userData.lastUpdate = apiData.lastUpdate;
                
                if (apiData.upgrades && Object.keys(apiData.upgrades).length > 0) {
                    for (const key in apiData.upgrades) {
                        if (upgrades[key] && apiData.upgrades[key]) {
                            upgrades[key].level = apiData.upgrades[key].level || 0;
                        }
                    }
                }
                
                console.log('🔄 Данные синхронизированы с API');
                
                updateUI();
                updateShopUI();
                saveUserData();
                
                return true;
            }
        }
        
        return false;
        
    } catch (error) {
        console.warn('⚠️ Ошибка синхронизации с API:', error);
        return false;
    }
}

function initializeDefaultData() {
    console.log('🆕 Инициализация базовых данных');
    
    userData = {
        userId: generateUserId(),
        username: 'Player',
        balance: 0.000000100,
        totalEarned: 0.000000100,
        totalClicks: 0,
        lotteryWins: 0,
        totalBet: 0,
        transfers: { sent: 0, received: 0 },
        referralEarnings: 0,
        referralsCount: 0,
        totalWinnings: 0,
        totalLosses: 0,
        lastUpdate: new Date().toISOString()
    };
    
    initializeUpgrades();
    updateUI();
    updateShopUI();
    saveUserData();
}

function generateUserId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return 'user_' + result;
}

// ==================== ИГРОВАЯ ЛОГИКА ====================

function clickCoin() {
    const clickValue = calculateClickSpeed();
    userData.balance += clickValue;
    userData.totalEarned += clickValue;
    userData.totalClicks++;
    
    updateUI();
    
    // Автосохранение каждые 10 кликов
    if (userData.totalClicks % 10 === 0) {
        saveUserData();
    }
    
    // Создаем эффект клика
    createClickEffect(event);
}

function createClickEffect(event) {
    const effect = document.createElement('div');
    effect.className = 'click-effect';
    effect.textContent = `+${formatNumber(calculateClickSpeed())}`;
    effect.style.cssText = `
        position: absolute;
        left: ${event.clientX}px;
        top: ${event.clientY}px;
        color: #ffd700;
        font-weight: bold;
        font-size: 16px;
        pointer-events: none;
        animation: floatUp 1s ease-out forwards;
        z-index: 1000;
    `;
    
    document.body.appendChild(effect);
    
    setTimeout(() => {
        if (effect.parentElement) {
            effect.remove();
        }
    }, 1000);
}

function startMining() {
    setInterval(() => {
        const mineValue = calculateMineSpeed();
        if (mineValue > 0) {
            userData.balance += mineValue;
            userData.totalEarned += mineValue;
            updateUI();
            
            // Автосохранение каждую минуту
            if (Date.now() % 60000 < 100) {
                saveUserData();
            }
        }
    }, 1000);
}

// ==================== ИНТЕРФЕЙС ====================

function updateUI() {
    const balanceElement = document.getElementById('balance');
    const totalEarnedElement = document.getElementById('totalEarned');
    const totalClicksElement = document.getElementById('totalClicks');
    const mineSpeedElement = document.getElementById('mineSpeed');
    const clickSpeedElement = document.getElementById('clickSpeed');
    
    if (balanceElement) balanceElement.textContent = formatNumber(userData.balance);
    if (totalEarnedElement) totalEarnedElement.textContent = formatNumber(userData.totalEarned);
    if (totalClicksElement) totalClicksElement.textContent = userData.totalClicks.toLocaleString();
    if (mineSpeedElement) mineSpeedElement.textContent = formatNumber(calculateMineSpeed());
    if (clickSpeedElement) clickSpeedElement.textContent = formatNumber(calculateClickSpeed());
}

function updateShopUI() {
    const shopGrid = document.getElementById('shopGrid');
    if (!shopGrid) return;
    
    shopGrid.innerHTML = '';
    
    for (const key in upgrades) {
        const upgrade = upgrades[key];
        const price = getUpgradePrice(key);
        const canAfford = userData.balance >= price;
        
        const upgradeElement = document.createElement('div');
        upgradeElement.className = `upgrade-item ${canAfford ? 'affordable' : 'unaffordable'}`;
        upgradeElement.innerHTML = `
            <h4>${upgrade.name} (Ур. ${upgrade.level})</h4>
            <p>${upgrade.description}</p>
            <div class="upgrade-stats">
                <span>Стоимость: ${formatNumber(price)}</span>
            </div>
            <button onclick="buyUpgrade('${key}')" ${!canAfford ? 'disabled' : ''}>
                ${canAfford ? 'Купить' : 'Недостаточно средств'}
            </button>
        `;
        
        shopGrid.appendChild(upgradeElement);
    }
}

function formatNumber(num) {
    if (num >= 1) {
        return num.toFixed(3) + ' S';
    } else if (num >= 0.001) {
        return (num * 1000).toFixed(3) + ' mS';
    } else if (num >= 0.000001) {
        return (num * 1000000).toFixed(3) + ' μS';
    } else {
        return (num * 1000000000).toFixed(3) + ' nS';
    }
}

function switchTab(tabName) {
    // Скрыть все вкладки
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Показать выбранную вкладку
    const activeTab = document.getElementById(tabName);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Обновить активную кнопку
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================

async function checkApiConnection() {
    try {
        updateApiStatus('syncing', 'Проверка...');
        
        if (!isOnline) {
            updateApiStatus('disconnected', 'Офлайн режим');
            return false;
        }
        
        const result = await apiRequest('/health', {}, false);
        const connected = result && result.status === 'healthy';
        
        if (connected) {
            updateApiStatus('connected', 'Подключен');
            setTimeout(() => processPendingRequests(), 1000);
        } else {
            updateApiStatus('disconnected', 'Ошибка сервера');
        }
        
        return connected;
    } catch (error) {
        console.warn('API check failed:', error);
        updateApiStatus('disconnected', getErrorMessage(error));
        return false;
    }
}

function startPeriodicSync() {
    setInterval(() => {
        if (isOnline && apiConnected) {
            syncAllData();
        }
    }, 30000);
    
    setInterval(() => {
        if (isOnline) {
            processPendingRequests();
        }
    }, 10000);
}

async function syncAllData() {
    if (!isOnline) return;
    
    try {
        await syncPlayerDataWithAPI();
    } catch (error) {
        console.warn('Ошибка периодической синхронизации:', error);
    }
}

function startAutoSave() {
    setInterval(() => {
        if (userData && userData.userId) {
            saveUserData();
        }
    }, CONFIG.AUTO_SAVE_INTERVAL);
}

// Сохранение при закрытии страницы
window.addEventListener('beforeunload', () => {
    if (userData && userData.userId) {
        saveUserData();
    }
});

// Основная инициализация
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Инициализация SparkCoin...');
    
    initializeUpgrades();
    loadPendingRequests();
    startPeriodicSync();
    
    loadUserData().then(success => {
        if (success) {
            console.log('✅ Система данных успешно инициализирована');
        } else {
            console.log('⚠️ Система данных инициализирована с резервными данными');
        }
        
        startMining();
        startAutoSave();
        checkApiConnection();
        
        setInterval(checkApiConnection, 30000);
    });
});

// CSS анимации
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes floatUp {
        0% { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(-50px); opacity: 0; }
    }
    
    .click-effect {
        animation: floatUp 1s ease-out forwards;
    }
    
    .api-status {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
    }
    
    .api-status.connected { background: #4caf50; color: white; }
    .api-status.syncing { background: #ff9800; color: white; }
    .api-status.disconnected { background: #f44336; color: white; }
    
    .upgrade-item {
        border: 1px solid #ddd;
        padding: 15px;
        margin: 10px;
        border-radius: 8px;
        background: white;
    }
    
    .upgrade-item.affordable {
        border-color: #4caf50;
        background: #f8fff8;
    }
    
    .upgrade-item.unaffordable {
        border-color: #ccc;
        background: #f5f5f5;
        opacity: 0.7;
    }
    
    .tab-content {
        display: none;
    }
    
    .tab-content.active {
        display: block;
    }
    
    .tab-button.active {
        background: #2196f3;
        color: white;
    }
`;
document.head.appendChild(style);
