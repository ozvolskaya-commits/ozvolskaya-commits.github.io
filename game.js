// games.js - РАБОЧИЙ КОД ИГР БЕЗ ПРОБЛЕМ
console.log('🎮 ЗАГРУЖАЕМ РАБОЧИЙ КОД ИГР...');

// ========== БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ ПЕРЕМЕННЫХ ==========

// Проверяем существование переменных перед использованием
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

// Реферальная система
let referralData = {
    referralsCount: 0,
    totalEarnings: 0,
    referralCode: ''
};

// Локальные переменные
let selectedTeam = null;
let lotteryUpdateInterval;
let classicLotteryInterval;

// ========== КОМАНДНАЯ ЛОТЕРЕЯ - РАБОЧИЙ КОД ==========

async function loadLotteryStatus() {
    try {
        const data = await apiRequest('/api/lottery/status');
        
        if (data && data.success && data.lottery) {
            // Безопасное обновление данных
            lotteryData.eagle = data.lottery.eagle || [];
            lotteryData.tails = data.lottery.tails || [];
            lotteryData.last_winner = data.lottery.last_winner || null;
            lotteryData.timer = data.lottery.timer || 60;
            lotteryData.total_eagle = data.lottery.total_eagle || 0;
            lotteryData.total_tails = data.lottery.total_tails || 0;
            lotteryData.participants_count = data.lottery.participants_count || 0;
            
            updateLotteryUI();
        } else {
            console.log('⚠️ Нет данных лотереи, используем локальные');
            updateLotteryUI();
        }
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки лотереи:', error);
        updateLotteryUI();
    }
}

async function placeLotteryBet(team, amount) {
    // ПРОВЕРКИ БЕЗОПАСНОСТИ
    if (!window.userData) {
        showNotification('Данные пользователя не загружены', 'error');
        return false;
    }

    if (!window.userData.userId || !team || !amount || !window.userData.username) {
        console.error('❌ Отсутствуют обязательные поля');
        showNotification('Ошибка данных', 'error');
        return false;
    }

    if (team !== 'eagle' && team !== 'tails') {
        showNotification('Неверная команда', 'error');
        return false;
    }

    if (amount <= 0 || isNaN(amount)) {
        showNotification('Неверная сумма ставки', 'error');
        return false;
    }

    if (window.userData.balance < amount) {
        showNotification('Недостаточно средств', 'error');
        return false;
    }

    if (window.hardSessionBlocker && window.hardSessionBlocker.isBlocked) {
        showNotification('Действие заблокировано', 'error');
        return false;
    }

    // ОСНОВНАЯ ЛОГИКА СТАВКИ
    try {
        const response = await apiRequest('/api/lottery/bet', {
            method: 'POST',
            body: JSON.stringify({
                userId: window.userData.userId,
                team: team,
                amount: amount,
                username: window.userData.username
            })
        });
        
        if (response && response.success) {
            // Обновляем баланс
            window.userData.balance -= amount;
            window.userData.totalBet = (window.userData.totalBet || 0) + amount;
            window.userData.lastUpdate = Date.now();
            
            updateUI();
            saveUserData();
            
            await loadLotteryStatus();
            
            showNotification(`Ставка ${amount.toFixed(9)} S за команду ${team === 'eagle' ? '🦅 Орлов' : '🪙 Решки'} принята!`, 'success');
            return true;
        } else {
            showNotification(`Ошибка ставки: ${response?.error || 'Неизвестная ошибка'}`, 'error');
            return false;
        }
    } catch (error) {
        console.warn('⚠️ Ошибка ставки, используем локальный режим:', error);
        
        // ЛОКАЛЬНЫЙ РЕЖИМ - ВАЖНО ДЛЯ РАБОТОСПОСОБНОСТИ
        window.userData.balance -= amount;
        window.userData.totalBet = (window.userData.totalBet || 0) + amount;
        
        // Добавляем ставку локально
        const bet = {
            userId: window.userData.userId,
            username: window.userData.username,
            amount: amount,
            timestamp: new Date().toISOString()
        };
        
        lotteryData[team].push(bet);
        
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
    // БЕЗОПАСНОЕ ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
    try {
        const eagleList = document.getElementById('teamEagle');
        const tailsList = document.getElementById('teamTails');
        const eagleTotal = document.getElementById('eagleTotal');
        const tailsTotal = document.getElementById('tailsTotal');
        const eagleParticipants = document.getElementById('eagleParticipants');
        const tailsParticipants = document.getElementById('tailsParticipants');
        const lotteryTimer = document.getElementById('lotteryTimer');
        const lastWinner = document.getElementById('lastWinner');
        const winnerTeam = document.getElementById('winnerTeam');
        
        if (lotteryTimer) lotteryTimer.textContent = lotteryData.timer || 60;
        if (eagleTotal) eagleTotal.textContent = (lotteryData.total_eagle || 0).toFixed(9) + ' S';
        if (tailsTotal) tailsTotal.textContent = (lotteryData.total_tails || 0).toFixed(9) + ' S';
        if (eagleParticipants) eagleParticipants.textContent = lotteryData.eagle ? lotteryData.eagle.length : 0;
        if (tailsParticipants) tailsParticipants.textContent = lotteryData.tails ? lotteryData.tails.length : 0;
        
        // Очищаем списки
        if (eagleList) eagleList.innerHTML = '';
        if (tailsList) tailsList.innerHTML = '';
        
        // Заполняем список Орлов
        if (eagleList && lotteryData.eagle && lotteryData.eagle.length > 0) {
            lotteryData.eagle.forEach((participant) => {
                if (!participant) return;
                
                const item = document.createElement('div');
                item.className = `participant-item eagle ${participant.userId === (window.userData?.userId) ? 'current-player' : ''}`;
                
                const betTime = participant.timestamp ? new Date(participant.timestamp) : new Date();
                const timeString = betTime.toLocaleTimeString();
                
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div style="flex: 1;">
                            <div style="${participant.userId === (window.userData?.userId) ? 'color: #4CC9F0; font-weight: bold;' : 'color: white;'}">
                                ${participant.username || 'Игрок'} ${participant.userId === (window.userData?.userId) ? '(Вы)' : ''}
                            </div>
                            <div class="participant-time">${timeString}</div>
                        </div>
                        <span class="participant-bet">${(participant.amount || 0).toFixed(9)} S</span>
                    </div>
                `;
                eagleList.appendChild(item);
            });
        } else if (eagleList) {
            eagleList.innerHTML = '<div style="text-align: center; color: #666; padding: 15px; font-size: 12px;">Пока нет ставок</div>';
        }
        
        // Заполняем список Решек
        if (tailsList && lotteryData.tails && lotteryData.tails.length > 0) {
            lotteryData.tails.forEach((participant) => {
                if (!participant) return;
                
                const item = document.createElement('div');
                item.className = `participant-item tails ${participant.userId === (window.userData?.userId) ? 'current-player' : ''}`;
                
                const betTime = participant.timestamp ? new Date(participant.timestamp) : new Date();
                const timeString = betTime.toLocaleTimeString();
                
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <div style="flex: 1;">
                            <div style="${participant.userId === (window.userData?.userId) ? 'color: #4CC9F0; font-weight: bold;' : 'color: white;'}">
                                ${participant.username || 'Игрок'} ${participant.userId === (window.userData?.userId) ? '(Вы)' : ''}
                            </div>
                            <div class="participant-time">${timeString}</div>
                        </div>
                        <span class="participant-bet">${(participant.amount || 0).toFixed(9)} S</span>
                    </div>
                `;
                tailsList.appendChild(item);
            });
        } else if (tailsList) {
            tailsList.innerHTML = '<div style="text-align: center; color: #666; padding: 15px; font-size: 12px;">Пока нет ставок</div>';
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
        
        // Показываем последнего победителя
        if (lastWinner && winnerTeam && lotteryData.last_winner) {
            lastWinner.style.display = 'block';
            const teamName = lotteryData.last_winner.team === 'eagle' ? '🦅 Орлы' : '🪙 Решки';
            const winnerTime = lotteryData.last_winner.timestamp ? new Date(lotteryData.last_winner.timestamp).toLocaleDateString() : 'Недавно';
            winnerTeam.innerHTML = `
                <div style="color: #FFD700; font-weight: bold;">${teamName}</div>
                <div style="color: white;">${lotteryData.last_winner.username || 'Победитель'}</div>
                <div style="color: #4CAF50; font-weight: bold;">${(lotteryData.last_winner.prize || 0).toFixed(9)} S</div>
                <div style="font-size: 10px; color: #ccc;">${winnerTime}</div>
            `;
        } else if (lastWinner) {
            lastWinner.style.display = 'none';
        }
    } catch (error) {
        console.error('❌ Ошибка обновления интерфейса лотереи:', error);
    }
}

function startLotteryAutoUpdate() {
    clearInterval(lotteryUpdateInterval);
    
    loadLotteryStatus();
    
    lotteryUpdateInterval = setInterval(() => {
        loadLotteryStatus();
    }, 5000);
}

function selectTeam(team) {
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
    
    if (window.userData && bet > window.userData.balance) {
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

// ========== КЛАССИЧЕСКАЯ ЛОТЕРЕЯ - РАБОЧИЙ КОД ==========

async function loadClassicLottery() {
    try {
        const data = await apiRequest('/api/classic-lottery/status');
        
        if (data && data.success && data.lottery) {
            classicLotteryData.bets = data.lottery.bets || [];
            classicLotteryData.total_pot = data.lottery.total_pot || 0;
            classicLotteryData.timer = data.lottery.timer || 120;
            classicLotteryData.participants_count = data.lottery.participants_count || 0;
            classicLotteryData.history = data.lottery.history || [];
            
            updateClassicLotteryUI();
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
    const betInput = document.getElementById('classicBet');
    if (!betInput) return;
    
    const bet = parseFloat(betInput.value);
    
    if (isNaN(bet) || bet <= 0) {
        showNotification('Введите корректную сумму ставки', 'error');
        return;
    }
    
    if (window.userData && bet > window.userData.balance) {
        showNotification('Недостаточно средств', 'error');
        return;
    }
    
    if (bet < 0.000000001) {
        showNotification('Минимальная ставка 0.000000001 S', 'error');
        return;
    }
    
    if (window.hardSessionBlocker && window.hardSessionBlocker.isBlocked) {
        showNotification('Действие заблокировано', 'error');
        return;
    }
    
    if (!window.userData.userId || !bet || !window.userData.username) {
        showNotification('Ошибка данных', 'error');
        return;
    }
    
    try {
        const response = await apiRequest('/api/classic-lottery/bet', {
            method: 'POST',
            body: JSON.stringify({
                userId: window.userData.userId,
                amount: bet,
                username: window.userData.username
            })
        });
        
        if (response && response.success) {
            window.userData.balance -= bet;
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
        
        // ЛОКАЛЬНЫЙ РЕЖИМ
        window.userData.balance -= bet;
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
        
        if (classicTimer) classicTimer.textContent = classicLotteryData.timer || 120;
        if (lotteryPot) lotteryPot.textContent = (classicLotteryData.total_pot || 0).toFixed(9);
        if (lotteryParticipants) lotteryParticipants.textContent = classicLotteryData.participants_count || 0;
        
        if (historyElement) {
            historyElement.innerHTML = '';
            
            if (classicLotteryData.history && Array.isArray(classicLotteryData.history)) {
                classicLotteryData.history.forEach(item => {
                    if (!item) return;
                    
                    const historyItem = document.createElement('div');
                    const isWinner = item.winner === (window.userData?.username);
                    historyItem.className = `history-item ${isWinner ? '' : 'lost'}`;
                    historyItem.innerHTML = `
                        <div style="font-weight: bold;">${item.winner || 'Победитель'}</div>
                        <div style="color: ${isWinner ? '#4CAF50' : '#f44336'};">
                            ${isWinner ? 'Выиграл' : 'Проиграл'} ${(item.prize || 0).toFixed(9)} S
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
    clearInterval(classicLotteryInterval);
    
    loadClassicLottery();
    
    classicLotteryInterval = setInterval(() => {
        loadClassicLottery();
    }, 5000);
}

// ========== РЕФЕРАЛЬНАЯ СИСТЕМА ==========

async function loadReferralStats() {
    try {
        if (!window.userData || !window.userData.userId) {
            console.log('⚠️ Нет данных пользователя для загрузки рефералов');
            updateReferralUI();
            return;
        }
        
        const data = await apiRequest(`/api/referral/stats/${window.userData.userId}`);
        
        if (data && data.success) {
            referralData.referralsCount = data.stats?.referralsCount || 0;
            referralData.totalEarnings = data.stats?.totalEarnings || 0;
            referralData.referralCode = data.referralCode || 'REF-' + (window.userData.userId.slice(-8) || 'DEFAULT');
            
            updateReferralUI();
        } else {
            console.log('⚠️ Нет данных рефералов, используем локальные');
            updateReferralUI();
        }
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки реферальной статистики:', error);
        referralData.referralsCount = 0;
        referralData.totalEarnings = 0;
        referralData.referralCode = window.userData ? 'REF-' + window.userData.userId.slice(-8) : 'REF-DEFAULT';
        updateReferralUI();
    }
}

function updateReferralUI() {
    try {
        const referralsCountElement = document.getElementById('referralsCount');
        const referralEarningsElement = document.getElementById('referralEarnings');
        const referralLinkElement = document.getElementById('referralLink');
        
        if (referralsCountElement) referralsCountElement.textContent = referralData.referralsCount;
        if (referralEarningsElement) referralEarningsElement.textContent = referralData.totalEarnings.toFixed(9) + ' S';
        if (referralLinkElement) referralLinkElement.textContent = referralData.referralCode;
    } catch (error) {
        console.error('❌ Ошибка обновления интерфейса рефералов:', error);
    }
}

function shareReferral() {
    const shareText = `Присоединяйся к Sparkcoin! Используй мою реферальную ссылку: ${referralData.referralCode}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Sparkcoin',
            text: shareText,
            url: window.location.href
        }).catch(error => {
            console.log('Ошибка sharing API:', error);
            copyToClipboard(shareText);
        });
    } else {
        copyToClipboard(shareText);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Ссылка скопирована в буфер обмена!', 'success');
    }).catch(error => {
        console.error('Ошибка копирования:', error);
        // Резервный метод
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        showNotification('Ссылка скопирована!', 'success');
    });
}

// ========== ТОП ПОБЕДИТЕЛЕЙ ==========

async function updateTopWinners() {
    try {
        const data = await apiRequest('/api/top/winners?limit=50');
        
        if (data && data.success) {
            const topWinnersElement = document.getElementById('topWinners');
            if (topWinnersElement) {
                topWinnersElement.innerHTML = '';
                
                if (data.winners && Array.isArray(data.winners)) {
                    data.winners.forEach((winner, index) => {
                        if (!winner) return;
                        
                        const winnerItem = document.createElement('div');
                        winnerItem.className = 'winner-item';
                        winnerItem.innerHTML = `
                            <div class="winner-rank">${index + 1}</div>
                            <div class="winner-name">${winner.username || 'Игрок'}</div>
                            <div class="winner-amount">${(winner.netWinnings || 0).toFixed(9)} S</div>
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

// ========== ФИКС ДЛЯ СТРАНИЦЫ РЕЙТИНГА ==========

function showRatingSection() {
    console.log('📊 Показываем страницу рейтинга...');
    
    // Скрываем все секции
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Показываем секцию рейтинга
    const ratingSection = document.getElementById('ratingSection');
    if (ratingSection) {
        ratingSection.classList.add('active');
        console.log('✅ Секция рейтинга активирована');
        
        // Загружаем данные для рейтинга
        setTimeout(() => {
            updateTopWinners();
            if (typeof updateLeaderboard === 'function') {
                updateLeaderboard();
            }
        }, 100);
    } else {
        console.error('❌ Секция рейтинга не найдена');
    }
}

// ========== ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ HTML ==========

window.selectTeam = selectTeam;
window.playTeamLottery = playTeamLottery;
window.playClassicLottery = playClassicLottery;
window.shareReferral = shareReferral;
window.copyToClipboard = copyToClipboard;
window.showRatingSection = showRatingSection;

// ========== АВТОЗАПУСК ПРИ ЗАГРУЗКЕ ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Инициализация игровой системы...');
    
    setTimeout(() => {
        startLotteryAutoUpdate();
        startClassicLotteryUpdate();
        loadReferralStats();
        updateTopWinners();
        
        // Периодическое обновление
        setInterval(() => {
            updateTopWinners();
        }, 30000);
    }, 2000);
});

console.log('✅ РАБОЧИЙ КОД ИГР УСПЕШНО ЗАГРУЖЕН!');
