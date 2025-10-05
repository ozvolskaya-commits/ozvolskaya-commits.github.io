// ==================== УЛУЧШЕННЫЙ УСТОЙЧИВЫЙ API ДЛЯ СЛАБОГО ИНТЕРНЕТА ====================

let apiConnected = false;
let isOnline = navigator.onLine;
let pendingRequests = [];
let syncInProgress = false;
let lastSuccessfulRequest = Date.now();
let connectionRetries = 0;
const MAX_RETRIES = 5;
const BASE_DELAY = 1000;

// Расширенный кэш для данных
const dataCache = new Map();
const CACHE_TTL = 60000; // 60 секунд для слабого интернета
const OFFLINE_CACHE_TTL = 300000; // 5 минут для офлайн режима

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
    showTemporaryNotification('Работаем в автономном режиме', 'warning');
});

// Мониторинг качества соединения
let networkQuality = 'good';
let requestTimings = [];

function monitorNetworkQuality() {
    const now = Date.now();
    requestTimings = requestTimings.filter(time => now - time < 60000); // Последние 60 сек
    
    if (requestTimings.length > 20) {
        networkQuality = 'excellent';
    } else if (requestTimings.length > 10) {
        networkQuality = 'good';
    } else if (requestTimings.length > 5) {
        networkQuality = 'poor';
    } else {
        networkQuality = 'very-poor';
    }
}

function updateApiStatus(status, message) {
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.className = `api-status ${status}`;
        apiStatus.textContent = `API: ${message}`;
        apiStatus.title = `Статус соединения: ${message}\nКачество: ${networkQuality}`;
    }
    apiConnected = status === 'connected';
    
    // Сохраняем статус для использования в офлайн режиме
    localStorage.setItem('lastApiStatus', status);
    localStorage.setItem('lastApiMessage', message);
}

function showTemporaryNotification(message, type = 'info') {
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
        background: ${type === 'warning' ? '#ff9800' : type === 'success' ? '#4caf50' : '#2196f3'};
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

// Улучшенная система ожидания с прогрессом
async function wait(ms, reason = '') {
    if (reason) {
        console.log(`⏳ Ожидание ${ms}ms: ${reason}`);
    }
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Умная система ретраев с адаптивными задержками
async function apiRequestWithRetry(endpoint, options = {}, retries = MAX_RETRIES) {
    const cacheKey = `${endpoint}_${JSON.stringify(options.body || '')}`;
    const startTime = Date.now();
    
    // Для GET запросов проверяем кэш в первую очередь
    if ((options.method === 'GET' || !options.method) && !options.forceRefresh) {
        const cached = getCachedData(cacheKey);
        if (cached && isCacheValid(cached, endpoint)) {
            console.log(`📦 Используем кэш для: ${endpoint}`);
            updateApiStatus('connected', 'Кэш');
            return cached.data;
        }
    }
    
    // Если офлайн и есть кэш - возвращаем кэш с пометкой
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
            // Адаптивный таймаут в зависимости от качества сети
            const timeoutMs = calculateTimeout(attempt, networkQuality);
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
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            // Записываем успешный запрос для мониторинга качества
            requestTimings.push(endTime);
            monitorNetworkQuality();
            
            // Кэшируем успешные ответы
            if (options.method === 'GET' || !options.method) {
                cacheData(cacheKey, data, getCacheTTL(endpoint));
            }
            
            connectionRetries = 0;
            lastSuccessfulRequest = Date.now();
            updateApiStatus('connected', getConnectionMessage(networkQuality));
            
            console.log(`✅ Успех: ${endpoint} (${duration}ms)`);
            return data;
            
        } catch (error) {
            console.warn(`❌ Попытка ${attempt} провалена для ${endpoint}:`, error);
            
            if (attempt < retries) {
                const delay = calculateRetryDelay(attempt, networkQuality);
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

// Вспомогательные функции для расчета задержек
function calculateTimeout(attempt, quality) {
    const baseTimeouts = {
        'excellent': 5000,
        'good': 8000,
        'poor': 15000,
        'very-poor': 25000
    };
    
    const baseTimeout = baseTimeouts[quality] || 10000;
    return Math.min(baseTimeout * attempt, 60000); // Макс 60 секунд
}

function calculateRetryDelay(attempt, quality) {
    const baseDelays = {
        'excellent': 500,
        'good': 1000,
        'poor': 2000,
        'very-poor': 4000
    };
    
    const baseDelay = baseDelays[quality] || 1000;
    return Math.min(baseDelay * Math.pow(2, attempt - 1), 30000); // Экспоненциальная задержка
}

function getCacheTTL(endpoint) {
    const ttls = {
        '/health': 10000, // 10 секунд
        '/leaderboard': 30000, // 30 секунд
        '/all_players': 60000, // 60 секунд
        '/lottery/status': 15000, // 15 секунд
        '/classic-lottery/status': 15000, // 15 секунд
        '/referral/stats/': 30000 // 30 секунд
    };
    
    for (const [key, ttl] of Object.entries(ttls)) {
        if (endpoint.includes(key)) {
            return ttl;
        }
    }
    
    return isOnline ? CACHE_TTL : OFFLINE_CACHE_TTL;
}

function getConnectionMessage(quality) {
    const messages = {
        'excellent': 'Отличное соединение',
        'good': 'Хорошее соединение',
        'poor': 'Слабое соединение',
        'very-poor': 'Очень слабое соединение'
    };
    return messages[quality] || 'Подключен';
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

// Улучшенная основная функция запроса
async function apiRequest(endpoint, options = {}, useFallback = true) {
    // Добавляем в очередь если синхронизация в процессе
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

// Улучшенная система кэширования
function cacheData(key, data, ttl = CACHE_TTL) {
    const cacheEntry = {
        data,
        timestamp: Date.now(),
        ttl,
        endpoint: key.split('_')[0] // Сохраняем endpoint для валидации
    };
    
    dataCache.set(key, cacheEntry);
    
    // Сохраняем в localStorage для persistence
    try {
        const persistentCache = JSON.parse(localStorage.getItem('persistentCache') || '{}');
        persistentCache[key] = cacheEntry;
        // Очищаем старые записи
        const oneHourAgo = Date.now() - 3600000;
        Object.keys(persistentCache).forEach(k => {
            if (persistentCache[k].timestamp < oneHourAgo) {
                delete persistentCache[k];
            }
        });
        localStorage.setItem('persistentCache', JSON.stringify(persistentCache));
    } catch (e) {
        console.warn('Не удалось сохранить в persistent cache');
    }
}

function getCachedData(key) {
    // Сначала проверяем memory cache
    const cached = dataCache.get(key);
    if (cached && isCacheValid(cached)) {
        return cached;
    }
    
    // Затем проверяем persistent cache
    try {
        const persistentCache = JSON.parse(localStorage.getItem('persistentCache') || '{}');
        const persistent = persistentCache[key];
        if (persistent && isCacheValid(persistent)) {
            // Восстанавливаем в memory cache
            dataCache.set(key, persistent);
            return persistent;
        }
    } catch (e) {
        console.warn('Ошибка чтения persistent cache');
    }
    
    return null;
}

function isCacheValid(cached, endpoint = '') {
    const now = Date.now();
    const age = now - cached.timestamp;
    
    // Для критичных данных используем короткий TTL
    if (endpoint.includes('/lottery/') || endpoint.includes('/health')) {
        return age < 15000; // 15 секунд
    }
    
    return age < cached.ttl;
}

// Система очереди запросов с приоритетами
function addToPendingQueue(endpoint, options) {
    const request = {
        endpoint,
        options,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9),
        priority: getRequestPriority(endpoint),
        attempts: 0
    };
    
    pendingRequests.push(request);
    pendingRequests.sort((a, b) => b.priority - a.priority); // Сортируем по приоритету
    
    // Сохраняем в localStorage для восстановления после перезагрузки
    savePendingRequests();
    
    // Лимит очереди
    if (pendingRequests.length > 100) {
        pendingRequests = pendingRequests.slice(-100);
    }
    
    return { 
        success: true, 
        message: 'Данные поставлены в очередь для отправки',
        queued: true 
    };
}

function getRequestPriority(endpoint) {
    const priorities = {
        '/player/': 10, // Высокий приоритет для сохранения данных игрока
        '/lottery/bet': 8, // Высокий приоритет для ставок
        '/classic-lottery/bet': 8,
        '/transfer': 7,
        '/referral/add-earning': 6,
        '/lottery/draw': 5,
        '/classic-lottery/draw': 5
    };
    
    for (const [key, priority] of Object.entries(priorities)) {
        if (endpoint.includes(key)) {
            return priority;
        }
    }
    
    return 1; // Низкий приоритет по умолчанию
}

async function processPendingRequests() {
    if (pendingRequests.length === 0 || !isOnline || syncInProgress) return;
    
    syncInProgress = true;
    updateApiStatus('syncing', 'Синхронизация...');
    
    try {
        const successfulRequests = [];
        
        for (const request of [...pendingRequests]) {
            if (request.attempts >= 3) {
                // Слишком много попыток, пропускаем
                successfulRequests.push(request.id);
                continue;
            }
            
            try {
                await apiRequest(request.endpoint, request.options, false);
                successfulRequests.push(request.id);
                request.attempts++;
                
                // Задержка между запросами в зависимости от качества сети
                const delay = networkQuality === 'poor' ? 500 : 100;
                await wait(delay, 'Processing pending requests');
                
            } catch (error) {
                console.warn(`Не удалось отправить отложенный запрос:`, error);
                request.attempts++;
                if (request.attempts >= 3) {
                    successfulRequests.push(request.id); // Удаляем после 3 попыток
                }
                break; // Прерываем при первой ошибке
            }
        }
        
        // Удаляем успешно отправленные запросы
        pendingRequests = pendingRequests.filter(req => 
            !successfulRequests.includes(req.id)
        );
        savePendingRequests();
        
    } finally {
        syncInProgress = false;
        if (isOnline) {
            updateApiStatus('connected', getConnectionMessage(networkQuality));
        }
    }
}

// Сохранение/загрузка очереди из localStorage
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
            // Загружаем только свежие запросы (не старше 24 часов)
            if (Date.now() - data.timestamp < 86400000) {
                pendingRequests = data.requests || [];
            }
        }
    } catch (error) {
        console.warn('Не удалось загрузить очередь запросов:', error);
    }
}

// Периодическая синхронизация с адаптивными интервалами
function getSyncInterval() {
    const intervals = {
        'excellent': 30000, // 30 секунд
        'good': 45000, // 45 секунд
        'poor': 60000, // 60 секунд
        'very-poor': 90000 // 90 секунд
    };
    return intervals[networkQuality] || 60000;
}

async function startPeriodicSync() {
    // Синхронизация с адаптивными интервалами
    setInterval(() => {
        if (isOnline && apiConnected) {
            syncAllData();
        }
    }, getSyncInterval());
    
    // Обработка очереди с адаптивными интервалами
    setInterval(() => {
        if (isOnline) {
            processPendingRequests();
        }
    }, Math.max(5000, getSyncInterval() / 2));
    
    // Мониторинг соединения
    setInterval(() => {
        monitorNetworkQuality();
        checkConnectionHealth();
    }, 10000);
}

async function checkConnectionHealth() {
    if (!isOnline) return;
    
    const timeSinceLastSuccess = Date.now() - lastSuccessfulRequest;
    if (timeSinceLastSuccess > 30000) { // 30 секунд без успешных запросов
        console.warn('Долго не было успешных запросов, проверяем соединение...');
        try {
            await apiRequest('/health', {}, false);
        } catch (error) {
            console.warn('Проверка соединения провалилась');
        }
    }
}

async function syncAllData() {
    if (!isOnline) return;
    
    try {
        await syncPlayerDataWithAPI();
        // Можно добавить синхронизацию других данных
    } catch (error) {
        console.warn('Ошибка периодической синхронизации:', error);
    }
}

// Улучшенная функция проверки соединения
async function checkApiConnection() {
    try {
        updateApiStatus('syncing', 'Проверка...');
        
        // Проверяем базовое соединение
        if (!isOnline) {
            updateApiStatus('disconnected', 'Офлайн режим');
            return false;
        }
        
        const result = await apiRequest('/health', {}, false);
        const connected = result && result.status === 'healthy';
        
        if (connected) {
            updateApiStatus('connected', getConnectionMessage(networkQuality));
            // Запускаем обработку очереди после восстановления
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

// Инициализация
function initResilientAPI() {
    loadPendingRequests();
    startPeriodicSync();
    
    // Восстанавливаем статус из localStorage
    const lastStatus = localStorage.getItem('lastApiStatus');
    const lastMessage = localStorage.getItem('lastApiMessage');
    if (lastStatus && lastMessage) {
        updateApiStatus(lastStatus, lastMessage);
    }
    
    checkApiConnection();
    
    // Периодическая проверка соединения
    setInterval(checkApiConnection, 30000);
}

// Инициализируем при загрузке
document.addEventListener('DOMContentLoaded', initResilientAPI);
