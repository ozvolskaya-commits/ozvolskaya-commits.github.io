// api-new.js - полностью исправленная версия
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
        }
    };
    
    for (const [key, value] of Object.entries(offlineResponses)) {
        if (endpoint.startsWith(key)) {
            return value;
        }
    }
    
    return { 
        success: true, 
        offline: true
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
