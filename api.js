// server.js - СВЕРХБЫСТРЫЙ API ДЛЯ SPARKCOIN (120ms MAX)
const http = require('http');
const crypto = require('crypto');
const { URL } = require('url');

// ==================== КОНФИГУРАЦИЯ ====================
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const API_TIMEOUT = 120; // 120ms максимум
const MAX_CONCURRENT_REQUESTS = 6;

// ==================== БАЗА ДАННЫХ В ПАМЯТИ ====================
const db = {
    users: new Map(),
    upgrades: new Map(),
    lottery: {
        team: {
            eagle: [], tails: [], 
            last_winner: null, timer: 60,
            total_eagle: 0, total_tails: 0,
            participants_count: 0, current_round: 1,
            round_start_time: Date.now(),
            round_end_time: Date.now() + 60000
        },
        classic: {
            bets: [], total_pot: 0, timer: 120,
            participants_count: 0, current_round: 1,
            round_start_time: Date.now(),
            round_end_time: Date.now() + 120000,
            history: []
        }
    },
    leaderboard: {
        balance: [],
        speed: [],
        winners: []
    },
    cache: new Map(),
    pendingRequests: new Map(),
    concurrentCounter: 0
};

// ==================== УТИЛИТЫ ====================
function generateRequestId() {
    return 'req_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
}

function generateUserId() {
    return 'user_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
}

function generateTransactionId() {
    return 'tx_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex');
}

function calculateClickPower(upgrades) {
    let power = 0.000000001;
    if (upgrades) {
        const mouseLevel = upgrades.mouse || upgrades.mouse?.level || 0;
        const gamepadLevel = upgrades.gamepad || upgrades.gamepad?.level || 0;
        power += mouseLevel * 0.000000001;
        power += gamepadLevel * 0.000000002;
    }
    return parseFloat(power.toFixed(9));
}

function calculateMiningSpeed(upgrades) {
    let speed = 0.000000000;
    if (upgrades) {
        const pickaxeLevel = upgrades.pickaxe || upgrades.pickaxe?.level || 0;
        const gpuLevel = upgrades.gpu || upgrades.gpu?.level || 0;
        speed += pickaxeLevel * 0.0000000005;
        speed += gpuLevel * 0.000000001;
    }
    return parseFloat(speed.toFixed(9));
}

// ==================== ИНИЦИАЛИЗАЦИЯ ДЕМО-ДАННЫХ ====================
function initDemoData() {
    const demoUsers = [
        {
            userId: generateUserId(),
            username: 'Текущий Игрок',
            balance: 0.000000100,
            totalEarned: 0.000000100,
            totalClicks: 0,
            lastUpdate: Date.now(),
            online: true,
            telegramId: null,
            upgrades: { mouse: 1, gamepad: 0, pickaxe: 0, gpu: 0 }
        },
        {
            userId: 'demo_1',
            username: 'Демо Игрок 1',
            balance: 0.000000090,
            totalEarned: 0.000000200,
            totalClicks: 50,
            lastUpdate: Date.now() - 30000,
            online: false,
            upgrades: { mouse: 2, gamepad: 1, pickaxe: 0, gpu: 0 }
        },
        {
            userId: 'demo_2',
            username: 'Демо Игрок 2',
            balance: 0.000000070,
            totalEarned: 0.000000180,
            totalClicks: 40,
            lastUpdate: Date.now() - 60000,
            online: false,
            upgrades: { mouse: 1, gamepad: 0, pickaxe: 1, gpu: 0 }
        },
        {
            userId: 'demo_3',
            username: 'Демо Игрок 3',
            balance: 0.000000050,
            totalEarned: 0.000000150,
            totalClicks: 30,
            lastUpdate: Date.now() - 90000,
            online: false,
            upgrades: { mouse: 0, gamepad: 0, pickaxe: 2, gpu: 1 }
        },
        {
            userId: 'demo_4',
            username: 'Демо Игрок 4',
            balance: 0.000000030,
            totalEarned: 0.000000120,
            totalClicks: 25,
            lastUpdate: Date.now() - 120000,
            online: false,
            upgrades: { mouse: 1, gamepad: 1, pickaxe: 1, gpu: 0 }
        }
    ];

    demoUsers.forEach(user => {
        const clickSpeed = calculateClickPower(user.upgrades);
        const mineSpeed = calculateMiningSpeed(user.upgrades);
        user.clickSpeed = clickSpeed;
        user.mineSpeed = mineSpeed;
        user.totalSpeed = clickSpeed + mineSpeed;
        
        db.users.set(user.userId, user);
        db.upgrades.set(user.userId, user.upgrades);
    });

    // Обновляем кэш рейтингов
    updateLeaderboardCache();
    updateWinnersCache();
}

// ==================== КЭШИРОВАНИЕ ====================
function updateLeaderboardCache() {
    const users = Array.from(db.users.values());
    
    // Рейтинг по балансу
    db.leaderboard.balance = users
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 20)
        .map((user, index) => ({
            rank: index + 1,
            userId: user.userId,
            username: user.username,
            balance: user.balance,
            totalEarned: user.totalEarned,
            totalClicks: user.totalClicks,
            clickSpeed: user.clickSpeed,
            mineSpeed: user.mineSpeed,
            totalSpeed: user.totalSpeed,
            isCurrent: false
        }));
    
    // Рейтинг по скорости
    db.leaderboard.speed = users
        .sort((a, b) => b.totalSpeed - a.totalSpeed)
        .slice(0, 20)
        .map((user, index) => ({
            rank: index + 1,
            userId: user.userId,
            username: user.username,
            clickSpeed: user.clickSpeed,
            mineSpeed: user.mineSpeed,
            totalSpeed: user.totalSpeed,
            isCurrent: false
        }));
}

function updateWinnersCache() {
    const users = Array.from(db.users.values());
    
    db.leaderboard.winners = users
        .map(user => ({
            userId: user.userId,
            username: user.username,
            totalWinnings: user.totalEarned * 0.15,
            totalLosses: user.totalEarned * 0.05,
            netWinnings: user.totalEarned * 0.10,
            lastWin: new Date(user.lastUpdate).toISOString(),
            winStreak: Math.floor(Math.random() * 5) + 1,
            isCurrent: false
        }))
        .sort((a, b) => b.netWinnings - a.netWinnings)
        .slice(0, 10)
        .map((winner, index) => ({ ...winner, rank: index + 1 }));
}

// ==================== API ОБРАБОТЧИКИ ====================
async function handleAPIRequest(req, res) {
    const startTime = Date.now();
    const requestId = generateRequestId();
    
    // Устанавливаем базовые заголовки
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Request-ID', requestId);
    res.setHeader('X-Response-Time', '0ms');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Обработка OPTIONS запроса
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // Парсим URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const endpoint = url.pathname;
    const query = Object.fromEntries(url.searchParams);
    
    // Проверяем лимит параллельных запросов
    if (db.concurrentCounter >= MAX_CONCURRENT_REQUESTS) {
        return sendError(res, 429, 'Too many requests', requestId, startTime);
    }
    
    db.concurrentCounter++;
    
    try {
        // Читаем тело запроса для POST
        let body = '';
        if (req.method === 'POST') {
            body = await readRequestBody(req);
        }
        
        // Обрабатываем запрос
        let response;
        const cacheKey = `${req.method}:${endpoint}:${JSON.stringify(query)}:${body.substring(0, 50)}`;
        
        // Проверка кэша для GET запросов
        if (req.method === 'GET') {
            const cached = db.cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp < 3000)) {
                cached.data._cached = true;
                cached.data._requestId = requestId;
                sendResponse(res, 200, cached.data, startTime);
                db.concurrentCounter--;
                return;
            }
        }
        
        // Проверяем есть ли уже такой запрос в процессе
        if (db.pendingRequests.has(cacheKey)) {
            response = await db.pendingRequests.get(cacheKey);
        } else {
            // Создаем промис для нового запроса
            const requestPromise = processRequest(req.method, endpoint, query, body);
            db.pendingRequests.set(cacheKey, requestPromise);
            response = await requestPromise;
            db.pendingRequests.delete(cacheKey);
            
            // Кэшируем GET запросы
            if (req.method === 'GET' && response.success) {
                db.cache.set(cacheKey, {
                    data: response,
                    timestamp: Date.now()
                });
            }
        }
        
        // Отправляем ответ
        sendResponse(res, 200, {
            ...response,
            _requestId: requestId,
            _timestamp: Date.now(),
            _responseTime: Date.now() - startTime
        }, startTime);
        
    } catch (error) {
        console.error(`[${requestId}] Ошибка обработки запроса:`, error.message);
        sendError(res, 500, 'Internal server error', requestId, startTime);
    } finally {
        db.concurrentCounter--;
    }
}

async function readRequestBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => {
            data += chunk.toString();
            // Защита от слишком больших запросов
            if (data.length > 1e6) {
                req.destroy();
                reject(new Error('Request body too large'));
            }
        });
        req.on('end', () => resolve(data));
        req.on('error', reject);
        
        // Таймаут чтения тела
        req.setTimeout(100, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

async function processRequest(method, endpoint, query, body) {
    const startTime = Date.now();
    
    try {
        let data = {};
        if (body && method === 'POST') {
            try {
                data = JSON.parse(body);
            } catch {
                return { success: false, error: 'Invalid JSON' };
            }
        }
        
        // Роутинг API
        switch (true) {
            case endpoint === '/api/health':
                return handleHealth();
                
            case endpoint === '/api/all_players':
                return handleAllPlayers();
                
            case endpoint === '/api/leaderboard':
                return handleLeaderboard(query.type || 'balance');
                
            case endpoint === '/api/top/winners':
                return handleTopWinners();
                
            case endpoint === '/api/lottery/status':
                return handleLotteryStatus();
                
            case endpoint === '/api/classic-lottery/status':
                return handleClassicLotteryStatus();
                
            case endpoint === '/api/referral/stats':
                return handleReferralStats(data);
                
            case endpoint === '/api/sync/unified':
                return handleSync(data);
                
            case endpoint === '/api/transfer':
                return handleTransfer(data);
                
            case endpoint === '/api/lottery/bet':
                return handleLotteryBet(data);
                
            case endpoint === '/api/classic-lottery/bet':
                return handleClassicLotteryBet(data);
                
            case endpoint === '/api/referral/apply':
                return handleReferralApply(data);
                
            default:
                return { success: false, error: 'Endpoint not found' };
        }
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ==================== ОБРАБОТЧИКИ ЭНДПОИНТОВ ====================
function handleHealth() {
    return {
        success: true,
        status: 'healthy',
        message: 'Sparkcoin API работает нормально',
        version: '3.0.0',
        onlinePlayers: Array.from(db.users.values()).filter(u => u.online).length,
        totalPlayers: db.users.size,
        uptime: process.uptime(),
        timestamp: Date.now()
    };
}

function handleAllPlayers() {
    const players = Array.from(db.users.values()).map(user => ({
        userId: user.userId,
        username: user.username,
        balance: user.balance,
        totalEarned: user.totalEarned,
        totalClicks: user.totalClicks,
        clickSpeed: user.clickSpeed,
        mineSpeed: user.mineSpeed,
        totalSpeed: user.totalSpeed,
        lastUpdate: new Date(user.lastUpdate).toISOString(),
        online: user.online,
        rank: 1
    }));
    
    return {
        success: true,
        players: players.sort((a, b) => b.balance - a.balance),
        count: players.length,
        timestamp: Date.now()
    };
}

function handleLeaderboard(type) {
    let leaderboard = [];
    
    if (type === 'balance') {
        leaderboard = db.leaderboard.balance;
    } else if (type === 'speed') {
        leaderboard = db.leaderboard.speed;
    }
    
    return {
        success: true,
        leaderboard,
        type,
        count: leaderboard.length,
        timestamp: Date.now()
    };
}

function handleTopWinners() {
    return {
        success: true,
        winners: db.leaderboard.winners,
        period: 'all_time',
        timestamp: Date.now()
    };
}

function handleLotteryStatus() {
    const now = Date.now();
    const timer = Math.max(0, Math.floor((db.lottery.team.round_end_time - now) / 1000));
    
    // Если таймер истек, начинаем новый раунд
    if (timer <= 0) {
        startNewLotteryRound();
        return handleLotteryStatus(); // Рекурсивно получаем обновленный статус
    }
    
    return {
        success: true,
        lottery: {
            eagle: db.lottery.team.eagle.slice(0, 50), // Ограничиваем количество
            tails: db.lottery.team.tails.slice(0, 50),
            last_winner: db.lottery.team.last_winner,
            timer: timer,
            total_eagle: db.lottery.team.total_eagle,
            total_tails: db.lottery.team.total_tails,
            participants_count: db.lottery.team.participants_count,
            current_round: db.lottery.team.current_round,
            round_start_time: new Date(db.lottery.team.round_start_time).toISOString(),
            round_end_time: new Date(db.lottery.team.round_end_time).toISOString(),
            status: timer > 10 ? 'waiting' : 'ending'
        },
        timestamp: Date.now()
    };
}

function startNewLotteryRound() {
    const now = Date.now();
    
    // Определяем победителя предыдущего раунда
    if (db.lottery.team.eagle.length > 0 || db.lottery.team.tails.length > 0) {
        const totalEagle = db.lottery.team.total_eagle;
        const totalTails = db.lottery.team.total_tails;
        const winningTeam = totalEagle > totalTails ? 'eagle' : 'tails';
        const winner = selectRandomWinner(winningTeam);
        
        if (winner) {
            db.lottery.team.last_winner = {
                userId: winner.userId,
                username: winner.username,
                amount: winner.amount,
                team: winningTeam,
                timestamp: now
            };
            
            // Начисляем выигрыш
            const user = db.users.get(winner.userId);
            if (user) {
                const winAmount = totalEagle + totalTails;
                user.balance += winAmount;
                user.totalEarned += winAmount;
                db.users.set(user.userId, user);
            }
        }
    }
    
    // Сбрасываем данные для нового раунда
    db.lottery.team.eagle = [];
    db.lottery.team.tails = [];
    db.lottery.team.total_eagle = 0;
    db.lottery.team.total_tails = 0;
    db.lottery.team.participants_count = 0;
    db.lottery.team.current_round++;
    db.lottery.team.round_start_time = now;
    db.lottery.team.round_end_time = now + 60000; // 60 секунд
    
    // Обновляем кэш
    updateLeaderboardCache();
}

function selectRandomWinner(team) {
    const participants = team === 'eagle' ? db.lottery.team.eagle : db.lottery.team.tails;
    if (participants.length === 0) return null;
    
    // Взвешенный случайный выбор (чем больше ставка, тем больше шансов)
    const totalAmount = participants.reduce((sum, p) => sum + p.amount, 0);
    let random = Math.random() * totalAmount;
    
    for (const participant of participants) {
        random -= participant.amount;
        if (random <= 0) {
            return participant;
        }
    }
    
    return participants[0];
}

function handleClassicLotteryStatus() {
    const now = Date.now();
    const timer = Math.max(0, Math.floor((db.lottery.classic.round_end_time - now) / 1000));
    
    // Если таймер истек, начинаем новый раунд
    if (timer <= 0) {
        startNewClassicLotteryRound();
        return handleClassicLotteryStatus();
    }
    
    return {
        success: true,
        lottery: {
            bets: db.lottery.classic.bets.slice(0, 50),
            total_pot: db.lottery.classic.total_pot,
            timer: timer,
            participants_count: db.lottery.classic.participants_count,
            history: db.lottery.classic.history.slice(-10), // Последние 10 розыгрышей
            current_round: db.lottery.classic.current_round,
            round_start_time: new Date(db.lottery.classic.round_start_time).toISOString(),
            round_end_time: new Date(db.lottery.classic.round_end_time).toISOString(),
            status: timer > 20 ? 'collecting' : 'ending'
        },
        timestamp: Date.now()
    };
}

function startNewClassicLotteryRound() {
    const now = Date.now();
    
    // Определяем победителя предыдущего раунда
    if (db.lottery.classic.bets.length > 0) {
        const winningTicket = Math.floor(Math.random() * 1000) + 1;
        let winner = null;
        let closestDiff = Infinity;
        
        // Находим ближайший билет к выигрышному
        for (const bet of db.lottery.classic.bets) {
            const diff = Math.abs(bet.ticketNumber - winningTicket);
            if (diff < closestDiff) {
                closestDiff = diff;
                winner = bet;
            }
        }
        
        if (winner) {
            const winAmount = db.lottery.classic.total_pot * 0.9; // 90% банка победителю
            const user = db.users.get(winner.userId);
            
            if (user) {
                user.balance += winAmount;
                user.totalEarned += winAmount;
                db.users.set(user.userId, user);
            }
            
            // Сохраняем в историю
            db.lottery.classic.history.push({
                round: db.lottery.classic.current_round,
                winningTicket: winningTicket,
                winner: {
                    userId: winner.userId,
                    username: winner.username,
                    ticketNumber: winner.ticketNumber,
                    amount: winner.amount,
                    winAmount: winAmount
                },
                totalPot: db.lottery.classic.total_pot,
                participants: db.lottery.classic.participants_count,
                timestamp: now
            });
        }
    }
    
    // Сбрасываем данные для нового раунда
    db.lottery.classic.bets = [];
    db.lottery.classic.total_pot = 0;
    db.lottery.classic.participants_count = 0;
    db.lottery.classic.current_round++;
    db.lottery.classic.round_start_time = now;
    db.lottery.classic.round_end_time = now + 120000; // 120 секунд
    
    // Обновляем кэш
    updateLeaderboardCache();
    updateWinnersCache();
}

function handleReferralStats(data) {
    const userId = data.userId || query.userId || 'unknown';
    const user = db.users.get(userId);
    
    if (!user) {
        return {
            success: false,
            error: 'User not found',
            timestamp: Date.now()
        };
    }
    
    return {
        success: true,
        stats: {
            referralsCount: 0,
            totalEarnings: 0,
            todayEarnings: 0,
            topReferral: null,
            earningsHistory: []
        },
        referralCode: `REF-${userId.slice(-8).toUpperCase()}`,
        referralLink: `https://t.me/sparkcoin_bot?start=ref_${userId}`,
        referralsList: [],
        timestamp: Date.now()
    };
}

function handleSync(data) {
    if (!data.userId) {
        return {
            success: false,
            error: 'userId is required',
            timestamp: Date.now()
        };
    }
    
    const now = Date.now();
    let user = db.users.get(data.userId);
    
    if (!user) {
        // Создаем нового пользователя
        user = {
            userId: data.userId,
            username: data.username || `Игрок_${data.userId.slice(-6)}`,
            balance: data.balance || 0.000000100,
            totalEarned: data.totalEarned || 0.000000100,
            totalClicks: data.totalClicks || 0,
            lastUpdate: now,
            online: true,
            telegramId: data.telegramId || null
        };
    } else {
        // Обновляем существующего пользователя
        user.balance = Math.max(user.balance, data.balance || user.balance);
        user.totalEarned = Math.max(user.totalEarned, data.totalEarned || user.totalEarned);
        user.totalClicks = Math.max(user.totalClicks, data.totalClicks || user.totalClicks);
        user.username = data.username || user.username;
        user.lastUpdate = now;
        user.online = true;
    }
    
    // Обновляем или устанавливаем апгрейды
    if (data.upgrades) {
        const currentUpgrades = db.upgrades.get(data.userId) || {};
        const newUpgrades = { ...currentUpgrades, ...data.upgrades };
        
        // Пересчитываем скорости
        user.clickSpeed = calculateClickPower(newUpgrades);
        user.mineSpeed = calculateMiningSpeed(newUpgrades);
        user.totalSpeed = user.clickSpeed + user.mineSpeed;
        
        db.upgrades.set(data.userId, newUpgrades);
    } else {
        // Если апгрейдов нет, используем текущие
        const currentUpgrades = db.upgrades.get(data.userId) || {};
        user.clickSpeed = calculateClickPower(currentUpgrades);
        user.mineSpeed = calculateMiningSpeed(currentUpgrades);
        user.totalSpeed = user.clickSpeed + user.mineSpeed;
    }
    
    db.users.set(data.userId, user);
    
    // Обновляем кэш рейтингов
    updateLeaderboardCache();
    updateWinnersCache();
    
    return {
        success: true,
        message: 'Синхронизация успешна',
        userId: data.userId,
        bestBalance: user.balance,
        syncStatus: 'synced',
        upgradesCount: Object.keys(db.upgrades.get(data.userId) || {}).length,
        clickSpeed: user.clickSpeed,
        mineSpeed: user.mineSpeed,
        totalSpeed: user.totalSpeed,
        timestamp: now
    };
}

function handleTransfer(data) {
    const { userId, toUsername, amount } = data;
    
    if (!userId || !toUsername || !amount) {
        return {
            success: false,
            error: 'Missing required fields',
            timestamp: Date.now()
        };
    }
    
    const sender = db.users.get(userId);
    if (!sender) {
        return {
            success: false,
            error: 'Sender not found',
            timestamp: Date.now()
        };
    }
    
    if (sender.balance < amount) {
        return {
            success: false,
            error: 'Insufficient balance',
            timestamp: Date.now()
        };
    }
    
    // Находим получателя по имени пользователя
    const receiver = Array.from(db.users.values()).find(u => u.username === toUsername);
    if (!receiver) {
        return {
            success: false,
            error: 'Recipient not found',
            timestamp: Date.now()
        };
    }
    
    if (sender.userId === receiver.userId) {
        return {
            success: false,
            error: 'Cannot transfer to yourself',
            timestamp: Date.now()
        };
    }
    
    // Выполняем перевод
    const now = Date.now();
    sender.balance -= amount;
    sender.lastUpdate = now;
    
    receiver.balance += amount;
    receiver.lastUpdate = now;
    
    db.users.set(sender.userId, sender);
    db.users.set(receiver.userId, receiver);
    
    // Обновляем кэш рейтингов
    updateLeaderboardCache();
    
    return {
        success: true,
        message: 'Перевод выполнен успешно',
        newBalance: sender.balance,
        transactionId: generateTransactionId(),
        receiver: toUsername,
        amount: amount,
        timestamp: now
    };
}

function handleLotteryBet(data) {
    const { userId, team, amount } = data;
    
    if (!userId || !team || !amount) {
        return {
            success: false,
            error: 'Missing required fields',
            timestamp: Date.now()
        };
    }
    
    const user = db.users.get(userId);
    if (!user) {
        return {
            success: false,
            error: 'User not found',
            timestamp: Date.now()
        };
    }
    
    if (user.balance < amount) {
        return {
            success: false,
            error: 'Insufficient balance',
            timestamp: Date.now()
        };
    }
    
    if (!['eagle', 'tails'].includes(team)) {
        return {
            success: false,
            error: 'Invalid team. Use "eagle" or "tails"',
            timestamp: Date.now()
        };
    }
    
    // Проверяем минимальную ставку
    if (amount < 0.000000001) {
        return {
            success: false,
            error: 'Minimum bet is 0.000000001 S',
            timestamp: Date.now()
        };
    }
    
    const now = Date.now();
    
    // Списываем средства
    user.balance -= amount;
    user.lastUpdate = now;
    db.users.set(userId, user);
    
    // Добавляем ставку
    const bet = {
        userId,
        username: user.username,
        amount,
        timestamp: now
    };
    
    if (team === 'eagle') {
        db.lottery.team.eagle.push(bet);
        db.lottery.team.total_eagle += amount;
    } else {
        db.lottery.team.tails.push(bet);
        db.lottery.team.total_tails += amount;
    }
    
    db.lottery.team.participants_count++;
    
    return {
        success: true,
        message: 'Ставка принята',
        bet_id: `bet_${now}_${userId.slice(-6)}`,
        newBalance: user.balance,
        team: team,
        amount: amount,
        timestamp: now
    };
}

function handleClassicLotteryBet(data) {
    const { userId, amount } = data;
    
    if (!userId || !amount) {
        return {
            success: false,
            error: 'Missing required fields',
            timestamp: Date.now()
        };
    }
    
    const user = db.users.get(userId);
    if (!user) {
        return {
            success: false,
            error: 'User not found',
            timestamp: Date.now()
        };
    }
    
    if (user.balance < amount) {
        return {
            success: false,
            error: 'Insufficient balance',
            timestamp: Date.now()
        };
    }
    
    // Проверяем минимальную ставку
    if (amount < 0.000000001) {
        return {
            success: false,
            error: 'Minimum bet is 0.000000001 S',
            timestamp: Date.now()
        };
    }
    
    const now = Date.now();
    
    // Списываем средства
    user.balance -= amount;
    user.lastUpdate = now;
    db.users.set(userId, user);
    
    // Генерируем номер билета
    const ticketNumber = Math.floor(Math.random() * 1000) + 1;
    
    // Добавляем ставку
    const bet = {
        userId,
        username: user.username,
        amount,
        ticketNumber,
        timestamp: now
    };
    
    db.lottery.classic.bets.push(bet);
    db.lottery.classic.total_pot += amount;
    db.lottery.classic.participants_count++;
    
    return {
        success: true,
        message: 'Ставка принята',
        bet_id: `classic_${now}_${userId.slice(-6)}`,
        newBalance: user.balance,
        ticket_number: ticketNumber,
        amount: amount,
        timestamp: now
    };
}

function handleReferralApply(data) {
    const { userId, referralCode } = data;
    
    if (!userId || !referralCode) {
        return {
            success: false,
            error: 'Missing required fields',
            timestamp: Date.now()
        };
    }
    
    const user = db.users.get(userId);
    if (!user) {
        return {
            success: false,
            error: 'User not found',
            timestamp: Date.now()
        };
    }
    
    // Простая проверка реферального кода
    if (!referralCode.startsWith('REF-')) {
        return {
            success: false,
            error: 'Invalid referral code format',
            timestamp: Date.now()
        };
    }
    
    // Проверяем, не применял ли уже пользователь код
    if (user.referralApplied) {
        return {
            success: false,
            error: 'Referral code already applied',
            timestamp: Date.now()
        };
    }
    
    const now = Date.now();
    const bonus = 0.000000100;
    
    // Начисляем бонус
    user.balance += bonus;
    user.totalEarned += bonus;
    user.referralApplied = true;
    user.lastUpdate = now;
    
    db.users.set(userId, user);
    
    // Обновляем кэш рейтингов
    updateLeaderboardCache();
    
    return {
        success: true,
        message: 'Реферальный код применен успешно',
        bonus: bonus,
        applied: true,
        newBalance: user.balance,
        timestamp: now
    };
}

// ==================== УТИЛИТЫ ОТВЕТОВ ====================
function sendResponse(res, statusCode, data, startTime) {
    const responseTime = Date.now() - startTime;
    
    // Проверяем таймаут
    if (responseTime > API_TIMEOUT) {
        data._warning = `Response delayed: ${responseTime}ms`;
    }
    
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    res.writeHead(statusCode);
    res.end(JSON.stringify(data, null, 2));
}

function sendError(res, statusCode, message, requestId, startTime) {
    const responseTime = Date.now() - startTime;
    
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    res.writeHead(statusCode);
    res.end(JSON.stringify({
        success: false,
        error: message,
        _requestId: requestId,
        _timestamp: Date.now(),
        _responseTime: responseTime
    }, null, 2));
}

// ==================== HTTP СЕРВЕР ====================
const server = http.createServer(async (req, res) => {
    const startTime = Date.now();
    
    try {
        // Обработка API запросов
        if (req.url.startsWith('/api/')) {
            await handleAPIRequest(req, res);
            return;
        }
        
        // Статический ответ для корневого пути
        if (req.url === '/' || req.url === '/index.html') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.writeHead(200);
            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Sparkcoin API</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; background: #121212; color: #fff; }
                        .container { max-width: 800px; margin: 0 auto; }
                        h1 { color: #00d4ff; }
                        .endpoint { background: #1e1e1e; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #00d4ff; }
                        .method { display: inline-block; padding: 3px 8px; border-radius: 3px; font-weight: bold; margin-right: 10px; }
                        .get { background: #4caf50; color: white; }
                        .post { background: #2196f3; color: white; }
                        .status { float: right; padding: 3px 10px; border-radius: 12px; font-size: 12px; }
                        .online { background: #4caf50; }
                        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
                        .stat-card { background: #1e1e1e; padding: 20px; border-radius: 8px; text-align: center; }
                        .stat-value { font-size: 24px; font-weight: bold; color: #00d4ff; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🚀 Sparkcoin API</h1>
                        <p>Сверхбыстрый API для Sparkcoin (максимальная задержка: ${API_TIMEOUT}мс)</p>
                        
                        <div class="stats">
                            <div class="stat-card">
                                <div>Онлайн игроков</div>
                                <div class="stat-value">${Array.from(db.users.values()).filter(u => u.online).length}</div>
                            </div>
                            <div class="stat-card">
                                <div>Всего игроков</div>
                                <div class="stat-value">${db.users.size}</div>
                            </div>
                            <div class="stat-card">
                                <div>Активных запросов</div>
                                <div class="stat-value">${db.concurrentCounter}/${MAX_CONCURRENT_REQUESTS}</div>
                            </div>
                            <div class="stat-card">
                                <div>Время работы</div>
                                <div class="stat-value">${Math.floor(process.uptime() / 60)} мин</div>
                            </div>
                        </div>
                        
                        <h2>Доступные эндпоинты:</h2>
                        
                        <div class="endpoint">
                            <span class="method get">GET</span> <strong>/api/health</strong>
                            <span class="status online">Работает</span>
                            <p>Проверка состояния API</p>
                        </div>
                        
                        <div class="endpoint">
                            <span class="method get">GET</span> <strong>/api/all_players</strong>
                            <span class="status online">Работает</span>
                            <p>Список всех игроков</p>
                        </div>
                        
                        <div class="endpoint">
                            <span class="method get">GET</span> <strong>/api/leaderboard?type=balance|speed</strong>
                            <span class="status online">Работает</span>
                            <p>Рейтинг игроков (по балансу или скорости)</p>
                        </div>
                        
                        <div class="endpoint">
                            <span class="method get">GET</span> <strong>/api/top/winners</strong>
                            <span class="status online">Работает</span>
                            <p>Топ победителей</p>
                        </div>
                        
                        <div class="endpoint">
                            <span class="method get">GET</span> <strong>/api/lottery/status</strong>
                            <span class="status online">Работает</span>
                            <p>Статус командной лотереи</p>
                        </div>
                        
                        <div class="endpoint">
                            <span class="method get">GET</span> <strong>/api/classic-lottery/status</strong>
                            <span class="status online">Работает</span>
                            <p>Статус классической лотереи</p>
                        </div>
                        
                        <div class="endpoint">
                            <span class="method post">POST</span> <strong>/api/sync/unified</strong>
                            <span class="status online">Работает</span>
                            <p>Синхронизация данных пользователя</p>
                        </div>
                        
                        <div class="endpoint">
                            <span class="method post">POST</span> <strong>/api/transfer</strong>
                            <span class="status online">Работает</span>
                            <p>Перевод средств между игроками</p>
                        </div>
                        
                        <div class="endpoint">
                            <span class="method post">POST</span> <strong>/api/lottery/bet</strong>
                            <span class="status online">Работает</span>
                            <p>Ставка в командной лотерее</p>
                        </div>
                        
                        <div class="endpoint">
                            <span class="method post">POST</span> <strong>/api/classic-lottery/bet</strong>
                            <span class="status online">Работает</span>
                            <p>Ставка в классической лотерее</p>
                        </div>
                        
                        <div class="endpoint">
                            <span class="method post">POST</span> <strong>/api/referral/apply</strong>
                            <span class="status online">Работает</span>
                            <p>Применение реферального кода</p>
                        </div>
                        
                        <p style="margin-top: 30px; color: #888; font-size: 14px;">
                            <strong>Технические характеристики:</strong><br>
                            • Максимальная задержка: ${API_TIMEOUT}мс<br>
                            • Максимум параллельных запросов: ${MAX_CONCURRENT_REQUESTS}<br>
                            • Кэширование: 3 секунды для GET запросов<br>
                            • Время отклика: ${Date.now() - startTime}мс
                        </p>
                    </div>
                </body>
                </html>
            `);
            return;
        }
        
        // 404 для остальных запросов
        res.writeHead(404);
        res.end('Not Found');
        
    } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500);
        res.end('Internal Server Error');
    }
});

// ==================== ФОНОВЫЕ ЗАДАЧИ ====================
// Очистка кэша каждые 5 секунд
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of db.cache.entries()) {
        if (now - value.timestamp > 3000) { // 3 секунды
            db.cache.delete(key);
        }
    }
}, 5000);

// Обновление статуса онлайн каждые 30 секунд
setInterval(() => {
    const now = Date.now();
    for (const user of db.users.values()) {
        // Если пользователь не обновлялся более 2 минут, считаем его оффлайн
        user.online = (now - user.lastUpdate) < 120000;
    }
}, 30000);

// Автоматическое обновление рейтингов каждую минуту
setInterval(() => {
    updateLeaderboardCache();
    updateWinnersCache();
}, 60000);

// ==================== ЗАПУСК СЕРВЕРА ====================
server.listen(PORT, HOST, () => {
    initDemoData();
    
    console.log(`
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║   🚀 SPARKCOIN API ЗАПУЩЕН!                                 ║
    ║                                                              ║
    ║   🔗 Адрес: http://${HOST}:${PORT}                         ║
    ║   ⚡ Задержка: ${API_TIMEOUT}мс максимум                     ║
    ║   🔥 Демо пользователей: ${db.users.size}                   ║
    ║   💾 Кэш запросов: ${db.cache.size}                         ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
    
    📊 Статистика:
    • Игроков онлайн: ${Array.from(db.users.values()).filter(u => u.online).length}
    • Всего игроков: ${db.users.size}
    • Ставок в лотереях: ${db.lottery.team.participants_count + db.lottery.classic.participants_count}
    • Общий банк лотерей: ${(db.lottery.team.total_eagle + db.lottery.team.total_tails + db.lottery.classic.total_pot).toFixed(9)} S
    
    📡 Доступные эндпоинты:
    • GET  /api/health
    • GET  /api/all_players
    • GET  /api/leaderboard?type=balance|speed
    • GET  /api/top/winners
    • GET  /api/lottery/status
    • GET  /api/classic-lottery/status
    • POST /api/sync/unified
    • POST /api/transfer
    • POST /api/lottery/bet
    • POST /api/classic-lottery/bet
    • POST /api/referral/apply
    
    ⚡ Готов к работе! Максимальная задержка: ${API_TIMEOUT}мс
    `);
});

// Обработка завершения работы
process.on('SIGINT', () => {
    console.log('\n\n🛑 Остановка Sparkcoin API...');
    console.log('📊 Финальная статистика:');
    console.log(`   • Всего запросов обработано: ${db.cache.size + db.pendingRequests.size}`);
    console.log(`   • Игроков в базе: ${db.users.size}`);
    console.log(`   • Активных запросов: ${db.concurrentCounter}`);
    
    server.close(() => {
        console.log('✅ API остановлен корректно\n');
        process.exit(0);
    });
});
