// lottery.js - система лотерей с поддержкой мультисессии
console.log('🎰 Загружаем lottery.js...');

let lotteryData = {
    eagle: [],
    tails: [],
    last_winner: null,
    timer: 60,
    total_eagle: 0,
    total_tails: 0,
    participants_count: 0
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
        const data = await apiRequest('/api/lottery/status');
        
        if (data && data.success && data.lottery) {
            lotteryData = data.lottery;
            updateLotteryUI();
        } else {
            console.log('⚠️ Нет данных лотереи, используем локальные');
            updateLotteryUI();
        }
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки статуса лотереи, используем локальные данные:', error);
        updateLotteryUI();
    }
}

async function placeLotteryBet(team, amount) {
    try {
        // Проверяем мультисессию перед ставкой
        if (window.multiSessionDetector) {
            const status = window.multiSessionDetector.getStatus();
            if (status.isMultiSession && status.timeSinceLastActivity < 10000) {
                showNotification('Ставки временно недоступны из-за мультисессии', 'warning');
                return false;
            }
        }

        const data = await apiRequest('/api/lottery/bet', {
            method: 'POST',
            body: JSON.stringify({
                userId: window.userData.userId,
                team: team,
                amount: amount
            })
        });
        
        if (data && data.success) {
            if (window.userData) {
                window.userData.balance -= amount;
                window.userData.totalBet += amount;
                window.userData.lastUpdate = Date.now();
                
                updateUI();
                saveUserData();
            }
            
            await loadLotteryStatus();
            
            showNotification(`Ставка ${amount.toFixed(9)} S за команду ${team === 'eagle' ? 'Орлов' : 'Решки'} принята!`, 'success');
            return true;
        } else {
            showNotification(`Ошибка ставки: ${data?.error || 'Неизвестная ошибка'}`, 'error');
            return false;
        }
    } catch (error) {
        console.warn('⚠️ Ошибка ставки, используем локальный режим:', error);
        
        // Локальная обработка ставки
        if (window.userData) {
            if (window.userData.balance >= amount) {
                window.userData.balance -= amount;
                window.userData.totalBet += amount;
                window.userData.lastUpdate = Date.now();
                
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
            } else {
                showNotification('Недостаточно средств', 'error');
                return false;
            }
        }
        return false;
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
                            ${participant.username || 'Игрок'}
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
                            ${participant.username || 'Игрок'}
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
    
    // Обновляем синхронизацию
    if (window.multiSessionDetector) {
        window.multiSessionDetector.updateSync();
    }
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

// Классическая лотерея
async function loadClassicLottery() {
    try {
        const data = await apiRequest('/api/classic-lottery/status');
        
        if (data && data.success && data.lottery) {
            classicLotteryData = data.lottery;
            updateClassicLotteryUI();
        } else {
            console.log('⚠️ Нет данных классической лотереи, используем локальные');
            updateClassicLotteryUI();
        }
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки классической лотереи, используем локальные данные:', error);
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
    
    // Проверяем мультисессию перед ставкой
    if (window.multiSessionDetector) {
        const status = window.multiSessionDetector.getStatus();
        if (status.isMultiSession && status.timeSinceLastActivity < 10000) {
            showNotification('Ставки временно недоступны из-за мультисессии', 'warning');
            return;
        }
    }
    
    try {
        const data = await apiRequest('/api/classic-lottery/bet', {
            method: 'POST',
            body: JSON.stringify({
                userId: window.userData?.userId,
                amount: bet
            })
        });
        
        if (data && data.success) {
            if (window.userData) {
                window.userData.balance -= bet;
                window.userData.totalBet += bet;
                window.userData.lastUpdate = Date.now();
                
                updateUI();
                saveUserData();
            }
            
            await loadClassicLottery();
            
            showNotification(`Ставка ${bet.toFixed(9)} S принята!`, 'success');
        } else {
            showNotification(`Ошибка ставки: ${data?.error || 'Неизвестная ошибка'}`, 'error');
        }
    } catch (error) {
        console.warn('⚠️ Ошибка ставки, используем локальный режим:', error);
        
        // Локальная обработка ставки
        if (window.userData) {
            if (window.userData.balance >= bet) {
                window.userData.balance -= bet;
                window.userData.totalBet += bet;
                window.userData.lastUpdate = Date.now();
                
                // Добавляем ставку локально
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
            } else {
                showNotification('Недостаточно средств', 'error');
            }
        }
    }
}

function updateClassicLotteryUI() {
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
        if (!window.userData || !window.userData.userId) {
            console.log('⚠️ Нет данных пользователя для загрузки рефералов');
            updateReferralUI();
            return;
        }
        
        const data = await apiRequest(`/api/referral/stats/${window.userData.userId}`);
        
        if (data && data.success) {
            referralData = {
                referralsCount: data.stats?.referralsCount || 0,
                totalEarnings: data.stats?.totalEarnings || 0,
                referralCode: data.referralCode || 'REF-' + (window.userData.userId.slice(-8) || 'DEFAULT')
            };
            updateReferralUI();
        } else {
            console.log('⚠️ Нет данных рефералов, используем локальные');
            updateReferralUI();
        }
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки реферальной статистики, используем локальные данные:', error);
        referralData = {
            referralsCount: 0,
            totalEarnings: 0,
            referralCode: window.userData ? 'REF-' + window.userData.userId.slice(-8) : 'REF-DEFAULT'
        };
        updateReferralUI();
    }
}

function updateReferralUI() {
    const referralsCountElement = document.getElementById('referralsCount');
    const referralEarningsElement = document.getElementById('referralEarnings');
    const referralLinkElement = document.getElementById('referralLink');
    
    if (referralsCountElement) referralsCountElement.textContent = referralData.referralsCount;
    if (referralEarningsElement) referralEarningsElement.textContent = referralData.totalEarnings.toFixed(9) + ' S';
    if (referralLinkElement) referralLinkElement.textContent = referralData.referralCode;
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
    
    // Обновляем синхронизацию
    if (window.multiSessionDetector) {
        window.multiSessionDetector.updateSync();
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

// Топ победителей
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

console.log('🎰 Модуль лотереи загружен!');
