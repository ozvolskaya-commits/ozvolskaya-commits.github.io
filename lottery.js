// ==================== ФУНКЦИИ ЛОТЕРЕИ ====================

let lotteryData = {
    eagle: [],
    tails: [],
    last_winner: null,
    timer: 60,
    total_eagle: 0,
    total_tails: 0
};

let classicLotteryData = {
    bets: [],
    total_pot: 0,
    timer: 120,
    participants_count: 0,
    history: []
};

let selectedTeam = null;
let lotteryUpdateInterval;
let classicLotteryInterval;

// Командная лотерея
async function loadLotteryStatus() {
    try {
        const data = await apiRequest('/lottery/status');
        
        if (data.success && data.lottery) {
            lotteryData = data.lottery;
            updateLotteryUI();
        }
    } catch (error) {
        console.warn('Ошибка загрузки статуса лотереи:', error);
    }
}

async function placeLotteryBet(team, amount) {
    try {
        const data = await apiRequest('/lottery/bet', {
            method: 'POST',
            body: JSON.stringify({
                userId: userData.userId,
                team: team,
                amount: amount
            })
        });
        
        if (data.success) {
            userData.balance -= amount;
            userData.totalBet += amount;
            userData.lastUpdate = Date.now();
            
            updateUI();
            saveUserData();
            
            await loadLotteryStatus();
            
            showNotification(`Ставка ${amount.toFixed(9)} S за команду ${team === 'eagle' ? 'Орлов' : 'Решки'} принята!`, 'success');
            return true;
        } else {
            showNotification(`Ошибка ставки: ${data.error}`, 'error');
            return false;
        }
    } catch (error) {
        showNotification('Ставка принята в резервном режиме', 'warning');
        userData.balance -= amount;
        userData.totalBet += amount;
        userData.lastUpdate = Date.now();
        updateUI();
        saveUserData();
        return true;
    }
}

function updateLotteryUI() {
    const eagleList = document.getElementById('teamEagle');
    const tailsList = document.getElementById('teamTails');
    const eagleTotal = document.getElementById('eagleTotal');
    const tailsTotal = document.getElementById('tailsTotal');
    const eagleParticipants = document.getElementById('eagleParticipants');
    const tailsParticipants = document.getElementById('tailsParticipants');
    const lotteryTimer = document.getElementById('lotteryTimer');
    const lastWinner = document.getElementById('lastWinner');
    const winnerTeam = document.getElementById('winnerTeam');
    
    lotteryTimer.textContent = lotteryData.timer;
    
    eagleTotal.textContent = lotteryData.total_eagle.toFixed(9) + ' S';
    tailsTotal.textContent = lotteryData.total_tails.toFixed(9) + ' S';
    
    eagleParticipants.textContent = lotteryData.eagle.length;
    tailsParticipants.textContent = lotteryData.tails.length;
    
    eagleList.innerHTML = '';
    tailsList.innerHTML = '';
    
    if (lotteryData.eagle && lotteryData.eagle.length > 0) {
        lotteryData.eagle.forEach((participant) => {
            const item = document.createElement('div');
            item.className = `participant-item eagle ${participant.userId === userData.userId ? 'current-player' : ''}`;
            item.setAttribute('data-user-id', participant.userId);
            
            const betTime = new Date(participant.timestamp);
            const timeString = betTime.toLocaleTimeString();
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div style="flex: 1;">
                        <div style="${participant.userId === userData.userId ? 'color: #4CC9F0; font-weight: bold;' : 'color: white;'}">
                            ${participant.username}
                        </div>
                        <div class="participant-time">${timeString}</div>
                    </div>
                    <span class="participant-bet">${participant.amount.toFixed(9)} S</span>
                </div>
            `;
            eagleList.appendChild(item);
        });
    } else {
        eagleList.innerHTML = '<div style="text-align: center; color: #666; padding: 15px; font-size: 12px;">Пока нет ставок</div>';
    }
    
    if (lotteryData.tails && lotteryData.tails.length > 0) {
        lotteryData.tails.forEach((participant) => {
            const item = document.createElement('div');
            item.className = `participant-item tails ${participant.userId === userData.userId ? 'current-player' : ''}`;
            item.setAttribute('data-user-id', participant.userId);
            
            const betTime = new Date(participant.timestamp);
            const timeString = betTime.toLocaleTimeString();
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <div style="flex: 1;">
                        <div style="${participant.userId === userData.userId ? 'color: #4CC9F0; font-weight: bold;' : 'color: white;'}">
                            ${participant.username}
                        </div>
                        <div class="participant-time">${timeString}</div>
                    </div>
                    <span class="participant-bet">${participant.amount.toFixed(9)} S</span>
                </div>
            `;
            tailsList.appendChild(item);
        });
    } else {
        tailsList.innerHTML = '<div style="text-align: center; color: #666; padding: 15px; font-size: 12px;">Пока нет ставок</div>';
    }
    
    const totalBet = lotteryData.total_eagle + lotteryData.total_tails;
    let eagleChance = 50;
    let tailsChance = 50;
    
    if (totalBet > 0) {
        eagleChance = Math.round((lotteryData.total_eagle / totalBet) * 100);
        tailsChance = 100 - eagleChance;
    }
    
    document.getElementById('eagleChance').textContent = eagleChance + '%';
    document.getElementById('tailsChance').textContent = tailsChance + '%';
    
    if (lotteryData.last_winner) {
        lastWinner.style.display = 'block';
        const teamName = lotteryData.last_winner.team === 'eagle' ? '🦅 Орлы' : '🪙 Решки';
        const winnerTime = new Date(lotteryData.last_winner.timestamp).toLocaleDateString();
        winnerTeam.innerHTML = `
            <div style="color: #FFD700; font-weight: bold;">${teamName}</div>
            <div style="color: white;">${lotteryData.last_winner.username}</div>
            <div style="color: #4CAF50; font-weight: bold;">${lotteryData.last_winner.prize.toFixed(9)} S</div>
            <div style="font-size: 10px; color: #ccc;">${winnerTime}</div>
        `;
    } else {
        lastWinner.style.display = 'none';
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
    const bet = parseFloat(betInput.value);
    
    if (isNaN(bet) || bet <= 0) {
        showNotification('Введите корректную сумму ставки', 'error');
        return;
    }
    
    if (bet > userData.balance) {
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
        betInput.value = '0.000000100';
    }
}

// Классическая лотерея
async function loadClassicLottery() {
    try {
        const data = await apiRequest('/classic-lottery/status');
        
        if (data.success && data.lottery) {
            classicLotteryData = data.lottery;
            updateClassicLotteryUI();
        }
    } catch (error) {
        console.warn('Ошибка загрузки классической лотереи:', error);
    }
}

async function playClassicLottery() {
    const betInput = document.getElementById('classicBet');
    const bet = parseFloat(betInput.value);
    
    if (isNaN(bet) || bet <= 0) {
        showNotification('Введите корректную сумму ставки', 'error');
        return;
    }
    
    if (bet > userData.balance) {
        showNotification('Недостаточно средств', 'error');
        return;
    }
    
    if (bet < 0.000000001) {
        showNotification('Минимальная ставка 0.000000001 S', 'error');
        return;
    }
    
    try {
        const data = await apiRequest('/classic-lottery/bet', {
            method: 'POST',
            body: JSON.stringify({
                userId: userData.userId,
                amount: bet
            })
        });
        
        if (data.success) {
            userData.balance -= bet;
            userData.totalBet += bet;
            userData.lastUpdate = Date.now();
            
            updateUI();
            saveUserData();
            await loadClassicLottery();
            
            showNotification(`Ставка ${bet.toFixed(9)} S принята!`, 'success');
        } else {
            showNotification(`Ошибка ставки: ${data.error}`, 'error');
        }
    } catch (error) {
        showNotification('Ставка принята в резервном режиме', 'warning');
        userData.balance -= bet;
        userData.totalBet += bet;
        userData.lastUpdate = Date.now();
        updateUI();
        saveUserData();
    }
}

function updateClassicLotteryUI() {
    document.getElementById('classicTimer').textContent = classicLotteryData.timer;
    document.getElementById('lotteryPot').textContent = classicLotteryData.total_pot.toFixed(9);
    document.getElementById('lotteryParticipants').textContent = classicLotteryData.participants_count;
    
    const historyElement = document.getElementById('classicHistory');
    historyElement.innerHTML = '';
    
    classicLotteryData.history.forEach(item => {
        const historyItem = document.createElement('div');
        const isWinner = item.winner === userData.username;
        historyItem.className = `history-item ${isWinner ? '' : 'lost'}`;
        historyItem.innerHTML = `
            <div style="font-weight: bold;">${item.winner}</div>
            <div style="color: ${isWinner ? '#4CAF50' : '#f44336'};">
                ${isWinner ? 'Выиграл' : 'Проиграл'} ${item.prize.toFixed(9)} S
            </div>
            <div style="font-size: 10px; color: #ccc;">Участников: ${item.participants}</div>
        `;
        historyElement.appendChild(historyItem);
    });
}

function startClassicLotteryUpdate() {
    clearInterval(classicLotteryInterval);
    
    loadClassicLottery();
    
    classicLotteryInterval = setInterval(() => {
        loadClassicLottery();
    }, 5000);
}

// Реферальная система
let referralData = {
    referralsCount: 0,
    totalEarnings: 0,
    referralCode: ''
};

async function loadReferralStats() {
    try {
        const data = await apiRequest(`/referral/stats/${userData.userId}`);
        
        if (data.success) {
            referralData = {
                referralsCount: data.stats.referralsCount || 0,
                totalEarnings: data.stats.totalEarnings || 0,
                referralCode: data.referralCode || userData.referralCode || 'API-' + userData.userId.slice(-8)
            };
            updateReferralUI();
        }
    } catch (error) {
        console.warn('Ошибка загрузки реферальной статистики:', error);
        referralData = {
            referralsCount: 0,
            totalEarnings: 0,
            referralCode: userData.referralCode || 'RETRY-' + userData.userId.slice(-8)
        };
        updateReferralUI();
    }
}

function updateReferralUI() {
    document.getElementById('referralsCount').textContent = referralData.referralsCount;
    document.getElementById('referralEarnings').textContent = referralData.totalEarnings.toFixed(9) + ' S';
    
    const referralLinkElement = document.getElementById('referralLink');
    referralLinkElement.textContent = referralData.referralCode;
}

function shareReferral() {
    const shareText = `Присоединяйся к Sparkcoin! Используй мою реферальную ссылку: ${referralData.referralCode}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Sparkcoin',
            text: shareText,
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(shareText).then(() => {
            showNotification('Ссылка скопирована в буфер обмена!', 'success');
        });
    }
}

// Топ победителей
async function updateTopWinners() {
    try {
        const data = await apiRequest('/top/winners?limit=50');
        
        if (data.success) {
            const topWinnersElement = document.getElementById('topWinners');
            topWinnersElement.innerHTML = '';
            
            data.winners.forEach((winner, index) => {
                const winnerItem = document.createElement('div');
                winnerItem.className = 'winner-item';
                winnerItem.innerHTML = `
                    <div class="winner-rank">${index + 1}</div>
                    <div class="winner-name">${winner.username}</div>
                    <div class="winner-amount">${winner.netWinnings.toFixed(9)} S</div>
                `;
                topWinnersElement.appendChild(winnerItem);
            });
        }
    } catch (error) {
        console.warn('Ошибка обновления топа победителей:', error);
        const topWinnersElement = document.getElementById('topWinners');
        topWinnersElement.innerHTML = '<div class="winner-item"><div class="winner-name">Данные временно недоступны</div></div>';
    }
}
