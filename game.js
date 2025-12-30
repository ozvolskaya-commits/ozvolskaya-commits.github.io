// game.js - ОПТИМИЗИРОВАННЫЙ КОД ИГР С МНОГОЯЗЫЧНОСТЬЮ
console.log('🎮 Загружаем оптимизированный код игр...');

// ========== ИНИЦИАЛИЗАЦИЯ ПЕРЕМЕННЫХ ==========
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

// ========== ЛОКАЛИЗАЦИЯ ИГР ==========
const GAME_LOCALIZATION = {
    ru: {
        selectTeam: "Выберите команду!",
        enterBet: "Введите сумму ставки",
        invalidBet: "Некорректная сумма ставки",
        minBet: "Минимальная ставка 0.000000001 S",
        betAccepted: "Ставка принята",
        betAcceptedOffline: "Ставка принята в локальном режиме",
        noBets: "Пока нет ставок",
        recentWinner: "Последний победитель",
        teamEagle: "Орлы",
        teamTails: "Решки",
        chance: "Шанс",
        total: "Всего",
        participants: "Участники",
        seconds: "сек"
    },
    en: {
        selectTeam: "Select team!",
        enterBet: "Enter bet amount",
        invalidBet: "Invalid bet amount",
        minBet: "Minimum bet 0.000000001 S",
        betAccepted: "Bet accepted",
        betAcceptedOffline: "Bet accepted in offline mode",
        noBets: "No bets yet",
        recentWinner: "Recent winner",
        teamEagle: "Eagles",
        teamTails: "Tails",
        chance: "Chance",
        total: "Total",
        participants: "Participants",
        seconds: "sec"
    }
};

function getGameText(key) {
    const lang = window.CURRENT_LANG || 'ru';
    return GAME_LOCALIZATION[lang][key] || key;
}

// ========== УТИЛИТЫ ДЛЯ ИГР ==========
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
    if (!timestamp) return getGameText('justNow');
    
    const betTime = new Date(timestamp);
    const now = new Date();
    const diffMs = now - betTime;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    
    if (diffSec < 10) return getGameText('justNow');
    if (diffSec < 60) return `${diffSec} ${getGameText('secondsAgo')}`;
    if (diffMin < 60) return `${diffMin} ${getGameText('minutesAgo')}`;
    
    return betTime.toLocaleTimeString();
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
                ${participant.username || getGameText('player')} ${isCurrentUser ? `(${getGameText('you')})` : ''}
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
                p.username && participantName.includes(p.username.replace(`(${getGameText('you')})`, '').trim())
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
        
        const data = await apiRequest('/api/lottery/status');
        
        if (data && data.success && data.lottery) {
            lotteryData.eagle = data.lottery.eagle || [];
            lotteryData.tails = data.lottery.tails || [];
            lotteryData.last_winner = data.lottery.last_winner || null;
            lotteryData.timer = data.lottery.timer || 60;
            lotteryData.total_eagle = data.lottery.total_eagle || 0;
            lotteryData.total_tails = data.lottery.total_tails || 0;
            lotteryData.participants_count = data.lottery.participants_count || 0;
            
            lastLotteryUpdate = now;
        }
        updateLotteryUI();
    } catch (error) {
        updateLotteryUI();
    }
}

async function placeLotteryBet(team, amount) {
    if (!window.userData) {
        showNotification(getGameText('noUserData'), 'error');
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
            headers: { 'Content-Type': 'application/json' },
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
            
            const teamName = team === 'eagle' ? getGameText('teamEagle') : getGameText('teamTails');
            showNotification(`${getGameText('betAccepted')} ${amount.toFixed(9)} S ${getGameText('forTeam')} ${teamName}`, 'success');
            return true;
        } else {
            showNotification(`${getGameText('betError')}: ${response?.error || getGameText('unknownError')}`, 'error');
            return false;
        }
    } catch (error) {
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
        
        showNotification(getGameText('betAcceptedOffline'), 'warning');
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
        
        if (lotteryTimer) lotteryTimer.textContent = (lotteryData.timer || 60) + ' ' + getGameText('seconds');
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
            eagleList.innerHTML = `<div style="text-align: center; color: #666; padding: 15px; font-size: 12px;">${getGameText('noBets')}</div>`;
        }
        
        if (tailsList && lotteryData.tails && lotteryData.tails.length > 0) {
            lotteryData.tails.forEach((participant) => {
                const item = createParticipantElement(participant, 'tails');
                if (item) tailsList.appendChild(item);
            });
        } else if (tailsList) {
            tailsList.innerHTML = `<div style="text-align: center; color: #666; padding: 15px; font-size: 12px;">${getGameText('noBets')}</div>`;
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
            const teamName = lotteryData.last_winner.team === 'eagle' ? '🦅 ' + getGameText('teamEagle') : '🪙 ' + getGameText('teamTails');
            const winnerTime = lotteryData.last_winner.timestamp ? formatBetTime(lotteryData.last_winner.timestamp) : getGameText('recently');
            winnerTeam.innerHTML = `
                <div style="color: #FFD700; font-weight: bold;">${teamName}</div>
                <div style="color: white;">${lotteryData.last_winner.username || getGameText('winner')}</div>
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
    clearInterval(lotteryUpdateInterval);
    
    loadLotteryStatus();
    
    lotteryUpdateInterval = setInterval(() => {
        loadLotteryStatus();
    }, 3000);
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
        showNotification(getGameText('selectTeam'), 'error');
        return;
    }
    
    const betInput = document.getElementById('teamBet');
    if (!betInput) return;
    
    const bet = parseFloat(betInput.value);
    
    if (isNaN(bet) || bet <= 0) {
        showNotification(getGameText('invalidBet'), 'error');
        return;
    }
    
    if (window.userData && parseFloat(window.userData.balance) < bet) {
        showNotification(getGameText('insufficientFunds'), 'error');
        return;
    }
    
    if (bet < 0.000000001) {
        showNotification(getGameText('minBet'), 'error');
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
        
        const data = await apiRequest('/api/classic-lottery/status');
        
        if (data && data.success && data.lottery) {
            classicLotteryData.bets = data.lottery.bets || [];
            classicLotteryData.total_pot = data.lottery.total_pot || 0;
            classicLotteryData.timer = data.lottery.timer || 120;
            classicLotteryData.participants_count = data.lottery.participants_count || 0;
            classicLotteryData.history = data.lottery.history || [];
            
            lastClassicUpdate = now;
        }
        updateClassicLotteryUI();
    } catch (error) {
        updateClassicLotteryUI();
    }
}

async function playClassicLottery() {
    const betInput = document.getElementById('classicBet');
    if (!betInput) return;
    
    const bet = parseFloat(betInput.value);
    
    if (isNaN(bet) || bet <= 0) {
        showNotification(getGameText('invalidBet'), 'error');
        return;
    }
    
    if (window.userData && parseFloat(window.userData.balance) < bet) {
        showNotification(getGameText('insufficientFunds'), 'error');
        return;
    }
    
    if (bet < 0.000000001) {
        showNotification(getGameText('minBet'), 'error');
        return;
    }
    
    if (!window.userData.userId || !bet || !window.userData.username) {
        showNotification(getGameText('noUserData'), 'error');
        return;
    }
    
    try {
        const response = await apiRequest('/api/classic-lottery/bet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            
            showNotification(getGameText('betAccepted'), 'success');
        } else {
            showNotification(`${getGameText('betError')}: ${response?.error || getGameText('unknownError')}`, 'error');
        }
    } catch (error) {
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
        
        showNotification(getGameText('betAcceptedOffline'), 'warning');
    }
}

function updateClassicLotteryUI() {
    try {
        const classicTimer = document.getElementById('classicTimer');
        const lotteryPot = document.getElementById('lotteryPot');
        const lotteryParticipants = document.getElementById('lotteryParticipants');
        const historyElement = document.getElementById('classicHistory');
        
        if (classicTimer) classicTimer.textContent = (classicLotteryData.timer || 120) + ' ' + getGameText('seconds');
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
                        <div style="font-weight: bold;">${item.winner || getGameText('winner')}</div>
                        <div style="color: ${isWinner ? '#4CAF50' : '#f44336'};">
                            ${isWinner ? getGameText('won') : getGameText('lost')} ${(item.prize || 0).toFixed(9)} S
                        </div>
                        <div style="font-size: 10px; color: #ccc;">${getGameText('participants')}: ${item.participants || 0}</div>
                    `;
                    historyElement.appendChild(historyItem);
                });
            } else {
                historyElement.innerHTML = `<div style="text-align: center; color: #666; padding: 20px; font-size: 12px;">${getGameText('noHistory')}</div>`;
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
    }, 3000);
}

// ========== СИСТЕМА РЕЙТИНГОВ ==========
async function updateTopWinners() {
    try {
        const data = await apiRequest('/api/top/winners?limit=50');
        
        const topWinnersElement = document.getElementById('topWinners');
        if (!topWinnersElement) return;
        
        if (data && data.success && data.winners) {
            topWinnersElement.innerHTML = '';
            
            if (data.winners && Array.isArray(data.winners)) {
                data.winners.forEach((winner, index) => {
                    if (!winner) return;
                    
                    const winnerItem = document.createElement('div');
                    winnerItem.className = 'winner-item';
                    const netWinnings = winner.netWinnings || 0;
                    winnerItem.innerHTML = `
                        <div class="winner-rank">${index + 1}</div>
                        <div class="winner-name">${winner.username || getGameText('player')}</div>
                        <div class="winner-amount ${netWinnings >= 0 ? 'positive' : 'negative'}">
                            ${netWinnings.toFixed(9)} S
                        </div>
                    `;
                    topWinnersElement.appendChild(winnerItem);
                });
            } else {
                topWinnersElement.innerHTML = `<div class="winner-item"><div class="winner-name">${getGameText('noWinners')}</div></div>`;
            }
        } else {
            topWinnersElement.innerHTML = `<div class="winner-item"><div class="winner-name">${getGameText('noData')}</div></div>`;
        }
    } catch (error) {
        const topWinnersElement = document.getElementById('topWinners');
        if (topWinnersElement) {
            topWinnersElement.innerHTML = `<div class="winner-item"><div class="winner-name">${getGameText('loadError')}</div></div>`;
        }
    }
}

async function updateLeaderboard() {
    try {
        const userId = window.userData?.userId;
        const data = await apiRequest(`/api/leaderboard?type=balance&limit=20`);
        
        const leaderboard = document.getElementById('leaderboard');
        if (!leaderboard) return;
        
        if (!data || !data.success || !data.leaderboard) {
            leaderboard.innerHTML = `<div class="leader-item">🏆 ${getGameText('beFirst')}</div>`;
            return;
        }
        
        let newHTML = '';
        
        data.leaderboard.forEach((player, index) => {
            if (!player || typeof player !== 'object') return;
            
            const rank = index + 1;
            const name = player.username || `${getGameText('player')} ${rank}`;
            const balance = typeof player.balance === 'number' ? player.balance : 0;
            const isCurrent = player.userId === userId;
            const currentClass = isCurrent ? 'current-player' : '';
            
            newHTML += `
                <div class="leader-item ${currentClass}">
                    <div class="leader-rank">${rank} ${getGameText('place')}</div>
                    <div class="leader-name ${currentClass}">${name} ${isCurrent ? '👑' : ''}</div>
                    <div class="leader-balance">${balance.toFixed(9)} S</div>
                </div>
            `;
        });
        
        leaderboard.innerHTML = newHTML;
    } catch (error) {
        const leaderboard = document.getElementById('leaderboard');
        if (leaderboard) {
            leaderboard.innerHTML = `<div class="leader-item">${getGameText('loadError')}</div>`;
        }
    }
}

async function updateSpeedLeaderboard() {
    try {
        const userId = window.userData?.userId;
        const data = await apiRequest(`/api/leaderboard?type=speed&limit=20`);
        
        const leaderboard = document.getElementById('speedLeaderboard');
        if (!leaderboard) return;
        
        if (!data || !data.success || !data.leaderboard) {
            leaderboard.innerHTML = `<div class="leader-item">🏆 ${getGameText('beFirstSpeed')}</div>`;
            return;
        }
        
        let newHTML = '';
        
        data.leaderboard.forEach((player, index) => {
            if (!player || typeof player !== 'object') return;
            
            const rank = index + 1;
            const name = player.username || `${getGameText('player')} ${rank}`;
            const mineSpeed = typeof player.mineSpeed === 'number' ? player.mineSpeed : 0.000000000;
            const clickSpeed = typeof player.clickSpeed === 'number' ? player.clickSpeed : 0.000000000;
            const totalSpeed = mineSpeed + clickSpeed;
            const isCurrent = player.userId === userId;
            const currentClass = isCurrent ? 'current-player' : '';
            
            newHTML += `
                <div class="leader-item ${currentClass}">
                    <div class="leader-rank">${rank} ${getGameText('place')}</div>
                    <div class="leader-name ${currentClass}">${name} ${isCurrent ? '👑' : ''}</div>
                    <div class="leader-speed">${totalSpeed.toFixed(9)} S/${getGameText('second')}</div>
                </div>
            `;
        });
        
        leaderboard.innerHTML = newHTML;
    } catch (error) {
        const leaderboard = document.getElementById('speedLeaderboard');
        if (leaderboard) {
            leaderboard.innerHTML = `<div class="leader-item">${getGameText('loadError')}</div>`;
        }
    }
}

// ========== ГЛОБАЛЬНЫЕ ФУНКЦИИ ==========
window.selectTeam = selectTeam;
window.playTeamLottery = playTeamLottery;
window.playClassicLottery = playClassicLottery;
window.updateLeaderboard = updateLeaderboard;
window.updateSpeedLeaderboard = updateSpeedLeaderboard;
window.updateTopWinners = updateTopWinners;

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        startLotteryAutoUpdate();
        startClassicLotteryUpdate();
        startRealTimeUpdates();
        updateTopWinners();
        updateLeaderboard();
        updateSpeedLeaderboard();
    }, 2000);
});

console.log('✅ Оптимизированный код игр загружен!');
