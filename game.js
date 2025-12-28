// game.js - ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ И УЛУЧШЕННЫЙ КОД С РЕАЛЬНЫМИ ЛОТЕРЕЯМИ
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
        participants_count: 0,
        current_winner: null,
        last_draw_time: 0
    };
}

if (typeof classicLotteryData === 'undefined') {
    var classicLotteryData = {
        bets: [],
        total_pot: 0,
        timer: 120,
        participants_count: 0,
        history: [],
        current_winner: null,
        last_draw_time: 0
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
let lotteryTimerInterval;
let classicTimerInterval;
let currentLotteryRound = 0;
let currentClassicRound = 0;
let shownWinners = new Set();

// ========== УЛУЧШЕННАЯ СИСТЕМА СИНХРОНИЗИРОВАННЫХ ТАЙМЕРОВ С РЕАЛЬНЫМ РАСПИСАНИЕМ ==========

// Синхронизированные таймеры с мировым временем
function startSyncedTimers() {
    console.log('⏰ Запуск синхронизированных таймеров...');
    
    // Очищаем предыдущие интервалы
    if (lotteryTimerInterval) clearInterval(lotteryTimerInterval);
    if (classicTimerInterval) clearInterval(classicTimerInterval);
    
    // Начальная синхронизация
    updateLotteryTimer();
    updateClassicTimer();
    
    // Таймер командной лотереи (60 секунд)
    lotteryTimerInterval = setInterval(() => {
        updateLotteryTimer();
        
        // Когда таймер достигает 1, запускаем розыгрыш
        if (lotteryData.timer === 1) {
            setTimeout(() => {
                performLotteryDraw();
            }, 100);
        }
        
        // Обновляем данные каждые 5 секунд
        if (lotteryData.timer % 5 === 0) {
            loadLotteryStatus();
        }
    }, 1000);
    
    // Таймер классической лотереи (120 секунд)
    classicTimerInterval = setInterval(() => {
        updateClassicTimer();
        
        // Когда таймер достигает 1, запускаем розыгрыш
        if (classicLotteryData.timer === 1) {
            setTimeout(() => {
                performClassicDraw();
            }, 100);
        }
        
        // Обновляем данные каждые 10 секунд
        if (classicLotteryData.timer % 10 === 0) {
            loadClassicLottery();
        }
    }, 1000);
    
    console.log('✅ Синхронизированные таймеры запущены');
}

// Обновление таймера командной лотереи
function updateLotteryTimer() {
    const now = Math.floor(Date.now() / 1000);
    lotteryData.timer = 60 - (now % 60);
    
    // Обновляем UI
    const lotteryTimer = document.getElementById('lotteryTimer');
    if (lotteryTimer) {
        lotteryTimer.textContent = lotteryData.timer;
        lotteryTimer.style.color = lotteryData.timer <= 10 ? '#FF5252' : '#4CAF50';
        lotteryTimer.style.fontWeight = lotteryData.timer <= 5 ? 'bold' : 'normal';
        
        // Анимация для последних 10 секунд
        if (lotteryData.timer <= 10) {
            lotteryTimer.style.animation = lotteryData.timer <= 5 ? 
                'pulse 0.5s infinite alternate' : 'none';
        }
    }
}

// Обновление таймера классической лотереи
function updateClassicTimer() {
    const now = Math.floor(Date.now() / 1000);
    classicLotteryData.timer = 120 - (now % 120);
    
    // Обновляем UI
    const classicTimer = document.getElementById('classicTimer');
    if (classicTimer) {
        classicTimer.textContent = classicLotteryData.timer;
        classicTimer.style.color = classicLotteryData.timer <= 20 ? '#FF5252' : '#4CAF50';
        classicTimer.style.fontWeight = classicLotteryData.timer <= 10 ? 'bold' : 'normal';
        
        // Анимация для последних 20 секунд
        if (classicLotteryData.timer <= 20) {
            classicTimer.style.animation = classicLotteryData.timer <= 10 ? 
                'pulse 0.5s infinite alternate' : 'none';
        }
    }
}

// ========== ИСПРАВЛЕННЫЕ ФУНКЦИИ ДЛЯ АВАТАРОК И ТАЙМЕРОВ ==========

// Функция для получения аватарки пользователя
function getUserAvatar(userId, username) {
    const avatarSeed = userId || username || 'default';
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed)}&size=40`;
}

// Функция для получения ссылки на профиль
function getUserProfileLink(userId, username) {
    if (userId && userId.startsWith('tg_')) {
        const tgId = userId.replace('tg_', '');
        return `https://t.me/${username?.replace('@', '') || tgId}`;
    }
    return `https://t.me/${username?.replace('@', '') || 'sparkcoin'}`;
}

// Улучшенная функция для форматирования времени ставки
function formatBetTime(timestamp) {
    if (!timestamp) return 'только что';
    
    const betTime = new Date(timestamp);
    const now = new Date();
    const diffMs = now - betTime;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    
    if (diffSec < 5) return 'только что';
    if (diffSec < 60) return `${diffSec} сек назад`;
    if (diffMin < 60) return `${diffMin} мин назад`;
    
    return betTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Функция для создания элемента участника с улучшенным дизайном
function createParticipantElement(participant, team) {
    if (!participant) return null;
    
    const isCurrentUser = participant.userId === (window.userData?.userId);
    const item = document.createElement('div');
    item.className = `participant-item ${team} ${isCurrentUser ? 'current-player' : ''} new-bet`;
    
    const avatarUrl = getUserAvatar(participant.userId, participant.username);
    const profileLink = getUserProfileLink(participant.userId, participant.username);
    const timeText = formatBetTime(participant.timestamp);
    
    item.innerHTML = `
        <div class="participant-avatar-container">
            <img src="${avatarUrl}" 
                 alt="${participant.username}" 
                 class="participant-avatar"
                 onclick="window.open('${profileLink}', '_blank')"
                 onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(participant.userId)}&size=40'">
            ${isCurrentUser ? '<div class="current-user-badge">Вы</div>' : ''}
        </div>
        
        <div class="participant-info">
            <div class="participant-name ${isCurrentUser ? 'current-player' : ''}">
                ${participant.username || 'Игрок'}
            </div>
            <div class="participant-time">
                <span class="timer-icon">⏱</span>
                <span class="time-text">${timeText}</span>
            </div>
        </div>
        
        <div class="participant-bet">
            <span class="bet-amount">${(participant.amount || 0).toFixed(9)}</span>
            <span class="bet-currency">S</span>
        </div>
    `;
    
    // Убираем анимацию через 3 секунды
    setTimeout(() => {
        item.classList.remove('new-bet');
    }, 3000);
    
    return item;
}

// ========== КОМАНДНАЯ ЛОТЕРЕЯ - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ==========

async function loadLotteryStatus() {
    try {
        const now = Date.now();
        if (now - lastLotteryUpdate < 2000) return;
        
        console.log('🔄 Загрузка статуса командной лотереи...');
        const data = await apiRequest('/api/lottery/status');
        
        if (data && data.success && data.lottery) {
            // Сохраняем данные
            lotteryData.eagle = data.lottery.eagle || [];
            lotteryData.tails = data.lottery.tails || [];
            lotteryData.last_winner = data.lottery.last_winner || null;
            lotteryData.total_eagle = data.lottery.total_eagle || 0;
            lotteryData.total_tails = data.lottery.total_tails || 0;
            lotteryData.participants_count = data.lottery.participants_count || 0;
            lotteryData.current_winner = data.lottery.current_winner || null;
            
            // Обработка текущего победителя
            if (lotteryData.current_winner) {
                handleCurrentWinner(lotteryData.current_winner, 'team');
            }
            
            console.log('✅ Данные командной лотереи загружены');
            updateLotteryUI();
            lastLotteryUpdate = now;
        } else {
            console.log('⚠️ Нет данных лотереи');
        }
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки лотереи:', error);
    }
}

// Обработка текущего победителя
function handleCurrentWinner(winner, type) {
    const winnerKey = `${type}_${winner.userId}_${winner.timestamp || Date.now()}`;
    
    // Проверяем, не показывали ли уже этого победителя
    if (!shownWinners.has(winnerKey)) {
        shownWinners.add(winnerKey);
        
        // Показываем попап только если это текущий пользователь
        if (winner.userId === window.userData?.userId) {
            setTimeout(() => {
                showWinnerPopup(winner, type);
            }, 1000);
        }
        
        // Обновляем UI победителя
        updateWinnerUI(winner, type);
    }
}

// Показ попапа победителя
function showWinnerPopup(winner, type) {
    const popup = document.getElementById('winnerPopup');
    const emoji = document.getElementById('winnerEmoji');
    const text = document.getElementById('winnerText');
    const amount = document.getElementById('winnerAmount');
    const details = document.getElementById('winnerDetails');
    
    if (!popup) return;
    
    const isTeamLottery = type === 'team';
    const prize = winner.prize || 0;
    
    emoji.textContent = isTeamLottery ? (winner.team === 'eagle' ? '🦅' : '🪙') : '🏆';
    text.textContent = isTeamLottery ? 
        `Победа команды ${winner.team === 'eagle' ? 'Орлов' : 'Решек'}!` : 
        'Победа в классической лотерее!';
    amount.textContent = `+${prize.toFixed(9)} S`;
    details.innerHTML = isTeamLottery ? 
        `Вы выиграли ${prize.toFixed(9)} S за команду ${winner.team === 'eagle' ? 'Орлов' : 'Решек'}` :
        `Вы выиграли главный приз ${prize.toFixed(9)} S`;
    
    popup.style.display = 'flex';
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
        popup.style.display = 'none';
    }, 5000);
}

// Обновление UI победителя
function updateWinnerUI(winner, type) {
    if (type === 'team') {
        const lastWinnerElement = document.getElementById('lastWinner');
        const winnerTeamElement = document.getElementById('winnerTeam');
        
        if (lastWinnerElement && winnerTeamElement) {
            lastWinnerElement.style.display = 'block';
            const teamName = winner.team === 'eagle' ? '🦅 Орлы' : '🪙 Решки';
            winnerTeamElement.innerHTML = `
                <div class="winner-team">${teamName}</div>
                <div class="winner-name">${winner.username || 'Победитель'}</div>
                <div class="winner-prize">${(winner.prize || 0).toFixed(9)} S</div>
                <div class="winner-time">${formatBetTime(winner.timestamp)}</div>
            `;
        }
    }
}

// ФУНКЦИЯ ВЫБОРА КОМАНДЫ (ОТСУТСТВОВАЛА В ПРЕДЫДУЩЕМ КОДЕ)
function selectTeam(team) {
    console.log(`🎯 Выбрана команда: ${team}`);
    selectedTeam = team;
    
    // Убираем активный класс со всех кнопок
    document.querySelectorAll('.team-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Добавляем активный класс выбранной кнопке
    const selectedButton = document.querySelector(`.team-button.${team}`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
}

// ОБНОВЛЕННАЯ ФУНКЦИЯ СТАВКИ ДЛЯ КОМАНДНОЙ ЛОТЕРЕИ
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
            // Обновляем баланс
            window.userData.balance = parseFloat(window.userData.balance) - amount;
            window.userData.totalBet = (window.userData.totalBet || 0) + amount;
            window.userData.lastUpdate = Date.now();
            
            // Добавляем ставку в локальные данные
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
        
        // ЛОКАЛЬНЫЙ РЕЖИМ
        window.userData.balance = parseFloat(window.userData.balance) - amount;
        window.userData.totalBet = (window.userData.totalBet || 0) + amount;
        
        // Добавляем ставку в локальные данные
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

// ФУНКЦИЯ ИГРЫ В КОМАНДНУЮ ЛОТТЕРЕЮ (ОТСУТСТВОВАЛА)
function playTeamLottery() {
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
    
    const success = placeLotteryBet(selectedTeam, bet);
    
    if (success) {
        selectedTeam = null;
        document.querySelectorAll('.team-button').forEach(btn => {
            btn.classList.remove('active');
        });
        if (betInput) betInput.value = '0.000000100';
    }
}

// Обновление UI командной лотереи
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
        
        if (eagleTotal) eagleTotal.textContent = (lotteryData.total_eagle || 0).toFixed(9) + ' S';
        if (tailsTotal) tailsTotal.textContent = (lotteryData.total_tails || 0).toFixed(9) + ' S';
        if (eagleParticipants) eagleParticipants.textContent = lotteryData.eagle ? lotteryData.eagle.length : 0;
        if (tailsParticipants) tailsParticipants.textContent = lotteryData.tails ? lotteryData.tails.length : 0;
        if (eagleCountElement) eagleCountElement.textContent = lotteryData.eagle ? lotteryData.eagle.length : 0;
        if (tailsCountElement) tailsCountElement.textContent = lotteryData.tails ? lotteryData.tails.length : 0;
        
        // Очищаем списки
        if (eagleList) eagleList.innerHTML = '';
        if (tailsList) tailsList.innerHTML = '';
        
        // Заполняем список Орлов
        if (eagleList && lotteryData.eagle && lotteryData.eagle.length > 0) {
            lotteryData.eagle.forEach((participant) => {
                const item = createParticipantElement(participant, 'eagle');
                if (item) eagleList.appendChild(item);
            });
        } else if (eagleList) {
            eagleList.innerHTML = '<div class="empty-participants">Пока нет ставок</div>';
        }
        
        // Заполняем список Решек
        if (tailsList && lotteryData.tails && lotteryData.tails.length > 0) {
            lotteryData.tails.forEach((participant) => {
                const item = createParticipantElement(participant, 'tails');
                if (item) tailsList.appendChild(item);
            });
        } else if (tailsList) {
            tailsList.innerHTML = '<div class="empty-participants">Пока нет ставок</div>';
        }
        
        // Обновляем шансы
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
        
        // Обновляем прогресс-бары
        updateTeamProgressBars(eagleChance, tailsChance);
        
    } catch (error) {
        console.error('❌ Ошибка обновления интерфейса лотереи:', error);
    }
}

// Обновление прогресс-баров команд
function updateTeamProgressBars(eagleChance, tailsChance) {
    const eagleProgress = document.getElementById('eagleProgress');
    const tailsProgress = document.getElementById('tailsProgress');
    
    if (eagleProgress) {
        eagleProgress.style.width = eagleChance + '%';
        eagleProgress.style.backgroundColor = eagleChance > tailsChance ? '#4CAF50' : '#f44336';
    }
    
    if (tailsProgress) {
        tailsProgress.style.width = tailsChance + '%';
        tailsProgress.style.backgroundColor = tailsChance > eagleChance ? '#4CAF50' : '#f44336';
    }
}

// Выполнение розыгрыша командной лотереи
async function performLotteryDraw() {
    console.log('🎯 Выполнение розыгрыша командной лотереи...');
    
    try {
        // Загружаем обновленные данные
        await loadLotteryStatus();
        
        // Показываем анимацию розыгрыша
        showDrawAnimation('team');
        
    } catch (error) {
        console.error('❌ Ошибка выполнения розыгрыша:', error);
    }
}

// ========== КЛАССИЧЕСКАЯ ЛОТЕРЕЯ - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ==========

async function loadClassicLottery() {
    try {
        const now = Date.now();
        if (now - lastClassicUpdate < 2000) return;
        
        console.log('🔄 Загрузка статуса классической лотереи...');
        const data = await apiRequest('/api/classic-lottery/status');
        
        if (data && data.success && data.lottery) {
            // Сохраняем данные
            classicLotteryData.bets = data.lottery.bets || [];
            classicLotteryData.total_pot = data.lottery.total_pot || 0;
            classicLotteryData.participants_count = data.lottery.participants_count || 0;
            classicLotteryData.history = data.lottery.history || [];
            classicLotteryData.current_winner = data.lottery.current_winner || null;
            
            // Обработка текущего победителя
            if (classicLotteryData.current_winner) {
                handleCurrentWinner(classicLotteryData.current_winner, 'classic');
            }
            
            console.log('✅ Данные классической лотереи загружены');
            updateClassicLotteryUI();
            lastClassicUpdate = now;
        } else {
            console.log('⚠️ Нет данных классической лотереи');
        }
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки классической лотереи:', error);
    }
}

// ФУНКЦИЯ ИГРЫ В КЛАССИЧЕСКУЮ ЛОТТЕРЕЮ (ОТСУТСТВОВАЛА)
function playClassicLottery() {
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
        // Используем функцию из api.js для ставки
        apiRequest('/api/classic-lottery/bet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: window.userData.userId,
                amount: bet,
                username: window.userData.username
            })
        }).then(response => {
            if (response && response.success) {
                window.userData.balance = parseFloat(window.userData.balance) - bet;
                window.userData.totalBet = (window.userData.totalBet || 0) + bet;
                window.userData.lastUpdate = Date.now();
                
                updateUI();
                saveUserData();
                
                // Обновляем данные лотереи
                loadClassicLottery();
                
                showNotification(`Ставка ${bet.toFixed(9)} S принята!`, 'success');
            } else {
                showNotification(`Ошибка ставки: ${response?.error || 'Неизвестная ошибка'}`, 'error');
            }
        }).catch(error => {
            console.warn('⚠️ Ошибка ставки:', error);
            
            // Локальный режим для обеспечения работоспособности
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
        });
    } catch (error) {
        console.warn('⚠️ Общая ошибка ставки:', error);
        showNotification('Ошибка выполнения ставки', 'error');
    }
}

// Обновление UI классической лотереи
function updateClassicLotteryUI() {
    try {
        const lotteryPot = document.getElementById('lotteryPot');
        const lotteryParticipants = document.getElementById('lotteryParticipants');
        const historyElement = document.getElementById('classicHistory');
        const potProgress = document.getElementById('potProgress');
        
        if (lotteryPot) lotteryPot.textContent = (classicLotteryData.total_pot || 0).toFixed(9);
        if (lotteryParticipants) lotteryParticipants.textContent = classicLotteryData.participants_count || 0;
        
        // Обновляем прогресс банка
        if (potProgress) {
            const maxPot = 1.0;
            const potPercentage = Math.min((classicLotteryData.total_pot / maxPot) * 100, 100);
            potProgress.style.width = potPercentage + '%';
        }
        
        // Обновляем шансы текущего игрока
        const playerChanceElement = document.getElementById('playerChance');
        if (playerChanceElement && classicLotteryData.total_pot > 0 && window.userData) {
            const userBets = classicLotteryData.bets.filter(bet => bet.userId === window.userData.userId);
            const userTotalBet = userBets.reduce((sum, bet) => sum + bet.amount, 0);
            const playerChance = classicLotteryData.total_pot > 0 ? (userTotalBet / classicLotteryData.total_pot * 100).toFixed(2) : 0;
            playerChanceElement.textContent = playerChance + '%';
            
            // Обновляем прогресс шанса игрока
            const chanceProgress = document.getElementById('chanceProgress');
            if (chanceProgress) {
                chanceProgress.style.width = playerChance + '%';
            }
        }
        
        if (historyElement) {
            historyElement.innerHTML = '';
            
            if (classicLotteryData.history && Array.isArray(classicLotteryData.history)) {
                classicLotteryData.history.forEach((item, index) => {
                    if (!item) return;
                    
                    const historyItem = document.createElement('div');
                    const isWinner = item.winner === (window.userData?.username) || 
                                    item.winner_username === (window.userData?.username);
                    historyItem.className = `history-item ${isWinner ? 'won' : 'lost'}`;
                    
                    const avatarUrl = getUserAvatar(item.winner_user_id, item.winner_username);
                    
                    historyItem.innerHTML = `
                        <div class="history-avatar">
                            <img src="${avatarUrl}" alt="${item.winner_username}">
                        </div>
                        <div class="history-info">
                            <div class="history-winner">${item.winner_username || 'Победитель'}</div>
                            <div class="history-prize ${isWinner ? 'won' : 'lost'}">
                                ${isWinner ? '🏆 Выиграл' : '💸 Проиграл'} ${(item.prize || 0).toFixed(9)} S
                            </div>
                            <div class="history-time">${formatBetTime(item.timestamp)}</div>
                        </div>
                        <div class="history-rank">#${index + 1}</div>
                    `;
                    historyElement.appendChild(historyItem);
                });
            } else {
                historyElement.innerHTML = '<div class="empty-history">История розыгрышей пуста</div>';
            }
        }
    } catch (error) {
        console.error('❌ Ошибка обновления интерфейса классической лотереи:', error);
    }
}

// Выполнение розыгрыша классической лотереи
async function performClassicDraw() {
    console.log('🎰 Выполнение розыгрыша классической лотереи...');
    
    try {
        // Загружаем обновленные данные
        await loadClassicLottery();
        
        // Показываем анимацию розыгрыша
        showDrawAnimation('classic');
        
    } catch (error) {
        console.error('❌ Ошибка выполнения розыгрыша:', error);
    }
}

// Анимация розыгрыша
function showDrawAnimation(type) {
    const animationContainer = document.getElementById('drawAnimation');
    if (!animationContainer) return;
    
    const isTeam = type === 'team';
    const duration = isTeam ? 3000 : 5000;
    
    animationContainer.style.display = 'flex';
    animationContainer.innerHTML = `
        <div class="draw-animation-content">
            <div class="draw-spinner"></div>
            <div class="draw-text">Идет розыгрыш ${isTeam ? 'командной' : 'классической'} лотереи...</div>
            <div class="draw-countdown" id="drawCountdown">3</div>
        </div>
    `;
    
    // Анимация обратного отсчета
    let countdown = 3;
    const countdownElement = document.getElementById('drawCountdown');
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
            countdownElement.textContent = countdown;
            countdownElement.style.transform = 'scale(1.2)';
            setTimeout(() => {
                countdownElement.style.transform = 'scale(1)';
            }, 200);
        }
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            animationContainer.style.display = 'none';
        }
    }, 1000);
    
    // Автоматическое скрытие
    setTimeout(() => {
        animationContainer.style.display = 'none';
    }, duration);
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
                
                if (data.winners && Array.isArray(data.winners) && data.winners.length > 0) {
                    // Сортируем по чистым выигрышам
                    const sortedWinners = [...data.winners].sort((a, b) => {
                        const aNet = a.netWinnings || 0;
                        const bNet = b.netWinnings || 0;
                        return bNet - aNet;
                    });
                    
                    sortedWinners.forEach((winner, index) => {
                        if (!winner) return;
                        
                        const winnerItem = document.createElement('div');
                        const isCurrent = winner.username === window.userData?.username;
                        winnerItem.className = `winner-item ${isCurrent ? 'current-player' : ''}`;
                        
                        const netWinnings = winner.netWinnings || 0;
                        const avatarUrl = getUserAvatar(winner.userId, winner.username);
                        
                        winnerItem.innerHTML = `
                            <div class="winner-rank">
                                <div class="rank-number">${index + 1}</div>
                                <div class="rank-medal">${getMedalEmoji(index + 1)}</div>
                            </div>
                            <div class="winner-avatar">
                                <img src="${avatarUrl}" alt="${winner.username}">
                            </div>
                            <div class="winner-info">
                                <div class="winner-name ${isCurrent ? 'current-player' : ''}">
                                    ${winner.username || 'Игрок'} ${isCurrent ? '👑' : ''}
                                </div>
                                <div class="winner-stats">
                                    <span class="stat-wins">🏆 ${winner.totalWinnings || 0}</span>
                                    <span class="stat-losses">💸 ${winner.totalLosses || 0}</span>
                                </div>
                            </div>
                            <div class="winner-amount ${netWinnings >= 0 ? 'positive' : 'negative'}">
                                ${netWinnings >= 0 ? '+' : ''}${netWinnings.toFixed(9)} S
                            </div>
                        `;
                        topWinnersElement.appendChild(winnerItem);
                    });
                } else {
                    topWinnersElement.innerHTML = '<div class="empty-winners">🏆 Стань первым победителем!</div>';
                }
            }
        } else {
            console.log('⚠️ Нет данных топа победителей');
            const topWinnersElement = document.getElementById('topWinners');
            if (topWinnersElement) {
                topWinnersElement.innerHTML = '<div class="empty-winners">🏆 Стань первым победителем!</div>';
            }
        }
    } catch (error) {
        console.warn('⚠️ Ошибка обновления топа победителей:', error);
        const topWinnersElement = document.getElementById('topWinners');
        if (topWinnersElement) {
            topWinnersElement.innerHTML = '<div class="empty-winners">Ошибка загрузки топа</div>';
        }
    }
}

// Получение эмодзи медали по позиции
function getMedalEmoji(position) {
    switch(position) {
        case 1: return '🥇';
        case 2: return '🥈';
        case 3: return '🥉';
        default: return '🎖️';
    }
}

// ========== ИСПРАВЛЕННЫЙ РЕЙТИНГ СО СКОРОСТЬЮ ==========

async function updateLeaderboard() {
    try {
        console.log('📊 Загрузка рейтинга по балансу...');
        const userId = window.userData?.userId;
        const data = await apiRequest(`/api/leaderboard?type=balance&limit=20`);
        
        const leaderboard = document.getElementById('leaderboard');
        if (!leaderboard) return;
        
        leaderboard.innerHTML = '<div class="loading-leaderboard">Загрузка рейтинга...</div>';
        
        if (!data || !data.success || !data.leaderboard) {
            leaderboard.innerHTML = '<div class="empty-leaderboard">🏆 Стань первым в рейтинге!</div>';
            return;
        }
        
        let newHTML = '';
        
        data.leaderboard.forEach((player, index) => {
            if (!player || typeof player !== 'object') return;
            
            const rank = index + 1;
            const name = player.username || `Игрок ${rank}`;
            const balance = typeof player.balance === 'number' ? player.balance : 0;
            const isCurrent = player.userId === userId;
            const currentClass = isCurrent ? 'current-player' : '';
            const avatarUrl = getUserAvatar(player.userId, player.username);
            
            newHTML += `
                <div class="leader-item ${currentClass}">
                    <div class="leader-rank">
                        <span class="rank-number">${rank}</span>
                        <span class="rank-medal">${getMedalEmoji(rank)}</span>
                    </div>
                    <div class="leader-avatar">
                        <img src="${avatarUrl}" alt="${name}">
                    </div>
                    <div class="leader-info">
                        <div class="leader-name ${currentClass}">
                            ${name} ${isCurrent ? '👑' : ''}
                        </div>
                        <div class="leader-balance">${balance.toFixed(9)} S</div>
                    </div>
                    <div class="leader-trend ${getTrendClass(index, data.leaderboard)}">
                        ${getTrendEmoji(index, data.leaderboard)}
                    </div>
                </div>
            `;
        });
        
        leaderboard.innerHTML = newHTML;
        
    } catch (error) {
        console.error('Ошибка обновления рейтинга:', error);
        const leaderboard = document.getElementById('leaderboard');
        if (leaderboard) {
            leaderboard.innerHTML = '<div class="empty-leaderboard">Ошибка загрузки рейтинга</div>';
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
        
        leaderboard.innerHTML = '<div class="loading-leaderboard">Загрузка рейтинга скорости...</div>';
        
        if (!data || !data.success || !data.leaderboard) {
            leaderboard.innerHTML = '<div class="empty-leaderboard">⚡ Стань первым в рейтинге скорости!</div>';
            return;
        }
        
        let newHTML = '';
        
        data.leaderboard.forEach((player, index) => {
            if (!player || typeof player !== 'object') return;
            
            const rank = index + 1;
            const name = player.username || `Игрок ${rank}`;
            
            let mineSpeed = 0;
            let clickSpeed = 0;
            let totalSpeed = 0;
            
            if (typeof player.mineSpeed === 'number') {
                mineSpeed = player.mineSpeed;
            } else if (typeof player.mine_speed === 'number') {
                mineSpeed = player.mine_speed;
            }
            
            if (typeof player.clickSpeed === 'number') {
                clickSpeed = player.clickSpeed;
            } else if (typeof player.click_speed === 'number') {
                clickSpeed = player.click_speed;
            }
            
            if (typeof player.totalSpeed === 'number') {
                totalSpeed = player.totalSpeed;
            } else if (typeof player.total_speed === 'number') {
                totalSpeed = player.total_speed;
            } else {
                totalSpeed = mineSpeed + clickSpeed;
            }
            
            const displaySpeed = totalSpeed > 0 ? totalSpeed : 0.000000000;
            const isCurrent = player.userId === userId;
            const currentClass = isCurrent ? 'current-player' : '';
            const avatarUrl = getUserAvatar(player.userId, player.username);
            
            newHTML += `
                <div class="leader-item ${currentClass}">
                    <div class="leader-rank">
                        <span class="rank-number">${rank}</span>
                        <span class="rank-medal">${getMedalEmoji(rank)}</span>
                    </div>
                    <div class="leader-avatar">
                        <img src="${avatarUrl}" alt="${name}">
                    </div>
                    <div class="leader-info">
                        <div class="leader-name ${currentClass}">
                            ${name} ${isCurrent ? '👑' : ''}
                        </div>
                        <div class="leader-speed">${displaySpeed.toFixed(9)} S/сек</div>
                    </div>
                    <div class="leader-trend ${getTrendClass(index, data.leaderboard)}">
                        ${getTrendEmoji(index, data.leaderboard)}
                    </div>
                </div>
            `;
        });
        
        leaderboard.innerHTML = newHTML;
        
    } catch (error) {
        console.error('Ошибка обновления рейтинга скорости:', error);
        const leaderboard = document.getElementById('speedLeaderboard');
        if (leaderboard) {
            leaderboard.innerHTML = '<div class="empty-leaderboard">Ошибка загрузки рейтинга</div>';
        }
    }
}

// Функции для трендов
function getTrendClass(index, leaderboard) {
    if (index === 0) return 'trend-up';
    const prevPlayer = leaderboard[index - 1];
    if (!prevPlayer) return 'trend-neutral';
    
    return index < 3 ? 'trend-up' : 'trend-neutral';
}

function getTrendEmoji(index, leaderboard) {
    if (index === 0) return '🚀';
    if (index < 3) return '📈';
    if (index < 10) return '⭐';
    return '🎯';
}

// ========== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ HTML ==========

// Экспортируем функции в глобальную область видимости
window.selectTeam = selectTeam;
window.playTeamLottery = playTeamLottery;
window.playClassicLottery = playClassicLottery;
window.updateLeaderboard = updateLeaderboard;
window.updateSpeedLeaderboard = updateSpeedLeaderboard;
window.updateTopWinners = updateTopWinners;

// Закрытие попапа победителя
window.closeWinnerPopup = function() {
    const popup = document.getElementById('winnerPopup');
    if (popup) {
        popup.style.display = 'none';
    }
};

// ========== АВТОЗАПУСК ПРИ ЗАГРУЗКЕ ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Инициализация улучшенной игровой системы...');
    
    // Очищаем историю показанных победителей
    shownWinners.clear();
    
    setTimeout(() => {
        // Запускаем синхронизированные таймеры
        startSyncedTimers();
        
        // Загружаем начальные данные
        loadLotteryStatus();
        loadClassicLottery();
        
        // Обновляем рейтинги
        updateTopWinners();
        updateLeaderboard();
        updateSpeedLeaderboard();
        
        console.log('✅ Улучшенная игровая система полностью инициализирована');
    }, 2000);
});

console.log('✅ ПОЛНЫЙ ИСПРАВЛЕННЫЙ КОД ИГР УСПЕШНО ЗАГРУЖЕН!');
