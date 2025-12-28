// api.js - ПОЛНОСТЬЮ ОПТИМИЗИРОВАННЫЙ API ДЛЯ SPARKCOIN С ЗАДЕРЖКОЙ 120МС
console.log('🚀 Загрузка оптимизированного API для Sparkcoin...');

// Конфигурация с минимальной задержкой
window.CONFIG = {
    API_BASE_URL: 'https://b9339c3b-8a22-434d-b97a-a426ac75c328-00-2vzfhw3hnozb6.sisko.replit.dev',
    API_TIMEOUT: 120, // 120 миллисекунд максимум
    RETRY_ATTEMPTS: 1, // Только одна попытка для скорости
    RETRY_DELAY: 50, // Быстрая задержка при повторе
    CACHE_DURATION: 3000, // Кэширование на 3 секунды
    MAX_CONCURRENT_REQUESTS: 6, // Максимум параллельных запросов
    USE_CACHE: true, // Использовать кэширование
    USE_OFFLINE_FIRST: true // Приоритет офлайн данных
};

// Кэш для быстрых ответов
window.API_CACHE = new Map();
window.PENDING_REQUESTS = new Map();
window.CONCURRENT_COUNTER = 0;

// Генерация уникального ID для запросов
window.generateRequestId = function() {
    return 'req_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
};

// Основная функция API запросов с оптимизацией
window.apiRequest = async function(endpoint, options = {}) {
    const requestId = generateRequestId();
    const url = `${window.CONFIG.API_BASE_URL}${endpoint}`;
    const method = options.method || 'GET';
    const cacheKey = `${method}:${url}`;
    const now = Date.now();
    
    console.log(`⚡ API запрос [${requestId}]: ${method} ${endpoint}`);
    
    // Проверяем кэш для GET запросов
    if (method === 'GET' && window.CONFIG.USE_CACHE) {
        const cached = window.API_CACHE.get(cacheKey);
        if (cached && (now - cached.timestamp < window.CONFIG.CACHE_DURATION)) {
            console.log(`📦 Используем кэшированный ответ для ${endpoint}`);
            return Promise.resolve({ 
                ...cached.data, 
                _cached: true,
                _timestamp: cached.timestamp,
                _requestId: requestId
            });
        }
    }
    
    // Проверяем есть ли уже такой запрос в процессе
    if (window.PENDING_REQUESTS.has(cacheKey)) {
        console.log(`🔄 Ожидание существующего запроса для ${endpoint}`);
        return window.PENDING_REQUESTS.get(cacheKey);
    }
    
    // Проверяем лимит параллельных запросов
    if (window.CONCURRENT_COUNTER >= window.CONFIG.MAX_CONCURRENT_REQUESTS) {
        console.log(`⏳ Достигнут лимит параллельных запросов, ожидание...`);
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Создаем промис запроса
    const requestPromise = new Promise(async (resolve) => {
        window.CONCURRENT_COUNTER++;
        
        const requestOptions = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Device-ID': window.generateDeviceId ? window.generateDeviceId() : 'device_unknown',
                'X-User-ID': window.userData?.userId || 'user_unknown',
                'X-Request-ID': requestId,
                'X-Timestamp': now,
                'X-Client-Version': 'sparkcoin_3.0',
                ...options.headers
            },
            mode: 'cors',
            credentials: 'omit',
            signal: AbortSignal.timeout(window.CONFIG.API_TIMEOUT)
        };
        
        if (options.body) {
            requestOptions.body = typeof options.body === 'string' ? 
                options.body : 
                JSON.stringify(options.body);
        }
        
        let responseData = null;
        let attempt = 1;
        
        // Функция для быстрого возврата офлайн данных
        const returnOfflineData = () => {
            const offlineData = getOfflineResponse(endpoint, options);
            console.log(`📴 Возвращаем офлайн данные для ${endpoint}`);
            return {
                ...offlineData,
                _offline: true,
                _attempts: attempt,
                _timestamp: now,
                _requestId: requestId
            };
        };
        
        // Проверяем соединение перед запросом
        if (!navigator.onLine) {
            console.log('📡 Нет интернет соединения');
            window.CONCURRENT_COUNTER--;
            window.PENDING_REQUESTS.delete(cacheKey);
            resolve(returnOfflineData());
            return;
        }
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), window.CONFIG.API_TIMEOUT);
            requestOptions.signal = controller.signal;
            
            const startTime = Date.now();
            const response = await fetch(url, requestOptions);
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;
            
            console.log(`✅ API ответ [${requestId}]: ${response.status} (${responseTime}ms)`);
            
            if (response.ok) {
                try {
                    responseData = await response.json();
                    
                    // Сохраняем в кэш для GET запросов
                    if (method === 'GET' && window.CONFIG.USE_CACHE) {
                        window.API_CACHE.set(cacheKey, {
                            data: responseData,
                            timestamp: now
                        });
                    }
                    
                    const result = {
                        ...responseData,
                        _online: true,
                        _responseTime: responseTime,
                        _attempts: attempt,
                        _timestamp: now,
                        _requestId: requestId
                    };
                    
                    // Обновляем статус API
                    if (responseTime <= 50) {
                        window.updateApiStatus?.('connected', `API (${responseTime}ms)`);
                    } else if (responseTime <= 120) {
                        window.updateApiStatus?.('connected', `API (${responseTime}ms)`);
                    } else {
                        window.updateApiStatus?.('connected', `API (${responseTime}ms)`);
                    }
                    
                    window.CONCURRENT_COUNTER--;
                    window.PENDING_REQUESTS.delete(cacheKey);
                    resolve(result);
                    return;
                    
                } catch (parseError) {
                    console.warn(`⚠️ Ошибка парсинга JSON для ${endpoint}:`, parseError);
                }
            }
            
            // Если статус не ок или ошибка парсинга
            if (attempt < window.CONFIG.RETRY_ATTEMPTS) {
                attempt++;
                console.log(`🔄 Повторная попытка ${attempt} для ${endpoint}`);
                await new Promise(r => setTimeout(r, window.CONFIG.RETRY_DELAY));
                
                // Рекурсивно повторяем
                const retryResult = await apiRequest(endpoint, options);
                window.CONCURRENT_COUNTER--;
                window.PENDING_REQUESTS.delete(cacheKey);
                resolve(retryResult);
                return;
            }
            
            // Все попытки исчерпаны
            console.warn(`❌ Все попытки исчерпаны для ${endpoint}`);
            
        } catch (error) {
            console.warn(`❌ Ошибка API для ${endpoint}:`, error.name, error.message);
        }
        
        // В случае ошибки возвращаем офлайн данные
        window.CONCURRENT_COUNTER--;
        window.PENDING_REQUESTS.delete(cacheKey);
        resolve(returnOfflineData());
    });
    
    // Сохраняем промис в pending requests
    window.PENDING_REQUESTS.set(cacheKey, requestPromise);
    
    return requestPromise;
};

// Улучшенные офлайн ответы
function getOfflineResponse(endpoint, options = {}) {
    const currentUserId = window.userData?.userId || `user_${Date.now()}`;
    const currentUsername = window.userData?.username || 'Игрок';
    const currentBalance = window.userData?.balance || 0.000000100;
    const currentTime = new Date().toISOString();
    const now = Date.now();
    
    const baseResponse = {
        success: true,
        offline: true,
        timestamp: currentTime,
        serverTime: currentTime,
        _local: true
    };
    
    const offlineResponses = {
        // Проверка здоровья
        '/api/health': {
            ...baseResponse,
            status: 'healthy',
            mode: 'offline',
            message: 'Работаем в офлайн режиме',
            version: '3.0.0',
            responseTime: 1
        },
        
        // Синхронизация
        '/api/sync/unified': {
            ...baseResponse,
            message: 'Синхронизировано в офлайн режиме',
            userId: currentUserId,
            bestBalance: currentBalance,
            syncStatus: 'offline_saved',
            upgradesCount: window.upgrades ? Object.keys(window.upgrades).length : 0
        },
        
        // Все игроки
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
                    rank: 1
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
                    lastUpdate: currentTime,
                    online: false,
                    rank: 2
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
                    lastUpdate: currentTime,
                    online: false,
                    rank: 3
                }
            ],
            count: 3
        },
        
        // Рейтинг по балансу
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
                    isCurrent: true
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
                    isCurrent: false
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
                    isCurrent: false
                }
            ],
            type: 'balance'
        },
        
        // Рейтинг по скорости
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
                    isCurrent: true
                },
                {
                    rank: 2,
                    userId: 'demo_1',
                    username: 'Демо Игрок 1',
                    balance: 0.000000080,
                    clickSpeed: 0.000000002,
                    mineSpeed: 0.000000001,
                    totalSpeed: 0.000000003,
                    isCurrent: false
                },
                {
                    rank: 3,
                    userId: 'demo_2',
                    username: 'Демо Игрок 2',
                    balance: 0.000000060,
                    clickSpeed: 0.000000001,
                    mineSpeed: 0.000000001,
                    totalSpeed: 0.000000002,
                    isCurrent: false
                }
            ],
            type: 'speed'
        },
        
        // Топ победителей
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
                    isCurrent: true
                },
                {
                    rank: 2,
                    username: 'Демо Победитель',
                    totalWinnings: 0.000000500,
                    totalLosses: 0.000000100,
                    netWinnings: 0.000000400,
                    lastWin: new Date(now - 86400000).toISOString(),
                    winStreak: 2,
                    isCurrent: false
                },
                {
                    rank: 3,
                    username: 'Удачливый',
                    totalWinnings: 0.000000300,
                    totalLosses: 0.000000050,
                    netWinnings: 0.000000250,
                    lastWin: new Date(now - 172800000).toISOString(),
                    winStreak: 1,
                    isCurrent: false
                }
            ],
            period: 'all_time'
        },
        
        // Командная лотерея
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
                status: 'waiting'
            }
        },
        
        // Классическая лотерея
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
                status: 'collecting'
            }
        },
        
        // Реферальная статистика
        '/api/referral/stats': {
            ...baseResponse,
            stats: {
                referralsCount: window.userData?.referralsCount || 0,
                totalEarnings: window.userData?.referralEarnings || 0,
                todayEarnings: 0,
                topReferral: null,
                earningsHistory: []
            },
            referralCode: window.userData?.referralCode || `REF-${currentUserId.slice(-8).toUpperCase()}`,
            referralLink: `https://t.me/sparkcoin_bot?start=ref_${currentUserId}`,
            referralsList: []
        }
    };
    
    // POST запросы
    if (options.method === 'POST') {
        const body = options.body ? JSON.parse(options.body) : {};
        
        switch (true) {
            case endpoint.includes('/api/transfer'):
                return {
                    ...baseResponse,
                    success: true,
                    message: 'Перевод выполнен в офлайн режиме',
                    newBalance: Math.max(0, currentBalance - (body.amount || 0)),
                    transactionId: `offline_tx_${now}`,
                    receiver: body.toUsername || 'Получатель'
                };
                
            case endpoint.includes('/api/lottery/bet'):
                return {
                    ...baseResponse,
                    success: true,
                    message: 'Ставка принята в офлайн режиме',
                    bet_id: `offline_bet_${now}`,
                    newBalance: Math.max(0, currentBalance - (body.amount || 0)),
                    team: body.team || 'eagle'
                };
                
            case endpoint.includes('/api/classic-lottery/bet'):
                return {
                    ...baseResponse,
                    success: true,
                    message: 'Ставка принята в офлайн режиме',
                    bet_id: `offline_classic_${now}`,
                    newBalance: Math.max(0, currentBalance - (body.amount || 0)),
                    ticket_number: Math.floor(Math.random() * 1000) + 1
                };
                
            case endpoint.includes('/api/referral/apply'):
                return {
                    ...baseResponse,
                    success: true,
                    message: 'Реферальный код применен в офлайн режиме',
                    bonus: 0.000000100,
                    applied: true
                };
                
            default:
                return {
                    ...baseResponse,
                    success: true,
                    message: 'Операция выполнена в офлайн режиме',
                    savedLocally: true
                };
        }
    }
    
    // Ищем подходящий ответ
    for (const [key, response] of Object.entries(offlineResponses)) {
        if (endpoint.includes(key.replace('?', '').replace('&limit=20', ''))) {
            return response;
        }
    }
    
    // Ответ по умолчанию
    return baseResponse;
}

// Оптимизированная проверка соединения
window.checkApiConnection = async function() {
    console.log('🔍 Проверка соединения с API...');
    
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.className = 'api-status syncing';
        apiStatus.textContent = 'API: Проверка...';
    }
    
    const startTime = Date.now();
    
    try {
        const response = await Promise.race([
            window.apiRequest('/api/health'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 100))
        ]);
        
        const pingTime = Date.now() - startTime;
        
        if (response && (response.status === 'healthy' || response.offline)) {
            console.log(`✅ API ${response.offline ? 'офлайн' : 'подключено'}! Пинг: ${pingTime}ms`);
            
            const statusMessage = response.offline ? 
                `Офлайн (${pingTime}ms)` : 
                `Sparkcoin (${pingTime}ms)`;
            
            window.updateApiStatus('connected', statusMessage);
            
            localStorage.setItem('last_api_check', Date.now().toString());
            
            return {
                connected: true,
                offline: response.offline || false,
                ping: pingTime,
                timestamp: new Date().toISOString()
            };
        }
    } catch (error) {
        console.log('📴 API недоступно:', error.message);
    }
    
    window.updateApiStatus('disconnected', 'Офлайн');
    return {
        connected: false,
        offline: true,
        ping: null,
        timestamp: new Date().toISOString()
    };
};

// Обновление статуса API
window.updateApiStatus = function(status, message) {
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.className = `api-status ${status}`;
        apiStatus.textContent = `API: ${message}`;
        apiStatus.title = `Обновлено: ${new Date().toLocaleTimeString()}`;
        
        // Анимация для быстрых ответов
        if (status === 'connected' && message.includes('ms')) {
            const ms = parseInt(message.match(/\d+/)?.[0] || 0);
            if (ms < 50) {
                apiStatus.style.background = 'rgba(76, 175, 80, 0.95)';
            } else if (ms < 100) {
                apiStatus.style.background = 'rgba(255, 152, 0, 0.95)';
            } else {
                apiStatus.style.background = 'rgba(244, 67, 54, 0.95)';
            }
        }
    }
    
    window.apiConnected = status === 'connected';
    window.isOnline = status !== 'disconnected';
};

// Оптимизированная синхронизация
window.syncUserData = async function(force = false) {
    console.log('🔄 Быстрая синхронизация...');
    
    if (!window.userData) {
        return {
            success: false,
            error: 'Нет данных пользователя',
            offline: true
        };
    }
    
    const now = Date.now();
    const lastSync = window.lastSyncTime || 0;
    
    if (!force && (now - lastSync < 15000)) {
        console.log('⏳ Синхронизация пропущена (слишком часто)');
        return {
            success: true,
            skipped: true,
            reason: 'too_frequent'
        };
    }
    
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
                   (window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0)
    };
    
    try {
        const response = await window.apiRequest('/api/sync/unified', {
            method: 'POST',
            body: JSON.stringify(syncData)
        });
        
        if (response && response.success) {
            console.log('✅ Данные синхронизированы');
            
            if (response.bestBalance && response.bestBalance > window.userData.balance) {
                window.userData.balance = response.bestBalance;
                if (window.updateUI) window.updateUI();
            }
            
            window.lastSyncTime = Date.now();
            localStorage.setItem('last_sync_time', window.lastSyncTime.toString());
            
            return {
                success: true,
                offline: response.offline || false,
                balanceUpdated: response.bestBalance > window.userData.balance
            };
        }
        
    } catch (error) {
        console.log('📴 Ошибка синхронизации:', error.message);
    }
    
    return {
        success: false,
        error: 'Ошибка синхронизации',
        offline: true
    };
};

// Быстрая загрузка рейтинга
window.loadLeaderboard = async function(type = 'balance', limit = 20) {
    console.log(`⚡ Загрузка рейтинга ${type}...`);
    
    const cacheKey = `leaderboard_${type}`;
    const cached = window.API_CACHE.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < 5000)) {
        console.log(`📦 Используем кэшированный рейтинг ${type}`);
        return cached.data;
    }
    
    try {
        const response = await window.apiRequest(`/api/leaderboard?type=${type}&limit=${limit}`);
        
        if (response && response.success && response.leaderboard) {
            const userId = window.userData?.userId;
            response.leaderboard.forEach(player => {
                player.isCurrent = player.userId === userId;
            });
            
            // Кэшируем результат
            window.API_CACHE.set(cacheKey, {
                data: response,
                timestamp: Date.now()
            });
            
            return response;
        }
        
    } catch (error) {
        console.log(`📴 Ошибка загрузки рейтинга ${type}:`, error.message);
    }
    
    return {
        success: true,
        leaderboard: [],
        type: type,
        offline: true
    };
};

// Быстрая загрузка топа победителей
window.loadTopWinners = async function(limit = 20) {
    console.log('⚡ Загрузка топа победителей...');
    
    const cacheKey = 'top_winners';
    const cached = window.API_CACHE.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < 5000)) {
        console.log('📦 Используем кэшированный топ победителей');
        return cached.data;
    }
    
    try {
        const response = await window.apiRequest(`/api/top/winners?limit=${limit}`);
        
        if (response && response.success && response.winners) {
            const username = window.userData?.username;
            response.winners.forEach(winner => {
                winner.isCurrent = winner.username === username;
            });
            
            window.API_CACHE.set(cacheKey, {
                data: response,
                timestamp: Date.now()
            });
            
            return response;
        }
        
    } catch (error) {
        console.log('📴 Ошибка загрузки топа победителей:', error.message);
    }
    
    return {
        success: true,
        winners: [],
        offline: true
    };
};

// Быстрая загрузка статуса лотереи
window.loadLotteryStatus = async function() {
    console.log('⚡ Загрузка статуса командной лотереи...');
    
    const cacheKey = 'lottery_status';
    const now = Date.now();
    
    try {
        const response = await window.apiRequest('/api/lottery/status');
        
        if (response && response.success) {
            window.API_CACHE.set(cacheKey, {
                data: response,
                timestamp: now
            });
            
            return response;
        }
        
    } catch (error) {
        console.log('📴 Ошибка загрузки статуса лотереи:', error.message);
    }
    
    return {
        success: true,
        lottery: window.lotteryData || {
            eagle: [],
            tails: [],
            timer: 60 - Math.floor((now % 60000) / 1000),
            total_eagle: 0,
            total_tails: 0,
            participants_count: 0
        },
        offline: true
    };
};

// Быстрая загрузка классической лотереи
window.loadClassicLottery = async function() {
    console.log('⚡ Загрузка статуса классической лотереи...');
    
    const cacheKey = 'classic_lottery_status';
    const now = Date.now();
    
    try {
        const response = await window.apiRequest('/api/classic-lottery/status');
        
        if (response && response.success) {
            window.API_CACHE.set(cacheKey, {
                data: response,
                timestamp: now
            });
            
            return response;
        }
        
    } catch (error) {
        console.log('📴 Ошибка загрузки классической лотереи:', error.message);
    }
    
    return {
        success: true,
        lottery: window.classicLotteryData || {
            bets: [],
            total_pot: 0,
            timer: 120 - Math.floor((now % 120000) / 1000),
            participants_count: 0,
            history: []
        },
        offline: true
    };
};

// Быстрая загрузка реферальной статистики
window.loadReferralStats = async function() {
    console.log('⚡ Загрузка реферальной статистики...');
    
    const userId = window.userData?.userId;
    if (!userId) {
        return {
            success: false,
            error: 'Нет данных пользователя',
            offline: true
        };
    }
    
    const cacheKey = `referral_${userId}`;
    const cached = window.API_CACHE.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < 10000)) {
        console.log('📦 Используем кэшированную реферальную статистику');
        return cached.data;
    }
    
    try {
        const response = await window.apiRequest(`/api/referral/stats/${userId}`);
        
        if (response && response.success) {
            window.API_CACHE.set(cacheKey, {
                data: response,
                timestamp: Date.now()
            });
            
            return response;
        }
        
    } catch (error) {
        console.log('📴 Ошибка загрузки реферальной статистики:', error.message);
    }
    
    return {
        success: true,
        stats: {
            referralsCount: 0,
            totalEarnings: 0
        },
        referralCode: `REF-${userId.slice(-8).toUpperCase()}`,
        offline: true
    };
};

// Функции для утилит
window.showNotification = function(message, type = 'info', duration = 3000) {
    console.log(`🔔 ${type.toUpperCase()}: ${message}`);
    
    // Удаляем старые уведомления
    const oldNotifications = document.querySelectorAll('.notification');
    if (oldNotifications.length > 3) {
        oldNotifications[0].remove();
    }
    
    // Создаем уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    notification.innerHTML = `
        <div class="notification-header">
            <span class="notification-icon">${icons[type] || 'ℹ️'}</span>
            <span class="notification-title">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
            <button class="notification-close">×</button>
        </div>
        <div class="notification-body">
            ${message}
        </div>
        <div class="notification-progress"></div>
    `;
    
    document.body.appendChild(notification);
    
    // Показываем с анимацией
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Закрытие
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.onclick = () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
    };
    
    // Автозакрытие
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }
    }, duration);
};

window.calculateClickPower = function() {
    let power = 0.000000001;
    
    if (window.upgrades) {
        const mouseLevel = window.upgrades.mouse?.level || window.upgrades.mouse || 0;
        power += mouseLevel * 0.000000001;
    }
    
    return Math.max(0.000000001, power);
};

window.calculateMiningSpeed = function() {
    let speed = 0.000000000;
    
    if (window.upgrades) {
        const gpuLevel = window.upgrades.gpu?.level || window.upgrades.gpu || 0;
        const cpuLevel = window.upgrades.cpu?.level || window.upgrades.cpu || 0;
        speed += (gpuLevel + cpuLevel) * 0.0000000005;
    }
    
    return Math.max(0.000000000, speed);
};

window.updateUI = function() {
    if (!window.userData) return;
    
    const balanceElement = document.getElementById('balanceValue');
    const clickValueElement = document.getElementById('clickValue');
    const clickSpeedElement = document.getElementById('clickSpeed');
    const mineSpeedElement = document.getElementById('mineSpeed');
    const totalEarnedElement = document.getElementById('totalEarned');
    const totalClicksElement = document.getElementById('totalClicks');
    
    if (balanceElement) {
        const balance = parseFloat(window.userData.balance || 0.000000100);
        balanceElement.textContent = balance.toFixed(9) + ' S';
    }
    
    if (clickValueElement) {
        const clickPower = window.calculateClickPower();
        clickValueElement.textContent = clickPower.toFixed(9);
    }
    
    if (clickSpeedElement) {
        const clickPower = window.calculateClickPower();
        clickSpeedElement.textContent = clickPower.toFixed(9) + ' S/сек';
    }
    
    if (mineSpeedElement) {
        const miningSpeed = window.calculateMiningSpeed();
        mineSpeedElement.textContent = miningSpeed.toFixed(9) + ' S/сек';
    }
    
    if (totalEarnedElement) {
        const totalEarned = window.userData.totalEarned || 0.000000100;
        totalEarnedElement.textContent = parseFloat(totalEarned).toFixed(9) + ' S';
    }
    
    if (totalClicksElement) {
        totalClicksElement.textContent = window.userData.totalClicks || 0;
    }
};

window.saveUserData = function() {
    try {
        if (!window.userData) return;
        
        window.userData.lastUpdate = Date.now();
        window.userData.version = '3.0.0';
        
        localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
        
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
        
        localStorage.setItem('sparkcoin_last_save', Date.now().toString());
        
        console.log('💾 Данные сохранены');
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
    }
};

window.generateDeviceId = function() {
    let deviceId = localStorage.getItem('sparkcoin_device_id');
    if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sparkcoin_device_id', deviceId);
    }
    return deviceId;
};

// Автоматическая инициализация
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.checkApiConnection) {
            window.checkApiConnection();
        }
    }, 1000);
});

// Периодические проверки
setInterval(() => {
    if (window.checkApiConnection) {
        window.checkApiConnection();
    }
}, 30000);

// Периодическая синхронизация
setInterval(() => {
    if (window.syncUserData && window.userData) {
        window.syncUserData();
    }
}, 60000);

// Автосохранение
setInterval(() => {
    if (window.saveUserData && window.userData) {
        window.saveUserData();
    }
}, 15000);

console.log('✅ Оптимизированный API загружен! Максимальная задержка: 120мс');
