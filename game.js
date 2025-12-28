// game.js - ПОЛНЫЙ ИСПРАВЛЕННЫЙ КОД ИГР С РАБОТАЮЩИМИ ЛОТЕРЕЯМИ
console.log('🎮 ЗАГРУЖАЕМ ПОЛНЫЙ ИСПРАВЛЕННЫЙ КОД ИГР...');

// ========== БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ ПЕРЕМЕННЫХ ==========
window.lotteryData = window.lotteryData || {
    eagle: [],
    tails: [],
    last_winner: null,
    timer: 60,
    total_eagle: 0,
    total_tails: 0,
    participants_count: 0,
    current_round: 1,
    round_start_time: null,
    round_end_time: null,
    status: 'waiting',
    last_update: Date.now()
};

window.classicLotteryData = window.classicLotteryData || {
    bets: [],
    total_pot: 0,
    timer: 120,
    participants_count: 0,
    history: [],
    current_round: 1,
    round_start_time: null,
    round_end_time: null,
    status: 'collecting',
    last_update: Date.now()
};

window.referralData = window.referralData || {
    referralsCount: 0,
    totalEarnings: 0,
    referralCode: ''
};

window.selectedTeam = null;
window.lotteryUpdateInterval = null;
window.classicLotteryInterval = null;
window.lastLotteryUpdate = 0;
window.lastClassicUpdate = 0;
window.lotteryTimerInterval = null;
window.classicTimerInterval = null;
window.lastWinnerNotificationTime = 0;

// ========== УЛУЧШЕННАЯ СИСТЕМА СИНХРОНИЗИРОВАННЫХ ТАЙМЕРОВ ==========

// Синхронизированные таймеры с мировым временем
window.startSyncedTimers = function() {
    console.log('⏰ Запуск синхронизированных таймеров...');
    
    // Очищаем предыдущие интервалы
    if (window.lotteryTimerInterval) clearInterval(window.lotteryTimerInterval);
    if (window.classicTimerInterval) clearInterval(window.classicTimerInterval);
    
    // Начальная синхронизация
    const now = Math.floor(Date.now() / 1000);
    window.lotteryData.timer = 60 - (now % 60);
    window.classicLotteryData.timer = 120 - (now % 120);
    
    // Таймер командной лотереи (60 секунд)
    window.lotteryTimerInterval = setInterval(() => {
        const nowSec = Math.floor(Date.now() / 1000);
        window.lotteryData.timer = 60 - (nowSec % 60);
        
        // Обновляем UI каждую секунду
        updateLotteryTimerUI();
        
        // Когда таймер достигает 1, запускаем розыгрыш
        if (window.lotteryData.timer === 1) {
            setTimeout(() => {
                simulateLotteryDraw();
            }, 1000);
        }
        
        // Обновляем данные каждые 10 секунд
        if (window.lotteryData.timer % 10 === 0) {
            loadLotteryStatus();
        }
        
        // Обновляем время последнего обновления
        window.lotteryData.last_update = Date.now();
    }, 1000);
    
    // Таймер классической лотереи (120 секунд)
    window.classicTimerInterval = setInterval(() => {
        const nowSec = Math.floor(Date.now() / 1000);
        window.classicLotteryData.timer = 120 - (nowSec % 120);
        
        // Обновляем UI каждую секунду
        updateClassicTimerUI();
        
        // Когда таймер достигает 1, запускаем розыгрыш
        if (window.classicLotteryData.timer === 1) {
            setTimeout(() => {
                simulateClassicLotteryDraw();
            }, 1000);
        }
        
        // Обновляем данные каждые 15 секунд
        if (window.classicLotteryData.timer % 15 === 0) {
            loadClassicLottery();
        }
        
        // Обновляем время последнего обновления
        window.classicLotteryData.last_update = Date.now();
    }, 1000);
    
    console.log('✅ Синхронизированные таймеры запущены');
};

// Симуляция розыгрыша командной лотереи
async function simulateLotteryDraw() {
    console.log('🎲 Начинаем розыгрыш командной лотереи...');
    
    // Проверяем, есть ли участники
    if (window.lotteryData.eagle.length === 0 && window.lotteryData.tails.length === 0) {
        console.log('⏭️ Нет участников, пропускаем розыгрыш');
        return;
    }
    
    // Определяем победившую команду
    const totalBet = window.lotteryData.total_eagle + window.lotteryData.total_tails;
    const eagleChance = window.lotteryData.total_eagle / totalBet;
    const isEagleWin = Math.random() < eagleChance;
    const winningTeam = isEagleWin ? 'eagle' : 'tails';
    
    // Выбираем победителя
    const winningPlayers = isEagleWin ? window.lotteryData.eagle : window.lotteryData.tails;
    if (winningPlayers.length === 0) {
        console.log('⚠️ Нет участников в выигравшей команде');
        return;
    }
    
    // Выбираем случайного победителя (чем больше ставка, тем выше шанс)
    let winner = null;
    if (winningPlayers.length === 1) {
        winner = winningPlayers[0];
    } else {
        // Взвешенный выбор по размеру ставки
        const totalWinningBet = winningPlayers.reduce((sum, player) => sum + player.amount, 0);
        let random = Math.random() * totalWinningBet;
        let accumulated = 0;
        
        for (const player of winningPlayers) {
            accumulated += player.amount;
            if (random <= accumulated) {
                winner = player;
                break;
            }
        }
    }
    
    if (!winner) {
        winner = winningPlayers[0];
    }
    
    // Рассчитываем выигрыш (90% от общего банка проигравшей команды)
    const losingTeamBet = isEagleWin ? window.lotteryData.total_tails : window.lotteryData.total_eagle;
    const prize = losingTeamBet * 0.9;
    
    // Сохраняем информацию о победителе
    window.lotteryData.last_winner = {
        userId: winner.userId,
        username: winner.username,
        team: winningTeam,
        prize: prize,
        timestamp: new Date().toISOString(),
        round: window.lotteryData.current_round
    };
    
    // Обновляем статистику пользователя если это текущий пользователь
    if (window.userData && winner.userId === window.userData.userId) {
        window.userData.totalWinnings = (window.userData.totalWinnings || 0) + prize;
        window.userData.lotteryWins = (window.userData.lotteryWins || 0) + 1;
        window.userData.balance = parseFloat(window.userData.balance) + prize;
        
        if (window.updateUI) window.updateUI();
        if (window.saveUserData) window.saveUserData();
        
        // Показываем уведомление о выигрыше
        showResultPopup(true, prize, '🏆');
        
        console.log(`🎉 Текущий пользователь выиграл ${prize.toFixed(9)} S!`);
    }
    
    // Показываем уведомление о победителе
    const now = Date.now();
    if (now - window.lastWinnerNotificationTime > 5000) { // Не чаще чем раз в 5 секунд
        const teamName = winningTeam === 'eagle' ? '🦅 Орлы' : '🪙 Решки';
        const notificationMessage = `${teamName} победили! ${winner.username} выиграл ${prize.toFixed(9)} S`;
        
        if (window.showNotification) {
            window.showNotification(notificationMessage, 'success');
        }
        
        window.lastWinnerNotificationTime = now;
    }
    
    // Сбрасываем данные для нового раунда
    window.lotteryData.eagle = [];
    window.lotteryData.tails = [];
    window.lotteryData.total_eagle = 0;
    window.lotteryData.total_tails = 0;
    window.lotteryData.participants_count = 0;
    window.lotteryData.current_round += 1;
    window.lotteryData.round_start_time = new Date().toISOString();
    window.lotteryData.round_end_time = new Date(Date.now() + 60000).toISOString();
    
    // Обновляем UI
    updateLotteryUI();
    
    console.log(`🎲 Розыгрыш завершен! Победитель: ${winner.username}, Выигрыш: ${prize.toFixed(9)} S`);
    
    // Синхронизируем с сервером
    setTimeout(() => {
        if (window.syncUserData) {
            window.syncUserData();
        }
    }, 2000);
}

// Симуляция розыгрыша классической лотереи
async function simulateClassicLotteryDraw() {
    console.log('🎰 Начинаем розыгрыш классической лотереи...');
    
    // Проверяем, есть ли участники
    if (window.classicLotteryData.bets.length === 0) {
        console.log('⏭️ Нет участников, пропускаем розыгрыш');
        return;
    }
    
    // Выбираем победителя (чем больше ставка, тем выше шанс)
    let winner = null;
    if (window.classicLotteryData.bets.length === 1) {
        winner = window.classicLotteryData.bets[0];
    } else {
        // Взвешенный выбор по размеру ставки
        const totalBet = window.classicLotteryData.total_pot;
        let random = Math.random() * totalBet;
        let accumulated = 0;
        
        for (const bet of window.classicLotteryData.bets) {
            accumulated += bet.amount;
            if (random <= accumulated) {
                winner = bet;
                break;
            }
        }
    }
    
    if (!winner) {
        winner = window.classicLotteryData.bets[0];
    }
    
    // Рассчитываем выигрыш (90% от общего банка)
    const prize = window.classicLotteryData.total_pot * 0.9;
    
    // Сохраняем в историю
    const historyEntry = {
        winner: winner.username,
        winner_username: winner.username,
        winner_userId: winner.userId,
        prize: prize,
        timestamp: new Date().toISOString(),
        round: window.classicLotteryData.current_round,
        total_participants: window.classicLotteryData.participants_count,
        total_pot: window.classicLotteryData.total_pot
    };
    
    window.classicLotteryData.history.unshift(historyEntry);
    if (window.classicLotteryData.history.length > 20) {
        window.classicLotteryData.history = window.classicLotteryData.history.slice(0, 20);
    }
    
    // Обновляем статистику пользователя если это текущий пользователь
    if (window.userData && winner.userId === window.userData.userId) {
        window.userData.totalWinnings = (window.userData.totalWinnings || 0) + prize;
        window.userData.lotteryWins = (window.userData.lotteryWins || 0) + 1;
        window.userData.balance = parseFloat(window.userData.balance) + prize;
        
        if (window.updateUI) window.updateUI();
        if (window.saveUserData) window.saveUserData();
        
        // Показываем уведомление о выигрыше
        showResultPopup(true, prize, '🏆');
        
        console.log(`🎉 Текущий пользователь выиграл ${prize.toFixed(9)} S в классической лотерее!`);
    } else if (window.userData) {
        // Если текущий пользователь проиграл
        const userBet = window.classicLotteryData.bets.find(bet => bet.userId === window.userData.userId);
        if (userBet) {
            window.userData.totalLosses = (window.userData.totalLosses || 0) + userBet.amount;
            
            // Показываем уведомление о проигрыше
            showResultPopup(false, -userBet.amount, '💸');
        }
    }
    
    // Сбрасываем данные для нового раунда
    window.classicLotteryData.bets = [];
    window.classicLotteryData.total_pot = 0;
    window.classicLotteryData.participants_count = 0;
    window.classicLotteryData.current_round += 1;
    window.classicLotteryData.round_start_time = new Date().toISOString();
    window.classicLotteryData.round_end_time = new Date(Date.now() + 120000).toISOString();
    
    // Обновляем UI
    updateClassicLotteryUI();
    
    console.log(`🎰 Розыгрыш завершен! Победитель: ${winner.username}, Выигрыш: ${prize.toFixed(9)} S`);
    
    // Синхронизируем с сервером
    setTimeout(() => {
        if (window.syncUserData) {
            window.syncUserData();
        }
    }, 2000);
}

// Обновление UI таймера командной лотереи
function updateLotteryTimerUI() {
    const lotteryTimer = document.getElementById('lotteryTimer');
    if (lotteryTimer) {
        lotteryTimer.textContent = window.lotteryData.timer;
        
        // Обновляем анимацию таймера
        if (window.lotteryData.timer <= 10) {
            lotteryTimer.style.color = '#FF5252';
            lotteryTimer.style.fontWeight = 'bold';
            lotteryTimer.style.animation = window.lotteryData.timer <= 5 ? 'pulse 0.5s infinite' : 'none';
        } else if (window.lotteryData.timer <= 30) {
            lotteryTimer.style.color = '#FF9800';
            lotteryTimer.style.fontWeight = 'normal';
            lotteryTimer.style.animation = 'none';
        } else {
            lotteryTimer.style.color = '#4CAF50';
            lotteryTimer.style.fontWeight = 'normal';
            lotteryTimer.style.animation = 'none';
        }
    }
    
    // Обновляем прогресс-бар если есть
    const progressBar = document.getElementById('lotteryProgress');
    if (progressBar) {
        const progress = (60 - window.lotteryData.timer) / 60 * 100;
        progressBar.style.width = progress + '%';
        progressBar.style.backgroundColor = progress > 80 ? '#FF5252' : progress > 50 ? '#FF9800' : '#4CAF50';
    }
}

// Обновление UI таймера классической лотереи
function updateClassicTimerUI() {
    const classicTimer = document.getElementById('classicTimer');
    if (classicTimer) {
        classicTimer.textContent = window.classicLotteryData.timer;
        
        // Обновляем анимацию таймера
        if (window.classicLotteryData.timer <= 20) {
            classicTimer.style.color = '#FF5252';
            classicTimer.style.fontWeight = 'bold';
            classicTimer.style.animation = window.classicLotteryData.timer <= 10 ? 'pulse 0.5s infinite' : 'none';
        } else if (window.classicLotteryData.timer <= 60) {
            classicTimer.style.color = '#FF9800';
            classicTimer.style.fontWeight = 'normal';
            classicTimer.style.animation = 'none';
        } else {
            classicTimer.style.color = '#4CAF50';
            classicTimer.style.fontWeight = 'normal';
            classicTimer.style.animation = 'none';
        }
    }
    
    // Обновляем прогресс-бар если есть
    const progressBar = document.getElementById('classicProgress');
    if (progressBar) {
        const progress = (120 - window.classicLotteryData.timer) / 120 * 100;
        progressBar.style.width = progress + '%';
        progressBar.style.backgroundColor = progress > 80 ? '#FF5252' : progress > 50 ? '#FF9800' : '#4CAF50';
    }
}

// ========== ФУНКЦИИ ДЛЯ АВАТАРОК И ТАЙМЕРОВ ==========

// Функция для получения аватарки пользователя
window.getUserAvatar = function(userId, username) {
    // Для Telegram пользователей
    if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user) {
        const user = Telegram.WebApp.initDataUnsafe.user;
        const isCurrentUser = user.id && `tg_${user.id}` === userId;
        
        if (isCurrentUser && user.photo_url) {
            return user.photo_url;
        }
    }
    
    // Генерируем аватарки через DiceBear
    const avatarSeed = userId || username || 'default';
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed)}&size=40&backgroundColor=4CC9F0`;
};

// Функция для получения ссылки на профиль
window.getUserProfileLink = function(userId, username) {
    if (userId && userId.startsWith('tg_')) {
        const tgId = userId.replace('tg_', '');
        return `https://t.me/${username?.replace('@', '') || tgId}`;
    }
    
    return `https://t.me/sparkcoin_bot`;
};

// Функция для форматирования времени ставки
window.formatBetTime = function(timestamp) {
    if (!timestamp) return 'только что';
    
    const betTime = new Date(timestamp);
    const now = new Date();
    const diffMs = now - betTime;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    
    if (diffSec < 10) return 'только что';
    if (diffSec < 60) return `${diffSec} сек назад`;
    if (diffMin < 60) return `${diffMin} мин назад`;
    if (diffHour < 24) return `${diffHour} час назад`;
    
    return betTime.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Функция для создания элемента участника
window.createParticipantElement = function(participant, team) {
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
             onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(participant.userId)}&size=40&backgroundColor=4CC9F0'">
        
        <div class="participant-info">
            <div class="participant-name ${isCurrentUser ? 'current-player' : ''}">
                ${participant.username || 'Игрок'} ${isCurrentUser ? '<span class="you-badge">(Вы)</span>' : ''}
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
    
    // Добавляем обработчик клика на аватар
    const avatar = item.querySelector('.participant-avatar');
    if (avatar) {
        avatar.style.cursor = 'pointer';
        avatar.addEventListener('click', () => {
            window.open(profileLink, '_blank');
        });
    }
    
    // Убираем анимацию через 3 секунды
    setTimeout(() => {
        item.classList.remove('new-bet');
    }, 3000);
    
    return item;
};

// Функция для обновления всех таймеров ставок
window.updateAllBetTimers = function() {
    const timeElements = document.querySelectorAll('.time-text');
    const now = new Date();
    
    timeElements.forEach(element => {
        const participantItem = element.closest('.participant-item');
        if (participantItem) {
            const timeText = element.textContent;
            // Обновляем только если это не статичный текст
            if (!timeText.includes('только что') && !timeText.includes('мин назад') && !timeText.includes('час назад')) {
                const minutesAgo = parseInt(timeText) || 0;
                const newTimeText = minutesAgo + 1 + ' сек назад';
                element.textContent = newTimeText;
            }
        }
    });
};

// Функция для обновления времени в реальном времени
window.startRealTimeUpdates = function() {
    setInterval(() => {
        updateAllBetTimers();
    }, 1000);
};

// ========== КОМАНДНАЯ ЛОТЕРЕЯ - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ==========

window.loadLotteryStatus = async function() {
    try {
        const now = Date.now();
        if (now - window.lastLotteryUpdate < 2000) return;
        
        console.log('🔄 Загрузка статуса командной лотереи...');
        const data = await apiRequest('/api/lottery/status');
        
        if (data && data.success && data.lottery) {
            // Сохраняем данные
            window.lotteryData = {
                ...window.lotteryData,
                ...data.lottery,
                last_update: now
            };
            
            // Если есть новые данные о победителе и прошло больше 5 секунд с последнего уведомления
            if (data.lottery.last_winner && now - window.lastWinnerNotificationTime > 5000) {
                const winner = data.lottery.last_winner;
                const teamName = winner.team === 'eagle' ? '🦅 Орлы' : '🪙 Решки';
                const message = `${teamName} победили! ${winner.username} выиграл ${(winner.prize || 0).toFixed(9)} S`;
                
                if (window.showNotification) {
                    window.showNotification(message, 'info');
                }
                
                window.lastWinnerNotificationTime = now;
            }
            
            console.log('✅ Данные командной лотереи загружены');
            updateLotteryUI();
            window.lastLotteryUpdate = now;
        } else {
            console.log('⚠️ Нет данных лотереи, используем локальные');
            updateLotteryUI();
        }
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки лотереи:', error);
        updateLotteryUI();
    }
};

// ОБНОВЛЕННАЯ ФУНКЦИЯ СТАВКИ
window.placeLotteryBet = async function(team, amount) {
    console.log(`🎯 Размещение ставки: ${team}, ${amount}`);
    
    if (!window.userData) {
        showNotification('Данные пользователя не загружены', 'error');
        return false;
    }
    
    // Проверяем баланс
    if (parseFloat(window.userData.balance) < amount) {
        showNotification('Недостаточно средств', 'error');
        return false;
    }
    
    // Проверяем минимальную ставку
    if (amount < 0.000000001) {
        showNotification('Минимальная ставка 0.000000001 S', 'error');
        return false;
    }
    
    // Создаем объект ставки с текущим временем
    const betData = {
        userId: window.userData.userId,
        username: window.userData.username,
        amount: amount,
        timestamp: new Date().toISOString(),
        team: team,
        round: window.lotteryData.current_round
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
            window.lotteryData[team].unshift(betData);
            
            if (team === 'eagle') {
                window.lotteryData.total_eagle += amount;
            } else {
                window.lotteryData.total_tails += amount;
            }
            
            window.lotteryData.participants_count = window.lotteryData.eagle.length + window.lotteryData.tails.length;
            
            if (window.updateUI) window.updateUI();
            updateLotteryUI();
            if (window.saveUserData) window.saveUserData();
            
            // Показываем анимацию ставки
            const teamButton = document.querySelector(`.team-button.${team}`);
            if (teamButton) {
                teamButton.classList.add('bet-placed');
                setTimeout(() => teamButton.classList.remove('bet-placed'), 1000);
            }
            
            const teamName = team === 'eagle' ? '🦅 Орлов' : '🪙 Решек';
            showNotification(`Ставка ${amount.toFixed(9)} S за команду ${teamName} принята!`, 'success');
            
            // Синхронизируем с сервером
            setTimeout(() => {
                if (window.syncUserData) {
                    window.syncUserData();
                }
            }, 1000);
            
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
        window.lotteryData[team].unshift(betData);
        
        if (team === 'eagle') {
            window.lotteryData.total_eagle += amount;
        } else {
            window.lotteryData.total_tails += amount;
        }
        
        window.lotteryData.participants_count = window.lotteryData.eagle.length + window.lotteryData.tails.length;
        
        if (window.updateUI) window.updateUI();
        updateLotteryUI();
        if (window.saveUserData) window.saveUserData();
        
        showNotification(`Ставка ${amount.toFixed(9)} S принята в локальном режиме!`, 'warning');
        return true;
    }
};

// ОБНОВЛЕННАЯ ФУНКЦИЯ ОБНОВЛЕНИЯ ИНТЕРФЕЙСА ЛОТЕРЕИ
window.updateLotteryUI = function() {
    try {
        const eagleList = document.getElementById('teamEagle');
        const tailsList = document.getElementById('teamTails');
        const eagleTotal = document.getElementById('eagleTotal');
        const tailsTotal = document.getElementById('tailsTotal');
        const eagleParticipants = document.getElementById('eagleParticipants');
        const tailsParticipants = document.getElementById('tailsParticipants');
        const eagleCountElement = document.getElementById('eagleParticipantsCount');
        const tailsCountElement = document.getElementById('tailsParticipantsCount');
        const lastWinner = document.getElementById('lastWinner');
        const winnerTeam = document.getElementById('winnerTeam');
        
        if (eagleTotal) eagleTotal.textContent = (window.lotteryData.total_eagle || 0).toFixed(9) + ' S';
        if (tailsTotal) tailsTotal.textContent = (window.lotteryData.total_tails || 0).toFixed(9) + ' S';
        if (eagleParticipants) eagleParticipants.textContent = window.lotteryData.eagle ? window.lotteryData.eagle.length : 0;
        if (tailsParticipants) tailsParticipants.textContent = window.lotteryData.tails ? window.lotteryData.tails.length : 0;
        if (eagleCountElement) eagleCountElement.textContent = window.lotteryData.eagle ? window.lotteryData.eagle.length : 0;
        if (tailsCountElement) tailsCountElement.textContent = window.lotteryData.tails ? window.lotteryData.tails.length : 0;
        
        // Очищаем списки
        if (eagleList) eagleList.innerHTML = '';
        if (tailsList) tailsList.innerHTML = '';
        
        // Заполняем список Орлов
        if (eagleList && window.lotteryData.eagle && window.lotteryData.eagle.length > 0) {
            window.lotteryData.eagle.forEach((participant) => {
                const item = createParticipantElement(participant, 'eagle');
                if (item) eagleList.appendChild(item);
            });
        } else if (eagleList) {
            eagleList.innerHTML = '<div class="empty-bets">Пока нет ставок</div>';
        }
        
        // Заполняем список Решек
        if (tailsList && window.lotteryData.tails && window.lotteryData.tails.length > 0) {
            window.lotteryData.tails.forEach((participant) => {
                const item = createParticipantElement(participant, 'tails');
                if (item) tailsList.appendChild(item);
            });
        } else if (tailsList) {
            tailsList.innerHTML = '<div class="empty-bets">Пока нет ставок</div>';
        }
        
        // Обновляем шансы
        const totalBet = (window.lotteryData.total_eagle || 0) + (window.lotteryData.total_tails || 0);
        let eagleChance = 50;
        let tailsChance = 50;
        
        if (totalBet > 0) {
            eagleChance = Math.round(((window.lotteryData.total_eagle || 0) / totalBet) * 100);
            tailsChance = 100 - eagleChance;
        }
        
        const eagleChanceElement = document.getElementById('eagleChance');
        const tailsChanceElement = document.getElementById('tailsChance');
        
        if (eagleChanceElement) eagleChanceElement.textContent = eagleChance + '%';
        if (tailsChanceElement) tailsChanceElement.textContent = tailsChance + '%';
        
        // Обновляем визуализацию шансов
        const eagleChanceBar = document.getElementById('eagleChanceBar');
        const tailsChanceBar = document.getElementById('tailsChanceBar');
        
        if (eagleChanceBar) eagleChanceBar.style.width = eagleChance + '%';
        if (tailsChanceBar) tailsChanceBar.style.width = tailsChance + '%';
        
        // Показываем последнего победителя
        if (lastWinner && winnerTeam && window.lotteryData.last_winner) {
            lastWinner.style.display = 'block';
            const teamName = window.lotteryData.last_winner.team === 'eagle' ? '🦅 Орлы' : '🪙 Решки';
            const winnerTime = window.lotteryData.last_winner.timestamp ? formatBetTime(window.lotteryData.last_winner.timestamp) : 'Недавно';
            const isCurrentWinner = window.userData && window.lotteryData.last_winner.userId === window.userData.userId;
            
            winnerTeam.innerHTML = `
                <div class="winner-team">${teamName}</div>
                <div class="winner-name ${isCurrentWinner ? 'current-winner' : ''}">${window.lotteryData.last_winner.username || 'Победитель'}</div>
                <div class="winner-prize">${(window.lotteryData.last_winner.prize || 0).toFixed(9)} S</div>
                <div class="winner-time">${winnerTime}</div>
            `;
            
            if (isCurrentWinner) {
                lastWinner.classList.add('current-winner');
            } else {
                lastWinner.classList.remove('current-winner');
            }
        } else if (lastWinner) {
            lastWinner.style.display = 'none';
        }
        
        // Обновляем таймеры у всех ставок
        updateAllBetTimers();
        
        // Обновляем кнопки выбора команды
        document.querySelectorAll('.team-button').forEach(btn => {
            if (btn.classList.contains('eagle') && window.selectedTeam === 'eagle') {
                btn.classList.add('active');
            } else if (btn.classList.contains('tails') && window.selectedTeam === 'tails') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
    } catch (error) {
        console.error('❌ Ошибка обновления интерфейса лотереи:', error);
    }
};

window.startLotteryAutoUpdate = function() {
    console.log('🔄 Запуск автообновления командной лотереи');
    clearInterval(window.lotteryUpdateInterval);
    
    // Загружаем начальные данные
    loadLotteryStatus();
    
    // Обновляем данные каждые 10 секунд
    window.lotteryUpdateInterval = setInterval(() => {
        loadLotteryStatus();
    }, 10000);
};

window.selectTeam = function(team) {
    console.log(`🎯 Выбрана команда: ${team}`);
    window.selectedTeam = team;
    
    // Обновляем UI кнопок
    document.querySelectorAll('.team-button').forEach(btn => {
        btn.classList.remove('active');
        if ((btn.classList.contains('eagle') && team === 'eagle') || 
            (btn.classList.contains('tails') && team === 'tails')) {
            btn.classList.add('active');
        }
    });
    
    // Показываем подсказку
    const teamName = team === 'eagle' ? 'Орлов' : 'Решек';
    if (window.showNotification) {
        window.showNotification(`Выбрана команда ${teamName}. Введите сумму и нажмите "Участвовать"`, 'info', 2000);
    }
};

window.playTeamLottery = function() {
    console.log('🎮 Игра в командную лотерею');
    
    if (!window.selectedTeam) {
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
    
    // Вызываем асинхронную функцию ставки
    placeLotteryBet(window.selectedTeam, bet).then(success => {
        if (success) {
            // Сбрасываем выбор команды
            window.selectedTeam = null;
            document.querySelectorAll('.team-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Сбрасываем поле ввода
            if (betInput) {
                betInput.value = '0.000000100';
            }
        }
    });
};

// ========== КЛАССИЧЕСКАЯ ЛОТЕРЕЯ - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ==========

window.loadClassicLottery = async function() {
    try {
        const now = Date.now();
        if (now - window.lastClassicUpdate < 2000) return;
        
        console.log('🔄 Загрузка статуса классической лотереи...');
        const data = await apiRequest('/api/classic-lottery/status');
        
        if (data && data.success && data.lottery) {
            // Сохраняем данные
            window.classicLotteryData = {
                ...window.classicLotteryData,
                ...data.lottery,
                last_update: now
            };
            
            console.log('✅ Данные классической лотереи загружены');
            updateClassicLotteryUI();
            window.lastClassicUpdate = now;
        } else {
            console.log('⚠️ Нет данных классической лотереи');
            updateClassicLotteryUI();
        }
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки классической лотереи:', error);
        updateClassicLotteryUI();
    }
};

window.playClassicLottery = async function() {
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
    
    if (!window.userData || !window.userData.userId || !window.userData.username) {
        showNotification('Ошибка данных пользователя', 'error');
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
                username: window.userData.username,
                timestamp: Date.now(),
                round: window.classicLotteryData.current_round
            })
        });
        
        if (response && response.success) {
            window.userData.balance = parseFloat(window.userData.balance) - bet;
            window.userData.totalBet = (window.userData.totalBet || 0) + bet;
            window.userData.lastUpdate = Date.now();
            
            // Добавляем ставку в локальные данные
            const betData = {
                userId: window.userData.userId,
                username: window.userData.username,
                amount: bet,
                timestamp: new Date().toISOString(),
                round: window.classicLotteryData.current_round
            };
            
            window.classicLotteryData.bets.push(betData);
            window.classicLotteryData.total_pot += bet;
            window.classicLotteryData.participants_count = window.classicLotteryData.bets.length;
            
            if (window.updateUI) window.updateUI();
            updateClassicLotteryUI();
            if (window.saveUserData) window.saveUserData();
            
            showNotification(`Ставка ${bet.toFixed(9)} S принята! Ваш билет №${window.classicLotteryData.bets.length}`, 'success');
            
            // Синхронизируем с сервером
            setTimeout(() => {
                if (window.syncUserData) {
                    window.syncUserData();
                }
            }, 1000);
        } else {
            showNotification(`Ошибка ставки: ${response?.error || 'Неизвестная ошибка'}`, 'error');
        }
    } catch (error) {
        console.warn('⚠️ Ошибка ставки, используем локальный режим:', error);
        
        // ЛОКАЛЬНЫЙ РЕЖИМ
        window.userData.balance = parseFloat(window.userData.balance) - bet;
        window.userData.totalBet = (window.userData.totalBet || 0) + bet;
        
        const betData = {
            userId: window.userData.userId,
            username: window.userData.username,
            amount: bet,
            timestamp: new Date().toISOString(),
            round: window.classicLotteryData.current_round
        };
        
        window.classicLotteryData.bets.push(betData);
        window.classicLotteryData.total_pot += bet;
        window.classicLotteryData.participants_count = window.classicLotteryData.bets.length;
        
        if (window.updateUI) window.updateUI();
        updateClassicLotteryUI();
        if (window.saveUserData) window.saveUserData();
        
        showNotification(`Ставка ${bet.toFixed(9)} S принята в локальном режиме!`, 'warning');
    }
};

window.updateClassicLotteryUI = function() {
    try {
        const lotteryPot = document.getElementById('lotteryPot');
        const lotteryParticipants = document.getElementById('lotteryParticipants');
        const historyElement = document.getElementById('classicHistory');
        
        if (lotteryPot) lotteryPot.textContent = (window.classicLotteryData.total_pot || 0).toFixed(9) + ' S';
        if (lotteryParticipants) lotteryParticipants.textContent = window.classicLotteryData.participants_count || 0;
        
        // Обновляем шансы текущего игрока
        const playerChanceElement = document.getElementById('playerChance');
        if (playerChanceElement && window.classicLotteryData.total_pot > 0 && window.userData) {
            const userBets = window.classicLotteryData.bets.filter(bet => bet.userId === window.userData.userId);
            const userTotalBet = userBets.reduce((sum, bet) => sum + bet.amount, 0);
            const playerChance = (userTotalBet / window.classicLotteryData.total_pot * 100).toFixed(2);
            playerChanceElement.textContent = playerChance + '%';
            
            // Обновляем прогресс-бар шансов
            const playerChanceBar = document.getElementById('playerChanceBar');
            if (playerChanceBar) {
                playerChanceBar.style.width = Math.min(100, parseFloat(playerChance)) + '%';
            }
        }
        
        if (historyElement) {
            historyElement.innerHTML = '';
            
            if (window.classicLotteryData.history && Array.isArray(window.classicLotteryData.history)) {
                if (window.classicLotteryData.history.length === 0) {
                    historyElement.innerHTML = '<div class="empty-history">История розыгрышей пуста</div>';
                } else {
                    window.classicLotteryData.history.forEach((item, index) => {
                        if (!item) return;
                        
                        const isWinner = item.winner === (window.userData?.username) || 
                                        item.winner_username === (window.userData?.username) ||
                                        item.winner_userId === (window.userData?.userId);
                        
                        const historyItem = document.createElement('div');
                        historyItem.className = `history-item ${isWinner ? 'won' : 'lost'}`;
                        historyItem.innerHTML = `
                            <div class="history-header">
                                <span class="history-round">Раунд #${item.round || index + 1}</span>
                                <span class="history-time">${formatBetTime(item.timestamp)}</span>
                            </div>
                            <div class="history-winner ${isWinner ? 'current-winner' : ''}">
                                ${item.winner || item.winner_username || 'Победитель'}
                                ${isWinner ? ' <span class="you-badge">(Вы)</span>' : ''}
                            </div>
                            <div class="history-prize ${isWinner ? 'won' : 'lost'}">
                                ${isWinner ? '🏆 Выиграл' : '💸 Проиграл'} ${(item.prize || 0).toFixed(9)} S
                            </div>
                            <div class="history-stats">
                                <span class="history-stat">Участников: ${item.total_participants || 0}</span>
                                <span class="history-stat">Банк: ${(item.total_pot || 0).toFixed(9)} S</span>
                            </div>
                        `;
                        historyElement.appendChild(historyItem);
                    });
                }
            } else {
                historyElement.innerHTML = '<div class="empty-history">История розыгрышей пуста</div>';
            }
        }
        
        // Обновляем количество билетов текущего пользователя
        const userTicketsElement = document.getElementById('userTickets');
        if (userTicketsElement && window.userData) {
            const userTickets = window.classicLotteryData.bets.filter(bet => bet.userId === window.userData.userId).length;
            userTicketsElement.textContent = userTickets;
        }
        
    } catch (error) {
        console.error('❌ Ошибка обновления интерфейса классической лотереи:', error);
    }
};

window.startClassicLotteryUpdate = function() {
    console.log('🔄 Запуск автообновления классической лотереи');
    clearInterval(window.classicLotteryInterval);
    
    loadClassicLottery();
    
    window.classicLotteryInterval = setInterval(() => {
        loadClassicLottery();
    }, 10000);
};

// ========== ТОП ПОБЕДИТЕЛЕЙ - ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ ==========

window.updateTopWinners = async function() {
    try {
        console.log('🏆 Загрузка топа победителей...');
        const data = await apiRequest('/api/top/winners?limit=20');
        
        const topWinnersElement = document.getElementById('topWinners');
        if (!topWinnersElement) return;
        
        topWinnersElement.innerHTML = '<div class="loading">Загрузка топа победителей...</div>';
        
        if (data && data.success && data.winners) {
            // Очищаем элемент
            topWinnersElement.innerHTML = '';
            
            if (data.winners && Array.isArray(data.winners)) {
                // Сортируем по чистым выигрышам
                const sortedWinners = [...data.winners].sort((a, b) => {
                    const aNet = a.netWinnings || 0;
                    const bNet = b.netWinnings || 0;
                    return bNet - aNet;
                });
                
                sortedWinners.forEach((winner, index) => {
                    if (!winner) return;
                    
                    const winnerItem = document.createElement('div');
                    const isCurrent = winner.username === window.userData?.username || winner.isCurrent;
                    winnerItem.className = `winner-item ${isCurrent ? 'current-player' : ''}`;
                    
                    const netWinnings = winner.netWinnings || 0;
                    const winStreak = winner.winStreak || 0;
                    
                    winnerItem.innerHTML = `
                        <div class="winner-rank">
                            <span class="rank-number">${index + 1}</span>
                            ${winStreak > 1 ? `<span class="win-streak">🔥 ${winStreak}</span>` : ''}
                        </div>
                        <div class="winner-info">
                            <div class="winner-name ${isCurrent ? 'current-player' : ''}">
                                ${winner.username || 'Игрок'} ${isCurrent ? '<span class="you-badge">(Вы)</span>' : ''}
                            </div>
                            <div class="winner-stats">
                                <span class="winner-stat">Выиграно: ${(winner.totalWinnings || 0).toFixed(9)} S</span>
                                <span class="winner-stat">Проиграно: ${(winner.totalLosses || 0).toFixed(9)} S</span>
                            </div>
                        </div>
                        <div class="winner-net ${netWinnings >= 0 ? 'positive' : 'negative'}">
                            ${netWinnings >= 0 ? '+' : ''}${netWinnings.toFixed(9)} S
                        </div>
                    `;
                    topWinnersElement.appendChild(winnerItem);
                });
            } else {
                topWinnersElement.innerHTML = '<div class="empty-winners">Победителей пока нет</div>';
            }
        } else {
            topWinnersElement.innerHTML = '<div class="empty-winners">Данные временно недоступны</div>';
        }
    } catch (error) {
        console.warn('⚠️ Ошибка обновления топа победителей:', error);
        const topWinnersElement = document.getElementById('topWinners');
        if (topWinnersElement) {
            topWinnersElement.innerHTML = '<div class="empty-winners">Ошибка загрузки</div>';
        }
    }
};

// ========== ИСПРАВЛЕННЫЙ РЕЙТИНГ СО СКОРОСТЬЮ ==========

window.updateLeaderboard = async function() {
    try {
        console.log('📊 Загрузка рейтинга по балансу...');
        const userId = window.userData?.userId;
        const data = await apiRequest(`/api/leaderboard?type=balance&limit=20`);
        
        const leaderboard = document.getElementById('leaderboard');
        if (!leaderboard) return;
        
        leaderboard.innerHTML = '<div class="loading">Загрузка рейтинга...</div>';
        
        if (!data || !data.success || !data.leaderboard) {
            leaderboard.innerHTML = '<div class="empty-leaderboard">🏆 Стань первым в рейтинге!</div>';
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
            const isCurrent = player.userId === userId || player.isCurrent;
            const currentClass = isCurrent ? 'current-player' : '';
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            
            newHTML += `
                <div class="leader-item ${currentClass} ${rankClass}">
                    <div class="leader-rank">
                        <span class="rank-number">${rank}</span>
                        ${rank <= 3 ? `<span class="rank-medal">${rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>` : ''}
                    </div>
                    <div class="leader-info">
                        <div class="leader-name ${currentClass}">
                            ${name} ${isCurrent ? '<span class="you-badge">(Вы)</span>' : ''}
                        </div>
                        <div class="leader-stats">
                            <span class="leader-stat">Клики: ${player.totalClicks || 0}</span>
                            <span class="leader-stat">Скорость: ${(player.totalSpeed || 0).toFixed(9)} S/сек</span>
                        </div>
                    </div>
                    <div class="leader-balance">
                        ${balance.toFixed(9)} S
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
};

window.updateSpeedLeaderboard = async function() {
    try {
        console.log('⚡ Загрузка рейтинга по скорости...');
        const userId = window.userData?.userId;
        const data = await apiRequest(`/api/leaderboard?type=speed&limit=20`);
        
        const leaderboard = document.getElementById('speedLeaderboard');
        if (!leaderboard) return;
        
        leaderboard.innerHTML = '<div class="loading">Загрузка рейтинга скорости...</div>';
        
        if (!data || !data.success || !data.leaderboard) {
            leaderboard.innerHTML = '<div class="empty-leaderboard">⚡ Стань первым в рейтинге скорости!</div>';
            return;
        }
        
        let newHTML = '';
        
        data.leaderboard.forEach((player, index) => {
            if (!player || typeof player !== 'object') {
                return;
            }
            
            const rank = index + 1;
            const name = player.username || `Игрок ${rank}`;
            
            // Убедимся, что у игрока есть данные о скорости
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
            const isCurrent = player.userId === userId || player.isCurrent;
            const currentClass = isCurrent ? 'current-player' : '';
            const rankClass = rank <= 3 ? `rank-${rank}` : '';
            
            newHTML += `
                <div class="leader-item ${currentClass} ${rankClass}">
                    <div class="leader-rank">
                        <span class="rank-number">${rank}</span>
                        ${rank <= 3 ? `<span class="rank-medal">${rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}</span>` : ''}
                    </div>
                    <div class="leader-info">
                        <div class="leader-name ${currentClass}">
                            ${name} ${isCurrent ? '<span class="you-badge">(Вы)</span>' : ''}
                        </div>
                        <div class="leader-stats">
                            <span class="leader-stat">Клик: ${clickSpeed.toFixed(9)} S/сек</span>
                            <span class="leader-stat">Майнинг: ${mineSpeed.toFixed(9)} S/сек</span>
                        </div>
                    </div>
                    <div class="leader-speed">
                        ${displaySpeed.toFixed(9)} S/сек
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
};

// ========== ФУНКЦИЯ ДЛЯ ПОКАЗА РЕЗУЛЬТАТОВ ==========

window.showResultPopup = function(isWin, amount, emoji = '🎉') {
    console.log(`🎮 Показываем результат: ${isWin ? 'Победа' : 'Проигрыш'}, сумма: ${amount}`);
    
    // Проверяем, не показывался ли уже попап при загрузке страницы
    const pageLoadTime = window.pageLoadTime || 0;
    const now = Date.now();
    
    if (now - pageLoadTime < 3000) { // Не показываем в первые 3 секунды после загрузки
        console.log('⏭️ Пропускаем показ попапа при загрузке страницы');
        return;
    }
    
    const popup = document.getElementById('resultPopup');
    const emojiElement = document.getElementById('resultEmoji');
    const textElement = document.getElementById('resultText');
    const amountElement = document.getElementById('resultAmount');
    
    if (!popup || !emojiElement || !textElement || !amountElement) {
        console.log('❌ Не найден элемент попапа');
        return;
    }
    
    // Устанавливаем класс в зависимости от результата
    popup.className = `result-popup ${isWin ? 'win' : 'lose'}`;
    
    // Устанавливаем эмодзи
    emojiElement.textContent = emoji;
    
    // Устанавливаем текст
    textElement.textContent = isWin ? '🎉 ПОБЕДА!' : '💸 ПРОИГРЫШ';
    textElement.style.color = isWin ? '#4CAF50' : '#f44336';
    
    // Устанавливаем сумму
    const formattedAmount = Math.abs(amount).toFixed(9);
    amountElement.textContent = `${amount >= 0 ? '+' : '-'}${formattedAmount} S`;
    amountElement.style.color = isWin ? '#4CAF50' : '#f44336';
    amountElement.className = `result-amount ${isWin ? 'positive' : 'negative'}`;
    
    // Показываем попап
    popup.style.display = 'block';
    
    // Добавляем анимацию
    popup.style.animation = 'popupShow 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        closeResultPopup();
    }, 5000);
    
    console.log(`✅ Показываем попап: ${isWin ? 'Победа' : 'Проигрыш'}`);
};

window.closeResultPopup = function() {
    const popup = document.getElementById('resultPopup');
    if (popup) {
        popup.style.animation = 'popupHide 0.3s ease-out';
        setTimeout(() => {
            popup.style.display = 'none';
            popup.style.animation = '';
        }, 300);
    }
};

// ========== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ HTML ==========

// Функции уже объявлены как window.функция, так что они глобальные

// ========== АВТОЗАПУСК ПРИ ЗАГРУЗКЕ ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Инициализация улучшенной игровой системы...');
    
    // Сохраняем время загрузки страницы
    window.pageLoadTime = Date.now();
    
    // Скрываем попап результата при загрузке
    const popup = document.getElementById('resultPopup');
    if (popup) {
        popup.style.display = 'none';
    }
    
    setTimeout(() => {
        // Запускаем синхронизированные таймеры
        if (typeof startSyncedTimers === 'function') {
            startSyncedTimers();
        }
        
        // Запускаем обновление данных
        if (typeof startLotteryAutoUpdate === 'function') {
            startLotteryAutoUpdate();
        }
        
        if (typeof startClassicLotteryUpdate === 'function') {
            startClassicLotteryUpdate();
        }
        
        if (typeof startRealTimeUpdates === 'function') {
            startRealTimeUpdates();
        }
        
        // Загружаем начальные данные
        if (typeof updateTopWinners === 'function') {
            updateTopWinners();
        }
        
        if (typeof updateLeaderboard === 'function') {
            updateLeaderboard();
        }
        
        if (typeof updateSpeedLeaderboard === 'function') {
            updateSpeedLeaderboard();
        }
        
        // Загружаем статус лотерей
        if (typeof loadLotteryStatus === 'function') {
            loadLotteryStatus();
        }
        
        if (typeof loadClassicLottery === 'function') {
            loadClassicLottery();
        }
        
        console.log('✅ Улучшенная игровая система полностью инициализирована');
    }, 2000);
});

console.log('✅ ПОЛНЫЙ ИСПРАВЛЕННЫЙ КОД ИГР УСПЕШНО ЗАГРУЖЕН!');
