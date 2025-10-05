// ==================== УЛУЧШЕННЫЙ УСТОЙЧИВЫЙ API ====================

let apiConnected = false;
let isOnline = navigator.onLine;
let pendingRequests = [];
let syncInProgress = false;

// Кэш для данных
const dataCache = new Map();
const CACHE_TTL = 30000; // 30 секунд

// Обработчики онлайн/офлайн статуса
window.addEventListener('online', () => {
    console.log('Соединение восстановлено');
    isOnline = true;
    updateApiStatus('syncing', 'Восстановление...');
    processPendingRequests();
    syncAllData();
});

window.addEventListener('offline', () => {
    console.log('Соединение потеряно');
    isOnline = false;
    updateApiStatus('disconnected', 'Офлайн режим');
});

function updateApiStatus(status, message) {
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.className = `api-status ${status}`;
        apiStatus.textContent = `API: ${message}`;
        apiStatus.title = `Статус соединения: ${message}`;
    }
    apiConnected = status === 'connected';
    
    // Уведомление пользователя о смене статуса
    if (status === 'disconnected' && isOnline) {
        showTemporaryNotification('Работаем в автономном режиме', 'warning');
    } else if (status === 'connected' && !apiConnected) {
        showTemporaryNotification('Соединение восстановлено', 'success');
    }
}

function showTemporaryNotification(message, type = 'info') {
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

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Улучшенный кэширующий запрос
async function apiRequestWithRetry(endpoint, options = {}, retries = CONFIG.MAX_RETRIES) {
    const cacheKey = `${endpoint}_${JSON.stringify(options.body || '')}`;
    
    // Проверка кэша для GET запросов
    if (options.method === 'GET' || !options.method) {
        const cached = getCachedData(cacheKey);
        if (cached) {
            return cached;
        }
    }
    
    // Если офлайн и есть кэш - возвращаем кэш
    if (!isOnline && options.method === 'GET') {
        const cached = getCachedData(cacheKey);
        if (cached) {
            updateApiStatus('disconnected', 'Офлайн (кэш)');
            return cached;
        }
    }
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Динамический таймаут в зависимости от попытки
            const timeoutMs = Math.min(10000 + (attempt * 2000), 30000);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
                cacheData(cacheKey, data);
            }
            
            updateApiStatus('connected', 'Подключен');
            return data;
            
        } catch (error) {
            console.warn(`API Request attempt ${attempt} failed for ${endpoint}:`, error);
            
            if (attempt < retries) {
                const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1); // Экспоненциальная задержка
                updateApiStatus('syncing', `Повтор ${attempt}/${retries}...`);
                await wait(delay);
            } else {
                updateApiStatus('disconnected', 'Ошибка подключения');
                throw error;
            }
        }
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
        }
        
        // Используем fallback
        const fallbackResponse = createFallbackResponse(endpoint, options);
        
        // Для POST запросов добавляем в очередь на отправку
        if (options.method === 'POST') {
            addToPendingQueue(endpoint, options);
        }
        
        return fallbackResponse;
    }
}

// Система очереди запросов
function addToPendingQueue(endpoint, options) {
    const request = {
        endpoint,
        options,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9)
    };
    
    pendingRequests.push(request);
    
    // Сохраняем в localStorage для восстановления после перезагрузки
    savePendingRequests();
    
    // Лимит очереди
    if (pendingRequests.length > 50) {
        pendingRequests = pendingRequests.slice(-50);
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
            try {
                await apiRequest(request.endpoint, request.options, false);
                successfulRequests.push(request.id);
                
                // Небольшая задержка между запросами
                await wait(100);
            } catch (error) {
                console.warn(`Не удалось отправить отложенный запрос:`, error);
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
            updateApiStatus('connected', 'Синхронизировано');
        }
    }
}

// Сохранение/загрузка очереди из localStorage
function savePendingRequests() {
    try {
        localStorage.setItem('pendingApiRequests', JSON.stringify(pendingRequests));
    } catch (error) {
        console.warn('Не удалось сохранить очередь запросов:', error);
    }
}

function loadPendingRequests() {
    try {
        const saved = localStorage.getItem('pendingApiRequests');
        if (saved) {
            pendingRequests = JSON.parse(saved) || [];
        }
    } catch (error) {
        console.warn('Не удалось загрузить очередь запросов:', error);
    }
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
    
    if (Date.now() - cached.timestamp > cached.ttl) {
        dataCache.delete(key);
        return null;
    }
    
    return cached.data;
}

// Периодическая синхронизация
async function startPeriodicSync() {
    // Синхронизация каждые 30 секунд когда онлайн
    setInterval(() => {
        if (isOnline && apiConnected) {
            syncAllData();
        }
    }, 30000);
    
    // Обработка очереди каждые 10 секунд
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
        // Дополнительные синхронизации можно добавить здесь
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
            updateApiStatus('connected', 'Подключен');
            // Запускаем обработку очереди после восстановления
            setTimeout(() => processPendingRequests(), 1000);
        } else {
            updateApiStatus('disconnected', 'Ошибка сервера');
        }
        
        return connected;
    } catch (error) {
        console.warn('API check failed:', error);
        updateApiStatus('disconnected', 'Ошибка подключения');
        return false;
    }
}

// Улучшенная синхронизация данных игрока
async function syncPlayerDataWithAPI() {
    try {
        const data = await apiRequest(`/player/${userData.userId}`);
        
        if (data.success && data.player) {
            const apiData = data.player;
            
            if (!userData.lastUpdate || (apiData.lastUpdate && new Date(apiData.lastUpdate) > new Date(userData.lastUpdate))) {
                Object.assign(userData, {
                    balance: apiData.balance || 0.000000100,
                    totalEarned: apiData.totalEarned || 0.000000100,
                    totalClicks: apiData.totalClicks || 0,
                    lotteryWins: apiData.lotteryWins || 0,
                    totalBet: apiData.totalBet || 0,
                    transfers: apiData.transfers || { sent: 0, received: 0 },
                    referralEarnings: apiData.referralEarnings || 0,
                    referralsCount: apiData.referralsCount || 0,
                    totalWinnings: apiData.totalWinnings || 0,
                    totalLosses: apiData.totalLosses || 0,
                    lastUpdate: apiData.lastUpdate || new Date().toISOString()
                });
                
                if (apiData.upgrades) {
                    for (const key in apiData.upgrades) {
                        if (upgrades[key]) {
                            upgrades[key].level = apiData.upgrades[key].level || 0;
                        }
                    }
                }
                
                updateUI();
                updateShopUI();
                
                // Кэшируем обновленные данные
                cacheData(`player_${userData.userId}`, userData, 60000);
            }
        }
    } catch (error) {
        console.warn('Ошибка синхронизации с API:', error);
    }
}

// Улучшенное сохранение данных
async function saveUserDataToAPI(immediate = false) {
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
    
    try {
        if (immediate && isOnline) {
            await apiRequest(`/player/${userData.userId}`, {
                method: 'POST',
                body: JSON.stringify(saveData)
            }, false);
        } else {
            await apiRequest(`/player/${userData.userId}`, {
                method: 'POST',
                body: JSON.stringify(saveData)
            });
        }
    } catch (error) {
        console.warn('Ошибка сохранения в API:', error);
    }
}

// Инициализация
function initResilientAPI() {
    loadPendingRequests();
    startPeriodicSync();
    checkApiConnection();
    
    // Периодическая проверка соединения
    setInterval(checkApiConnection, 60000);
}

// Инициализируем при загрузке
document.addEventListener('DOMContentLoaded', initResilientAPI);
