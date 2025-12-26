// game.js - ПОЛНЫЙ ИСПРАВЛЕННЫЙ КОД ИГР С СИНХРОНИЗАЦИЕЙ ВРЕМЕНИ И ВСЕМИ ИСПРАВЛЕНИЯМИ
console.log('🎮 ЗАГРУЖАЕМ ПОЛНЫЙ ИСПРАВЛЕННЫЙ КОД ИГР...');

// ========== БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ ПЕРЕМЕННЫХ ==========
if (typeof lotteryData === 'undefined') {
    var lotteryData = {
        eagle: [],
        tails: [],
        last_winner: null,
        timer: 60,
        total_eagle: 0,
        total_tails: 0,
        participants_count: 0
    };
}

if (typeof classicLotteryData === 'undefined') {
    var classicLotteryData = {
        bets: [],
        total_pot: 0,
        timer: 120,
        participants_count: 0,
        history: []
    };
}

let referralData = {
    referralsCount: 0,
    totalEarnings: 0,
    referralCode: ''
};

let selectedTeam = null;
let lotteryUpdateInterval;
let classicLotteryInterval;
let lastLotteryUpdate = 0;
let lastClassicUpdate = 0;
let currentLotteryTimer = 60;
let currentClassicTimer = 120;
let timerInterval;

// ========== СИНХРОНИЗАЦИЯ ВРЕМЕНИ ЛОТЕРЕЙ (МГНОВЕННОЕ ОБНОВЛЕНИЕ) ==========
function startTimerSync() {
    console.log('⏱️ Запуск синхронизации времени лотерей');
    clearInterval(timerInterval);
    
    // Получаем текущее время сервера для синхронизации
    const now = Date.now();
    const lotteryStart = now % (60 * 1000);
    const classicStart = now % (120 * 1000);
    
    currentLotteryTimer = 60 - Math.floor(lotteryStart / 1000);
    currentClassicTimer = 120 - Math.floor(classicStart / 1000);
    
    // Обновляем таймеры немедленно
    const lotteryTimerElement = document.getElementById('lotteryTimer');
    const classicTimerElement = document.getElementById('classicTimer');
    
    if (lotteryTimerElement) lotteryTimerElement.textContent = currentLotteryTimer;
    if (classicTimerElement) classicTimerElement.textContent = currentClassicTimer;
    
    // Запускаем точное обновление каждую секунду
    timerInterval = setInterval(() => {
        // Обновляем таймер командной лотереи
        if (currentLotteryTimer > 1) {
            currentLotteryTimer--;
        } else {
            currentLotteryTimer = 60;
            // Обновляем данные лотереи при сбросе таймера
            setTimeout(() => loadLotteryStatus(), 100);
        }
        
        // Обновляем таймер классической лотереи
        if (currentClassicTimer > 1) {
            currentClassicTimer--;
        } else {
            currentClassicTimer = 120;
            // Обновляем данные лотереи при сбросе таймера
            setTimeout(() => loadClassicLottery(), 100);
        }
        
        // Немедленное обновление отображения
        if (lotteryTimerElement) lotteryTimerElement.textContent = currentLotteryTimer;
        if (classicTimerElement) classicTimerElement.textContent = currentClassicTimer;
        
    }, 1000);
    
    console.log('✅ Синхронизация времени запущена');
}

// ========== ФУНКЦИИ ДЛЯ АВАТАРОК И ТАЙМЕРОВ ==========
function getUserAvatar(userId, username) {
    if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user) {
        const user = Telegram.WebApp.initDataUnsafe.user;
        const isCurrentUser = user.id && `tg_${user.id}` === userId;
        
        if (isCurrentUser && user.photo_url) {
            return user.photo_url;
        }
    }
    
    const avatarSeed = userId || username || 'default';
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed)}&size=40`;
}

function getUserProfileLink(userId, username) {
    if (userId.startsWith('tg_')) {
        const tgId = userId.replace('tg_', '');
        return `https://t.me/${username?.replace('@', '') || tgId}`;
    }
    
    return `https://t.me/${username?.replace('@', '') || 'sparkcoin'}`;
}

function formatBetTime(timestamp) {
    if (!timestamp) return 'только что';
    
    const betTime = new Date(timestamp);
    const now = new Date();
    const diffMs = now - betTime;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    
    if (diffSec < 10) return 'только что';
    if (diffSec < 60) return `${diffSec} сек назад`;
    if (diffMin < 60) return `${diffMin} мин назад`;
    
    return betTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

function createParticipantElement(participant, team) {
    if (!participant) return null;
    
    const isCurrentUser = participant.userId === (window.userData?.userId);
    const item = document.createElement('div');
    item.className = `participant-item ${team} ${isCurrentUser ? 'current-player' : ''} new-bet`;
    
    const avatarUrl = getUserAvatar(participant.userId, participant.username);
    const profileLink = getUserProfileLink(participant.userId, participant.username);
    const timeText = formatBetTime(participant.timestamp);
    
    item.innerHTML = `
        <img src="${avatarUrl}" 
             alt="${participant.username}" 
             class="participant-avatar"
             onclick="window.open('${profileLink}', '_blank')"
             onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(participant.userId)}&size=40'">
        
        <div class="participant-info">
            <div class="participant-name ${isCurrentUser ? 'current-player' : ''}">
                ${participant.username || 'Игрок'} ${isCurrentUser ? '(Вы)' : ''}
            </div>
            <div class="participant-time">
                <span class="timer-icon">⏱</span>
                <span class="time-text">${timeText}</span>
            </div>
        </div>
        
        <div class="participant-bet">
            ${(participant.amount || 0).toFixed(9)} S
        </div>
    `;
    
    setTimeout(() => {
        item.classList.remove('new-bet');
    }, 2000);
    
    return item;
}

function updateAllBetTimers() {
    const timeElements = document.querySelectorAll('.time-text');
    const now = new Date();
    
    timeElements.forEach(element => {
        const participantItem = element.closest('.participant-item');
        if (participantItem) {
            const participantName = participantItem.querySelector('.participant-name').textContent;
            const team = participantItem.classList.contains('eagle') ? 'eagle' : 'tails';
            
            const participants = lotteryData[team] || [];
            const participant = participants.find(p => 
                p.username && participantName.includes(p.username.replace('(Вы)', '').trim())
            );
            
            if (participant && participant.timestamp) {
                const newTimeText = formatBetTime(participant.timestamp);
                element.textContent = newTimeText;
            }
        }
    });
}

function startRealTimeUpdates() {
    setInterval(() => {
        updateAllBetTimers();
    }, 1000);
}

// ========== КОМАНДНАЯ ЛОТЕРЕЯ ==========
async function loadLotteryStatus() {
    try {
        const now = Date.now();
        if (now - lastLotteryUpdate < 2000) return;
        
        console.log('🔄 Загрузка статуса командной лотереи...');
        const data = await apiRequest('/api/lottery/status');
        
        if (data && data.success && data.lottery) {
            lotteryData.eagle = data.lottery.eagle || [];
            lotteryData.tails = data.lottery.tails || [];
            lotteryData.last_winner = data.lottery.last_winner || null;
            currentLotteryTimer = data.lottery.timer || 60;
            lotteryData.total_eagle = data.lottery.total_eagle || 0;
            lotteryData.total_tails = data.lottery.total_tails || 0;
            lotteryData.participants_count = data.lottery.participants_count || 0;
            
            console.log('✅ Данные командной лотереи загружены:', currentLotteryTimer + 'сек');
            updateLotteryUI();
            lastLotteryUpdate = now;
        } else {
            updateLotteryUI();
        }
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки лотереи:', error);
        updateLotteryUI();
    }
}

async function placeLotteryBet(team, amount) {
    console.log(`🎯 Размещение ставки: ${team}, ${amount}`);
    
    if (!window.userData) {
        showNotification('Данные пользователя не загружены', 'error');
        return false;
    }

    const betData = {
        userId: window.userData.userId,
        username: window.userData.username,
        amount: amount,
        timestamp: new Date().toISOString(),
        team: team
    };

    try {
        const response = await apiRequest('/api/lottery/bet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(betData)
        });
        
        if (response && response.success) {
            window.userData.balance = parseFloat(window.userData.balance) - amount;
            window.userData.totalBet = (window.userData.totalBet || 0) + amount;
            window.userData.lastUpdate = Date.now();
            
            lotteryData[team].unshift(betData);
            
            if (team === 'eagle') {
                lotteryData.total_eagle += amount;
            } else {
                lotteryData.total_tails += amount;
            }
            
            lotteryData.participants_count = lotteryData.eagle.length + lotteryData.tails.length;
            
            updateUI();
            updateLotteryUI();
            saveUserData();
            
            showNotification(`Ставка ${amount.toFixed(9)} S за команду ${team === 'eagle' ? '🦅 Орлов' : '🪙 Решки'} принята!`, 'success');
            return true;
        } else {
            showNotification(`Ошибка ставки: ${response?.error || 'Неизвестная ошибка'}`, 'error');
            return false;
        }
    } catch (error) {
        console.warn('⚠️ Ошибка ставки, используем локальный режим:', error);
        
        window.userData.balance = parseFloat(window.userData.balance) - amount;
        window.userData.totalBet = (window.userData.totalBet || 0) + amount;
        
        lotteryData[team].unshift(betData);
        
        if (team === 'eagle') {
            lotteryData.total_eagle += amount;
        } else {
            lotteryData.total_tails += amount;
        }
        
        lotteryData.participants_count = lotteryData.eagle.length + lotteryData.tails.length;
        
        updateUI();
        updateLotteryUI();
        saveUserData();
        
        showNotification(`Ставка ${amount.toFixed(9)} S принята в локальном режиме!`, 'warning');
        return true;
    }
}

function updateLotteryUI() {
    try {
        const eagleList = document.getElementById('teamEagle');
        const tailsList = document.getElementById('teamTails');
        const eagleTotal = document.getElementById('eagleTotal');
        const tailsTotal = document.getElementById('tailsTotal');
        const eagleParticipants = document.getElementById('eagleParticipants');
        const tailsParticipants = document.getElementById('tailsParticipants');
        const eagleCountElement = document.getElementById('eagleParticipantsCount');
        const tailsCountElement = document.getElementById('tailsParticipantsCount');
        const lotteryTimer = document.getElementById('lotteryTimer');
        const lastWinner = document.getElementById('lastWinner');
        const winnerTeam = document.getElementById('winnerTeam');
        
        if (lotteryTimer) lotteryTimer.textContent = currentLotteryTimer;
        if (eagleTotal) eagleTotal.textContent = (lotteryData.total_eagle || 0).toFixed(9) + ' S';
        if (tailsTotal) tailsTotal.textContent = (lotteryData.total_tails || 0).toFixed(9) + ' S';
        if (eagleParticipants) eagleParticipants.textContent = lotteryData.eagle ? lotteryData.eagle.length : 0;
        if (tailsParticipants) tailsParticipants.textContent = lotteryData.tails ? lotteryData.tails.length : 0;
        if (eagleCountElement) eagleCountElement.textContent = lotteryData.eagle ? lotteryData.eagle.length : 0;
        if (tailsCountElement) tailsCountElement.textContent = lotteryData.tails ? lotteryData.tails.length : 0;
        
        if (eagleList) eagleList.innerHTML = '';
        if (tailsList) tailsList.innerHTML = '';
        
        if (eagleList && lotteryData.eagle && lotteryData.eagle.length > 0) {
            lotteryData.eagle.forEach((participant) => {
                const item = createParticipantElement(participant, 'eagle');
                if (item) eagleList.appendChild(item);
            });
        } else if (eagleList) {
            eagleList.innerHTML = '<div style="text-align: center; color: #666; padding: 15px; font-size: 12px;">Пока нет ставок</div>';
        }
        
        if (tailsList && lotteryData.tails && lotteryData.tails.length > 0) {
            lotteryData.tails.forEach((participant) => {
                const item = createParticipantElement(participant, 'tails');
                if (item) tailsList.appendChild(item);
            });
        } else if (tailsList) {
            tailsList.innerHTML = '<div style="text-align: center; color: #666; padding: 15px; font-size: 12px;">Пока нет ставок</div>';
        }
        
        const totalBet = (lotteryData.total_eagle || 0) + (lotteryData.total_tails || 0);
        let eagleChance = 50;
        let tailsChance = 50;
        
        if (totalBet > 0) {
            eagleChance = Math.round(((lotteryData.total_eagle || 0) / totalBet) * 100);
            tailsChance = 100 - eagleChance;
        }
        
        const eagleChanceElement = document.getElementById('eagleChance');
        const tailsChanceElement = document.getElementById('tailsChance');
        
        if (eagleChanceElement) eagleChanceElement.textContent = eagleChance + '%';
        if (tailsChanceElement) tailsChanceElement.textContent = tailsChance + '%';
        
        if (lastWinner && winnerTeam && lotteryData.last_winner) {
            lastWinner.style.display = 'block';
            const teamName = lotteryData.last_winner.team === 'eagle' ? '🦅 Орлы' : '🪙 Решки';
            const winnerTime = lotteryData.last_winner.timestamp ? formatBetTime(lotteryData.last_winner.timestamp) : 'Недавно';
            winnerTeam.innerHTML = `
                <div style="color: #FFD700; font-weight: bold;">${teamName}</div>
                <div style="color: white;">${lotteryData.last_winner.username || 'Победитель'}</div>
                <div style="color: #4CAF50; font-weight: bold;">${(lotteryData.last_winner.prize || 0).toFixed(9)} S</div>
                <div style="font-size: 10px; color: #ccc;">${winnerTime}</div>
            `;
        } else if (lastWinner) {
            lastWinner.style.display = 'none';
        }
        
        updateAllBetTimers();
        
    } catch (error) {
        console.error('❌ Ошибка обновления интерфейса лотереи:', error);
    }
}

function startLotteryAutoUpdate() {
    console.log('🔄 Запуск автообновления командной лотереи');
    clearInterval(lotteryUpdateInterval);
    
    loadLotteryStatus();
    
    lotteryUpdateInterval = setInterval(() => {
        loadLotteryStatus();
    }, 3000);
}

function selectTeam(team) {
    console.log(`🎯 Выбрана команда: ${team}`);
    selectedTeam = team;
    document.querySelectorAll('.team-button').forEach(btn => btn.classList.remove('active'));
    
    document.querySelectorAll('.team-button').forEach(btn => {
        if (btn.classList.contains('eagle') && team === 'eagle') {
            btn.classList.add('active');
        } else if (btn.classList.contains('tails') && team === 'tails') {
            btn.classList.add('active');
        }
    });
}

async function playTeamLottery() {
    console.log('🎮 Игра в командную лотерею');
    if (!selectedTeam) {
        showNotification('Выберите команду!', 'error');
        return;
    }
    
    const betInput = document.getElementById('teamBet');
    if (!betInput) return;
    
    const bet = parseFloat(betInput.value);
    
    if (isNaN(bet) || bet <= 0) {
        showNotification('Введите корректную сумму ставки', 'error');
        return;
    }
    
    if (window.userData && parseFloat(window.userData.balance) < bet) {
        showNotification('Недостаточно средств', 'error');
        return;
    }
    
    if (bet < 0.000000001) {
        showNotification('Минимальная ставка 0.000000001 S', 'error');
        return;
    }
    
    const success = await placeLotteryBet(selectedTeam, bet);
    
    if (success) {
        document.querySelectorAll('.team-button').forEach(btn => {
            btn.classList.remove('active');
        });
        selectedTeam = null;
        if (betInput) betInput.value = '0.000000100';
    }
}

// ========== КЛАССИЧЕСКАЯ ЛОТЕРЕЯ ==========
async function loadClassicLottery() {
    try {
        const now = Date.now();
        if (now - lastClassicUpdate < 2000) return;
        
        console.log('🔄 Загрузка статуса классической лотереи...');
        const data = await apiRequest('/api/classic-lottery/status');
        
        if (data && data.success && data.lottery) {
            classicLotteryData.bets = data.lottery.bets || [];
            classicLotteryData.total_pot = data.lottery.total_pot || 0;
            currentClassicTimer = data.lottery.timer || 120;
            classicLotteryData.participants_count = data.lottery.participants_count || 0;
            classicLotteryData.history = data.lottery.history || [];
            
            console.log('✅ Данные классической лотереи загружены:', currentClassicTimer + 'сек');
            updateClassicLotteryUI();
            lastClassicUpdate = now;
        } else {
            console.log('⚠️ Нет данных классической лотереи');
            updateClassicLotteryUI();
        }
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки классической лотереи:', error);
        updateClassicLotteryUI();
    }
}

async function playClassicLottery() {
    console.log('🎮 Игра в классическую лотерею');
    const betInput = document.getElementById('classicBet');
    if (!betInput) return;
    
    const bet = parseFloat(betInput.value);
    
    if (isNaN(bet) || bet <= 0) {
        showNotification('Введите корректную сумму ставки', 'error');
        return;
    }
    
    if (window.userData && parseFloat(window.userData.balance) < bet) {
        showNotification('Недостаточно средств', 'error');
        return;
    }
    
    if (bet < 0.000000001) {
        showNotification('Минимальная ставка 0.000000001 S', 'error');
        return;
    }
    
    if (!window.userData.userId || !bet || !window.userData.username) {
        showNotification('Ошибка данных', 'error');
        return;
    }
    
    try {
        const response = await apiRequest('/api/classic-lottery/bet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: window.userData.userId,
                amount: bet,
                username: window.userData.username
            })
        });
        
        if (response && response.success) {
            window.userData.balance = parseFloat(window.userData.balance) - bet;
            window.userData.totalBet = (window.userData.totalBet || 0) + bet;
            window.userData.lastUpdate = Date.now();
            
            updateUI();
            saveUserData();
            
            await loadClassicLottery();
            
            showNotification(`Ставка ${bet.toFixed(9)} S принята!`, 'success');
        } else {
            showNotification(`Ошибка ставки: ${response?.error || 'Неизвестная ошибка'}`, 'error');
        }
    } catch (error) {
        console.warn('⚠️ Ошибка ставки, используем локальный режим:', error);
        
        window.userData.balance = parseFloat(window.userData.balance) - bet;
        window.userData.totalBet = (window.userData.totalBet || 0) + bet;
        
        const betData = {
            userId: window.userData.userId,
            username: window.userData.username,
            amount: bet,
            timestamp: new Date().toISOString()
        };
        
        classicLotteryData.bets.push(betData);
        classicLotteryData.total_pot += bet;
        classicLotteryData.participants_count = classicLotteryData.bets.length;
        
        updateUI();
        updateClassicLotteryUI();
        saveUserData();
        
        showNotification(`Ставка ${bet.toFixed(9)} S принята в локальном режиме!`, 'warning');
    }
}

function updateClassicLotteryUI() {
    try {
        const classicTimer = document.getElementById('classicTimer');
        const lotteryPot = document.getElementById('lotteryPot');
        const lotteryParticipants = document.getElementById('lotteryParticipants');
        const historyElement = document.getElementById('classicHistory');
        
        if (classicTimer) classicTimer.textContent = currentClassicTimer;
        if (lotteryPot) lotteryPot.textContent = (classicLotteryData.total_pot || 0).toFixed(9);
        if (lotteryParticipants) lotteryParticipants.textContent = classicLotteryData.participants_count || 0;
        
        if (historyElement) {
            historyElement.innerHTML = '';
            
            if (classicLotteryData.history && Array.isArray(classicLotteryData.history)) {
                classicLotteryData.history.forEach(item => {
                    if (!item) return;
                    
                    const historyItem = document.createElement('div');
                    const isCurrentUser = window.userData?.username && 
                        (item.winner === window.userData.username || 
                         (item.winner && window.userData.username.includes(item.winner)) ||
                         (item.winner && item.winner.includes(window.userData.username)));
                    
                    historyItem.className = `history-item ${isCurrentUser ? 'current-player' : 'lost'}`;
                    historyItem.innerHTML = `
                        <div style="font-weight: bold; color: ${isCurrentUser ? '#FFD700' : '#fff'};">${item.winner || 'Победитель'} ${isCurrentUser ? '👑' : ''}</div>
                        <div style="color: ${isCurrentUser ? '#4CAF50' : '#f44336'};">
                            ${isCurrentUser ? 'Выиграл' : 'Проиграл'} ${(item.prize || 0).toFixed(9)} S
                        </div>
                        <div style="font-size: 10px; color: #ccc;">Участников: ${item.participants || 0}</div>
                    `;
                    historyElement.appendChild(historyItem);
                });
            } else {
                historyElement.innerHTML = '<div style="text-align: center; color: #666; padding: 20px; font-size: 12px;">История розыгрышей пуста</div>';
            }
        }
    } catch (error) {
        console.error('❌ Ошибка обновления интерфейса классической лотереи:', error);
    }
}

function startClassicLotteryUpdate() {
    console.log('🔄 Запуск автообновления классической лотереи');
    clearInterval(classicLotteryInterval);
    
    loadClassicLottery();
    
    classicLotteryInterval = setInterval(() => {
        loadClassicLottery();
    }, 3000);
}

// ========== ТОП ПОБЕДИТЕЛЕЙ - ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ ==========
async function updateTopWinners() {
    try {
        console.log('🏆 Загрузка топа победителей...');
        const data = await apiRequest('/api/top/winners?limit=50');
        
        if (data && data.success && data.winners) {
            const topWinnersElement = document.getElementById('topWinners');
            if (topWinnersElement) {
                topWinnersElement.innerHTML = '';
                
                if (data.winners && Array.isArray(data.winners)) {
                    data.winners.forEach((winner, index) => {
                        if (!winner) return;
                        
                        const isCurrentUser = window.userData?.username && 
                            (winner.username === window.userData.username || 
                             (winner.username && window.userData.username.includes(winner.username)) ||
                             (winner.username && winner.username.includes(window.userData.username)));
                        
                        const winnerItem = document.createElement('div');
                        winnerItem.className = `winner-item ${isCurrentUser ? 'current-player' : ''}`;
                        const netWinnings = winner.netWinnings || 0;
                        winnerItem.innerHTML = `
                            <div class="winner-rank">${index + 1}</div>
                            <div class="winner-name ${isCurrentUser ? 'current-player' : ''}">${winner.username || 'Игрок'} ${isCurrentUser ? '👑' : ''}</div>
                            <div class="winner-amount ${netWinnings >= 0 ? 'positive' : 'negative'}">
                                ${netWinnings.toFixed(9)} S
                            </div>
                        `;
                        topWinnersElement.appendChild(winnerItem);
                    });
                } else {
                    topWinnersElement.innerHTML = '<div class="winner-item"><div class="winner-name">Победителей пока нет</div></div>';
                }
            }
        } else {
            console.log('⚠️ Нет данных топа победителей');
            const topWinnersElement = document.getElementById('topWinners');
            if (topWinnersElement) {
                topWinnersElement.innerHTML = '<div class="winner-item"><div class="winner-name">Данные временно недоступны</div></div>';
            }
        }
    } catch (error) {
        console.warn('⚠️ Ошибка обновления топа победителей:', error);
        const topWinnersElement = document.getElementById('topWinners');
        if (topWinnersElement) {
            topWinnersElement.innerHTML = '<div class="winner-item"><div class="winner-name">Ошибка загрузки</div></div>';
        }
    }
}

// ========== ИСПРАВЛЕННЫЙ РЕЙТИНГ С ПРАВИЛЬНЫМ РАСЧЁТОМ СКОРОСТИ ==========
async function updateLeaderboard() {
    try {
        console.log('📊 Загрузка рейтинга по балансу...');
        const userId = window.userData?.userId;
        const data = await apiRequest(`/api/leaderboard?type=balance&limit=20`);
        
        const leaderboard = document.getElementById('leaderboard');
        if (!leaderboard) return;
        
        if (!data || !data.success || !data.leaderboard) {
            leaderboard.innerHTML = '<div class="leader-item">🏆 Стань первым в рейтинге!</div>';
            return;
        }
        
        let newHTML = '';
        
        data.leaderboard.forEach((player, index) => {
            if (!player || typeof player !== 'object') {
                return;
            }
            
            const rank = index + 1;
            const name = player.username || `Игрок ${rank}`;
            const balance = typeof player.balance === 'number' ? player.balance : 0;
            const isCurrent = player.userId === userId || 
                (player.username && window.userData?.username && 
                 (player.username === window.userData.username ||
                  player.username.includes(window.userData.username) || 
                  window.userData.username.includes(player.username)));
            const currentClass = isCurrent ? 'current-player' : '';
            
            newHTML += `
                <div class="leader-item ${currentClass}">
                    <div class="leader-rank">${rank} место</div>
                    <div class="leader-name ${currentClass}">${name} ${isCurrent ? '👑' : ''}</div>
                    <div class="leader-balance">${balance.toFixed(9)} S</div>
                </div>
            `;
        });
        
        leaderboard.innerHTML = newHTML;
        
    } catch (error) {
        console.error('Ошибка обновления рейтинга:', error);
        const leaderboard = document.getElementById('leaderboard');
        if (leaderboard) {
            leaderboard.innerHTML = '<div class="leader-item">Ошибка загрузки рейтинга</div>';
        }
    }
}

async function updateSpeedLeaderboard() {
    try {
        console.log('⚡ Загрузка рейтинга по скорости...');
        const userId = window.userData?.userId;
        const data = await apiRequest(`/api/leaderboard?type=speed&limit=20`);
        
        const leaderboard = document.getElementById('speedLeaderboard');
        if (!leaderboard) return;
        
        if (!data || !data.success || !data.leaderboard) {
            leaderboard.innerHTML = '<div class="leader-item">🏆 Стань первым в рейтинге скорости!</div>';
            return;
        }
        
        let newHTML = '';
        
        data.leaderboard.forEach((player, index) => {
            if (!player || typeof player !== 'object') {
                return;
            }
            
            const rank = index + 1;
            const name = player.username || `Игрок ${rank}`;
            
            // РАСЧЕТ СКОРОСТИ ДЛЯ КАЖДОГО ИГРОКА ИЗ ДАННЫХ УЛУЧШЕНИЙ
            let mineSpeed = 0.000000000;
            let clickSpeed = 0.000000000;
            
            if (player.upgrades) {
                try {
                    // Расчет скорости майнинга из улучшений GPU/CPU
                    if (typeof player.upgrades === 'string') {
                        try {
                            player.upgrades = JSON.parse(player.upgrades);
                        } catch (e) {
                            console.error('Ошибка парсинга улучшений:', e);
                        }
                    }
                    
                    if (player.upgrades && typeof player.upgrades === 'object') {
                        for (const key in player.upgrades) {
                            if (key.startsWith('gpu') || key.startsWith('cpu')) {
                                const level = typeof player.upgrades[key] === 'number' ? player.upgrades[key] : 
                                            (player.upgrades[key]?.level || 0);
                                const upgrade = window.UPGRADES ? window.UPGRADES[key] : null;
                                if (upgrade && upgrade.baseBonus) {
                                    mineSpeed += level * upgrade.baseBonus;
                                }
                            }
                            if (key.startsWith('mouse')) {
                                const level = typeof player.upgrades[key] === 'number' ? player.upgrades[key] : 
                                            (player.upgrades[key]?.level || 0);
                                const upgrade = window.UPGRADES ? window.UPGRADES[key] : null;
                                if (upgrade && upgrade.baseBonus) {
                                    clickSpeed += level * upgrade.baseBonus;
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('Ошибка расчета скорости для игрока:', player.username, error);
                }
            }
            
            // Если у игрока нет данных об улучшениях, используем базовые значения
            if (mineSpeed === 0 && player.mineSpeed) {
                mineSpeed = parseFloat(player.mineSpeed) || 0.000000000;
            }
            if (clickSpeed === 0 && player.clickSpeed) {
                clickSpeed = parseFloat(player.clickSpeed) || 0.000000001;
            }
            
            const totalSpeed = mineSpeed + clickSpeed;
            const isCurrent = player.userId === userId || 
                (player.username && window.userData?.username && 
                 (player.username === window.userData.username ||
                  player.username.includes(window.userData.username) || 
                  window.userData.username.includes(player.username)));
            const currentClass = isCurrent ? 'current-player' : '';
            
            newHTML += `
                <div class="leader-item ${currentClass}">
                    <div class="leader-rank">${rank} место</div>
                    <div class="leader-name ${currentClass}">${name} ${isCurrent ? '👑' : ''}</div>
                    <div class="leader-speed">${totalSpeed.toFixed(9)} S/сек</div>
                </div>
            `;
        });
        
        leaderboard.innerHTML = newHTML;
        
    } catch (error) {
        console.error('Ошибка обновления рейтинга скорости:', error);
        const leaderboard = document.getElementById('speedLeaderboard');
        if (leaderboard) {
            leaderboard.innerHTML = '<div class="leader-item">Ошибка загрузки рейтинга</div>';
        }
    }
}

// ========== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ HTML ==========
window.selectTeam = selectTeam;
window.playTeamLottery = playTeamLottery;
window.playClassicLottery = playClassicLottery;
window.updateLeaderboard = updateLeaderboard;
window.updateSpeedLeaderboard = updateSpeedLeaderboard;
window.updateTopWinners = updateTopWinners;

// ========== АВТОЗАПУСК ПРИ ЗАГРУЗКЕ ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Инициализация улучшенной игровой системы...');
    
    setTimeout(() => {
        startTimerSync(); // Запускаем синхронизацию времени ПЕРВЫМ
        startLotteryAutoUpdate();
        startClassicLotteryUpdate();
        startRealTimeUpdates();
        updateTopWinners();
        updateLeaderboard();
        updateSpeedLeaderboard();
        
        console.log('✅ Улучшенная игровая система полностью инициализирована');
    }, 2000);
});

console.log('✅ ПОЛНЫЙ ИСПРАВЛЕННЫЙ КОД ИГР УСПЕШНО ЗАГРУЖЕН!');
