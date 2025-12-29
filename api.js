// api.js - ПОЛНОСТЬЮ ОПТИМИЗИРОВАННЫЙ ВЫСОКОПРОИЗВОДИТЕЛЬНЫЙ API ДЛЯ SPARKCOIN
console.log('🚀 Загрузка высокопроизводительного API для Sparkcoin...');

// КОНФИГУРАЦИЯ ВЫСОКОГО БЫСТРОДЕЙСТВИЯ
window.CONFIG = {
    API_BASE_URL: 'https://b9339c3b-8a22-434d-b97a-a426ac75c328-00-2vzfhw3hnozb6.sisko.replit.dev',
    API_TIMEOUT: 120, // 120 миллисекунд максимум
    RETRY_ATTEMPTS: 1, // Только одна попытка для скорости
    RETRY_DELAY: 50, // Быстрая задержка при повторе
    CACHE_DURATION: 3000, // Кэширование на 3 секунды
    MAX_CONCURRENT_REQUESTS: 6, // Максимум параллельных запросов
    USE_CACHE: true, // Использовать кэширование
    USE_OFFLINE_FIRST: true, // Приоритет офлайн данных
    MAX_CACHE_SIZE: 100, // Максимальное количество кэшированных запросов
    PERFORMANCE_MONITORING: true, // Мониторинг производительности
    ENABLE_COMPRESSION: false, // Сжатие данных (отключено для скорости)
    VALIDATE_RESPONSES: true, // Валидация ответов
    LOG_LEVEL: 'error' // Уровень логирования
};

// СИСТЕМА ПРОИЗВОДИТЕЛЬНОСТИ
window.PERFORMANCE_METRICS = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    cachedResponses: 0,
    offlineResponses: 0,
    averageResponseTime: 0,
    lastResponseTimes: [],
    connectionStatus: 'unknown',
    lastCheck: Date.now(),
    errors: []
};

// КЭШ ДЛЯ БЫСТРЫХ ОТВЕТОВ
window.API_CACHE = new Map();
window.PENDING_REQUESTS = new Map();
window.CONCURRENT_COUNTER = 0;
window.OFFLINE_QUEUE = []; // Очередь отложенных запросов
window.METRICS_UPDATE_INTERVAL = 60000; // Обновление метрик каждую минуту

// ГЕНЕРАЦИЯ УНИКАЛЬНОГО ID ДЛЯ ЗАПРОСОВ
window.generateRequestId = function() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9) + '_' + 
           window.CONCURRENT_COUNTER + '_' + window.PERFORMANCE_METRICS.totalRequests;
};

// ОЧИСТКА СТАРОГО КЭША
window.cleanupOldCache = function() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, value] of window.API_CACHE.entries()) {
        if (now - value.timestamp > window.CONFIG.CACHE_DURATION * 2) {
            keysToDelete.push(key);
        }
    }
    
    keysToDelete.forEach(key => {
        window.API_CACHE.delete(key);
    });
    
    // Ограничение размера кэша
    if (window.API_CACHE.size > window.CONFIG.MAX_CACHE_SIZE) {
        const entries = Array.from(window.API_CACHE.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toRemove = entries.slice(0, Math.floor(entries.length * 0.2)); // Удаляем 20% старых записей
        toRemove.forEach(([key]) => {
            window.API_CACHE.delete(key);
        });
    }
    
    console.log(`🧹 Очистка кэша: удалено ${keysToDelete.length} записей, текущий размер: ${window.API_CACHE.size}`);
};

// ОСНОВНАЯ ФУНКЦИЯ API ЗАПРОСОВ С ВЫСОКОЙ ПРОИЗВОДИТЕЛЬНОСТЬЮ
window.apiRequest = async function(endpoint, options = {}) {
    const requestId = generateRequestId();
    const url = `${window.CONFIG.API_BASE_URL}${endpoint}`;
    const method = options.method || 'GET';
    const cacheKey = `${method}:${url}:${JSON.stringify(options.body || '')}`;
    const now = Date.now();
    const startTime = performance.now();
    
    window.PERFORMANCE_METRICS.totalRequests++;
    
    console.log(`⚡ API запрос [${requestId}]: ${method} ${endpoint}`);
    
    // ОБЯЗАТЕЛЬНАЯ ПРОВЕРКА КЭША ДЛЯ GET ЗАПРОСОВ
    if (method === 'GET' && window.CONFIG.USE_CACHE) {
        const cached = window.API_CACHE.get(cacheKey);
        if (cached && (now - cached.timestamp < window.CONFIG.CACHE_DURATION)) {
            window.PERFORMANCE_METRICS.cachedResponses++;
            console.log(`📦 Используем кэшированный ответ для ${endpoint} (возраст: ${now - cached.timestamp}ms)`);
            
            const responseTime = performance.now() - startTime;
            updateMetrics(responseTime, true, true);
            
            return Promise.resolve({ 
                ...cached.data, 
                _cached: true,
                _timestamp: cached.timestamp,
                _requestId: requestId,
                _responseTime: responseTime
            });
        }
    }
    
    // ПРОВЕРКА НАЛИЧИЯ УЖЕ ВЫПОЛНЯЕМОГО ИДЕНТИЧНОГО ЗАПРОСА
    if (window.PENDING_REQUESTS.has(cacheKey)) {
        console.log(`🔄 Ожидание существующего запроса для ${endpoint}`);
        return window.PENDING_REQUESTS.get(cacheKey);
    }
    
    // ПРОВЕРКА ЛИМИТА ПАРАЛЛЕЛЬНЫХ ЗАПРОСОВ
    if (window.CONCURRENT_COUNTER >= window.CONFIG.MAX_CONCURRENT_REQUESTS) {
        console.log(`⏳ Достигнут лимит параллельных запросов (${window.CONCURRENT_COUNTER}/${window.CONFIG.MAX_CONCURRENT_REQUESTS}), ожидание...`);
        await new Promise(resolve => setTimeout(resolve, 10));
        return window.apiRequest(endpoint, options); // Рекурсивный вызов после ожидания
    }
    
    // СОЗДАНИЕ ПРОМИСА ЗАПРОСА
    const requestPromise = new Promise(async (resolve) => {
        window.CONCURRENT_COUNTER++;
        
        const requestOptions = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Device-ID': window.generateDeviceId ? window.generateDeviceId() : 'device_unknown',
                'X-User-ID': window.userData?.userId || 'user_unknown',
                'X-Request-ID': requestId,
                'X-Timestamp': now.toString(),
                'X-Client-Version': 'sparkcoin_3.0_performance',
                'X-Performance-Mode': 'high',
                ...options.headers
            },
            mode: 'cors',
            credentials: 'omit',
            signal: AbortSignal.timeout(window.CONFIG.API_TIMEOUT)
        };
        
        // ОБРАБОТКА ТЕЛА ЗАПРОСА
        if (options.body) {
            requestOptions.body = typeof options.body === 'string' ? 
                options.body : 
                JSON.stringify(options.body);
        }
        
        let responseData = null;
        let attempt = 1;
        let lastError = null;
        
        // ФУНКЦИЯ ДЛЯ БЫСТРОГО ВОЗВРАТА ОФЛАЙН ДАННЫХ
        const returnOfflineData = () => {
            const offlineData = getOfflineResponse(endpoint, options);
            window.PERFORMANCE_METRICS.offlineResponses++;
            
            const responseTime = performance.now() - startTime;
            updateMetrics(responseTime, false, true);
            
            console.log(`📴 Возвращаем офлайн данные для ${endpoint} (время: ${responseTime.toFixed(2)}ms)`);
            
            return {
                ...offlineData,
                _offline: true,
                _attempts: attempt,
                _timestamp: now,
                _requestId: requestId,
                _responseTime: responseTime
            };
        };
        
        // ПРОВЕРКА СОЕДИНЕНИЯ ПЕРЕД ЗАПРОСОМ
        if (!navigator.onLine) {
            console.log('📡 Нет интернет соединения, переход в офлайн режим');
            window.CONCURRENT_COUNTER--;
            window.PENDING_REQUESTS.delete(cacheKey);
            
            // Добавляем в очередь для повторной отправки при восстановлении соединения
            if (method !== 'GET') {
                addToOfflineQueue(endpoint, options, requestId);
            }
            
            resolve(returnOfflineData());
            return;
        }
        
        try {
            const requestStartTime = performance.now();
            const response = await fetch(url, requestOptions);
            const requestTime = performance.now() - requestStartTime;
            
            console.log(`✅ API ответ [${requestId}]: ${response.status} (${requestTime.toFixed(2)}ms)`);
            
            if (response.ok) {
                try {
                    responseData = await response.json();
                    
                    // ВАЛИДАЦИЯ ОТВЕТА
                    if (window.CONFIG.VALIDATE_RESPONSES && !validateResponse(responseData, endpoint)) {
                        throw new Error('Невалидный ответ от сервера');
                    }
                    
                    // СОХРАНЕНИЕ В КЭШ ДЛЯ GET ЗАПРОСОВ
                    if (method === 'GET' && window.CONFIG.USE_CACHE) {
                        window.API_CACHE.set(cacheKey, {
                            data: responseData,
                            timestamp: now
                        });
                        
                        // Периодическая очистка кэша
                        if (window.API_CACHE.size % 10 === 0) {
                            setTimeout(window.cleanupOldCache, 0);
                        }
                    }
                    
                    const totalResponseTime = performance.now() - startTime;
                    const result = {
                        ...responseData,
                        _online: true,
                        _responseTime: totalResponseTime,
                        _attempts: attempt,
                        _timestamp: now,
                        _requestId: requestId,
                        _serverTime: requestTime
                    };
                    
                    // ОБНОВЛЕНИЕ СТАТУСА API
                    updateApiStatusBasedOnResponseTime(totalResponseTime);
                    
                    // ОБНОВЛЕНИЕ МЕТРИК ПРОИЗВОДИТЕЛЬНОСТИ
                    updateMetrics(totalResponseTime, true, false);
                    
                    window.CONCURRENT_COUNTER--;
                    window.PENDING_REQUESTS.delete(cacheKey);
                    resolve(result);
                    return;
                    
                } catch (parseError) {
                    lastError = parseError;
                    console.warn(`⚠️ Ошибка парсинга JSON для ${endpoint}:`, parseError);
                    window.PERFORMANCE_METRICS.errors.push({
                        type: 'parse_error',
                        endpoint: endpoint,
                        error: parseError.message,
                        timestamp: now
                    });
                }
            } else {
                lastError = new Error(`HTTP ${response.status}`);
                window.PERFORMANCE_METRICS.errors.push({
                    type: 'http_error',
                    endpoint: endpoint,
                    status: response.status,
                    timestamp: now
                });
            }
            
            // ПОВТОРНАЯ ПОПЫТКА ПРИ НЕУДАЧЕ
            if (attempt < window.CONFIG.RETRY_ATTEMPTS) {
                attempt++;
                console.log(`🔄 Повторная попытка ${attempt} для ${endpoint} (ошибка: ${lastError?.message})`);
                await new Promise(r => setTimeout(r, window.CONFIG.RETRY_DELAY));
                
                // РЕКУРСИВНЫЙ ПОВТОР
                const retryResult = await window.apiRequest(endpoint, options);
                window.CONCURRENT_COUNTER--;
                window.PENDING_REQUESTS.delete(cacheKey);
                resolve(retryResult);
                return;
            }
            
            // ВСЕ ПОПЫТКИ ИСЧЕРПАНЫ
            console.warn(`❌ Все попытки исчерпаны для ${endpoint}: ${lastError?.message}`);
            window.PERFORMANCE_METRICS.failedRequests++;
            
        } catch (error) {
            lastError = error;
            console.warn(`❌ Ошибка API для ${endpoint}:`, error.name, error.message);
            window.PERFORMANCE_METRICS.errors.push({
                type: 'network_error',
                endpoint: endpoint,
                error: error.message,
                timestamp: now
            });
        }
        
        // В СЛУЧАЕ ОШИБКИ ВОЗВРАЩАЕМ ОФЛАЙН ДАННЫЕ
        window.CONCURRENT_COUNTER--;
        window.PENDING_REQUESTS.delete(cacheKey);
        
        // Добавляем в очередь для повторной отправки при восстановлении соединения
        if (method !== 'GET' && !endpoint.includes('/api/health')) {
            addToOfflineQueue(endpoint, options, requestId);
        }
        
        resolve(returnOfflineData());
    });
    
    // СОХРАНЕНИЕ ПРОМИСА В PENDING REQUESTS
    window.PENDING_REQUESTS.set(cacheKey, requestPromise);
    
    return requestPromise;
};

// ДОБАВЛЕНИЕ ЗАПРОСА В ОФЛАЙН ОЧЕРЕДЬ
function addToOfflineQueue(endpoint, options, requestId) {
    const queueItem = {
        endpoint: endpoint,
        options: options,
        requestId: requestId,
        timestamp: Date.now(),
        attempts: 0
    };
    
    window.OFFLINE_QUEUE.push(queueItem);
    
    // Ограничение размера очереди
    if (window.OFFLINE_QUEUE.length > 50) {
        window.OFFLINE_QUEUE = window.OFFLINE_QUEUE.slice(-50); // Оставляем последние 50 записей
    }
    
    console.log(`📝 Добавлен запрос в офлайн очередь: ${endpoint} (размер очереди: ${window.OFFLINE_QUEUE.length})`);
}

// ПРОЦЕССИРОВАНИЕ ОФЛАЙН ОЧЕРЕДИ
window.processOfflineQueue = async function() {
    if (window.OFFLINE_QUEUE.length === 0 || !navigator.onLine) {
        return;
    }
    
    console.log(`🔄 Обработка офлайн очереди (${window.OFFLINE_QUEUE.length} запросов)`);
    
    const successful = [];
    const failed = [];
    
    for (let i = window.OFFLINE_QUEUE.length - 1; i >= 0; i--) {
        const item = window.OFFLINE_QUEUE[i];
        
        try {
            // Пропускаем слишком старые запросы (старше 10 минут)
            if (Date.now() - item.timestamp > 10 * 60 * 1000) {
                console.log(`⏭️ Пропуск старого запроса из очереди: ${item.endpoint}`);
                window.OFFLINE_QUEUE.splice(i, 1);
                continue;
            }
            
            if (item.attempts > 3) {
                console.log(`❌ Слишком много попыток для запроса: ${item.endpoint}`);
                window.OFFLINE_QUEUE.splice(i, 1);
                failed.push(item);
                continue;
            }
            
            const response = await window.apiRequest(item.endpoint, item.options);
            
            if (response && response._online && !response._offline) {
                successful.push(item);
                window.OFFLINE_QUEUE.splice(i, 1);
                console.log(`✅ Успешно отправлен запрос из очереди: ${item.endpoint}`);
            } else {
                item.attempts++;
                console.log(`🔄 Повторная попытка для запроса из очереди: ${item.endpoint} (попытка ${item.attempts})`);
            }
        } catch (error) {
            item.attempts++;
            console.warn(`⚠️ Ошибка при обработке запроса из очереди: ${item.endpoint}`, error);
        }
    }
    
    if (successful.length > 0) {
        window.showNotification(`Синхронизировано ${successful.length} запросов`, 'success');
    }
};

// ВАЛИДАЦИЯ ОТВЕТА
function validateResponse(response, endpoint) {
    if (!response) {
        return false;
    }
    
    // Базовая проверка структуры
    if (typeof response !== 'object') {
        return false;
    }
    
    // Проверка для различных эндпоинтов
    switch (true) {
        case endpoint.includes('/api/health'):
            return typeof response.status === 'string' && typeof response.timestamp === 'string';
        
        case endpoint.includes('/api/sync'):
            return typeof response.success === 'boolean' && 
                   (response.userId || response.message);
        
        case endpoint.includes('/api/leaderboard'):
            return Array.isArray(response.leaderboard) && typeof response.type === 'string';
        
        case endpoint.includes('/api/all_players'):
            return Array.isArray(response.players) && typeof response.count === 'number';
        
        default:
            return typeof response.success === 'boolean' || typeof response.status === 'string';
    }
}

// ОБНОВЛЕНИЕ МЕТРИК ПРОИЗВОДИТЕЛЬНОСТИ
function updateMetrics(responseTime, success, cached) {
    if (!window.CONFIG.PERFORMANCE_MONITORING) return;
    
    window.PERFORMANCE_METRICS.lastResponseTimes.push({
        time: responseTime,
        timestamp: Date.now(),
        success: success,
        cached: cached
    });
    
    // Ограничиваем массив последних замеров
    if (window.PERFORMANCE_METRICS.lastResponseTimes.length > 100) {
        window.PERFORMANCE_METRICS.lastResponseTimes = 
            window.PERFORMANCE_METRICS.lastResponseTimes.slice(-50);
    }
    
    if (success) {
        window.PERFORMANCE_METRICS.successfulRequests++;
    } else {
        window.PERFORMANCE_METRICS.failedRequests++;
    }
    
    // Расчет среднего времени ответа
    const recentResponses = window.PERFORMANCE_METRICS.lastResponseTimes
        .slice(-20)
        .filter(r => !r.cached && r.success);
    
    if (recentResponses.length > 0) {
        const avg = recentResponses.reduce((sum, r) => sum + r.time, 0) / recentResponses.length;
        window.PERFORMANCE_METRICS.averageResponseTime = avg;
    }
    
    // Периодический вывод статистики
    if (window.PERFORMANCE_METRICS.totalRequests % 50 === 0) {
        console.log(`📊 Статистика API: запросов=${window.PERFORMANCE_METRICS.totalRequests}, ` +
                   `успешно=${window.PERFORMANCE_METRICS.successfulRequests}, ` +
                   `ошибок=${window.PERFORMANCE_METRICS.failedRequests}, ` +
                   `кэш=${window.PERFORMANCE_METRICS.cachedResponses}, ` +
                   `офлайн=${window.PERFORMANCE_METRICS.offlineResponses}, ` +
                   `среднее время=${window.PERFORMANCE_METRICS.averageResponseTime.toFixed(2)}ms`);
    }
}

// ОБНОВЛЕНИЕ СТАТУСА API НА ОСНОВЕ ВРЕМЕНИ ОТВЕТА
function updateApiStatusBasedOnResponseTime(responseTime) {
    let status = 'connected';
    let message = `API (${responseTime.toFixed(0)}ms)`;
    
    if (responseTime <= 50) {
        message = `API (${responseTime.toFixed(0)}ms) 🚀`;
        window.PERFORMANCE_METRICS.connectionStatus = 'excellent';
    } else if (responseTime <= 100) {
        message = `API (${responseTime.toFixed(0)}ms) ⚡`;
        window.PERFORMANCE_METRICS.connectionStatus = 'good';
    } else if (responseTime <= 150) {
        message = `API (${responseTime.toFixed(0)}ms) ⚠️`;
        window.PERFORMANCE_METRICS.connectionStatus = 'slow';
        status = 'warning';
    } else {
        message = `API (${responseTime.toFixed(0)}ms) 🐌`;
        window.PERFORMANCE_METRICS.connectionStatus = 'poor';
        status = 'slow';
    }
    
    window.updateApiStatus?.(status, message);
}

// УЛУЧШЕННЫЕ ОФЛАЙН ОТВЕТЫ (ПОЛНОСТЬЮ РАСШИРЕННЫЕ)
function getOfflineResponse(endpoint, options = {}) {
    const currentUserId = window.userData?.userId || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentUsername = window.userData?.username || 'Игрок';
    const currentBalance = parseFloat(window.userData?.balance || 0.000000100);
    const currentTime = new Date().toISOString();
    const now = Date.now();
    const deviceId = window.generateDeviceId ? window.generateDeviceId() : 'device_offline';
    
    const baseResponse = {
        success: true,
        offline: true,
        timestamp: currentTime,
        serverTime: currentTime,
        _local: true,
        _deviceId: deviceId,
        _version: '3.0.0_offline'
    };
    
    // ОПРЕДЕЛЕНИЕ ТИПА ЗАПРОСА
    const method = options.method || 'GET';
    
    // POST, PUT, DELETE ЗАПРОСЫ
    if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
        const body = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : {};
        
        switch (true) {
            case endpoint.includes('/api/transfer'):
                const transferAmount = parseFloat(body.amount || 0);
                const newBalance = Math.max(0, currentBalance - transferAmount);
                
                return {
                    ...baseResponse,
                    success: true,
                    message: 'Перевод выполнен в офлайн режиме и сохранен в очередь',
                    newBalance: newBalance,
                    transactionId: `offline_tx_${now}_${Math.random().toString(36).substr(2, 9)}`,
                    receiver: body.toUsername || 'Получатель',
                    amount: transferAmount,
                    commission: transferAmount * 0.01,
                    queuePosition: window.OFFLINE_QUEUE.length + 1,
                    estimatedSyncTime: new Date(now + 30000).toISOString()
                };
                
            case endpoint.includes('/api/lottery/bet'):
                const betAmount = parseFloat(body.amount || 0);
                const betBalance = Math.max(0, currentBalance - betAmount);
                
                return {
                    ...baseResponse,
                    success: true,
                    message: 'Ставка принята в офлайн режиме',
                    bet_id: `offline_bet_${now}_${Math.random().toString(36).substr(2, 5)}`,
                    newBalance: betBalance,
                    team: body.team || 'eagle',
                    amount: betAmount,
                    ticket_number: Math.floor(Math.random() * 1000) + 1,
                    offline_confirmation: true
                };
                
            case endpoint.includes('/api/classic-lottery/bet'):
                const classicAmount = parseFloat(body.amount || 0);
                const classicBalance = Math.max(0, currentBalance - classicAmount);
                
                return {
                    ...baseResponse,
                    success: true,
                    message: 'Ставка принята в офлайн режиме',
                    bet_id: `offline_classic_${now}_${Math.random().toString(36).substr(2, 5)}`,
                    newBalance: classicBalance,
                    ticket_number: Math.floor(Math.random() * 1000) + 1,
                    numbers: body.numbers || Array.from({length: 6}, () => Math.floor(Math.random() * 49) + 1),
                    offline_confirmation: true
                };
                
            case endpoint.includes('/api/referral/apply'):
                return {
                    ...baseResponse,
                    success: true,
                    message: 'Реферальный код применен в офлайн режиме',
                    bonus: 0.000000100,
                    applied: true,
                    referral_code: body.code || 'unknown',
                    offline_bonus: true
                };
                
            case endpoint.includes('/api/upgrade/buy'):
                return {
                    ...baseResponse,
                    success: true,
                    message: 'Улучшение куплено в офлайн режиме',
                    upgrade: body.upgrade || 'unknown',
                    level: body.level || 1,
                    cost: body.cost || 0,
                    newBalance: Math.max(0, currentBalance - (body.cost || 0)),
                    offline_purchase: true
                };
                
            case method === 'PUT':
                return {
                    ...baseResponse,
                    success: true,
                    message: 'Данные обновлены в офлайн режиме',
                    updated: true,
                    fields: Object.keys(body),
                    offline_update: true
                };
                
            case method === 'DELETE':
                return {
                    ...baseResponse,
                    success: true,
                    message: 'Удаление выполнено в офлайн режиме',
                    deleted: true,
                    item: body.id || 'unknown',
                    offline_delete: true
                };
                
            default:
                return {
                    ...baseResponse,
                    success: true,
                    message: 'Операция выполнена в офлайн режиме',
                    savedLocally: true,
                    queueId: `queue_${now}_${Math.random().toString(36).substr(2, 6)}`,
                    operation: method,
                    endpoint: endpoint
                };
        }
    }
    
    // GET ЗАПРОСЫ
    const offlineResponses = {
        // ПРОВЕРКА ЗДОРОВЬЯ
        '/api/health': {
            ...baseResponse,
            status: 'healthy',
            mode: 'offline',
            message: 'Работаем в офлайн режиме',
            version: '3.0.0_offline',
            responseTime: 1,
            uptime: Math.floor(now / 1000),
            services: {
                database: 'offline',
                cache: 'online',
                queue: window.OFFLINE_QUEUE.length > 0 ? 'active' : 'idle'
            },
            limits: {
                maxResponseTime: window.CONFIG.API_TIMEOUT,
                concurrentRequests: window.CONCURRENT_COUNTER,
                cacheSize: window.API_CACHE.size
            }
        },
        
        // СИНХРОНИЗАЦИЯ
        '/api/sync/unified': {
            ...baseResponse,
            message: 'Синхронизировано в офлайн режиме',
            userId: currentUserId,
            bestBalance: currentBalance,
            syncStatus: 'offline_saved',
            upgradesCount: window.upgrades ? Object.keys(window.upgrades).length : 0,
            lastSync: currentTime,
            nextSync: new Date(now + 60000).toISOString(),
            pendingOperations: window.OFFLINE_QUEUE.length,
            deviceInfo: {
                id: deviceId,
                online: false,
                lastSeen: currentTime
            }
        },
        
        // ВСЕ ИГРОКИ
        '/api/all_players': {
            ...baseResponse,
            players: [
                {
                    userId: currentUserId,
                    username: currentUsername,
                    balance: currentBalance,
                    totalEarned: window.userData?.totalEarned || 0.000000100,
                    totalClicks: window.userData?.totalClicks || 0,
                    clickSpeed: window.calculateClickPower ? window.calculateClickPower() : 0.000000001,
                    mineSpeed: window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0.000000000,
                    totalSpeed: (window.calculateClickPower ? window.calculateClickPower() : 0) + 
                               (window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0),
                    lastUpdate: currentTime,
                    online: true,
                    rank: 1,
                    device: deviceId,
                    offline: true,
                    level: window.userData?.level || 1
                },
                {
                    userId: 'demo_1',
                    username: 'Демо Игрок 1',
                    balance: 0.000000080,
                    totalEarned: 0.000000200,
                    totalClicks: 50,
                    clickSpeed: 0.000000002,
                    mineSpeed: 0.000000001,
                    totalSpeed: 0.000000003,
                    lastUpdate: new Date(now - 300000).toISOString(),
                    online: false,
                    rank: 2,
                    device: 'demo_device_1',
                    offline: false,
                    level: 2
                },
                {
                    userId: 'demo_2',
                    username: 'Демо Игрок 2',
                    balance: 0.000000060,
                    totalEarned: 0.000000180,
                    totalClicks: 40,
                    clickSpeed: 0.000000001,
                    mineSpeed: 0.000000001,
                    totalSpeed: 0.000000002,
                    lastUpdate: new Date(now - 600000).toISOString(),
                    online: false,
                    rank: 3,
                    device: 'demo_device_2',
                    offline: false,
                    level: 1
                },
                {
                    userId: 'demo_3',
                    username: 'Демо Игрок 3',
                    balance: 0.000000040,
                    totalEarned: 0.000000150,
                    totalClicks: 30,
                    clickSpeed: 0.000000001,
                    mineSpeed: 0.0000000005,
                    totalSpeed: 0.0000000015,
                    lastUpdate: new Date(now - 900000).toISOString(),
                    online: false,
                    rank: 4,
                    device: 'demo_device_3',
                    offline: false,
                    level: 1
                },
                {
                    userId: 'demo_4',
                    username: 'Демо Игрок 4',
                    balance: 0.000000030,
                    totalEarned: 0.000000120,
                    totalClicks: 25,
                    clickSpeed: 0.000000001,
                    mineSpeed: 0.000000000,
                    totalSpeed: 0.000000001,
                    lastUpdate: new Date(now - 1200000).toISOString(),
                    online: false,
                    rank: 5,
                    device: 'demo_device_4',
                    offline: false,
                    level: 1
                }
            ],
            count: 5,
            totalPlayers: 5,
            page: 1,
            perPage: 20,
            hasMore: false
        },
        
        // РЕЙТИНГ ПО БАЛАНСУ
        '/api/leaderboard?type=balance': {
            ...baseResponse,
            leaderboard: [
                {
                    rank: 1,
                    userId: currentUserId,
                    username: currentUsername,
                    balance: currentBalance,
                    totalEarned: window.userData?.totalEarned || 0.000000100,
                    totalClicks: window.userData?.totalClicks || 0,
                    clickSpeed: window.calculateClickPower ? window.calculateClickPower() : 0.000000001,
                    mineSpeed: window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0.000000000,
                    totalSpeed: (window.calculateClickPower ? window.calculateClickPower() : 0) + 
                               (window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0),
                    isCurrent: true,
                    progress: 100,
                    level: window.userData?.level || 1,
                    offline: true
                },
                {
                    rank: 2,
                    userId: 'demo_1',
                    username: 'Демо Игрок 1',
                    balance: 0.000000090,
                    totalEarned: 0.000000250,
                    totalClicks: 60,
                    clickSpeed: 0.000000002,
                    mineSpeed: 0.000000001,
                    totalSpeed: 0.000000003,
                    isCurrent: false,
                    progress: 75,
                    level: 2,
                    offline: false
                },
                {
                    rank: 3,
                    userId: 'demo_2',
                    username: 'Демо Игрок 2',
                    balance: 0.000000070,
                    totalEarned: 0.000000200,
                    totalClicks: 45,
                    clickSpeed: 0.000000001,
                    mineSpeed: 0.000000001,
                    totalSpeed: 0.000000002,
                    isCurrent: false,
                    progress: 50,
                    level: 1,
                    offline: false
                },
                {
                    rank: 4,
                    userId: 'demo_3',
                    username: 'Демо Игрок 3',
                    balance: 0.000000050,
                    totalEarned: 0.000000180,
                    totalClicks: 40,
                    clickSpeed: 0.000000001,
                    mineSpeed: 0.0000000005,
                    totalSpeed: 0.0000000015,
                    isCurrent: false,
                    progress: 25,
                    level: 1,
                    offline: false
                },
                {
                    rank: 5,
                    userId: 'demo_4',
                    username: 'Демо Игрок 4',
                    balance: 0.000000040,
                    totalEarned: 0.000000150,
                    totalClicks: 35,
                    clickSpeed: 0.000000001,
                    mineSpeed: 0.000000000,
                    totalSpeed: 0.000000001,
                    isCurrent: false,
                    progress: 10,
                    level: 1,
                    offline: false
                }
            ],
            type: 'balance',
            updated: currentTime,
            totalParticipants: 5,
            currentUserRank: 1
        },
        
        // РЕЙТИНГ ПО СКОРОСТИ
        '/api/leaderboard?type=speed': {
            ...baseResponse,
            leaderboard: [
                {
                    rank: 1,
                    userId: currentUserId,
                    username: currentUsername,
                    balance: currentBalance,
                    clickSpeed: window.calculateClickPower ? window.calculateClickPower() : 0.000000001,
                    mineSpeed: window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0.000000000,
                    totalSpeed: (window.calculateClickPower ? window.calculateClickPower() : 0) + 
                               (window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0),
                    isCurrent: true,
                    progress: 100,
                    level: window.userData?.level || 1,
                    offline: true
                },
                {
                    rank: 2,
                    userId: 'demo_1',
                    username: 'Демо Игрок 1',
                    balance: 0.000000080,
                    clickSpeed: 0.000000002,
                    mineSpeed: 0.000000001,
                    totalSpeed: 0.000000003,
                    isCurrent: false,
                    progress: 75,
                    level: 2,
                    offline: false
                },
                {
                    rank: 3,
                    userId: 'demo_2',
                    username: 'Демо Игрок 2',
                    balance: 0.000000060,
                    clickSpeed: 0.000000001,
                    mineSpeed: 0.000000001,
                    totalSpeed: 0.000000002,
                    isCurrent: false,
                    progress: 50,
                    level: 1,
                    offline: false
                },
                {
                    rank: 4,
                    userId: 'demo_3',
                    username: 'Демо Игрок 3',
                    balance: 0.000000050,
                    clickSpeed: 0.000000001,
                    mineSpeed: 0.0000000005,
                    totalSpeed: 0.0000000015,
                    isCurrent: false,
                    progress: 25,
                    level: 1,
                    offline: false
                },
                {
                    rank: 5,
                    userId: 'demo_4',
                    username: 'Демо Игрок 4',
                    balance: 0.000000040,
                    clickSpeed: 0.000000001,
                    mineSpeed: 0.000000000,
                    totalSpeed: 0.000000001,
                    isCurrent: false,
                    progress: 10,
                    level: 1,
                    offline: false
                }
            ],
            type: 'speed',
            updated: currentTime,
            totalParticipants: 5,
            currentUserRank: 1
        },
        
        // ТОП ПОБЕДИТЕЛЕЙ
        '/api/top/winners': {
            ...baseResponse,
            winners: [
                {
                    rank: 1,
                    username: currentUsername,
                    totalWinnings: window.userData?.totalWinnings || 0,
                    totalLosses: window.userData?.totalLosses || 0,
                    netWinnings: (window.userData?.totalWinnings || 0) - (window.userData?.totalLosses || 0),
                    lastWin: window.userData?.lastWin || currentTime,
                    winStreak: window.userData?.winStreak || 0,
                    isCurrent: true,
                    avatar: window.userData?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUserId}`,
                    level: window.userData?.level || 1,
                    offline: true
                },
                {
                    rank: 2,
                    username: 'Демо Победитель',
                    totalWinnings: 0.000000500,
                    totalLosses: 0.000000100,
                    netWinnings: 0.000000400,
                    lastWin: new Date(now - 86400000).toISOString(),
                    winStreak: 2,
                    isCurrent: false,
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo_winner',
                    level: 5,
                    offline: false
                },
                {
                    rank: 3,
                    username: 'Удачливый',
                    totalWinnings: 0.000000300,
                    totalLosses: 0.000000050,
                    netWinnings: 0.000000250,
                    lastWin: new Date(now - 172800000).toISOString(),
                    winStreak: 1,
                    isCurrent: false,
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lucky',
                    level: 3,
                    offline: false
                },
                {
                    rank: 4,
                    username: 'Везунчик',
                    totalWinnings: 0.000000200,
                    totalLosses: 0.000000030,
                    netWinnings: 0.000000170,
                    lastWin: new Date(now - 259200000).toISOString(),
                    winStreak: 1,
                    isCurrent: false,
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lucky2',
                    level: 2,
                    offline: false
                },
                {
                    rank: 5,
                    username: 'Новичок',
                    totalWinnings: 0.000000100,
                    totalLosses: 0.000000020,
                    netWinnings: 0.000000080,
                    lastWin: new Date(now - 345600000).toISOString(),
                    winStreak: 1,
                    isCurrent: false,
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=newbie',
                    level: 1,
                    offline: false
                }
            ],
            period: 'all_time',
            updated: currentTime,
            totalWinners: 5,
            totalPrizePool: 0.000001200
        },
        
        // КОМАНДНАЯ ЛОТЕРЕЯ
        '/api/lottery/status': {
            ...baseResponse,
            lottery: {
                eagle: [],
                tails: [],
                last_winner: window.lotteryData?.last_winner || null,
                timer: Math.floor((60000 - (now % 60000)) / 1000),
                total_eagle: 0,
                total_tails: 0,
                participants_count: 0,
                current_round: window.lotteryData?.current_round || 1,
                round_start_time: new Date(now - (now % 60000)).toISOString(),
                round_end_time: new Date(now - (now % 60000) + 60000).toISOString(),
                status: 'waiting',
                prize_pool: 0,
                min_bet: 0.000000001,
                max_bet: 0.000000100,
                last_winning_team: window.lotteryData?.last_winning_team || 'none',
                winning_history: window.lotteryData?.winning_history || []
            }
        },
        
        // КЛАССИЧЕСКАЯ ЛОТЕРЕЯ
        '/api/classic-lottery/status': {
            ...baseResponse,
            lottery: {
                bets: [],
                total_pot: 0,
                timer: Math.floor((120000 - (now % 120000)) / 1000),
                participants_count: 0,
                history: window.classicLotteryData?.history || [],
                current_round: window.classicLotteryData?.current_round || 1,
                round_start_time: new Date(now - (now % 120000)).toISOString(),
                round_end_time: new Date(now - (now % 120000) + 120000).toISOString(),
                status: 'collecting',
                jackpot: 0,
                min_bet: 0.000000001,
                max_bet: 0.000000050,
                winning_numbers: window.classicLotteryData?.winning_numbers || [],
                next_draw: new Date(now - (now % 120000) + 120000).toISOString()
            }
        },
        
        // РЕФЕРАЛЬНАЯ СТАТИСТИКА
        '/api/referral/stats': {
            ...baseResponse,
            stats: {
                referralsCount: window.userData?.referralsCount || 0,
                totalEarnings: window.userData?.referralEarnings || 0,
                todayEarnings: 0,
                yesterdayEarnings: 0,
                thisWeekEarnings: 0,
                thisMonthEarnings: 0,
                topReferral: null,
                earningsHistory: [],
                conversionRate: '0%',
                activeReferrals: 0
            },
            referralCode: window.userData?.referralCode || `REF-${currentUserId.slice(-8).toUpperCase()}`,
            referralLink: `https://t.me/sparkcoin_bot?start=ref_${currentUserId}`,
            referralsList: [],
            commissionRate: '10%',
            minWithdrawal: 0.000000100,
            maxReferrals: 100,
            availableBonuses: [
                { count: 5, bonus: 0.000000010 },
                { count: 10, bonus: 0.000000030 },
                { count: 20, bonus: 0.000000070 }
            ]
        },
        
        // НАСТРОЙКИ ПОЛЬЗОВАТЕЛЯ
        '/api/user/settings': {
            ...baseResponse,
            settings: {
                notifications: true,
                sounds: true,
                vibrations: true,
                auto_click: false,
                theme: 'dark',
                language: 'ru',
                currency: 'S',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                privacy: 'public',
                data_saving: false,
                performance_mode: true
            },
            version: '3.0.0',
            lastUpdated: currentTime,
            availableThemes: ['dark', 'light', 'blue', 'green'],
            availableLanguages: ['ru', 'en', 'de', 'es']
        },
        
        // ИСТОРИЯ ТРАНЗАКЦИЙ
        '/api/transactions/history': {
            ...baseResponse,
            transactions: [
                {
                    id: `tx_${now}_1`,
                    type: 'click',
                    amount: 0.000000001,
                    balance: currentBalance,
                    timestamp: new Date(now - 5000).toISOString(),
                    status: 'completed',
                    description: 'Клик по монете'
                },
                {
                    id: `tx_${now}_2`,
                    type: 'mining',
                    amount: 0.0000000005,
                    balance: currentBalance + 0.0000000015,
                    timestamp: new Date(now - 10000).toISOString(),
                    status: 'completed',
                    description: 'Автоматический майнинг'
                },
                {
                    id: `tx_${now}_3`,
                    type: 'upgrade',
                    amount: -0.000000010,
                    balance: currentBalance - 0.0000000085,
                    timestamp: new Date(now - 15000).toISOString(),
                    status: 'completed',
                    description: 'Покупка улучшения: Мышь'
                }
            ],
            total: 3,
            page: 1,
            perPage: 10,
            hasMore: false,
            totalAmount: 0.0000000015
        },
        
        // ДОСТИЖЕНИЯ
        '/api/achievements': {
            ...baseResponse,
            achievements: [
                {
                    id: 'first_click',
                    name: 'Первый клик',
                    description: 'Совершите первый клик',
                    unlocked: true,
                    progress: 100,
                    reward: 0.000000001,
                    unlockedAt: new Date(now - 86400000).toISOString()
                },
                {
                    id: '100_clicks',
                    name: '100 кликов',
                    description: 'Совершите 100 кликов',
                    unlocked: window.userData?.totalClicks >= 100,
                    progress: Math.min(100, (window.userData?.totalClicks || 0) / 100 * 100),
                    reward: 0.000000010,
                    unlockedAt: window.userData?.totalClicks >= 100 ? new Date(now - 43200000).toISOString() : null
                },
                {
                    id: 'balance_0.000001',
                    name: 'Баланс 0.000001 S',
                    description: 'Накопите 0.000001 S',
                    unlocked: currentBalance >= 0.000001,
                    progress: Math.min(100, currentBalance / 0.000001 * 100),
                    reward: 0.000000050,
                    unlockedAt: currentBalance >= 0.000001 ? new Date(now - 21600000).toISOString() : null
                }
            ],
            unlockedCount: 1,
            totalCount: 3,
            totalRewards: 0.000000011
        },
        
        // СТАТИСТИКА СИСТЕМЫ
        '/api/system/stats': {
            ...baseResponse,
            stats: {
                totalUsers: 12543,
                onlineUsers: 543,
                totalTransactions: 1254300,
                totalVolume: 125.43,
                activeGames: 12,
                serverLoad: 45,
                responseTime: 85,
                uptime: 99.8,
                memoryUsage: 65,
                cpuUsage: 42
            },
            lastUpdated: currentTime,
            version: '3.0.0',
            environment: 'production',
            region: 'europe'
        }
    };
    
    // ПОИСК ПОДХОДЯЩЕГО ОТВЕТА
    for (const [key, response] of Object.entries(offlineResponses)) {
        const cleanKey = key.split('?')[0];
        if (endpoint.includes(cleanKey) || endpoint.startsWith(cleanKey)) {
            return response;
        }
    }
    
    // ОБРАБОТКА ДИНАМИЧЕСКИХ ПУТЕЙ
    if (endpoint.includes('/api/user/')) {
        const userId = endpoint.split('/').pop();
        return {
            ...baseResponse,
            user: {
                userId: userId || currentUserId,
                username: userId === currentUserId ? currentUsername : `Игрок ${userId}`,
                balance: userId === currentUserId ? currentBalance : 0.000000050,
                level: 1,
                joinDate: new Date(now - 86400000 * 30).toISOString(),
                status: userId === currentUserId ? 'offline' : 'online',
                isCurrent: userId === currentUserId
            }
        };
    }
    
    // ОТВЕТ ПО УМОЛЧАНИЮ
    return {
        ...baseResponse,
        success: true,
        message: `Эндпоинт ${endpoint} не найден в офлайн режиме`,
        availableEndpoints: Object.keys(offlineResponses),
        timestamp: currentTime
    };
}

// ВЫСОКОПРОИЗВОДИТЕЛЬНАЯ ПРОВЕРКА СОЕДИНЕНИЯ
window.checkApiConnection = async function() {
    console.log('🔍 Проверка соединения с API...');
    
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.className = 'api-status syncing';
        apiStatus.textContent = 'API: Проверка...';
    }
    
    const startTime = performance.now();
    
    try {
        const response = await Promise.race([
            window.apiRequest('/api/health'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), window.CONFIG.API_TIMEOUT))
        ]);
        
        const pingTime = performance.now() - startTime;
        
        if (response && (response.status === 'healthy' || response.offline)) {
            console.log(`✅ API ${response.offline ? 'офлайн' : 'подключено'}! Пинг: ${pingTime.toFixed(2)}ms`);
            
            const statusMessage = response.offline ? 
                `Офлайн (${pingTime.toFixed(0)}ms)` : 
                `Sparkcoin (${pingTime.toFixed(0)}ms)`;
            
            window.updateApiStatus(response.offline ? 'disconnected' : 'connected', statusMessage);
            
            // Обновление метрик соединения
            window.PERFORMANCE_METRICS.lastCheck = Date.now();
            window.PERFORMANCE_METRICS.connectionStatus = response.offline ? 'offline' : 'online';
            
            localStorage.setItem('last_api_check', Date.now().toString());
            localStorage.setItem('api_ping_time', pingTime.toString());
            
            return {
                connected: !response.offline,
                offline: response.offline || false,
                ping: pingTime,
                timestamp: new Date().toISOString(),
                serverStatus: response.status,
                mode: response.mode || 'online'
            };
        }
    } catch (error) {
        console.log('📴 API недоступно:', error.message);
        window.PERFORMANCE_METRICS.errors.push({
            type: 'connection_check_error',
            error: error.message,
            timestamp: Date.now()
        });
    }
    
    window.updateApiStatus('disconnected', 'Офлайн');
    window.PERFORMANCE_METRICS.connectionStatus = 'offline';
    
    return {
        connected: false,
        offline: true,
        ping: null,
        timestamp: new Date().toISOString(),
        serverStatus: 'unreachable',
        mode: 'offline'
    };
};

// ОБНОВЛЕНИЕ СТАТУСА API
window.updateApiStatus = function(status, message) {
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.className = `api-status ${status}`;
        apiStatus.textContent = `API: ${message}`;
        apiStatus.title = `Обновлено: ${new Date().toLocaleTimeString()}\nСтатус: ${status}\nВсего запросов: ${window.PERFORMANCE_METRICS.totalRequests}`;
        
        // Анимация и цветовая индикация
        if (status === 'connected') {
            const ms = parseInt(message.match(/\d+/)?.[0] || 0);
            if (ms < 50) {
                apiStatus.style.background = 'linear-gradient(135deg, rgba(76, 175, 80, 0.95), rgba(56, 142, 60, 0.95))';
                apiStatus.style.boxShadow = '0 0 15px rgba(76, 175, 80, 0.5)';
            } else if (ms < 100) {
                apiStatus.style.background = 'linear-gradient(135deg, rgba(255, 152, 0, 0.95), rgba(245, 124, 0, 0.95))';
                apiStatus.style.boxShadow = '0 0 10px rgba(255, 152, 0, 0.5)';
            } else {
                apiStatus.style.background = 'linear-gradient(135deg, rgba(244, 67, 54, 0.95), rgba(211, 47, 47, 0.95))';
                apiStatus.style.boxShadow = '0 0 5px rgba(244, 67, 54, 0.5)';
            }
        } else if (status === 'disconnected') {
            apiStatus.style.background = 'linear-gradient(135deg, rgba(158, 158, 158, 0.95), rgba(97, 97, 97, 0.95))';
            apiStatus.style.boxShadow = '0 0 5px rgba(158, 158, 158, 0.5)';
        } else if (status === 'syncing') {
            apiStatus.style.background = 'linear-gradient(135deg, rgba(33, 150, 243, 0.95), rgba(30, 136, 229, 0.95))';
            apiStatus.style.animation = 'pulse 1.5s infinite';
        }
        
        // Добавление иконки
        const icons = {
            connected: '🟢',
            disconnected: '🔴',
            syncing: '🔄',
            warning: '🟡',
            slow: '🐌'
        };
        
        if (icons[status]) {
            apiStatus.textContent = `API: ${icons[status]} ${message}`;
        }
    }
    
    window.apiConnected = status === 'connected';
    window.isOnline = status !== 'disconnected';
    
    // Если соединение восстановилось, обрабатываем очередь
    if (status === 'connected' && window.OFFLINE_QUEUE.length > 0) {
        setTimeout(() => {
            window.processOfflineQueue();
        }, 2000);
    }
};

// ВЫСОКОПРОИЗВОДИТЕЛЬНАЯ СИНХРОНИЗАЦИЯ
window.syncUserData = async function(force = false) {
    console.log('🔄 Высокопроизводительная синхронизация...');
    
    if (!window.userData) {
        return {
            success: false,
            error: 'Нет данных пользователя',
            offline: true,
            timestamp: new Date().toISOString()
        };
    }
    
    const now = Date.now();
    const lastSync = window.lastSyncTime || 0;
    
    // ПРОВЕРКА ЧАСТОТЫ СИНХРОНИЗАЦИИ
    if (!force && (now - lastSync < 15000)) {
        console.log('⏳ Синхронизация пропущена (слишком часто)');
        return {
            success: true,
            skipped: true,
            reason: 'too_frequent',
            nextSync: new Date(now + 15000 - (now - lastSync)).toISOString(),
            waitTime: 15000 - (now - lastSync)
        };
    }
    
    // ПОДГОТОВКА ДАННЫХ ДЛЯ СИНХРОНИЗАЦИИ
    const syncData = {
        userId: window.userData.userId,
        username: window.userData.username,
        balance: parseFloat(window.userData.balance),
        totalEarned: parseFloat(window.userData.totalEarned),
        totalClicks: window.userData.totalClicks,
        upgrades: window.getUpgradesForSync ? window.getUpgradesForSync() : {},
        lastUpdate: now,
        telegramId: window.userData.telegramId,
        clickSpeed: window.calculateClickPower ? window.calculateClickPower() : 0.000000001,
        mineSpeed: window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0.000000000,
        totalSpeed: (window.calculateClickPower ? window.calculateClickPower() : 0) + 
                   (window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0),
        level: window.userData.level || 1,
        experience: window.userData.experience || 0,
        achievements: window.userData.achievements || [],
        settings: window.userData.settings || {},
        deviceId: window.generateDeviceId ? window.generateDeviceId() : 'unknown',
        sessionId: window.sessionId || `session_${now}`,
        version: '3.0.0_performance',
        platform: navigator.platform,
        userAgent: navigator.userAgent.substring(0, 100)
    };
    
    try {
        const response = await window.apiRequest('/api/sync/unified', {
            method: 'POST',
            body: JSON.stringify(syncData)
        });
        
        if (response && response.success) {
            console.log('✅ Данные синхронизированы', response.offline ? '(офлайн режим)' : '(онлайн режим)');
            
            // ОБНОВЛЕНИЕ БАЛАНСА ПРИ НЕОБХОДИМОСТИ
            if (response.bestBalance && parseFloat(response.bestBalance) > parseFloat(window.userData.balance)) {
                const oldBalance = parseFloat(window.userData.balance);
                const newBalance = parseFloat(response.bestBalance);
                window.userData.balance = newBalance;
                
                console.log(`💰 Баланс обновлен: ${oldBalance.toFixed(9)} → ${newBalance.toFixed(9)}`);
                
                if (window.updateUI) window.updateUI();
                
                // Уведомление об изменении баланса
                if (newBalance > oldBalance) {
                    window.showNotification(`Баланс синхронизирован: +${(newBalance - oldBalance).toFixed(9)} S`, 'success', 2000);
                }
            }
            
            window.lastSyncTime = Date.now();
            localStorage.setItem('last_sync_time', window.lastSyncTime.toString());
            localStorage.setItem('last_sync_result', JSON.stringify({
                success: true,
                offline: response.offline || false,
                timestamp: new Date().toISOString()
            }));
            
            return {
                success: true,
                offline: response.offline || false,
                balanceUpdated: response.bestBalance > window.userData.balance,
                timestamp: new Date().toISOString(),
                syncId: response.syncId || `sync_${now}`,
                nextSync: new Date(now + 60000).toISOString()
            };
        }
        
    } catch (error) {
        console.log('📴 Ошибка синхронизации:', error.message);
        window.PERFORMANCE_METRICS.errors.push({
            type: 'sync_error',
            error: error.message,
            timestamp: Date.now()
        });
    }
    
    // СОХРАНЕНИЕ ОШИБКИ СИНХРОНИЗАЦИИ
    localStorage.setItem('last_sync_error', JSON.stringify({
        error: 'Ошибка синхронизации',
        timestamp: new Date().toISOString(),
        data: syncData
    }));
    
    return {
        success: false,
        error: 'Ошибка синхронизации',
        offline: true,
        timestamp: new Date().toISOString(),
        retryAfter: 30000
    };
};

// ВЫСОКОПРОИЗВОДИТЕЛЬНАЯ ЗАГРУЗКА РЕЙТИНГА
window.loadLeaderboard = async function(type = 'balance', limit = 20) {
    console.log(`⚡ Высокопроизводительная загрузка рейтинга ${type}...`);
    
    const cacheKey = `leaderboard_${type}_${limit}`;
    const cached = window.API_CACHE.get(cacheKey);
    const now = Date.now();
    
    // ПРОВЕРКА КЭША
    if (cached && (now - cached.timestamp < 5000)) {
        console.log(`📦 Используем кэшированный рейтинг ${type} (возраст: ${now - cached.timestamp}ms)`);
        window.PERFORMANCE_METRICS.cachedResponses++;
        return cached.data;
    }
    
    try {
        const response = await window.apiRequest(`/api/leaderboard?type=${type}&limit=${limit}`);
        
        if (response && response.success && response.leaderboard) {
            const userId = window.userData?.userId;
            
            // ОБОГАЩЕНИЕ ДАННЫХ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
            response.leaderboard.forEach((player, index) => {
                player.isCurrent = player.userId === userId;
                player.rank = index + 1;
                
                // Добавление дополнительных данных
                if (player.isCurrent) {
                    player.clickPower = window.calculateClickPower ? window.calculateClickPower() : 0.000000001;
                    player.miningSpeed = window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0.000000000;
                    player.level = window.userData?.level || 1;
                    player.device = window.generateDeviceId ? window.generateDeviceId() : 'unknown';
                }
            });
            
            // ДОБАВЛЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ ЕСЛИ ЕГО НЕТ В СПИСКЕ
            if (userId && !response.leaderboard.some(p => p.userId === userId)) {
                response.leaderboard.push({
                    userId: userId,
                    username: window.userData?.username || 'Игрок',
                    balance: window.userData?.balance || 0.000000100,
                    totalEarned: window.userData?.totalEarned || 0.000000100,
                    totalClicks: window.userData?.totalClicks || 0,
                    clickSpeed: window.calculateClickPower ? window.calculateClickPower() : 0.000000001,
                    mineSpeed: window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0.000000000,
                    totalSpeed: (window.calculateClickPower ? window.calculateClickPower() : 0) + 
                               (window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0),
                    lastUpdate: new Date().toISOString(),
                    isCurrent: true,
                    rank: response.leaderboard.length + 1,
                    level: window.userData?.level || 1,
                    offline: true
                });
            }
            
            // КЭШИРОВАНИЕ РЕЗУЛЬТАТА
            window.API_CACHE.set(cacheKey, {
                data: response,
                timestamp: now
            });
            
            console.log(`✅ Рейтинг ${type} загружен (${response.leaderboard.length} игроков)`);
            
            return response;
        }
        
    } catch (error) {
        console.log(`📴 Ошибка загрузки рейтинга ${type}:`, error.message);
        window.PERFORMANCE_METRICS.errors.push({
            type: 'leaderboard_error',
            error: error.message,
            timestamp: Date.now(),
            leaderboardType: type
        });
    }
    
    // ВОЗВРАТ ОФЛАЙН ДАННЫХ
    return {
        success: true,
        leaderboard: [],
        type: type,
        offline: true,
        timestamp: new Date().toISOString(),
        message: 'Рейтинг временно недоступен'
    };
};

// ВЫСОКОПРОИЗВОДИТЕЛЬНАЯ ЗАГРУЗКА ТОПА ПОБЕДИТЕЛЕЙ
window.loadTopWinners = async function(limit = 20) {
    console.log('⚡ Высокопроизводительная загрузка топа победителей...');
    
    const cacheKey = `top_winners_${limit}`;
    const cached = window.API_CACHE.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp < 5000)) {
        console.log(`📦 Используем кэшированный топ победителей (возраст: ${now - cached.timestamp}ms)`);
        window.PERFORMANCE_METRICS.cachedResponses++;
        return cached.data;
    }
    
    try {
        const response = await window.apiRequest(`/api/top/winners?limit=${limit}`);
        
        if (response && response.success && response.winners) {
            const username = window.userData?.username;
            
            // ОБОГАЩЕНИЕ ДАННЫХ
            response.winners.forEach(winner => {
                winner.isCurrent = winner.username === username;
                
                if (winner.isCurrent) {
                    winner.avatar = window.userData?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${window.userData?.userId}`;
                    winner.level = window.userData?.level || 1;
                    winner.lastActive = new Date().toISOString();
                }
            });
            
            // ДОБАВЛЕНИЕ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ ЕСЛИ ЕГО НЕТ
            if (username && !response.winners.some(w => w.username === username)) {
                response.winners.push({
                    rank: response.winners.length + 1,
                    username: username,
                    totalWinnings: window.userData?.totalWinnings || 0,
                    totalLosses: window.userData?.totalLosses || 0,
                    netWinnings: (window.userData?.totalWinnings || 0) - (window.userData?.totalLosses || 0),
                    lastWin: window.userData?.lastWin || new Date(now - 86400000).toISOString(),
                    winStreak: window.userData?.winStreak || 0,
                    isCurrent: true,
                    avatar: window.userData?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${window.userData?.userId}`,
                    level: window.userData?.level || 1
                });
            }
            
            // КЭШИРОВАНИЕ
            window.API_CACHE.set(cacheKey, {
                data: response,
                timestamp: now
            });
            
            return response;
        }
        
    } catch (error) {
        console.log('📴 Ошибка загрузки топа победителей:', error.message);
        window.PERFORMANCE_METRICS.errors.push({
            type: 'top_winners_error',
            error: error.message,
            timestamp: Date.now()
        });
    }
    
    return {
        success: true,
        winners: [],
        offline: true,
        timestamp: new Date().toISOString()
    };
};

// ВЫСОКОПРОИЗВОДИТЕЛЬНАЯ ЗАГРУЗКА СТАТУСА ЛОТЕРЕИ
window.loadLotteryStatus = async function() {
    console.log('⚡ Высокопроизводительная загрузка статуса командной лотереи...');
    
    const cacheKey = 'lottery_status';
    const now = Date.now();
    const cached = window.API_CACHE.get(cacheKey);
    
    if (cached && (now - cached.timestamp < 2000)) {
        console.log(`📦 Используем кэшированный статус лотереи (возраст: ${now - cached.timestamp}ms)`);
        window.PERFORMANCE_METRICS.cachedResponses++;
        return cached.data;
    }
    
    try {
        const response = await window.apiRequest('/api/lottery/status');
        
        if (response && response.success) {
            // ОБНОВЛЕНИЕ ТАЙМЕРА
            if (response.lottery) {
                response.lottery.timer = Math.max(0, Math.floor((60000 - (now % 60000)) / 1000));
                
                // Добавление информации о текущем пользователе
                const userId = window.userData?.userId;
                if (userId) {
                    response.lottery.user_bet = window.lotteryData?.user_bet || null;
                    response.lottery.user_team = window.lotteryData?.user_team || null;
                    response.lottery.user_amount = window.lotteryData?.user_amount || 0;
                }
            }
            
            window.API_CACHE.set(cacheKey, {
                data: response,
                timestamp: now
            });
            
            // Сохранение данных лотереи
            window.lotteryData = response.lottery;
            
            return response;
        }
        
    } catch (error) {
        console.log('📴 Ошибка загрузки статуса лотереи:', error.message);
        window.PERFORMANCE_METRICS.errors.push({
            type: 'lottery_error',
            error: error.message,
            timestamp: Date.now()
        });
    }
    
    return {
        success: true,
        lottery: window.lotteryData || {
            eagle: [],
            tails: [],
            timer: Math.max(0, 60 - Math.floor((now % 60000) / 1000)),
            total_eagle: 0,
            total_tails: 0,
            participants_count: 0,
            status: 'offline'
        },
        offline: true,
        timestamp: new Date().toISOString()
    };
};

// ВЫСОКОПРОИЗВОДИТЕЛЬНАЯ ЗАГРУЗКА КЛАССИЧЕСКОЙ ЛОТЕРЕИ
window.loadClassicLottery = async function() {
    console.log('⚡ Высокопроизводительная загрузка статуса классической лотереи...');
    
    const cacheKey = 'classic_lottery_status';
    const now = Date.now();
    const cached = window.API_CACHE.get(cacheKey);
    
    if (cached && (now - cached.timestamp < 2000)) {
        console.log(`📦 Используем кэшированный статус классической лотереи (возраст: ${now - cached.timestamp}ms)`);
        window.PERFORMANCE_METRICS.cachedResponses++;
        return cached.data;
    }
    
    try {
        const response = await window.apiRequest('/api/classic-lottery/status');
        
        if (response && response.success) {
            // ОБНОВЛЕНИЕ ТАЙМЕРА
            if (response.lottery) {
                response.lottery.timer = Math.max(0, Math.floor((120000 - (now % 120000)) / 1000));
                
                // Добавление информации о текущем пользователе
                const userId = window.userData?.userId;
                if (userId) {
                    response.lottery.user_bets = window.classicLotteryData?.user_bets || [];
                    response.lottery.user_tickets = window.classicLotteryData?.user_tickets || [];
                }
            }
            
            window.API_CACHE.set(cacheKey, {
                data: response,
                timestamp: now
            });
            
            // Сохранение данных лотереи
            window.classicLotteryData = response.lottery;
            
            return response;
        }
        
    } catch (error) {
        console.log('📴 Ошибка загрузки классической лотереи:', error.message);
        window.PERFORMANCE_METRICS.errors.push({
            type: 'classic_lottery_error',
            error: error.message,
            timestamp: Date.now()
        });
    }
    
    return {
        success: true,
        lottery: window.classicLotteryData || {
            bets: [],
            total_pot: 0,
            timer: Math.max(0, 120 - Math.floor((now % 120000) / 1000)),
            participants_count: 0,
            history: [],
            status: 'offline'
        },
        offline: true,
        timestamp: new Date().toISOString()
    };
};

// ВЫСОКОПРОИЗВОДИТЕЛЬНАЯ ЗАГРУЗКА РЕФЕРАЛЬНОЙ СТАТИСТИКИ
window.loadReferralStats = async function() {
    console.log('⚡ Высокопроизводительная загрузка реферальной статистики...');
    
    const userId = window.userData?.userId;
    if (!userId) {
        return {
            success: false,
            error: 'Нет данных пользователя',
            offline: true,
            timestamp: new Date().toISOString()
        };
    }
    
    const cacheKey = `referral_${userId}`;
    const cached = window.API_CACHE.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp < 10000)) {
        console.log(`📦 Используем кэшированную реферальную статистику (возраст: ${now - cached.timestamp}ms)`);
        window.PERFORMANCE_METRICS.cachedResponses++;
        return cached.data;
    }
    
    try {
        const response = await window.apiRequest(`/api/referral/stats/${userId}`);
        
        if (response && response.success) {
            // ОБОГАЩЕНИЕ ДАННЫХ
            response.userId = userId;
            response.username = window.userData?.username || 'Игрок';
            response.joinDate = window.userData?.joinDate || new Date(now - 86400000 * 30).toISOString();
            
            // Генерация демо рефералов если их нет
            if (response.stats.referralsCount === 0 && response.referralsList.length === 0) {
                response.referralsList = [
                    {
                        id: 'ref_demo_1',
                        username: 'Реферал 1',
                        joinDate: new Date(now - 86400000 * 7).toISOString(),
                        earned: 0.000000010,
                        status: 'active',
                        level: 1
                    },
                    {
                        id: 'ref_demo_2',
                        username: 'Реферал 2',
                        joinDate: new Date(now - 86400000 * 14).toISOString(),
                        earned: 0.000000005,
                        status: 'inactive',
                        level: 1
                    }
                ];
                response.stats.referralsCount = 2;
                response.stats.totalEarnings = 0.000000015;
            }
            
            window.API_CACHE.set(cacheKey, {
                data: response,
                timestamp: now
            });
            
            return response;
        }
        
    } catch (error) {
        console.log('📴 Ошибка загрузки реферальной статистики:', error.message);
        window.PERFORMANCE_METRICS.errors.push({
            type: 'referral_error',
            error: error.message,
            timestamp: Date.now(),
            userId: userId
        });
    }
    
    return {
        success: true,
        stats: {
            referralsCount: window.userData?.referralsCount || 0,
            totalEarnings: window.userData?.referralEarnings || 0,
            todayEarnings: 0,
            activeReferrals: 0
        },
        referralCode: window.userData?.referralCode || `REF-${userId.slice(-8).toUpperCase()}`,
        referralLink: `https://t.me/sparkcoin_bot?start=ref_${userId}`,
        referralsList: [],
        offline: true,
        timestamp: new Date().toISOString()
    };
};

// ФУНКЦИЯ ДЛЯ ПОКАЗА УВЕДОМЛЕНИЙ
window.showNotification = function(message, type = 'info', duration = 3000) {
    console.log(`🔔 ${type.toUpperCase()}: ${message}`);
    
    // УДАЛЕНИЕ СТАРЫХ УВЕДОМЛЕНИЙ
    const oldNotifications = document.querySelectorAll('.notification');
    if (oldNotifications.length > 3) {
        oldNotifications[0].remove();
    }
    
    // СОЗДАНИЕ УВЕДОМЛЕНИЯ
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: ${20 + (document.querySelectorAll('.notification').length * 80)}px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 400px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196f3'};
        color: white;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transform: translateX(400px);
        opacity: 0;
        transition: transform 0.3s ease, opacity 0.3s ease;
        font-family: 'Segoe UI', Arial, sans-serif;
    `;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 20px;">${icons[type] || 'ℹ️'}</span>
                <span style="font-weight: bold; font-size: 16px; text-transform: capitalize;">${type}</span>
            </div>
            <button style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; opacity: 0.7; transition: opacity 0.2s;" 
                    onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">×</button>
        </div>
        <div style="font-size: 14px; line-height: 1.4;">${message}</div>
        <div style="height: 3px; background: rgba(255,255,255,0.3); margin-top: 10px; border-radius: 2px; overflow: hidden;">
            <div class="notification-progress" style="height: 100%; background: white; width: 100%; transform: scaleX(1); transform-origin: left; transition: transform ${duration}ms linear;"></div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // ПОКАЗ С АНИМАЦИЕЙ
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 10);
    
    // ЗАКРЫТИЕ
    const closeBtn = notification.querySelector('button');
    closeBtn.onclick = () => {
        notification.style.transform = 'translateX(400px)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    };
    
    // АВТОЗАКРЫТИЕ
    const progress = notification.querySelector('.notification-progress');
    progress.style.transition = `transform ${duration}ms linear`;
    
    setTimeout(() => {
        progress.style.transform = 'scaleX(0)';
    }, 10);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(400px)';
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, duration);
};

// ВЫСОКОПРОИЗВОДИТЕЛЬНЫЙ РАСЧЕТ СИЛЫ КЛИКА
window.calculateClickPower = function() {
    let power = 0.000000001;
    
    if (window.upgrades) {
        const upgrades = {
            mouse: 0.000000001,
            gamepad: 0.000000002,
            keyboard: 0.000000003,
            touchscreen: 0.000000004,
            vr_controller: 0.000000005
        };
        
        for (const [upgrade, multiplier] of Object.entries(upgrades)) {
            const level = window.upgrades[upgrade]?.level || window.upgrades[upgrade] || 0;
            power += level * multiplier;
        }
        
        // Множители комбо
        if (window.clickCombo && window.clickCombo > 10) {
            power *= 1 + (window.clickCombo / 100);
        }
    }
    
    // Минимальное значение
    return Math.max(0.000000001, parseFloat(power.toFixed(9)));
};

// ВЫСОКОПРОИЗВОДИТЕЛЬНЫЙ РАСЧЕТ СКОРОСТИ МАЙНИНГА
window.calculateMiningSpeed = function() {
    let speed = 0.000000000;
    
    if (window.upgrades) {
        const upgrades = {
            pickaxe: 0.0000000005,
            gpu: 0.000000001,
            asic: 0.000000002,
            quantum: 0.000000005,
            cloud: 0.000000010
        };
        
        for (const [upgrade, multiplier] of Object.entries(upgrades)) {
            const level = window.upgrades[upgrade]?.level || window.upgrades[upgrade] || 0;
            speed += level * multiplier;
        }
        
        // Бонус за активность
        if (window.miningActive && window.miningActive > 300000) { // 5 минут
            speed *= 1.2;
        }
    }
    
    // Минимальное значение
    return Math.max(0.000000000, parseFloat(speed.toFixed(9)));
};

// ВЫСОКОПРОИЗВОДИТЕЛЬНОЕ ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
window.updateUI = function() {
    if (!window.userData) return;
    
    const elements = {
        balanceValue: document.getElementById('balanceValue'),
        clickValue: document.getElementById('clickValue'),
        clickSpeed: document.getElementById('clickSpeed'),
        mineSpeed: document.getElementById('mineSpeed'),
        totalEarned: document.getElementById('totalEarned'),
        totalClicks: document.getElementById('totalClicks'),
        userLevel: document.getElementById('userLevel'),
        userExperience: document.getElementById('userExperience'),
        apiStatus: document.getElementById('apiStatus'),
        offlineIndicator: document.getElementById('offlineIndicator')
    };
    
    const balance = parseFloat(window.userData.balance || 0.000000100);
    const clickPower = window.calculateClickPower ? window.calculateClickPower() : 0.000000001;
    const miningSpeed = window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0.000000000;
    const totalSpeed = clickPower + miningSpeed;
    
    // ОБНОВЛЕНИЕ БАЛАНСА
    if (elements.balanceValue) {
        const oldBalance = parseFloat(elements.balanceValue.dataset.oldBalance || 0);
        elements.balanceValue.textContent = balance.toFixed(9) + ' S';
        elements.balanceValue.dataset.oldBalance = balance;
        
        // АНИМАЦИЯ ИЗМЕНЕНИЯ БАЛАНСА
        if (balance !== oldBalance) {
            elements.balanceValue.classList.add('balance-change');
            if (balance > oldBalance) {
                elements.balanceValue.classList.add('balance-increase');
                setTimeout(() => {
                    elements.balanceValue.classList.remove('balance-increase');
                }, 1000);
            } else if (balance < oldBalance) {
                elements.balanceValue.classList.add('balance-decrease');
                setTimeout(() => {
                    elements.balanceValue.classList.remove('balance-decrease');
                }, 1000);
            }
            setTimeout(() => {
                elements.balanceValue.classList.remove('balance-change');
            }, 1500);
        }
    }
    
    // ОБНОВЛЕНИЕ СИЛЫ КЛИКА
    if (elements.clickValue) {
        elements.clickValue.textContent = clickPower.toFixed(9);
        elements.clickValue.title = `Базовая сила: 0.000000001 S\nУлучшения: ${(clickPower - 0.000000001).toFixed(9)} S`;
    }
    
    // ОБНОВЛЕНИЕ СКОРОСТИ КЛИКА
    if (elements.clickSpeed) {
        elements.clickSpeed.textContent = clickPower.toFixed(9) + ' S/сек';
    }
    
    // ОБНОВЛЕНИЕ СКОРОСТИ МАЙНИНГА
    if (elements.mineSpeed) {
        elements.mineSpeed.textContent = miningSpeed.toFixed(9) + ' S/сек';
    }
    
    // ОБНОВЛЕНИЕ ОБЩЕГО ЗАРАБОТКА
    if (elements.totalEarned) {
        const totalEarned = window.userData.totalEarned || 0.000000100;
        elements.totalEarned.textContent = parseFloat(totalEarned).toFixed(9) + ' S';
    }
    
    // ОБНОВЛЕНИЕ КЛИКОВ
    if (elements.totalClicks) {
        elements.totalClicks.textContent = window.userData.totalClicks || 0;
    }
    
    // ОБНОВЛЕНИЕ УРОВНЯ
    if (elements.userLevel) {
        const level = window.userData.level || 1;
        const experience = window.userData.experience || 0;
        const nextLevelExp = level * 1000;
        
        elements.userLevel.textContent = level;
        if (elements.userExperience) {
            const percent = Math.min(100, (experience / nextLevelExp) * 100);
            elements.userExperience.textContent = `${experience}/${nextLevelExp}`;
            elements.userExperience.style.width = `${percent}%`;
            elements.userExperience.title = `Опыт: ${experience}/${nextLevelExp} (${percent.toFixed(1)}%)`;
        }
    }
    
    // ОБНОВЛЕНИЕ ИНДИКАТОРА ОФЛАЙН РЕЖИМА
    if (elements.offlineIndicator) {
        const isOnline = window.isOnline && window.apiConnected;
        elements.offlineIndicator.style.display = isOnline ? 'none' : 'block';
        elements.offlineIndicator.textContent = isOnline ? '' : 'Офлайн режим';
        elements.offlineIndicator.title = isOnline ? 
            'Подключено к серверу' : 
            'Работа в офлайн режиме. Данные будут синхронизированы при восстановлении соединения.';
    }
    
    // ОБНОВЛЕНИЕ СТАТУСА API В РЕАЛЬНОМ ВРЕМЕНИ
    if (elements.apiStatus && window.PERFORMANCE_METRICS) {
        const statusText = elements.apiStatus.textContent;
        if (statusText.includes('API:')) {
            const pingMatch = statusText.match(/\((\d+)ms\)/);
            const ping = pingMatch ? parseInt(pingMatch[1]) : 0;
            
            if (ping > 0 && ping < 50) {
                elements.apiStatus.style.borderLeft = '4px solid #4caf50';
            } else if (ping < 100) {
                elements.apiStatus.style.borderLeft = '4px solid #ff9800';
            } else {
                elements.apiStatus.style.borderLeft = '4px solid #f44336';
            }
        }
    }
    
    // ОБНОВЛЕНИЕ ТИТУЛА СТРАНИЦЫ
    document.title = `${balance.toFixed(6)} S | Sparkcoin ${window.isOnline ? '⚡' : '📴'}`;
};

// ВЫСОКОПРОИЗВОДИТЕЛЬНОЕ СОХРАНЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ
window.saveUserData = function() {
    try {
        if (!window.userData) return;
        
        const now = Date.now();
        
        // ОБНОВЛЕНИЕ МЕТАДАННЫХ
        window.userData.lastUpdate = now;
        window.userData.version = '3.0.0_performance';
        window.userData.deviceId = window.generateDeviceId ? window.generateDeviceId() : 'unknown';
        window.userData.saveCount = (window.userData.saveCount || 0) + 1;
        
        // ПОДГОТОВКА ДАННЫХ ДЛЯ СОХРАНЕНИЯ
        const saveData = {
            userData: window.userData,
            upgrades: window.upgrades || {},
            settings: window.userData.settings || {},
            lastSave: now,
            version: '3.0.0',
            checksum: `chk_${now}_${Math.random().toString(36).substr(2, 6)}`
        };
        
        // СОХРАНЕНИЕ В LOCALSTORAGE
        localStorage.setItem('sparkcoin_user_data', JSON.stringify(saveData.userData));
        
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
        
        // СОХРАНЕНИЕ НАСТРОЕК
        if (window.userData.settings) {
            localStorage.setItem('sparkcoin_settings_' + window.userData.userId, JSON.stringify(window.userData.settings));
        }
        
        localStorage.setItem('sparkcoin_last_save', now.toString());
        localStorage.setItem('sparkcoin_save_version', '3.0.0_performance');
        
        // СОХРАНЕНИЕ ДАННЫХ ЛОТЕРЕИ
        if (window.lotteryData) {
            localStorage.setItem('sparkcoin_lottery_data', JSON.stringify(window.lotteryData));
        }
        
        if (window.classicLotteryData) {
            localStorage.setItem('sparkcoin_classic_lottery_data', JSON.stringify(window.classicLotteryData));
        }
        
        // СОХРАНЕНИЕ МЕТРИК ПРОИЗВОДИТЕЛЬНОСТИ
        if (window.CONFIG.PERFORMANCE_MONITORING) {
            localStorage.setItem('sparkcoin_performance_metrics', JSON.stringify({
                ...window.PERFORMANCE_METRICS,
                lastSave: now
            }));
        }
        
        console.log(`💾 Данные сохранены (сохранение #${saveData.userData.saveCount})`);
        
        return {
            success: true,
            timestamp: now,
            saveId: `save_${now}`,
            dataSize: JSON.stringify(saveData).length
        };
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
        window.PERFORMANCE_METRICS.errors.push({
            type: 'save_error',
            error: error.message,
            timestamp: Date.now()
        });
        
        return {
            success: false,
            error: error.message,
            timestamp: Date.now()
        };
    }
};

// ВЫСОКОПРОИЗВОДИТЕЛЬНАЯ ГЕНЕРАЦИЯ ID УСТРОЙСТВА
window.generateDeviceId = function() {
    let deviceId = localStorage.getItem('sparkcoin_device_id');
    
    if (!deviceId) {
        const components = [
            'device',
            Date.now().toString(36),
            Math.random().toString(36).substr(2, 9),
            navigator.platform.substr(0, 3).toLowerCase(),
            navigator.userAgent.length % 100
        ];
        
        deviceId = components.join('_');
        localStorage.setItem('sparkcoin_device_id', deviceId);
        
        // Также сохраняем информацию об устройстве
        const deviceInfo = {
            id: deviceId,
            platform: navigator.platform,
            userAgent: navigator.userAgent.substring(0, 100),
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            created: Date.now()
        };
        
        localStorage.setItem('sparkcoin_device_info', JSON.stringify(deviceInfo));
    }
    
    return deviceId;
};

// ВЫСОКОПРОИЗВОДИТЕЛЬНАЯ ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
window.loadUserData = function() {
    try {
        // ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
        const userDataJson = localStorage.getItem('sparkcoin_user_data');
        if (userDataJson) {
            window.userData = JSON.parse(userDataJson);
            
            // ВОССТАНОВЛЕНИЕ ДАТЫ СОЗДАНИЯ ЕСЛИ ЕЁ НЕТ
            if (!window.userData.created) {
                window.userData.created = Date.now() - 86400000; // Вчера
            }
            
            // ВОССТАНОВЛЕНИЕ ID ЕСЛИ ЕГО НЕТ
            if (!window.userData.userId) {
                window.userData.userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            
            // ВОССТАНОВЛЕНИЕ БАЛАНСА ЕСЛИ ЕГО НЕТ
            if (!window.userData.balance) {
                window.userData.balance = 0.000000100;
            }
            
            console.log(`👤 Данные пользователя загружены: ${window.userData.username || 'Без имени'}`);
        } else {
            // СОЗДАНИЕ НОВОГО ПОЛЬЗОВАТЕЛЯ
            const deviceId = window.generateDeviceId();
            window.userData = {
                userId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                username: `Игрок_${deviceId.substr(-4)}`,
                balance: 0.000000100,
                totalEarned: 0.000000100,
                totalClicks: 0,
                level: 1,
                experience: 0,
                created: Date.now(),
                lastUpdate: Date.now(),
                version: '3.0.0',
                deviceId: deviceId
            };
            
            console.log(`👤 Создан новый пользователь: ${window.userData.username}`);
        }
        
        // ЗАГРУЗКА УЛУЧШЕНИЙ
        const upgradesJson = localStorage.getItem('sparkcoin_upgrades_' + window.userData.userId);
        if (upgradesJson) {
            const upgradesData = JSON.parse(upgradesJson);
            window.upgrades = {};
            
            for (const [key, level] of Object.entries(upgradesData)) {
                window.upgrades[key] = {
                    level: level,
                    name: key.charAt(0).toUpperCase() + key.slice(1),
                    purchased: Date.now() - 86400000 // Вчера
                };
            }
            
            console.log(`🛠️ Улучшения загружены: ${Object.keys(window.upgrades).length} шт`);
        }
        
        // ЗАГРУЗКА НАСТРОЕК
        const settingsJson = localStorage.getItem('sparkcoin_settings_' + window.userData.userId);
        if (settingsJson) {
            window.userData.settings = JSON.parse(settingsJson);
        }
        
        // ЗАГРУЗКА МЕТРИК ПРОИЗВОДИТЕЛЬНОСТИ
        const metricsJson = localStorage.getItem('sparkcoin_performance_metrics');
        if (metricsJson && window.CONFIG.PERFORMANCE_MONITORING) {
            const savedMetrics = JSON.parse(metricsJson);
            window.PERFORMANCE_METRICS = {
                ...window.PERFORMANCE_METRICS,
                ...savedMetrics,
                lastLoad: Date.now()
            };
        }
        
        return {
            success: true,
            user: window.userData,
            upgradesCount: window.upgrades ? Object.keys(window.upgrades).length : 0,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        
        // СОЗДАНИЕ ДАННЫХ ПО УМОЛЧАНИЮ ПРИ ОШИБКЕ
        window.userData = {
            userId: `user_error_${Date.now()}`,
            username: 'Игрок',
            balance: 0.000000100,
            totalEarned: 0.000000100,
            totalClicks: 0,
            created: Date.now(),
            lastUpdate: Date.now(),
            version: '3.0.0_error'
        };
        
        return {
            success: false,
            error: error.message,
            user: window.userData,
            timestamp: new Date().toISOString()
        };
    }
};

// ВЫСОКОПРОИЗВОДИТЕЛЬНАЯ ИНИЦИАЛИЗАЦИЯ API
window.initializeApi = function() {
    console.log('🚀 Инициализация высокопроизводительного API...');
    
    // ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
    window.loadUserData();
    
    // СОЗДАНИЕ ID СЕССИИ
    window.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('current_session_id', window.sessionId);
    
    // УСТАНОВКА ОБРАБОТЧИКОВ СОБЫТИЙ СЕТИ
    window.addEventListener('online', () => {
        console.log('🌐 Соединение восстановлено');
        window.showNotification('Соединение восстановлено', 'success', 2000);
        window.checkApiConnection();
        window.processOfflineQueue();
    });
    
    window.addEventListener('offline', () => {
        console.log('📴 Потеряно соединение');
        window.showNotification('Работа в офлайн режиме', 'warning', 3000);
        window.updateApiStatus('disconnected', 'Офлайн');
    });
    
    // ИНИЦИАЛИЗАЦИЯ ПЕРИОДИЧЕСКИХ ЗАДАЧ
    setInterval(() => {
        if (window.checkApiConnection) {
            window.checkApiConnection();
        }
    }, 30000); // Проверка соединения каждые 30 секунд
    
    setInterval(() => {
        if (window.syncUserData && window.userData) {
            window.syncUserData();
        }
    }, 60000); // Синхронизация каждые 60 секунд
    
    setInterval(() => {
        if (window.saveUserData && window.userData) {
            window.saveUserData();
        }
    }, 15000); // Автосохранение каждые 15 секунд
    
    setInterval(() => {
        window.cleanupOldCache();
    }, 60000); // Очистка кэша каждые 60 секунд
    
    setInterval(() => {
        if (window.PERFORMANCE_METRICS.errors.length > 50) {
            window.PERFORMANCE_METRICS.errors = window.PERFORMANCE_METRICS.errors.slice(-25);
        }
    }, 30000); // Очистка старых ошибок каждые 30 секунд
    
    // ПЕРВОНАЧАЛЬНАЯ ПРОВЕРКА СОЕДИНЕНИЯ
    setTimeout(() => {
        window.checkApiConnection();
    }, 1000);
    
    // ПЕРВОНАЧАЛЬНАЯ СИНХРОНИЗАЦИЯ
    setTimeout(() => {
        if (window.userData) {
            window.syncUserData(true); // Принудительная синхронизация
        }
    }, 3000);
    
    console.log('✅ Высокопроизводительный API инициализирован!');
    console.log(`⚙️ Конфигурация: таймаут=${window.CONFIG.API_TIMEOUT}ms, кэш=${window.CONFIG.CACHE_DURATION}ms, параллельные запросы=${window.CONFIG.MAX_CONCURRENT_REQUESTS}`);
    
    return {
        success: true,
        sessionId: window.sessionId,
        userId: window.userData?.userId,
        timestamp: new Date().toISOString(),
        version: '3.0.0_performance'
    };
};

// АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ДОКУМЕНТА
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM загружен, запуск высокопроизводительного API...');
    
    setTimeout(() => {
        window.initializeApi();
        
        // ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ПОСЛЕ ИНИЦИАЛИЗАЦИИ
        if (window.updateUI) {
            window.updateUI();
        }
        
        // ПОКАЗ ПРИВЕТСТВЕННОГО СООБЩЕНИЯ
        setTimeout(() => {
            const username = window.userData?.username || 'Игрок';
            window.showNotification(`Добро пожаловать, ${username}! API готов к работе.`, 'success', 4000);
        }, 2000);
        
    }, 500);
});

console.log('✅ Высокопроизводительный API полностью загружен и готов к работе!');
console.log('🎯 Целевые показатели: максимальная задержка 120мс, параллельные запросы: 6, кэширование: 3 секунды');
console.log('📊 Мониторинг производительности: включен');
