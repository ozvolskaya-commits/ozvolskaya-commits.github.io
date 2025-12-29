// ==============================================
// SPARKCOIN MOBILE OPTIMIZED API v2.0
// Полностью переработанная версия для мобильных устройств
// ==============================================

'use strict';

// ==============================================
// МОДУЛЬ КОНФИГУРАЦИИ И ИНИЦИАЛИЗАЦИИ
// ==============================================

/**
 * Глобальная конфигурация приложения
 * Оптимизирована для мобильных устройств
 */
window.CONFIG = {
    API_BASE_URL: 'https://b9339c3b-8a22-434d-b97a-a426ac75c328-00-2vzfhw3hnozb6.sisko.replit.dev',
    REQUEST_TIMEOUT: 10000,
    MAX_RETRIES: 2,
    CACHE_TTL: 30000,
    OFFLINE_MODE: true,
    PERFORMANCE_MONITORING: true
};

/**
 * Глобальные объекты состояния приложения
 * Используются для отслеживания производительности
 */
window.APP_STATE = {
    isOnline: navigator.onLine,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    connectionType: null,
    lastSyncTime: 0,
    pendingRequests: 0,
    errorCount: 0,
    performanceMetrics: {
        apiResponseTime: 0,
        uiRenderTime: 0,
        memoryUsage: 0
    }
};

/**
 * Кэш для хранения данных и уменьшения сетевых запросов
 */
window.APP_CACHE = {
    players: null,
    leaderboard: null,
    lotteryStatus: null,
    classicLotteryStatus: null,
    referralStats: null,
    lastUpdate: {}
};

/**
 * Система логирования с поддержкой мобильных устройств
 */
window.Logger = {
    levels: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    },
    
    currentLevel: 1,
    
    log: function(level, message, data) {
        if (level < this.currentLevel) {
            return;
        }
        
        const timestamp = new Date().toISOString();
        const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
        const prefix = `${timestamp} [${levelNames[level]}]`;
        
        if (data) {
            console.log(`${prefix} ${message}`, data);
        } else {
            console.log(`${prefix} ${message}`);
        }
        
        // Сохраняем критичные ошибки для последующего анализа
        if (level === this.levels.ERROR) {
            this.saveErrorLog(message, data);
        }
    },
    
    debug: function(message, data) {
        this.log(this.levels.DEBUG, message, data);
    },
    
    info: function(message, data) {
        this.log(this.levels.INFO, message, data);
    },
    
    warn: function(message, data) {
        this.log(this.levels.WARN, message, data);
    },
    
    error: function(message, data) {
        this.log(this.levels.ERROR, message, data);
    },
    
    saveErrorLog: function(message, data) {
        try {
            const errorLog = JSON.parse(localStorage.getItem('sparkcoin_error_log') || '[]');
            errorLog.push({
                timestamp: Date.now(),
                message: message,
                data: data,
                userAgent: navigator.userAgent,
                online: navigator.onLine
            });
            
            // Храним только последние 50 ошибок
            if (errorLog.length > 50) {
                errorLog.shift();
            }
            
            localStorage.setItem('sparkcoin_error_log', JSON.stringify(errorLog));
        } catch (e) {
            console.error('Ошибка сохранения лога:', e);
        }
    }
};

// ==============================================
// МОДУЛЬ РАБОТЫ С СЕТЬЮ И API
// ==============================================

/**
 * Универсальный обработчик сетевых запросов
 * Оптимизирован для мобильных сетей
 */
window.NetworkManager = {
    /**
     * Выполняет API запрос с оптимизациями для мобильных устройств
     */
    request: async function(endpoint, options) {
        const startTime = performance.now();
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        window.APP_STATE.pendingRequests = window.APP_STATE.pendingRequests + 1;
        
        const url = `${window.CONFIG.API_BASE_URL}${endpoint}`;
        const method = options.method || 'GET';
        
        Logger.info(`Сетевой запрос начат`, {
            requestId: requestId,
            endpoint: endpoint,
            method: method,
            pendingRequests: window.APP_STATE.pendingRequests
        });
        
        // Проверяем наличие в кэше для GET запросов
        if (method === 'GET' && this.shouldUseCache(endpoint)) {
            const cachedData = this.getCachedResponse(endpoint);
            if (cachedData) {
                Logger.debug(`Используем кэшированные данные`, {
                    requestId: requestId,
                    endpoint: endpoint
                });
                
                window.APP_STATE.pendingRequests = window.APP_STATE.pendingRequests - 1;
                return cachedData;
            }
        }
        
        // Настройки запроса для мобильных устройств
        const requestOptions = {
            method: method,
            headers: Object.assign({}, {
                'Content-Type': 'application/json',
                'X-Request-ID': requestId,
                'X-Device-Type': window.APP_STATE.isMobile ? 'mobile' : 'desktop',
                'X-Connection-Type': window.APP_STATE.connectionType || 'unknown'
            }, options.headers || {}),
            mode: 'cors',
            credentials: 'omit',
            signal: this.createAbortSignal()
        };
        
        if (options.body) {
            requestOptions.body = options.body;
        }
        
        let retryCount = 0;
        
        while (retryCount <= window.CONFIG.MAX_RETRIES) {
            try {
                const response = await this.executeFetchWithTimeout(url, requestOptions);
                
                if (response.ok) {
                    const data = await response.json();
                    const responseTime = performance.now() - startTime;
                    
                    window.APP_STATE.performanceMetrics.apiResponseTime = 
                        (window.APP_STATE.performanceMetrics.apiResponseTime + responseTime) / 2;
                    
                    // Кэшируем успешные GET ответы
                    if (method === 'GET' && response.headers.get('cache-control') !== 'no-cache') {
                        this.cacheResponse(endpoint, data);
                    }
                    
                    Logger.info(`Сетевой запрос завершен`, {
                        requestId: requestId,
                        endpoint: endpoint,
                        status: response.status,
                        responseTime: responseTime.toFixed(2) + 'ms',
                        pendingRequests: window.APP_STATE.pendingRequests - 1
                    });
                    
                    window.APP_STATE.pendingRequests = window.APP_STATE.pendingRequests - 1;
                    return data;
                } else {
                    Logger.warn(`Ошибка HTTP`, {
                        requestId: requestId,
                        endpoint: endpoint,
                        status: response.status,
                        retryCount: retryCount
                    });
                    
                    // Повторяем запрос при некоторых статусах
                    if (this.shouldRetry(response.status) && retryCount < window.CONFIG.MAX_RETRIES) {
                        retryCount = retryCount + 1;
                        await this.delay(Math.pow(2, retryCount) * 1000);
                        continue;
                    }
                    
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (error) {
                Logger.error(`Ошибка сетевого запроса`, {
                    requestId: requestId,
                    endpoint: endpoint,
                    error: error.message,
                    retryCount: retryCount
                });
                
                if (retryCount < window.CONFIG.MAX_RETRIES && this.isRetryableError(error)) {
                    retryCount = retryCount + 1;
                    await this.delay(Math.pow(2, retryCount) * 1000);
                } else {
                    window.APP_STATE.pendingRequests = window.APP_STATE.pendingRequests - 1;
                    window.APP_STATE.errorCount = window.APP_STATE.errorCount + 1;
                    
                    // Переходим в оффлайн режим при множественных ошибках
                    if (window.APP_STATE.errorCount > 5 && window.CONFIG.OFFLINE_MODE) {
                        Logger.warn(`Переход в оффлайн режим из-за множественных ошибок`);
                        return this.getOfflineResponse(endpoint, options);
                    }
                    
                    throw error;
                }
            }
        }
        
        window.APP_STATE.pendingRequests = window.APP_STATE.pendingRequests - 1;
        return this.getOfflineResponse(endpoint, options);
    },
    
    /**
     * Выполняет fetch с таймаутом
     */
    executeFetchWithTimeout: function(url, options) {
        return new Promise(function(resolve, reject) {
            const timeoutId = setTimeout(function() {
                reject(new Error('Request timeout'));
            }, window.CONFIG.REQUEST_TIMEOUT);
            
            fetch(url, options).then(function(response) {
                clearTimeout(timeoutId);
                resolve(response);
            }).catch(function(error) {
                clearTimeout(timeoutId);
                reject(error);
            });
        });
    },
    
    /**
     * Создает AbortSignal для отмены запросов
     */
    createAbortSignal: function() {
        const abortController = new AbortController();
        setTimeout(function() {
            abortController.abort();
        }, window.CONFIG.REQUEST_TIMEOUT + 1000);
        
        return abortController.signal;
    },
    
    /**
     * Задержка между повторными попытками
     */
    delay: function(ms) {
        return new Promise(function(resolve) {
            setTimeout(resolve, ms);
        });
    },
    
    /**
     * Определяет, нужно ли повторять запрос при данном статусе
     */
    shouldRetry: function(status) {
        const retryStatuses = [408, 429, 500, 502, 503, 504];
        return retryStatuses.includes(status);
    },
    
    /**
     * Определяет, является ли ошибка повторяемой
     */
    isRetryableError: function(error) {
        const retryableErrors = [
            'TypeError: Failed to fetch',
            'NetworkError when attempting to fetch resource',
            'Request timeout'
        ];
        
        return retryableErrors.includes(error.message) || error.name === 'AbortError';
    },
    
    /**
     * Проверяет, нужно ли использовать кэш для данного endpoint
     */
    shouldUseCache: function(endpoint) {
        const cacheableEndpoints = [
            '/api/all_players',
            '/api/leaderboard',
            '/api/lottery/status',
            '/api/classic-lottery/status',
            '/api/top/winners'
        ];
        
        return cacheableEndpoints.some(function(cacheableEndpoint) {
            return endpoint.startsWith(cacheableEndpoint);
        });
    },
    
    /**
     * Получает данные из кэша
     */
    getCachedResponse: function(endpoint) {
        try {
            const cacheKey = `cache_${endpoint.replace(/\//g, '_')}`;
            const cached = localStorage.getItem(cacheKey);
            
            if (cached) {
                const cacheData = JSON.parse(cached);
                const now = Date.now();
                
                if (now - cacheData.timestamp < window.CONFIG.CACHE_TTL) {
                    return cacheData.data;
                } else {
                    localStorage.removeItem(cacheKey);
                }
            }
        } catch (error) {
            Logger.error('Ошибка чтения кэша', error);
        }
        
        return null;
    },
    
    /**
     * Сохраняет данные в кэш
     */
    cacheResponse: function(endpoint, data) {
        try {
            const cacheKey = `cache_${endpoint.replace(/\//g, '_')}`;
            const cacheData = {
                data: data,
                timestamp: Date.now()
            };
            
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            
            Logger.debug(`Данные сохранены в кэш`, {
                endpoint: endpoint,
                cacheKey: cacheKey
            });
        } catch (error) {
            Logger.error('Ошибка сохранения в кэш', error);
        }
    },
    
    /**
     * Генерирует оффлайн ответ
     */
    getOfflineResponse: function(endpoint, options) {
        const currentUserId = window.userData ? window.userData.userId : 'default_user';
        const currentUsername = window.userData ? window.userData.username : 'Текущий Игрок';
        const currentBalance = window.userData ? window.userData.balance : 0.000000100;
        
        const clickSpeed = window.calculateClickPower ? window.calculateClickPower() : 0.000000001;
        const mineSpeed = window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0.000000000;
        const totalSpeed = clickSpeed + mineSpeed;
        
        const offlineResponses = {
            '/api/health': {
                status: 'healthy',
                mode: 'offline',
                timestamp: new Date().toISOString()
            },
            
            '/api/sync/unified': {
                success: true,
                message: 'Синхронизировано в офлайн режиме',
                userId: currentUserId,
                bestBalance: currentBalance,
                offline: true,
                timestamp: new Date().toISOString()
            },
            
            '/api/all_players': {
                success: true,
                players: [
                    {
                        userId: currentUserId,
                        username: currentUsername,
                        balance: currentBalance,
                        totalEarned: window.userData ? window.userData.totalEarned : 0.000000100,
                        totalClicks: window.userData ? window.userData.totalClicks : 0,
                        clickSpeed: clickSpeed,
                        mineSpeed: mineSpeed,
                        totalSpeed: totalSpeed,
                        lastUpdate: new Date().toISOString()
                    }
                ],
                offline: true
            },
            
            '/api/leaderboard': {
                success: true,
                leaderboard: [
                    {
                        rank: 1,
                        userId: currentUserId,
                        username: currentUsername,
                        balance: currentBalance,
                        totalEarned: window.userData ? window.userData.totalEarned : 0.000000100,
                        totalClicks: window.userData ? window.userData.totalClicks : 0,
                        clickSpeed: clickSpeed,
                        mineSpeed: mineSpeed,
                        totalSpeed: totalSpeed
                    }
                ],
                offline: true
            }
        };
        
        // Для POST запросов возвращаем успешный оффлайн ответ
        if (options && options.method === 'POST') {
            return {
                success: true,
                message: 'Операция выполнена в офлайн режиме',
                offline: true,
                timestamp: new Date().toISOString()
            };
        }
        
        // Поиск подходящего оффлайн ответа
        for (const key in offlineResponses) {
            if (endpoint.startsWith(key)) {
                return offlineResponses[key];
            }
        }
        
        // Ответ по умолчанию
        return {
            success: true,
            offline: true,
            message: 'Офлайн режим',
            timestamp: new Date().toISOString()
        };
    }
};

// ==============================================
// МОДУЛЬ СИНХРОНИЗАЦИИ ДАННЫХ
// ==============================================

window.DataSyncManager = {
    /**
     * Синхронизирует данные пользователя с сервером
     */
    syncUserData: async function() {
        if (!window.userData) {
            Logger.warn('Нет данных пользователя для синхронизации');
            return false;
        }
        
        const syncStartTime = performance.now();
        Logger.info('Начало синхронизации данных');
        
        try {
            const syncData = {
                userId: window.userData.userId,
                username: window.userData.username,
                balance: parseFloat(window.userData.balance),
                totalEarned: parseFloat(window.userData.totalEarned),
                totalClicks: window.userData.totalClicks,
                upgrades: this.getUpgradesData(),
                lastUpdate: Date.now(),
                deviceId: window.generateDeviceId ? window.generateDeviceId() : 'unknown'
            };
            
            const response = await window.NetworkManager.request('/api/sync/unified', {
                method: 'POST',
                body: JSON.stringify(syncData)
            });
            
            if (response && response.success) {
                window.APP_STATE.lastSyncTime = Date.now();
                
                // Обновляем баланс если серверный больше
                if (response.bestBalance && response.bestBalance > window.userData.balance) {
                    window.userData.balance = response.bestBalance;
                    this.updateUI();
                }
                
                const syncTime = performance.now() - syncStartTime;
                Logger.info(`Синхронизация завершена`, {
                    duration: syncTime.toFixed(2) + 'ms',
                    success: true
                });
                
                return true;
            }
        } catch (error) {
            Logger.error('Ошибка синхронизации', error);
        }
        
        return false;
    },
    
    /**
     * Получает данные улучшений для синхронизации
     */
    getUpgradesData: function() {
        const upgradesData = {};
        
        if (window.upgrades) {
            for (const key in window.upgrades) {
                if (window.upgrades[key] && window.upgrades[key].level !== undefined) {
                    upgradesData[key] = window.upgrades[key].level;
                } else if (typeof window.upgrades[key] === 'number') {
                    upgradesData[key] = window.upgrades[key];
                }
            }
        }
        
        return upgradesData;
    },
    
    /**
     * Загружает данные с сервера
     */
    loadFromServer: async function() {
        if (!window.userData || !window.userData.userId) {
            Logger.warn('Нет userID для загрузки данных');
            return false;
        }
        
        Logger.info('Загрузка данных с сервера');
        
        try {
            const response = await window.NetworkManager.request(`/api/sync/unified/${window.userData.userId}`);
            
            if (response && response.success && response.userData) {
                const serverData = response.userData;
                
                // Объединяем данные, сохраняя локальный прогресс
                this.mergeUserData(serverData);
                
                Logger.info('Данные успешно загружены с сервера');
                return true;
            }
        } catch (error) {
            Logger.error('Ошибка загрузки данных с сервера', error);
        }
        
        return false;
    },
    
    /**
     * Объединяет данные с сервера с локальными данными
     */
    mergeUserData: function(serverData) {
        // Используем максимальные значения
        if (serverData.balance > window.userData.balance) {
            window.userData.balance = serverData.balance;
        }
        
        if (serverData.totalEarned > window.userData.totalEarned) {
            window.userData.totalEarned = serverData.totalEarned;
        }
        
        if (serverData.totalClicks > window.userData.totalClicks) {
            window.userData.totalClicks = serverData.totalClicks;
        }
        
        // Обновляем другие поля
        const fieldsToUpdate = [
            'userId', 'username', 'lotteryWins', 'totalBet',
            'referralEarnings', 'referralsCount', 'totalWinnings', 'totalLosses'
        ];
        
        fieldsToUpdate.forEach(function(field) {
            if (serverData[field] !== undefined) {
                window.userData[field] = serverData[field];
            }
        });
        
        // Синхронизируем улучшения
        if (serverData.upgrades) {
            this.mergeUpgrades(serverData.upgrades);
        }
        
        // Сохраняем обновленные данные
        if (window.saveUserData) {
            window.saveUserData();
        }
        
        // Обновляем интерфейс
        this.updateUI();
    },
    
    /**
     * Объединяет улучшения с сервера
     */
    mergeUpgrades: function(serverUpgrades) {
        for (const key in serverUpgrades) {
            const serverLevel = serverUpgrades[key];
            const localLevel = window.upgrades[key] ? 
                (window.upgrades[key].level || window.upgrades[key]) : 0;
            
            if (serverLevel > localLevel) {
                if (typeof window.upgrades[key] === 'object') {
                    window.upgrades[key].level = serverLevel;
                } else {
                    window.upgrades[key] = serverLevel;
                }
            }
        }
    },
    
    /**
     * Обновляет пользовательский интерфейс
     */
    updateUI: function() {
        if (!window.userData) {
            return;
        }
        
        // Используем requestAnimationFrame для оптимального обновления
        window.requestAnimationFrame(function() {
            const balanceElement = document.getElementById('balanceValue');
            if (balanceElement) {
                balanceElement.textContent = window.userData.balance.toFixed(9) + ' S';
            }
            
            const clickValueElement = document.getElementById('clickValue');
            if (clickValueElement && window.calculateClickPower) {
                clickValueElement.textContent = window.calculateClickPower().toFixed(9);
            }
            
            const clickSpeedElement = document.getElementById('clickSpeed');
            if (clickSpeedElement && window.calculateClickPower) {
                clickSpeedElement.textContent = window.calculateClickPower().toFixed(9) + ' S/сек';
            }
            
            const mineSpeedElement = document.getElementById('mineSpeed');
            if (mineSpeedElement && window.calculateMiningSpeed) {
                mineSpeedElement.textContent = window.calculateMiningSpeed().toFixed(9) + ' S/сек';
            }
        });
    }
};

// ==============================================
// МОДУЛЬ РАБОТЫ С ДАННЫМИ
// ==============================================

window.DataManager = {
    /**
     * Загружает список всех игроков
     */
    loadAllPlayers: async function() {
        Logger.info('Загрузка списка игроков');
        
        try {
            const data = await window.NetworkManager.request('/api/all_players');
            
            if (data && data.success) {
                window.allPlayers = data.players || [];
                Logger.info(`Загружено ${window.allPlayers.length} игроков`);
                return window.allPlayers;
            }
        } catch (error) {
            Logger.error('Ошибка загрузки списка игроков', error);
            window.allPlayers = [];
        }
        
        return [];
    },
    
    /**
     * Загружает рейтинг игроков
     */
    loadLeaderboard: async function() {
        Logger.info('Загрузка рейтинга');
        
        try {
            const data = await window.NetworkManager.request('/api/leaderboard');
            
            if (data && data.success) {
                Logger.info(`Загружен рейтинг из ${data.leaderboard.length} игроков`);
                return data.leaderboard;
            }
        } catch (error) {
            Logger.error('Ошибка загрузки рейтинга', error);
        }
        
        return [];
    },
    
    /**
     * Загружает топ победителей
     */
    loadTopWinners: async function() {
        Logger.info('Загрузка топа победителей');
        
        try {
            const data = await window.NetworkManager.request('/api/top/winners?limit=20');
            
            if (data && data.success) {
                Logger.info(`Загружено ${data.winners.length} победителей`);
                return data.winners;
            }
        } catch (error) {
            Logger.error('Ошибка загрузки топа победителей', error);
        }
        
        return [];
    },
    
    /**
     * Загружает статус командной лотереи
     */
    loadLotteryStatus: async function() {
        Logger.info('Загрузка статуса командной лотереи');
        
        try {
            const data = await window.NetworkManager.request('/api/lottery/status');
            
            if (data && data.success) {
                Logger.info('Статус лотереи загружен');
                return data.lottery;
            }
        } catch (error) {
            Logger.error('Ошибка загрузки статуса лотереи', error);
        }
        
        return null;
    },
    
    /**
     * Загружает статус классической лотереи
     */
    loadClassicLotteryStatus: async function() {
        Logger.info('Загрузка статуса классической лотереи');
        
        try {
            const data = await window.NetworkManager.request('/api/classic-lottery/status');
            
            if (data && data.success) {
                Logger.info('Статус классической лотереи загружен');
                return data.lottery;
            }
        } catch (error) {
            Logger.error('Ошибка загрузки статуса классической лотереи', error);
        }
        
        return null;
    },
    
    /**
     * Загружает реферальную статистику
     */
    loadReferralStats: async function() {
        if (!window.userData || !window.userData.userId) {
            Logger.warn('Нет userID для загрузки реферальной статистики');
            return null;
        }
        
        Logger.info('Загрузка реферальной статистики');
        
        try {
            const data = await window.NetworkManager.request(`/api/referral/stats/${window.userData.userId}`);
            
            if (data && data.success) {
                Logger.info('Реферальная статистика загружена');
                return data;
            }
        } catch (error) {
            Logger.error('Ошибка загрузки реферальной статистики', error);
        }
        
        return null;
    }
};

// ==============================================
// МОДУЛЬ ОПЕРАЦИЙ
// ==============================================

window.OperationsManager = {
    /**
     * Выполняет ставку в командной лотерее
     */
    placeLotteryBet: async function(team, amount) {
        Logger.info(`Ставка в лотерею: ${team}, ${amount}`);
        
        if (!window.userData) {
            Logger.error('Нет данных пользователя для ставки');
            return { success: false, error: 'Нет данных пользователя' };
        }
        
        try {
            const response = await window.NetworkManager.request('/api/lottery/bet', {
                method: 'POST',
                body: JSON.stringify({
                    userId: window.userData.userId,
                    team: team,
                    amount: amount,
                    username: window.userData.username
                })
            });
            
            return response;
        } catch (error) {
            Logger.error('Ошибка ставки в лотерею', error);
            return { success: false, error: 'Ошибка соединения' };
        }
    },
    
    /**
     * Выполняет ставку в классической лотерее
     */
    placeClassicLotteryBet: async function(amount) {
        Logger.info(`Ставка в классическую лотерею: ${amount}`);
        
        if (!window.userData) {
            Logger.error('Нет данных пользователя для ставки');
            return { success: false, error: 'Нет данных пользователя' };
        }
        
        try {
            const response = await window.NetworkManager.request('/api/classic-lottery/bet', {
                method: 'POST',
                body: JSON.stringify({
                    userId: window.userData.userId,
                    amount: amount,
                    username: window.userData.username
                })
            });
            
            return response;
        } catch (error) {
            Logger.error('Ошибка ставки в классическую лотерею', error);
            return { success: false, error: 'Ошибка соединения' };
        }
    },
    
    /**
     * Выполняет перевод между пользователями
     */
    performTransfer: async function(fromUserId, toUserId, amount, fromUsername, toUsername) {
        Logger.info(`Перевод: ${fromUserId} -> ${toUserId}, сумма: ${amount}`);
        
        if (!fromUserId || !toUserId || !amount) {
            Logger.error('Недостаточно данных для перевода');
            return { success: false, error: 'Недостаточно данных' };
        }
        
        try {
            const response = await window.NetworkManager.request('/api/transfer', {
                method: 'POST',
                body: JSON.stringify({
                    fromUserId: fromUserId,
                    toUserId: toUserId,
                    amount: amount,
                    fromUsername: fromUsername || 'Игрок',
                    toUsername: toUsername || 'Игрок'
                })
            });
            
            return response;
        } catch (error) {
            Logger.error('Ошибка перевода', error);
            return { success: false, error: 'Ошибка соединения' };
        }
    }
};

// ==============================================
// МОДУЛЬ МОНИТОРИНГА И АНАЛИТИКИ
// ==============================================

window.PerformanceMonitor = {
    /**
     * Инициализирует мониторинг производительности
     */
    init: function() {
        if (!window.CONFIG.PERFORMANCE_MONITORING) {
            return;
        }
        
        // Мониторинг использования памяти
        if (performance.memory) {
            setInterval(this.monitorMemory.bind(this), 30000);
        }
        
        // Мониторинг FPS
        this.initFPSMonitoring();
        
        // Мониторинг сетевого соединения
        this.initConnectionMonitoring();
        
        Logger.info('Мониторинг производительности инициализирован');
    },
    
    /**
     * Мониторит использование памяти
     */
    monitorMemory: function() {
        if (performance.memory) {
            const memory = performance.memory;
            const usedMB = (memory.usedJSHeapSize / 1048576).toFixed(2);
            const totalMB = (memory.totalJSHeapSize / 1048576).toFixed(2);
            
            window.APP_STATE.performanceMetrics.memoryUsage = usedMB;
            
            // Предупреждение при высоком использовании памяти
            if (usedMB > 100) {
                Logger.warn(`Высокое использование памяти: ${usedMB}MB из ${totalMB}MB`);
            }
        }
    },
    
    /**
     * Инициализирует мониторинг FPS
     */
    initFPSMonitoring: function() {
        let lastTime = performance.now();
        let frames = 0;
        
        const checkFPS = function() {
            const currentTime = performance.now();
            frames = frames + 1;
            
            if (currentTime >= lastTime + 1000) {
                const fps = Math.round((frames * 1000) / (currentTime - lastTime));
                
                if (fps < 30) {
                    Logger.warn(`Низкий FPS: ${fps}`);
                }
                
                frames = 0;
                lastTime = currentTime;
            }
            
            window.requestAnimationFrame(checkFPS);
        };
        
        window.requestAnimationFrame(checkFPS);
    },
    
    /**
     * Инициализирует мониторинг сетевого соединения
     */
    initConnectionMonitoring: function() {
        // Определяем тип соединения
        if (navigator.connection) {
            window.APP_STATE.connectionType = navigator.connection.effectiveType;
            
            navigator.connection.addEventListener('change', function() {
                window.APP_STATE.connectionType = navigator.connection.effectiveType;
                Logger.info(`Изменен тип соединения: ${window.APP_STATE.connectionType}`);
            });
        }
        
        // Мониторинг онлайн/оффлайн статуса
        window.addEventListener('online', function() {
            window.APP_STATE.isOnline = true;
            Logger.info('Устройство онлайн');
        });
        
        window.addEventListener('offline', function() {
            window.APP_STATE.isOnline = false;
            Logger.warn('Устройство оффлайн');
        });
    },
    
    /**
     * Собирает и возвращает метрики производительности
     */
    getMetrics: function() {
        return {
            timestamp: Date.now(),
            isOnline: window.APP_STATE.isOnline,
            isMobile: window.APP_STATE.isMobile,
            connectionType: window.APP_STATE.connectionType,
            pendingRequests: window.APP_STATE.pendingRequests,
            errorCount: window.APP_STATE.errorCount,
            performance: window.APP_STATE.performanceMetrics
        };
    }
};

// ==============================================
// МОДУЛЬ УПРАВЛЕНИЯ СОСТОЯНИЕМ
// ==============================================

window.StateManager = {
    /**
     * Проверяет соединение с API
     */
    checkApiConnection: async function() {
        Logger.info('Проверка соединения с API');
        
        try {
            const response = await window.NetworkManager.request('/api/health');
            
            if (response && (response.status === 'healthy' || response.offline)) {
                window.APP_STATE.isOnline = true;
                this.updateConnectionStatus('connected', response.offline ? 'Офлайн режим' : 'Sparkcoin API');
                
                Logger.info('API доступно');
                return true;
            }
        } catch (error) {
            window.APP_STATE.isOnline = false;
            this.updateConnectionStatus('disconnected', 'Офлайн режим');
            
            Logger.warn('API недоступно');
        }
        
        return false;
    },
    
    /**
     * Обновляет статус соединения в интерфейсе
     */
    updateConnectionStatus: function(status, message) {
        window.requestAnimationFrame(function() {
            const apiStatus = document.getElementById('apiStatus');
            if (apiStatus) {
                apiStatus.className = `api-status ${status}`;
                apiStatus.textContent = `API: ${message}`;
            }
        });
    },
    
    /**
     * Инициализирует Service Worker для оффлайн работы
     */
    initServiceWorker: function() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
                navigator.serviceWorker.register('/service-worker.js').then(function(registration) {
                    Logger.info('Service Worker зарегистрирован', registration.scope);
                }).catch(function(error) {
                    Logger.error('Ошибка регистрации Service Worker', error);
                });
            });
        }
    },
    
    /**
     * Инициализирует все системы
     */
    init: function() {
        Logger.info('Инициализация StateManager');
        
        // Инициализируем Service Worker
        this.initServiceWorker();
        
        // Проверяем соединение
        this.checkApiConnection();
        
        // Инициализируем мониторинг производительности
        if (window.PerformanceMonitor && window.PerformanceMonitor.init) {
            window.PerformanceMonitor.init();
        }
        
        // Устанавливаем периодические задачи
        this.setupPeriodicTasks();
        
        Logger.info('StateManager инициализирован');
    },
    
    /**
     * Устанавливает периодические задачи
     */
    setupPeriodicTasks: function() {
        // Периодическая проверка соединения
        setInterval(function() {
            window.StateManager.checkApiConnection();
        }, 60000);
        
        // Периодическая синхронизация данных
        setInterval(function() {
            if (window.DataSyncManager && window.DataSyncManager.syncUserData) {
                window.DataSyncManager.syncUserData();
            }
        }, 300000); // Каждые 5 минут
        
        // Очистка старых кэшей
        setInterval(function() {
            window.StateManager.cleanupOldCaches();
        }, 3600000); // Каждый час
    },
    
    /**
     * Очищает старые кэши
     */
    cleanupOldCaches: function() {
        const now = Date.now();
        const cachePrefix = 'cache_';
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key.startsWith(cachePrefix)) {
                try {
                    const cacheData = JSON.parse(localStorage.getItem(key));
                    
                    if (now - cacheData.timestamp > window.CONFIG.CACHE_TTL * 2) {
                        localStorage.removeItem(key);
                        Logger.debug(`Удален старый кэш: ${key}`);
                    }
                } catch (error) {
                    // Удаляем битый кэш
                    localStorage.removeItem(key);
                }
            }
        }
    }
};

// ==============================================
// УТИЛИТЫ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==============================================

/**
 * Показывает уведомление пользователю
 */
if (typeof window.showNotification === 'undefined') {
    window.showNotification = function(message, type, duration) {
        const notificationType = type || 'info';
        const notificationDuration = duration || 3000;
        
        Logger.info(`Показано уведомление: ${message}`, { type: notificationType });
        
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `notification ${notificationType}`;
        
        // Определяем иконку для типа уведомления
        let icon;
        if (notificationType === 'success') {
            icon = '✅';
        } else if (notificationType === 'error') {
            icon = '❌';
        } else if (notificationType === 'warning') {
            icon = '⚠️';
        } else {
            icon = 'ℹ️';
        }
        
        notification.innerHTML = `
            <h4>${icon} ${notificationType.charAt(0).toUpperCase() + notificationType.slice(1)}</h4>
            <p>${message}</p>
        `;
        
        // Добавляем стили для мобильных устройств
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 300px;
            transform: translateX(150%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Показываем с анимацией
        window.requestAnimationFrame(function() {
            window.requestAnimationFrame(function() {
                notification.style.transform = 'translateX(0)';
            });
        });
        
        // Автоматически скрываем через указанное время
        setTimeout(function() {
            notification.style.transform = 'translateX(150%)';
            
            setTimeout(function() {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, notificationDuration);
    };
}

/**
 * Вычисляет силу клика
 */
if (typeof window.calculateClickPower === 'undefined') {
    window.calculateClickPower = function() {
        let power = 0.000000001;
        
        if (window.upgrades) {
            for (const key in window.upgrades) {
                if (key.startsWith('mouse')) {
                    const level = window.upgrades[key] ? 
                        (window.upgrades[key].level || window.upgrades[key]) : 0;
                    
                    if (window.UPGRADES && window.UPGRADES[key] && window.UPGRADES[key].baseBonus) {
                        power = power + (level * window.UPGRADES[key].baseBonus);
                    }
                }
            }
        }
        
        return power;
    };
}

/**
 * Вычисляет скорость майнинга
 */
if (typeof window.calculateMiningSpeed === 'undefined') {
    window.calculateMiningSpeed = function() {
        let speed = 0.000000000;
        
        if (window.upgrades) {
            for (const key in window.upgrades) {
                if (key.startsWith('gpu') || key.startsWith('cpu')) {
                    const level = window.upgrades[key] ? 
                        (window.upgrades[key].level || window.upgrades[key]) : 0;
                    
                    if (window.UPGRADES && window.UPGRADES[key] && window.UPGRADES[key].baseBonus) {
                        speed = speed + (level * window.UPGRADES[key].baseBonus);
                    }
                }
            }
        }
        
        return speed;
    };
}

/**
 * Сохраняет данные пользователя
 */
if (typeof window.saveUserData === 'undefined') {
    window.saveUserData = function() {
        try {
            if (!window.userData) {
                return;
            }
            
            window.userData.lastUpdate = Date.now();
            localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
            
            // Сохраняем улучшения
            if (window.upgrades) {
                const upgradesData = {};
                
                for (const key in window.upgrades) {
                    if (window.upgrades[key] && window.upgrades[key].level !== undefined) {
                        upgradesData[key] = window.upgrades[key].level;
                    } else if (typeof window.upgrades[key] === 'number') {
                        upgradesData[key] = window.upgrades[key];
                    }
                }
                
                localStorage.setItem('sparkcoin_upgrades_' + window.userData.userId, JSON.stringify(upgradesData));
            }
            
            Logger.debug('Данные пользователя сохранены');
        } catch (error) {
            Logger.error('Ошибка сохранения данных пользователя', error);
        }
    };
}

/**
 * Генерирует уникальный ID устройства
 */
if (typeof window.generateDeviceId === 'undefined') {
    window.generateDeviceId = function() {
        let deviceId = localStorage.getItem('sparkcoin_device_id');
        
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('sparkcoin_device_id', deviceId);
            Logger.debug(`Сгенерирован новый Device ID: ${deviceId}`);
        }
        
        return deviceId;
    };
}

// ==============================================
// ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
// ==============================================

/**
 * Инициализирует приложение после загрузки DOM
 */
document.addEventListener('DOMContentLoaded', function() {
    Logger.info('DOM загружен, инициализация приложения');
    
    // Инициализируем StateManager
    if (window.StateManager && window.StateManager.init) {
        window.StateManager.init();
    }
    
    // Инициализируем базовые функции если они не определены
    if (typeof window.updateUI === 'undefined') {
        window.updateUI = function() {
            if (window.DataSyncManager && window.DataSyncManager.updateUI) {
                window.DataSyncManager.updateUI();
            }
        };
    }
    
    Logger.info('Приложение инициализировано');
});

/**
 * Глобальная функция для совместимости с существующим кодом
 */
window.apiRequest = window.NetworkManager.request;

/**
 * Экспортируем основные функции для глобального использования
 */
window.syncPlayerDataWithAPI = window.DataSyncManager.syncUserData;
window.loadAllPlayers = window.DataManager.loadAllPlayers;
window.loadLeaderboard = window.DataManager.loadLeaderboard;
window.loadTopWinners = window.DataManager.loadTopWinners;
window.loadLotteryStatus = window.DataManager.loadLotteryStatus;
window.loadClassicLotteryStatus = window.DataManager.loadClassicLotteryStatus;
window.loadReferralStats = window.DataManager.loadReferralStats;
window.placeLotteryBet = window.OperationsManager.placeLotteryBet;
window.placeClassicLotteryBet = window.OperationsManager.placeClassicLotteryBet;
window.performTransfer = window.OperationsManager.performTransfer;
window.checkApiConnection = window.StateManager.checkApiConnection;
window.updateApiStatus = window.StateManager.updateConnectionStatus;

Logger.info('Мобильная версия API Sparkcoin загружена и оптимизирована');
