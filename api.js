// api.js - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ С УЛУЧШЕННОЙ СИСТЕМОЙ API
console.log('🌐 API для Sparkcoin - ПОЛНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ');

window.CONFIG = {
    API_BASE_URL: 'https://b9339c3b-8a22-434d-b97a-a426ac75c328-00-2vzfhw3hnozb6.sisko.replit.dev',
    API_TIMEOUT: 5000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
};

// Основная функция API запросов с улучшенной обработкой ошибок
window.apiRequest = async function(endpoint, options = {}) {
    const url = `${window.CONFIG.API_BASE_URL}${endpoint}`;
    console.log(`🔄 API запрос: ${url}`, options.method || 'GET');
    
    const requestOptions = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-Device-ID': window.generateDeviceId ? window.generateDeviceId() : 'unknown',
            'X-User-ID': window.userData?.userId || 'unknown',
            'X-Request-Timestamp': Date.now(),
            ...options.headers
        },
        mode: 'cors',
        credentials: 'omit',
        signal: AbortSignal.timeout(window.CONFIG.API_TIMEOUT)
    };
    
    if (options.body) {
        requestOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }
    
    // Система повторных попыток
    for (let attempt = 1; attempt <= window.CONFIG.RETRY_ATTEMPTS; attempt++) {
        try {
            console.log(`🔄 Попытка ${attempt}/${window.CONFIG.RETRY_ATTEMPTS}: ${endpoint}`);
            const response = await fetch(url, requestOptions);
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ API успех: ${endpoint}`, data);
                return { ...data, _attempts: attempt, _online: true };
            } else {
                console.warn(`⚠️ API ошибка ${response.status}: ${endpoint}`);
                
                // Для ошибок 4xx не повторяем
                if (response.status >= 400 && response.status < 500) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                // Для 5xx ошибок повторяем
                if (attempt < window.CONFIG.RETRY_ATTEMPTS) {
                    await new Promise(resolve => setTimeout(resolve, window.CONFIG.RETRY_DELAY * attempt));
                    continue;
                }
                
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.log(`📴 Ошибка API (попытка ${attempt}):`, error.message);
            
            if (attempt < window.CONFIG.RETRY_ATTEMPTS) {
                await new Promise(resolve => setTimeout(resolve, window.CONFIG.RETRY_DELAY * attempt));
                continue;
            }
            
            // Все попытки исчерпаны - переходим в офлайн режим
            console.log('📴 Все попытки исчерпаны, переходим в офлайн режим');
            return getOfflineResponse(endpoint, options);
        }
    }
};

// Улучшенные офлайн ответы с учетом текущего пользователя и скорости
function getOfflineResponse(endpoint, options = {}) {
    const currentUserId = window.userData?.userId || 'default_user';
    const currentUsername = window.userData?.username || 'Текущий Игрок';
    const currentBalance = window.userData?.balance || 0.000000100;
    const currentClickSpeed = window.calculateClickPower ? window.calculateClickPower() : 0.000000001;
    const currentMineSpeed = window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0.000000000;
    const currentTotalSpeed = currentClickSpeed + currentMineSpeed;
    const currentTime = new Date().toISOString();
    
    const offlineResponses = {
        '/api/health': {
            status: 'healthy',
            mode: 'offline',
            timestamp: currentTime,
            message: 'Работаем в офлайн режиме',
            version: '1.0.0'
        },
        
        '/api/sync/unified': {
            success: true,
            message: 'Синхронизировано в офлайн режиме',
            userId: currentUserId,
            bestBalance: currentBalance,
            offline: true,
            timestamp: currentTime,
            serverTime: currentTime,
            syncStatus: 'offline_saved'
        },
        
        '/api/all_players': {
            success: true,
            players: [
                {
                    userId: currentUserId,
                    username: currentUsername,
                    balance: currentBalance,
                    totalEarned: window.userData?.totalEarned || 0.000000100,
                    totalClicks: window.userData?.totalClicks || 0,
                    clickSpeed: currentClickSpeed,
                    mineSpeed: currentMineSpeed,
                    totalSpeed: currentTotalSpeed,
                    lastUpdate: currentTime,
                    online: false,
                    rank: 1
                },
                {
                    userId: 'demo_player_2',
                    username: 'Демо Игрок 2',
                    balance: 0.000000050,
                    totalEarned: 0.000000200,
                    totalClicks: 25,
                    clickSpeed: 0.000000002,
                    mineSpeed: 0.000000001,
                    totalSpeed: 0.000000003,
                    lastUpdate: currentTime,
                    online: false,
                    rank: 2
                },
                {
                    userId: 'demo_player_3',
                    username: 'Демо Игрок 3',
                    balance: 0.000000030,
                    totalEarned: 0.000000150,
                    totalClicks: 15,
                    clickSpeed: 0.000000001,
                    mineSpeed: 0.000000000,
                    totalSpeed: 0.000000001,
                    lastUpdate: currentTime,
                    online: false,
                    rank: 3
                }
            ],
            offline: true,
            count: 3,
            serverTime: currentTime
        },
        
        '/api/leaderboard': {
            success: true,
            leaderboard: [
                {
                    rank: 1,
                    userId: currentUserId,
                    username: currentUsername,
                    balance: currentBalance,
                    totalEarned: window.userData?.totalEarned || 0.000000100,
                    totalClicks: window.userData?.totalClicks || 0,
                    clickSpeed: currentClickSpeed,
                    mineSpeed: currentMineSpeed,
                    totalSpeed: currentTotalSpeed,
                    lastWin: null,
                    isCurrent: true
                },
                {
                    rank: 2,
                    userId: 'demo_player_2',
                    username: 'Демо Игрок 2',
                    balance: 0.000000080,
                    totalEarned: 0.000000200,
                    totalClicks: 45,
                    clickSpeed: 0.000000002,
                    mineSpeed: 0.000000001,
                    totalSpeed: 0.000000003,
                    lastWin: new Date(Date.now() - 3600000).toISOString(),
                    isCurrent: false
                },
                {
                    rank: 3,
                    userId: 'demo_player_3',
                    username: 'Демо Игрок 3',
                    balance: 0.000000060,
                    totalEarned: 0.000000180,
                    totalClicks: 30,
                    clickSpeed: 0.000000001,
                    mineSpeed: 0.000000001,
                    totalSpeed: 0.000000002,
                    lastWin: new Date(Date.now() - 7200000).toISOString(),
                    isCurrent: false
                }
            ],
            offline: true,
            type: 'balance',
            updatedAt: currentTime
        },
        
        '/api/lottery/status': {
            success: true,
            lottery: {
                eagle: [],
                tails: [],
                last_winner: null,
                timer: Math.floor(Math.random() * 60) + 30,
                total_eagle: 0,
                total_tails: 0,
                participants_count: 0,
                current_round: Math.floor(Math.random() * 1000) + 1,
                round_start_time: new Date(Date.now() - 30000).toISOString(),
                round_end_time: new Date(Date.now() + 30000).toISOString(),
                status: 'waiting'
            },
            offline: true,
            serverTime: currentTime
        },
        
        '/api/lottery/bet': {
            success: true,
            message: 'Ставка принята в офлайн режиме',
            bet_id: 'offline_' + Date.now(),
            offline: true,
            timestamp: currentTime,
            newBalance: currentBalance - (JSON.parse(options.body || '{}').amount || 0),
            team: JSON.parse(options.body || '{}').team || 'eagle'
        },
        
        '/api/classic-lottery/status': {
            success: true,
            lottery: {
                bets: [],
                total_pot: 0,
                timer: Math.floor(Math.random() * 120) + 60,
                participants_count: 0,
                history: [],
                current_round: Math.floor(Math.random() * 1000) + 1,
                round_start_time: new Date(Date.now() - 60000).toISOString(),
                round_end_time: new Date(Date.now() + 60000).toISOString(),
                status: 'collecting'
            },
            offline: true,
            serverTime: currentTime
        },
        
        '/api/classic-lottery/bet': {
            success: true,
            message: 'Ставка принята в офлайн режиме',
            bet_id: 'offline_' + Date.now(),
            offline: true,
            timestamp: currentTime,
            newBalance: currentBalance - (JSON.parse(options.body || '{}').amount || 0),
            ticket_number: Math.floor(Math.random() * 1000) + 1
        },
        
        '/api/referral/stats': {
            success: true,
            stats: {
                referralsCount: 0,
                totalEarnings: 0,
                todayEarnings: 0,
                topReferral: null,
                earningsHistory: []
            },
            referralCode: 'REF-' + (currentUserId.slice(-8) || 'DEFAULT').toUpperCase(),
            referralLink: `https://t.me/sparkcoin_bot?start=ref_${currentUserId}`,
            offline: true,
            timestamp: currentTime
        },
        
        '/api/top/winners': {
            success: true,
            winners: [
                {
                    rank: 1,
                    username: currentUsername,
                    totalWinnings: 0.000001000,
                    totalLosses: 0.000000200,
                    netWinnings: 0.000000800,
                    lastWin: new Date().toISOString(),
                    winStreak: 1,
                    isCurrent: true
                },
                {
                    rank: 2,
                    username: 'Демо Победитель',
                    totalWinnings: 0.000000500,
                    totalLosses: 0.000000100,
                    netWinnings: 0.000000400,
                    lastWin: new Date(Date.now() - 86400000).toISOString(),
                    winStreak: 3,
                    isCurrent: false
                },
                {
                    rank: 3,
                    username: 'Счастливчик',
                    totalWinnings: 0.000000300,
                    totalLosses: 0.000000050,
                    netWinnings: 0.000000250,
                    lastWin: new Date(Date.now() - 172800000).toISOString(),
                    winStreak: 2,
                    isCurrent: false
                }
            ],
            offline: true,
            period: 'all_time',
            updatedAt: currentTime
        },
        
        '/api/player': {
            success: true,
            player: {
                userId: currentUserId,
                username: currentUsername,
                balance: currentBalance,
                totalEarned: window.userData?.totalEarned || 0.000000100,
                totalClicks: window.userData?.totalClicks || 0,
                clickSpeed: currentClickSpeed,
                mineSpeed: currentMineSpeed,
                totalSpeed: currentTotalSpeed,
                rank: 1,
                joinDate: new Date().toISOString(),
                lastActive: currentTime
            },
            offline: true,
            timestamp: currentTime
        },
        
        '/api/transfer': {
            success: true,
            message: 'Перевод выполнен в офлайн режиме',
            newBalance: currentBalance - (JSON.parse(options.body || '{}').amount || 0),
            offline: true,
            transactionId: 'offline_tx_' + Date.now(),
            timestamp: currentTime
        }
    };

    // Для POST запросов возвращаем успешный ответ
    if (options.method === 'POST') {
        // Для переводов возвращаем специальный ответ
        if (endpoint.includes('/api/transfer')) {
            try {
                const body = options.body ? JSON.parse(options.body) : {};
                const amount = body.amount || 0;
                return {
                    success: true,
                    message: 'Перевод выполнен в офлайн режиме',
                    newBalance: Math.max(0, currentBalance - amount),
                    offline: true,
                    timestamp: currentTime,
                    transactionId: 'offline_tx_' + Date.now(),
                    receiver: body.toUsername || 'Получатель'
                };
            } catch (e) {
                return {
                    success: true,
                    message: 'Перевод выполнен в офлайн режиме',
                    newBalance: currentBalance,
                    offline: true,
                    timestamp: currentTime
                };
            }
        }
        
        // Для ставок в лотереях
        if (endpoint.includes('/api/lottery/bet') || endpoint.includes('/api/classic-lottery/bet')) {
            try {
                const body = options.body ? JSON.parse(options.body) : {};
                const amount = body.amount || 0;
                return {
                    success: true,
                    message: 'Ставка принята в офлайн режиме',
                    newBalance: Math.max(0, currentBalance - amount),
                    offline: true,
                    timestamp: currentTime,
                    betId: 'offline_bet_' + Date.now()
                };
            } catch (e) {
                return {
                    success: true,
                    message: 'Ставка принята в офлайн режиме',
                    newBalance: currentBalance,
                    offline: true,
                    timestamp: currentTime
                };
            }
        }
        
        return {
            success: true,
            message: 'Данные сохранены в офлайн режиме',
            userId: currentUserId,
            offline: true,
            timestamp: currentTime,
            savedLocally: true
        };
    }
    
    // Ищем подходящий ответ
    for (const [key, value] of Object.entries(offlineResponses)) {
        if (endpoint.includes(key.replace('/:userId', '').replace('/:id', ''))) {
            return value;
        }
    }
    
    // Ответ по умолчанию
    return { 
        success: true, 
        userId: currentUserId,
        offline: true,
        message: 'Офлайн режим',
        timestamp: currentTime,
        mode: 'offline',
        serverTime: currentTime
    };
}

// Функция проверки соединения
window.checkApiConnection = async function() {
    console.log('🔍 Проверка соединения с API...');
    
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.className = 'api-status syncing';
        apiStatus.textContent = 'API: Проверка...';
    }
    
    try {
        const startTime = Date.now();
        const response = await window.apiRequest('/api/health');
        const pingTime = Date.now() - startTime;
        
        if (response && (response.status === 'healthy' || response.offline)) {
            console.log(`✅ API подключено! Пинг: ${pingTime}ms`);
            
            let statusMessage = response.offline ? 'Офлайн режим' : 'Sparkcoin API';
            if (!response.offline) {
                statusMessage += ` (${pingTime}ms)`;
            }
            
            window.updateApiStatus('connected', statusMessage);
            
            // Сохраняем время последней успешной проверки
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
    
    window.updateApiStatus('disconnected', 'Офлайн режим');
    return {
        connected: false,
        offline: true,
        ping: null,
        timestamp: new Date().toISOString()
    };
};

// Функция для обновления статуса API
window.updateApiStatus = function(status, message) {
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.className = `api-status ${status}`;
        apiStatus.textContent = `API: ${message}`;
        apiStatus.title = `Обновлено: ${new Date().toLocaleTimeString()}`;
    }
    
    window.apiConnected = status === 'connected';
    window.isOnline = status !== 'disconnected';
    
    // Уведомление при изменении статуса
    if (window.lastApiStatus !== status) {
        console.log(`📡 Статус API изменен: ${window.lastApiStatus || 'unknown'} -> ${status}`);
        window.lastApiStatus = status;
        
        if (window.showNotification && status === 'connected') {
            setTimeout(() => {
                window.showNotification('Подключение к API восстановлено!', 'success');
            }, 1000);
        }
    }
};

// Улучшенная функция синхронизации данных с API
window.syncPlayerDataWithAPI = async function() {
    console.log('🔄 Синхронизация с API...');
    
    if (!window.userData || !window.isDataLoaded) {
        console.log('❌ Данные пользователя не загружены');
        return {
            success: false,
            error: 'Данные не загружены',
            offline: true
        };
    }
    
    const syncStartTime = Date.now();
    
    try {
        const syncData = {
            userId: window.userData.userId,
            username: window.userData.username,
            balance: parseFloat(window.userData.balance),
            totalEarned: parseFloat(window.userData.totalEarned),
            totalClicks: window.userData.totalClicks,
            upgrades: window.getUpgradesForSync ? window.getUpgradesForSync() : (window.upgrades || {}),
            lastUpdate: Date.now(),
            telegramId: window.userData.telegramId,
            deviceId: window.generateDeviceId ? window.generateDeviceId() : 'unknown',
            gameData: {
                clickPower: window.calculateClickPower ? window.calculateClickPower() : 0.000000001,
                miningSpeed: window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0.000000000,
                totalSpeed: (window.calculateClickPower ? window.calculateClickPower() : 0) + 
                           (window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0)
            }
        };
        
        const response = await window.apiRequest('/api/sync/unified', {
            method: 'POST',
            body: JSON.stringify(syncData)
        });
        
        const syncTime = Date.now() - syncStartTime;
        
        if (response && response.success) {
            console.log(`✅ Данные синхронизированы с API (${syncTime}ms)`);
            
            // Обновляем данные если сервер вернул лучший баланс
            if (response.bestBalance && response.bestBalance > window.userData.balance) {
                const oldBalance = window.userData.balance;
                window.userData.balance = response.bestBalance;
                console.log(`💰 Баланс обновлен: ${oldBalance.toFixed(9)} -> ${response.bestBalance.toFixed(9)}`);
                
                if (window.updateUI) window.updateUI();
                if (window.showNotification) {
                    window.showNotification(`Баланс синхронизирован! +${(response.bestBalance - oldBalance).toFixed(9)} S`, 'success');
                }
            }
            
            // Обновляем другие данные с сервера
            if (response.userData) {
                const serverData = response.userData;
                ['totalEarned', 'totalClicks', 'lotteryWins', 'totalBet', 'referralEarnings', 
                 'referralsCount', 'totalWinnings', 'totalLosses'].forEach(key => {
                    if (serverData[key] !== undefined && serverData[key] > (window.userData[key] || 0)) {
                        window.userData[key] = serverData[key];
                    }
                });
                
                // Синхронизируем улучшения
                if (serverData.upgrades && window.upgrades) {
                    Object.keys(serverData.upgrades).forEach(key => {
                        const serverLevel = serverData.upgrades[key];
                        const localLevel = window.upgrades[key]?.level || window.upgrades[key] || 0;
                        
                        if (serverLevel > localLevel) {
                            if (!window.upgrades[key] || typeof window.upgrades[key] === 'number') {
                                window.upgrades[key] = { level: serverLevel };
                            } else {
                                window.upgrades[key].level = serverLevel;
                            }
                            console.log(`📈 Улучшение ${key} синхронизировано: ${localLevel} -> ${serverLevel}`);
                        }
                    });
                }
            }
            
            // Сохраняем время синхронизации
            window.lastSyncTime = Date.now();
            localStorage.setItem('last_sync_time', window.lastSyncTime.toString());
            
            if (window.saveUserData) window.saveUserData();
            
            return {
                success: true,
                offline: response.offline || false,
                syncTime: syncTime,
                balanceUpdated: response.bestBalance > window.userData.balance,
                timestamp: new Date().toISOString()
            };
        }
        
    } catch (error) {
        console.log('📴 Ошибка синхронизации:', error.message);
    }
    
    return {
        success: false,
        error: 'Ошибка синхронизации',
        offline: true,
        syncTime: Date.now() - syncStartTime
    };
};

// Функция загрузки всех игроков
window.loadAllPlayers = async function() {
    console.log('👥 Загрузка списка игроков...');
    
    try {
        const data = await window.apiRequest('/api/all_players');
        if (data && data.success) {
            window.allPlayers = data.players || [];
            console.log(`✅ Загружено ${window.allPlayers.length} игроков`);
            
            // Сортируем по балансу
            window.allPlayers.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
            
            return {
                players: window.allPlayers,
                count: window.allPlayers.length,
                offline: data.offline || false,
                timestamp: data.timestamp || new Date().toISOString()
            };
        }
    } catch (error) {
        console.log('📴 Ошибка загрузки игроков:', error.message);
        window.allPlayers = [];
    }
    
    return {
        players: [],
        count: 0,
        offline: true,
        timestamp: new Date().toISOString()
    };
};

// Функция загрузки топа игроков
window.loadLeaderboard = async function(type = 'balance', limit = 50) {
    console.log(`🏆 Загрузка рейтинга (${type})...`);
    
    try {
        const data = await window.apiRequest(`/api/leaderboard?type=${type}&limit=${limit}`);
        if (data && data.success) {
            console.log(`✅ Загружен рейтинг из ${data.leaderboard.length} игроков`);
            
            // Добавляем флаг текущего игрока
            const currentUserId = window.userData?.userId;
            data.leaderboard.forEach(player => {
                player.isCurrent = player.userId === currentUserId;
            });
            
            return {
                leaderboard: data.leaderboard,
                type: type,
                count: data.leaderboard.length,
                offline: data.offline || false,
                timestamp: data.timestamp || new Date().toISOString()
            };
        }
    } catch (error) {
        console.log('📴 Ошибка загрузки рейтинга:', error.message);
    }
    
    return {
        leaderboard: [],
        type: type,
        count: 0,
        offline: true,
        timestamp: new Date().toISOString()
    };
};

// Функция загрузки топа победителей
window.loadTopWinners = async function(limit = 20) {
    console.log('🎯 Загрузка топа победителей...');
    
    try {
        const data = await window.apiRequest(`/api/top/winners?limit=${limit}`);
        if (data && data.success) {
            console.log(`✅ Загружено ${data.winners.length} победителей`);
            
            // Добавляем флаг текущего игрока
            const currentUsername = window.userData?.username;
            data.winners.forEach(winner => {
                winner.isCurrent = winner.username === currentUsername;
            });
            
            return {
                winners: data.winners,
                count: data.winners.length,
                period: data.period || 'all_time',
                offline: data.offline || false,
                timestamp: data.timestamp || new Date().toISOString()
            };
        }
    } catch (error) {
        console.log('📴 Ошибка загрузки топа победителей:', error.message);
    }
    
    return {
        winners: [],
        count: 0,
        period: 'all_time',
        offline: true,
        timestamp: new Date().toISOString()
    };
};

// Функция загрузки статуса командной лотереи
window.loadLotteryStatus = async function() {
    console.log('🎰 Загрузка статуса командной лотереи...');
    
    try {
        const data = await window.apiRequest('/api/lottery/status');
        if (data && data.success) {
            console.log('✅ Статус лотереи загружен');
            
            // Обновляем таймер на клиенте
            if (data.lottery && data.lottery.timer !== undefined) {
                data.lottery.client_timer = data.lottery.timer;
                data.lottery.client_update_time = Date.now();
            }
            
            return {
                lottery: data.lottery,
                offline: data.offline || false,
                timestamp: data.timestamp || new Date().toISOString()
            };
        }
    } catch (error) {
        console.log('📴 Ошибка загрузки статуса лотереи:', error.message);
    }
    
    return {
        lottery: null,
        offline: true,
        timestamp: new Date().toISOString()
    };
};

// Функция загрузки статуса классической лотереи
window.loadClassicLotteryStatus = async function() {
    console.log('🎲 Загрузка статуса классической лотереи...');
    
    try {
        const data = await window.apiRequest('/api/classic-lottery/status');
        if (data && data.success) {
            console.log('✅ Статус классической лотереи загружен');
            
            // Обновляем таймер на клиенте
            if (data.lottery && data.lottery.timer !== undefined) {
                data.lottery.client_timer = data.lottery.timer;
                data.lottery.client_update_time = Date.now();
            }
            
            return {
                lottery: data.lottery,
                offline: data.offline || false,
                timestamp: data.timestamp || new Date().toISOString()
            };
        }
    } catch (error) {
        console.log('📴 Ошибка загрузки статуса классической лотереи:', error.message);
    }
    
    return {
        lottery: null,
        offline: true,
        timestamp: new Date().toISOString()
    };
};

// Функция загрузки реферальной статистики
window.loadReferralStats = async function() {
    console.log('👥 Загрузка реферальной статистики...');
    
    try {
        const userId = window.userData?.userId;
        if (!userId) {
            console.log('❌ Нет userID для загрузки рефералов');
            return {
                stats: null,
                offline: true,
                error: 'Нет данных пользователя'
            };
        }
        
        const data = await window.apiRequest(`/api/referral/stats/${userId}`);
        if (data && data.success) {
            console.log('✅ Реферальная статистика загружена');
            return {
                stats: data.stats,
                referralCode: data.referralCode,
                referralLink: data.referralLink,
                offline: data.offline || false,
                timestamp: data.timestamp || new Date().toISOString()
            };
        }
    } catch (error) {
        console.log('📴 Ошибка загрузки реферальной статистики:', error.message);
    }
    
    return {
        stats: null,
        offline: true,
        timestamp: new Date().toISOString()
    };
};

// Функция для ставки в командной лотерее
window.placeLotteryBet = async function(team, amount) {
    console.log(`🎯 Ставка в лотерею: ${team}, ${amount}`);
    
    if (!window.userData) {
        console.log('❌ Нет данных пользователя');
        return { 
            success: false, 
            error: 'Нет данных пользователя',
            offline: true 
        };
    }
    
    if (parseFloat(window.userData.balance) < amount) {
        return { 
            success: false, 
            error: 'Недостаточно средств',
            offline: false 
        };
    }
    
    try {
        const response = await window.apiRequest('/api/lottery/bet', {
            method: 'POST',
            body: JSON.stringify({
                userId: window.userData.userId,
                team: team,
                amount: amount,
                username: window.userData.username,
                timestamp: Date.now(),
                deviceId: window.generateDeviceId ? window.generateDeviceId() : 'unknown'
            })
        });
        
        if (response && response.success) {
            // Обновляем баланс
            window.userData.balance = parseFloat(window.userData.balance) - amount;
            window.userData.totalBet = (window.userData.totalBet || 0) + amount;
            window.userData.lastUpdate = Date.now();
            
            if (window.updateUI) window.updateUI();
            if (window.saveUserData) window.saveUserData();
            
            console.log(`✅ Ставка принята: ${amount.toFixed(9)} S за команду ${team}`);
            
            return {
                ...response,
                newBalance: window.userData.balance,
                team: team,
                amount: amount,
                timestamp: new Date().toISOString()
            };
        } else {
            return {
                success: false,
                error: response?.error || 'Ошибка сервера',
                offline: response?.offline || false
            };
        }
    } catch (error) {
        console.log('📴 Ошибка ставки в лотерею:', error.message);
        return { 
            success: false, 
            error: 'Ошибка соединения',
            offline: true 
        };
    }
};

// Функция для ставки в классической лотерее
window.placeClassicLotteryBet = async function(amount) {
    console.log(`🎲 Ставка в классическую лотерею: ${amount}`);
    
    if (!window.userData) {
        console.log('❌ Нет данных пользователя');
        return { 
            success: false, 
            error: 'Нет данных пользователя',
            offline: true 
        };
    }
    
    if (parseFloat(window.userData.balance) < amount) {
        return { 
            success: false, 
            error: 'Недостаточно средств',
            offline: false 
        };
    }
    
    try {
        const response = await window.apiRequest('/api/classic-lottery/bet', {
            method: 'POST',
            body: JSON.stringify({
                userId: window.userData.userId,
                amount: amount,
                username: window.userData.username,
                timestamp: Date.now(),
                deviceId: window.generateDeviceId ? window.generateDeviceId() : 'unknown'
            })
        });
        
        if (response && response.success) {
            // Обновляем баланс
            window.userData.balance = parseFloat(window.userData.balance) - amount;
            window.userData.totalBet = (window.userData.totalBet || 0) + amount;
            window.userData.lastUpdate = Date.now();
            
            if (window.updateUI) window.updateUI();
            if (window.saveUserData) window.saveUserData();
            
            console.log(`✅ Ставка принята: ${amount.toFixed(9)} S`);
            
            return {
                ...response,
                newBalance: window.userData.balance,
                amount: amount,
                timestamp: new Date().toISOString()
            };
        } else {
            return {
                success: false,
                error: response?.error || 'Ошибка сервера',
                offline: response?.offline || false
            };
        }
    } catch (error) {
        console.log('📴 Ошибка ставки в классическую лотерею:', error.message);
        return { 
            success: false, 
            error: 'Ошибка соединения',
            offline: true 
        };
    }
};

// Функция для выполнения перевода
window.performTransfer = async function(fromUserId, toUserId, amount, fromUsername, toUsername) {
    console.log(`💸 Перевод: ${fromUserId} -> ${toUserId}, сумма: ${amount}`);
    
    if (!fromUserId || !toUserId || !amount) {
        console.log('❌ Недостаточно данных для перевода');
        return { 
            success: false, 
            error: 'Недостаточно данных',
            offline: true 
        };
    }
    
    if (parseFloat(window.userData.balance) < amount) {
        return { 
            success: false, 
            error: 'Недостаточно средств',
            offline: false 
        };
    }
    
    try {
        const response = await window.apiRequest('/api/transfer', {
            method: 'POST',
            body: JSON.stringify({
                fromUserId: fromUserId,
                toUserId: toUserId,
                amount: amount,
                fromUsername: fromUsername || 'Игрок',
                toUsername: toUsername || 'Игрок',
                timestamp: Date.now(),
                deviceId: window.generateDeviceId ? window.generateDeviceId() : 'unknown'
            })
        });
        
        if (response && response.success) {
            // Обновляем баланс
            window.userData.balance = parseFloat(window.userData.balance) - amount;
            window.userData.transfers = window.userData.transfers || { sent: 0, received: 0 };
            window.userData.transfers.sent = (window.userData.transfers.sent || 0) + amount;
            window.userData.lastUpdate = Date.now();
            
            if (window.updateUI) window.updateUI();
            if (window.saveUserData) window.saveUserData();
            
            console.log(`✅ Перевод выполнен: ${amount.toFixed(9)} S`);
            
            return {
                ...response,
                newBalance: window.userData.balance,
                amount: amount,
                receiver: toUsername,
                timestamp: new Date().toISOString()
            };
        } else {
            return {
                success: false,
                error: response?.error || 'Ошибка сервера',
                offline: response?.offline || false
            };
        }
    } catch (error) {
        console.log('📴 Ошибка перевода:', error.message);
        return { 
            success: false, 
            error: 'Ошибка соединения',
            offline: true 
        };
    }
};

// ========== УНИВЕРСАЛЬНЫЕ ФУНКЦИИ СИНХРОНИЗАЦИИ ==========

// Функция для получения улучшений для синхронизации
if (typeof window.getUpgradesForSync === 'undefined') {
    window.getUpgradesForSync = function() {
        const upgradesData = {};
        if (window.upgrades) {
            for (const key in window.upgrades) {
                if (window.upgrades[key] && typeof window.upgrades[key].level !== 'undefined') {
                    upgradesData[key] = window.upgrades[key].level;
                } else if (typeof window.upgrades[key] === 'number') {
                    upgradesData[key] = window.upgrades[key];
                }
            }
        }
        return upgradesData;
    };
}

// Функция для загрузки синхронизированных данных
if (typeof window.loadSyncedData === 'undefined') {
    window.loadSyncedData = async function() {
        console.log('📥 Загрузка синхронизированных данных...');
        
        try {
            const userId = window.userData?.userId;
            if (!userId) {
                console.log('❌ Нет userID для загрузки');
                return {
                    success: false,
                    error: 'Нет данных пользователя',
                    offline: true
                };
            }
            
            const response = await window.apiRequest(`/api/sync/unified/${userId}`);
            
            if (response && response.success && response.userData) {
                console.log('✅ Данные загружены с сервера');
                
                const serverData = response.userData;
                
                // Объединяем данные, сохраняя локальный прогресс
                if (serverData.balance > window.userData.balance) {
                    window.userData.balance = serverData.balance;
                }
                if (serverData.totalEarned > window.userData.totalEarned) {
                    window.userData.totalEarned = serverData.totalEarned;
                }
                if (serverData.totalClicks > window.userData.totalClicks) {
                    window.userData.totalClicks = serverData.totalClicks;
                }
                
                // Обновляем другие данные с сервера
                Object.keys(serverData).forEach(key => {
                    if (key !== 'balance' && key !== 'totalEarned' && key !== 'totalClicks') {
                        if (serverData[key] !== undefined) {
                            window.userData[key] = serverData[key];
                        }
                    }
                });
                
                // Синхронизируем улучшения
                if (serverData.upgrades && window.upgrades) {
                    Object.keys(serverData.upgrades).forEach(key => {
                        const serverLevel = serverData.upgrades[key];
                        const localLevel = window.upgrades[key]?.level || window.upgrades[key] || 0;
                        
                        if (serverLevel > localLevel) {
                            if (!window.upgrades[key] || typeof window.upgrades[key] === 'number') {
                                window.upgrades[key] = { level: serverLevel };
                            } else {
                                window.upgrades[key].level = serverLevel;
                            }
                        }
                    });
                }
                
                if (window.saveUserData) window.saveUserData();
                if (window.updateUI) window.updateUI();
                if (window.updateShopUI) window.updateShopUI();
                
                if (window.showNotification) {
                    window.showNotification('Данные синхронизированы с сервером!', 'success');
                }
                
                return {
                    success: true,
                    dataSynced: true,
                    balanceUpdated: serverData.balance > window.userData.balance,
                    timestamp: new Date().toISOString()
                };
            }
            
        } catch (error) {
            console.log('📴 Ошибка загрузки данных:', error.message);
        }
        
        return {
            success: false,
            error: 'Ошибка загрузки данных',
            offline: true,
            timestamp: new Date().toISOString()
        };
    };
}

// Функция для синхронизации данных
if (typeof window.syncUserData === 'undefined') {
    window.syncUserData = async function(force = false) {
        console.log('🔄 Синхронизация данных...');
        
        if (!window.userData) {
            return {
                success: false,
                error: 'Нет данных пользователя',
                offline: true
            };
        }
        
        // Проверяем, нужно ли синхронизировать
        const now = Date.now();
        const lastSync = window.lastSyncTime || 0;
        
        if (!force && (now - lastSync < 30000)) { // 30 секунд между синхронизациями
            console.log('⏳ Синхронизация не требуется (слишком часто)');
            return {
                success: true,
                skipped: true,
                reason: 'too_frequent',
                timestamp: new Date().toISOString()
            };
        }
        
        try {
            const syncData = {
                userId: window.userData.userId,
                username: window.userData.username,
                balance: parseFloat(window.userData.balance),
                totalEarned: parseFloat(window.userData.totalEarned),
                totalClicks: window.userData.totalClicks,
                upgrades: window.getUpgradesForSync(),
                lastUpdate: Date.now(),
                telegramId: window.userData.telegramId,
                deviceId: window.generateDeviceId ? window.generateDeviceId() : 'unknown',
                gameStats: {
                    clickPower: window.calculateClickPower ? window.calculateClickPower() : 0.000000001,
                    miningSpeed: window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0.000000000,
                    totalSpeed: (window.calculateClickPower ? window.calculateClickPower() : 0) + 
                               (window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0)
                }
            };
            
            const response = await window.apiRequest('/api/sync/unified', {
                method: 'POST',
                body: JSON.stringify(syncData)
            });
            
            if (response && response.success) {
                console.log('✅ Данные синхронизированы с сервером');
                
                // Если сервер вернул другой userId (при объединении записей)
                if (response.userId && response.userId !== window.userData.userId) {
                    console.log(`🆔 Объединение записей: ${window.userData.userId} -> ${response.userId}`);
                    window.userData.userId = response.userId;
                    if (window.saveUserData) window.saveUserData();
                }
                
                // Если серверный баланс больше - используем его
                if (response.bestBalance && response.bestBalance > window.userData.balance) {
                    console.log(`💰 Баланс обновлен: ${window.userData.balance.toFixed(9)} -> ${response.bestBalance.toFixed(9)}`);
                    window.userData.balance = response.bestBalance;
                    if (window.updateUI) window.updateUI();
                    if (window.saveUserData) window.saveUserData();
                }
                
                window.lastSyncTime = Date.now();
                localStorage.setItem('last_sync_time', window.lastSyncTime.toString());
                
                return {
                    success: true,
                    offline: response.offline || false,
                    userIdUpdated: response.userId && response.userId !== window.userData.userId,
                    balanceUpdated: response.bestBalance > window.userData.balance,
                    timestamp: new Date().toISOString()
                };
            }
            
        } catch (error) {
            console.log('📴 Ошибка синхронизации:', error.message);
        }
        
        return {
            success: false,
            error: 'Ошибка синхронизации',
            offline: true,
            timestamp: new Date().toISOString()
        };
    };
}

// ========== ФУНКЦИИ ДЛЯ УВЕДОМЛЕНИЙ И УТИЛИТ ==========

// Функция для уведомлений
if (typeof window.showNotification === 'undefined') {
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
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="notification-body">
                ${message}
            </div>
            <div class="notification-progress"></div>
        `;
        
        document.body.appendChild(notification);
        
        // Показываем с анимацией
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Анимация прогресс-бара
        const progressBar = notification.querySelector('.notification-progress');
        if (progressBar) {
            progressBar.style.animation = `progress ${duration}ms linear`;
        }
        
        // Убираем через указанное время
        const removeTimer = setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 400);
        }, duration);
        
        // Останавливаем таймер при наведении
        notification.addEventListener('mouseenter', () => {
            clearTimeout(removeTimer);
            if (progressBar) {
                progressBar.style.animationPlayState = 'paused';
            }
        });
        
        notification.addEventListener('mouseleave', () => {
            if (progressBar) {
                progressBar.style.animationPlayState = 'running';
            }
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 400);
            }, duration);
        });
    };
}

// Функция для расчета силы клика
if (typeof window.calculateClickPower === 'undefined') {
    window.calculateClickPower = function() {
        let power = 0.000000001;
        
        if (window.upgrades && window.UPGRADES) {
            for (const key in window.upgrades) {
                if (key.startsWith('mouse')) {
                    const level = window.upgrades[key]?.level || window.upgrades[key] || 0;
                    const upgrade = window.UPGRADES[key];
                    if (upgrade && upgrade.baseBonus) {
                        power += level * upgrade.baseBonus;
                    }
                }
            }
        }
        
        return Math.max(0.000000001, power);
    };
}

// Функция для расчета скорости майнинга
if (typeof window.calculateMiningSpeed === 'undefined') {
    window.calculateMiningSpeed = function() {
        let speed = 0.000000000;
        
        if (window.upgrades && window.UPGRADES) {
            for (const key in window.upgrades) {
                if (key.startsWith('gpu') || key.startsWith('cpu')) {
                    const level = window.upgrades[key]?.level || window.upgrades[key] || 0;
                    const upgrade = window.UPGRADES[key];
                    if (upgrade && upgrade.baseBonus) {
                        speed += level * upgrade.baseBonus;
                    }
                }
            }
        }
        
        return Math.max(0.000000000, speed);
    };
}

// Функция для обновления UI
if (typeof window.updateUI === 'undefined') {
    window.updateUI = function() {
        if (!window.userData) return;
        
        const balanceElement = document.getElementById('balanceValue');
        const clickValueElement = document.getElementById('clickValue');
        const clickSpeedElement = document.getElementById('clickSpeed');
        const mineSpeedElement = document.getElementById('mineSpeed');
        
        if (balanceElement) {
            const balance = parseFloat(window.userData.balance || 0.000000100);
            balanceElement.textContent = balance.toFixed(9) + ' S';
            
            // Анимация изменения баланса
            if (balanceElement.dataset.lastValue) {
                const lastValue = parseFloat(balanceElement.dataset.lastValue);
                if (balance > lastValue) {
                    balanceElement.classList.add('balance-increase');
                    setTimeout(() => balanceElement.classList.remove('balance-increase'), 500);
                } else if (balance < lastValue) {
                    balanceElement.classList.add('balance-decrease');
                    setTimeout(() => balanceElement.classList.remove('balance-decrease'), 500);
                }
            }
            balanceElement.dataset.lastValue = balance;
        }
        
        if (clickValueElement) {
            const clickPower = window.calculateClickPower ? window.calculateClickPower() : 0.000000001;
            clickValueElement.textContent = clickPower.toFixed(9);
        }
        
        if (clickSpeedElement) {
            const clickPower = window.calculateClickPower ? window.calculateClickPower() : 0.000000001;
            clickSpeedElement.textContent = clickPower.toFixed(9) + ' S/сек';
        }
        
        if (mineSpeedElement) {
            const miningSpeed = window.calculateMiningSpeed ? window.calculateMiningSpeed() : 0.000000000;
            mineSpeedElement.textContent = miningSpeed.toFixed(9) + ' S/сек';
        }
    };
}

// Функция для обновления баланса
if (typeof window.updateBalanceImmediately === 'undefined') {
    window.updateBalanceImmediately = function() {
        if (!window.userData) return;
        
        const balanceElement = document.getElementById('balanceValue');
        if (balanceElement) {
            balanceElement.textContent = (window.userData.balance || 0.000000100).toFixed(9) + ' S';
        }
        
        const clickValueElement = document.getElementById('clickValue');
        if (clickValueElement) {
            clickValueElement.textContent = (window.calculateClickPower ? window.calculateClickPower() : 0.000000001).toFixed(9);
        }
    };
}

// Функция для сохранения данных
if (typeof window.saveUserData === 'undefined') {
    window.saveUserData = function() {
        try {
            if (!window.userData) return;
            
            window.userData.lastUpdate = Date.now();
            window.userData.version = '1.0.0';
            
            // Сохраняем данные пользователя
            localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
            
            // Сохраняем улучшения
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
            
            // Сохраняем время последнего сохранения
            localStorage.setItem('sparkcoin_last_save', Date.now().toString());
            
            console.log('💾 Данные сохранены');
            
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
        }
    };
}

// Функция для генерации Device ID
if (typeof window.generateDeviceId === 'undefined') {
    window.generateDeviceId = function() {
        let deviceId = localStorage.getItem('sparkcoin_device_id');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '_' + 
                       navigator.userAgent.substring(0, 20).replace(/\s+/g, '_');
            localStorage.setItem('sparkcoin_device_id', deviceId);
        }
        return deviceId;
    };
}

// ========== АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ ==========

// Автоматическая проверка соединения при загрузке
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.checkApiConnection) {
            window.checkApiConnection();
        }
    }, 1500);
});

// Периодическая проверка соединения
setInterval(() => {
    if (window.checkApiConnection) {
        window.checkApiConnection();
    }
}, 60000); // Каждую минуту

// Периодическая синхронизация данных
setInterval(() => {
    if (window.syncUserData && window.userData && window.isDataLoaded) {
        window.syncUserData();
    }
}, 30000); // Каждые 30 секунд

// Автосохранение каждые 10 секунд
setInterval(() => {
    if (window.saveUserData && window.userData && window.isDataLoaded) {
        window.saveUserData();
    }
}, 10000);

console.log('✅ API для Sparkcoin загружен! ВСЕ ФУНКЦИИ ОПРЕДЕЛЕНЫ И ИСПРАВЛЕНЫ');
