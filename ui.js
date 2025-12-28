// ui.js - ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ И УЛУЧШЕННЫЙ
console.log('🖥️ Загружаем ui.js...');

let allPlayers = [];
let selectedTransferUser = null;
let currentRatingTab = 'winners';

// ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ КНОПОК
window.showSection = function(sectionName) {
    console.log('🎯 Показываем секцию:', sectionName);
    
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
        
        switch(sectionName) {
            case 'top':
                if (typeof updateTopTab === 'function') updateTopTab(currentRatingTab);
                break;
            case 'transfer':
                if (typeof updateUsersList === 'function') updateUsersList();
                break;
            case 'shop':
                if (typeof updateShopUI === 'function') updateShopUI();
                break;
            case 'games':
                if (typeof showGameTab === 'function') showGameTab('team-lottery');
                if (typeof startSyncedTimers === 'function') startSyncedTimers();
                break;
            case 'referral':
                if (typeof updateReferralStats === 'function') updateReferralStats();
                break;
        }
    }
    
    if (window.multiSessionDetector) {
        window.multiSessionDetector.updateSync();
    }
};

// ПОПАП ИГР
window.showGamesPopup = function() {
    console.log('🎮 Открываем popup игр');
    const popup = document.getElementById('games-popup');
    if (popup) {
        popup.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

window.closeGamesPopup = function() {
    console.log('🎮 Закрываем popup игр');
    const popup = document.getElementById('games-popup');
    if (popup) {
        popup.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

window.openGame = function(gameType) {
    console.log('🎮 Открываем игру:', gameType);
    closeGamesPopup();
    
    switch(gameType) {
        case 'team-lottery':
            showSection('games');
            if (typeof showGameTab === 'function') showGameTab('team-lottery');
            break;
        case 'classic-lottery':
            showSection('games');
            if (typeof showGameTab === 'function') showGameTab('classic-lottery');
            break;
        case 'plinko':
        case 'dice':
            showNotification('Игра скоро будет доступна!', 'info');
            break;
    }
};

window.showGamesSection = function() {
    console.log('🎮 Показываем секцию игр');
    showSection('games');
};

// ВКЛАДКИ ИГР
window.showGameTab = function(tabName) {
    console.log('🎰 Показываем игровую вкладку:', tabName);
    
    document.querySelectorAll('.game-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.game-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`.game-tab[onclick*="${tabName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    const targetSection = document.getElementById(tabName + '-game');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    switch(tabName) {
        case 'team-lottery':
            if (typeof loadLotteryStatus === 'function') loadLotteryStatus();
            break;
        case 'classic-lottery':
            if (typeof loadClassicLottery === 'function') loadClassicLottery();
            break;
    }
    
    if (window.multiSessionDetector) {
        window.multiSessionDetector.updateSync();
    }
};

// ВКЛАДКИ РЕЙТИНГА - ИСПРАВЛЕННЫЕ
window.showTopTab = function(tabName) {
    console.log('🏆 Показываем вкладку рейтинга:', tabName);
    currentRatingTab = tabName;
    
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.game-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`.nav-tab[onclick*="${tabName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    const targetSection = document.getElementById(tabName + '-tab');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    updateTopTab(tabName);
    
    if (window.multiSessionDetector) {
        window.multiSessionDetector.updateSync();
    }
};

// ОБНОВЛЕНИЕ ВКЛАДОК РЕЙТИНГА
async function updateTopTab(tabName) {
    console.log('📊 Обновление вкладки:', tabName);
    
    switch(tabName) {
        case 'winners':
            await updateTopWinners();
            break;
        case 'balance':
            await updateLeaderboard();
            break;
        case 'speed':
            await updateSpeedLeaderboard();
            break;
    }
}

// ВКЛАДКИ МАГАЗИНА
window.showShopTab = function(tabName) {
    console.log('🛒 Показываем вкладку:', tabName);
    
    document.querySelectorAll('.shop-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.shop-category').forEach(category => {
        category.classList.add('hidden');
    });
    
    const activeTab = document.querySelector(`.shop-tab[onclick*="${tabName}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    const targetCategory = document.getElementById('shop-' + tabName);
    if (targetCategory) {
        targetCategory.classList.remove('hidden');
    }
    
    if (window.multiSessionDetector) {
        window.multiSessionDetector.updateSync();
    }
};

// ПЕРЕВОДЫ - ПОЛНОСТЬЮ ИСПРАВЛЕННЫЕ
async function updateUsersList() {
    const usersList = document.getElementById('usersList');
    const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
    
    if (!usersList) return;
    
    usersList.innerHTML = '<div class="loading">Загрузка игроков...</div>';
    
    try {
        const data = await apiRequest('/api/all_players');
        const apiPlayers = data.players || [];
        
        allPlayers = apiPlayers;
        
        // Фильтруем пользователей
        const filteredUsers = apiPlayers.filter(player => {
            // Исключаем текущего пользователя
            if (player.userId === window.userData?.userId) return false;
            
            // Проверяем поиск
            if (searchTerm) {
                const username = (player.username || '').toLowerCase();
                const userId = (player.userId || '').toLowerCase();
                return username.includes(searchTerm) || userId.includes(searchTerm);
            }
            
            return true;
        });
        
        usersList.innerHTML = '';
        
        if (filteredUsers.length === 0) {
            usersList.innerHTML = '<div class="empty-placeholder">Игроки не найдены</div>';
            return;
        }
        
        // Функция для получения аватарки
        const getAvatarUrl = (userId, username) => {
            const avatarSeed = userId || username || 'default';
            return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(avatarSeed)}&size=40`;
        };
        
        filteredUsers.forEach(player => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            
            const totalSpeed = player.totalSpeed || player.total_speed || 
                             (player.clickSpeed || 0) + (player.mineSpeed || 0);
            
            userItem.innerHTML = `
                <img src="${getAvatarUrl(player.userId, player.username)}" 
                     alt="${player.username}" 
                     class="user-avatar">
                <div class="user-details">
                    <div class="user-name">${player.username || 'Игрок'}</div>
                    <div class="user-balance">${(player.balance || 0).toFixed(9)} S</div>
                    <div class="user-speed">${totalSpeed.toFixed(9)} S/сек</div>
                </div>
            `;
            
            userItem.onclick = () => selectUserForTransfer(player);
            usersList.appendChild(userItem);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки списка игроков:', error);
        usersList.innerHTML = '<div class="empty-placeholder">Ошибка загрузки</div>';
    }
}

function selectUserForTransfer(user) {
    selectedTransferUser = user;
    
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    event.target.closest('.user-item').classList.add('selected');
    
    const selectedUserElement = document.getElementById('selectedUser');
    if (selectedUserElement) {
        selectedUserElement.style.display = 'block';
        document.getElementById('selectedUserName').textContent = user.username || 'Игрок';
        document.getElementById('selectedUserBalance').textContent = `Баланс: ${(user.balance || 0).toFixed(9)} S`;
        
        const transferAmount = document.getElementById('transferAmount');
        if (transferAmount) {
            transferAmount.value = '0.000000001';
            transferAmount.addEventListener('input', function() {
                const amount = parseFloat(this.value);
                const transferButton = document.getElementById('transferButton');
                if (transferButton) {
                    const userBalance = window.userData?.balance || 0;
                    const isValid = amount > 0 && amount <= userBalance && amount >= 0.000000001;
                    transferButton.disabled = !isValid;
                    transferButton.innerHTML = isValid ? 
                        'Перевести' : 
                        (amount > userBalance ? 'Недостаточно средств' : 'Введите сумму');
                }
            });
        }
        
        const transferButton = document.getElementById('transferButton');
        if (transferButton) {
            transferButton.disabled = true;
        }
    }
    
    if (window.multiSessionDetector) {
        window.multiSessionDetector.updateSync();
    }
}

async function makeTransfer() {
    if (!selectedTransferUser) {
        showNotification('Выберите пользователя для перевода', 'error');
        return;
    }
    
    const amountInput = document.getElementById('transferAmount');
    if (!amountInput) return;
    
    const amount = parseFloat(amountInput.value);
    
    if (!amount || amount <= 0) {
        showNotification('Введите корректную сумму', 'error');
        return;
    }
    
    if (!window.userData) {
        showNotification('Данные пользователя не загружены', 'error');
        return;
    }
    
    if (amount > parseFloat(window.userData.balance)) {
        showNotification('Недостаточно средств', 'error');
        return;
    }
    
    if (amount < 0.000000001) {
        showNotification('Минимальная сумма перевода: 0.000000001 S', 'error');
        return;
    }
    
    if (selectedTransferUser.userId === window.userData.userId) {
        showNotification('Нельзя переводить самому себе', 'error');
        return;
    }
    
    // Проверка мультисессии
    if (window.multiSessionDetector) {
        const status = window.multiSessionDetector.getStatus();
        if (status.isMultiSession && status.timeSinceLastActivity < 10000) {
            showNotification('Переводы временно недоступны из-за мультисессии', 'warning');
            return;
        }
    }
    
    try {
        console.log('🔄 Выполнение перевода:', {
            from: window.userData.userId,
            to: selectedTransferUser.userId,
            amount: amount
        });
        
        const data = await apiRequest('/api/transfer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fromUserId: window.userData.userId,
                toUserId: selectedTransferUser.userId,
                amount: amount,
                fromUsername: window.userData.username,
                toUsername: selectedTransferUser.username
            })
        });
        
        if (data && data.success) {
            // Обновляем баланс
            window.userData.balance = parseFloat(window.userData.balance) - amount;
            window.userData.transfers = window.userData.transfers || { sent: 0, received: 0 };
            window.userData.transfers.sent = (window.userData.transfers.sent || 0) + amount;
            window.userData.lastUpdate = Date.now();
            
            updateUI();
            saveUserData();
            
            // Сбрасываем
            const selectedUserElement = document.getElementById('selectedUser');
            if (selectedUserElement) {
                selectedUserElement.style.display = 'none';
            }
            selectedTransferUser = null;
            
            // Очищаем поиск
            const userSearch = document.getElementById('userSearch');
            if (userSearch) {
                userSearch.value = '';
            }
            
            // Обновляем список
            setTimeout(updateUsersList, 500);
            
            showNotification(`Перевод ${amount.toFixed(9)} S выполнен успешно!`, 'success');
            
            // Синхронизация
            setTimeout(() => window.syncUserData(), 1000);
        } else {
            showNotification(`Ошибка перевода: ${data?.error || 'Неизвестная ошибка'}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка перевода:', error);
        showNotification('Ошибка соединения с сервером', 'warning');
    }
}

function searchUsers() {
    updateUsersList();
}

// РЕЙТИНГИ - ИСПРАВЛЕННЫЕ
async function updateLeaderboard() {
    try {
        const userId = window.userData?.userId;
        const data = await apiRequest(`/api/leaderboard?type=balance&limit=20`);
        
        const leaderboard = document.getElementById('leaderboard');
        if (!leaderboard) return;
        
        leaderboard.innerHTML = '<div class="loading">Загрузка рейтинга...</div>';
        
        if (!data || !data.success || !data.leaderboard || data.leaderboard.length === 0) {
            leaderboard.innerHTML = '<div class="empty-placeholder">🏆 Стань первым в рейтинге!</div>';
            return;
        }
        
        let newHTML = '';
        
        data.leaderboard.forEach((player, index) => {
            if (!player || typeof player !== 'object') return;
            
            const rank = index + 1;
            const name = player.username || `Игрок ${rank}`;
            const balance = player.balance || 0;
            const isCurrent = player.userId === userId;
            const currentClass = isCurrent ? 'current-player' : '';
            
            newHTML += `
                <div class="leader-item ${currentClass}">
                    <div class="leader-rank">${rank}</div>
                    <div class="leader-info">
                        <div class="leader-name ${currentClass}">
                            ${name} ${isCurrent ? '👑' : ''}
                        </div>
                        <div class="leader-balance">${balance.toFixed(9)} S</div>
                    </div>
                </div>
            `;
        });
        
        leaderboard.innerHTML = newHTML;
        
    } catch (error) {
        console.error('Ошибка обновления рейтинга:', error);
        const leaderboard = document.getElementById('leaderboard');
        if (leaderboard) {
            leaderboard.innerHTML = '<div class="empty-placeholder">Ошибка загрузки рейтинга</div>';
        }
    }
}

async function updateSpeedLeaderboard() {
    try {
        const userId = window.userData?.userId;
        const data = await apiRequest(`/api/leaderboard?type=speed&limit=20`);
        
        const leaderboard = document.getElementById('speedLeaderboard');
        if (!leaderboard) return;
        
        leaderboard.innerHTML = '<div class="loading">Загрузка рейтинга скорости...</div>';
        
        if (!data || !data.success || !data.leaderboard || data.leaderboard.length === 0) {
            leaderboard.innerHTML = '<div class="empty-placeholder">⚡ Стань первым в рейтинге скорости!</div>';
            return;
        }
        
        let newHTML = '';
        
        data.leaderboard.forEach((player, index) => {
            if (!player || typeof player !== 'object') return;
            
            const rank = index + 1;
            const name = player.username || `Игрок ${rank}`;
            const totalSpeed = player.totalSpeed || player.total_speed || 
                             (player.clickSpeed || 0) + (player.mineSpeed || 0);
            const displaySpeed = totalSpeed || 0.000000000;
            const isCurrent = player.userId === userId;
            const currentClass = isCurrent ? 'current-player' : '';
            
            newHTML += `
                <div class="leader-item ${currentClass}">
                    <div class="leader-rank">${rank}</div>
                    <div class="leader-info">
                        <div class="leader-name ${currentClass}">
                            ${name} ${isCurrent ? '👑' : ''}
                        </div>
                        <div class="leader-speed">${displaySpeed.toFixed(9)} S/сек</div>
                    </div>
                </div>
            `;
        });
        
        leaderboard.innerHTML = newHTML;
        
    } catch (error) {
        console.error('Ошибка обновления рейтинга скорости:', error);
        const leaderboard = document.getElementById('speedLeaderboard');
        if (leaderboard) {
            leaderboard.innerHTML = '<div class="empty-placeholder">Ошибка загрузки рейтинга</div>';
        }
    }
}

// ОБНОВЛЕНИЕ ИНТЕРФЕЙСА С ПРАВИЛЬНЫМИ СКОРОСТЯМИ
function updateUI() {
    if (!window.userData) return;
    
    const balanceElement = document.getElementById('balanceValue');
    const clickValueElement = document.getElementById('clickValue');
    const clickSpeedElement = document.getElementById('clickSpeed');
    const mineSpeedElement = document.getElementById('mineSpeed');
    
    if (balanceElement) {
        const balance = window.userData.balance || 0.000000100;
        balanceElement.textContent = balance.toFixed(9) + ' S';
    }
    
    if (clickValueElement) {
        const clickPower = typeof calculateClickPower === 'function' ? calculateClickPower() : 0.000000001;
        clickValueElement.textContent = clickPower.toFixed(9);
    }
    
    if (clickSpeedElement) {
        const clickPower = typeof calculateClickPower === 'function' ? calculateClickPower() : 0.000000001;
        clickSpeedElement.textContent = clickPower.toFixed(9) + ' S/сек';
    }
    
    if (mineSpeedElement) {
        let miningSpeed = 0.000000000;
        try {
            miningSpeed = typeof calculateMiningSpeed === 'function' ? calculateMiningSpeed() : 0.000000000;
            if (isNaN(miningSpeed) || !isFinite(miningSpeed) || miningSpeed < 0) {
                miningSpeed = 0.000000000;
            }
        } catch (error) {
            console.error('Ошибка получения скорости майнинга:', error);
            miningSpeed = 0.000000000;
        }
        mineSpeedElement.textContent = miningSpeed.toFixed(9) + ' S/сек';
    }
}

// УВЕДОМЛЕНИЯ
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(-20px);
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 90%;
        text-align: center;
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;
    
    const title = type === 'success' ? '✅ Успех' : 
                 type === 'error' ? '❌ Ошибка' :
                 type === 'warning' ? '⚠️ Внимание' : 'ℹ️ Информация';
    
    notification.innerHTML = `
        <div style="font-size: 14px; margin-bottom: 5px;">${title}</div>
        <div style="font-size: 12px;">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(-50%) translateY(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }, duration);
}

// ПОПАП РЕЗУЛЬТАТА
function showResultPopup(isWin, amount, emoji) {
    const popup = document.getElementById('resultPopup');
    const emojiElement = document.getElementById('resultEmoji');
    const textElement = document.getElementById('resultText');
    const amountElement = document.getElementById('resultAmount');
    
    if (!popup || !emojiElement || !textElement || !amountElement) return;
    
    popup.className = `result-popup ${isWin ? 'win' : 'lose'}`;
    emojiElement.textContent = emoji;
    textElement.textContent = isWin ? '🎉 Победа!' : '💸 Проигрыш';
    amountElement.textContent = `${amount >= 0 ? '+' : ''}${amount.toFixed(9)} S`;
    amountElement.style.color = isWin ? '#4CAF50' : '#f44336';
    
    popup.style.display = 'block';
}

function closeResultPopup() {
    const popup = document.getElementById('resultPopup');
    if (popup) {
        popup.style.display = 'none';
    }
}

// ТОП ПОБЕДИТЕЛЕЙ - ИСПРАВЛЕННЫЙ
async function updateTopWinners() {
    try {
        const data = await apiRequest('/api/top/winners?limit=20');
        const topWinnersElement = document.getElementById('topWinners');
        
        if (!topWinnersElement) return;
        
        topWinnersElement.innerHTML = '<div class="loading">Загрузка топа победителей...</div>';
        
        if (!data || !data.success || !data.winners || data.winners.length === 0) {
            topWinnersElement.innerHTML = '<div class="empty-placeholder">🏆 Стань первым победителем!</div>';
            return;
        }
        
        let newHTML = '';
        
        // Сортируем по чистым выигрышам
        const sortedWinners = [...data.winners].sort((a, b) => {
            const aNet = a.netWinnings || 0;
            const bNet = b.netWinnings || 0;
            return bNet - aNet;
        });
        
        sortedWinners.forEach((winner, index) => {
            if (!winner || typeof winner !== 'object') return;
            
            const rank = index + 1;
            const name = winner.username || `Игрок ${rank}`;
            const netWinnings = winner.netWinnings || 0;
            const isCurrent = winner.username === window.userData?.username;
            const currentClass = isCurrent ? 'current-player' : '';
            const amountClass = netWinnings >= 0 ? 'positive' : 'negative';
            
            newHTML += `
                <div class="winner-item ${currentClass}">
                    <div class="winner-rank">${rank}</div>
                    <div class="winner-name ${currentClass}">
                        ${name} ${isCurrent ? '👑' : ''}
                    </div>
                    <div class="winner-amount ${amountClass}">
                        ${netWinnings.toFixed(9)} S
                    </div>
                </div>
            `;
        });
        
        topWinnersElement.innerHTML = newHTML;
        
    } catch (error) {
        console.error('Ошибка обновления топа победителей:', error);
        const topWinnersElement = document.getElementById('topWinners');
        if (topWinnersElement) {
            topWinnersElement.innerHTML = '<div class="empty-placeholder">Ошибка загрузки топа победителей</div>';
        }
    }
}

// РЕФЕРАЛЬНАЯ СИСТЕМА
async function loadReferralStats() {
    try {
        const userId = window.userData?.userId;
        if (!userId) return;
        
        const data = await apiRequest(`/api/referral/stats/${userId}`);
        
        if (data && data.success) {
            updateReferralUI(data);
        }
    } catch (error) {
        console.error('Ошибка загрузки реферальной статистики:', error);
    }
}

window.updateReferralStats = async function() {
    try {
        const userId = window.userData?.userId;
        if (!userId) return;
        
        const data = await apiRequest(`/api/referral/stats/${userId}`);
        
        if (data && data.success) {
            updateReferralUI(data);
            console.log('✅ Реферальная статистика обновлена');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки реферальной статистики:', error);
    }
};

function updateReferralUI(data) {
    const referralCode = data.referralCode || `REF-${window.userData?.userId?.slice(-8)?.toUpperCase() || 'DEFAULT'}`;
    const referralLink = `https://t.me/bytecoinbeta_bot?start=${referralCode}`;
    
    const elements = [
        { id: 'referralsCount', value: data.stats?.referralsCount || 0 },
        { id: 'referralEarnings', value: (data.stats?.totalEarnings || 0).toFixed(9) + ' S' },
        { id: 'referralsCountNew', value: data.stats?.referralsCount || 0 },
        { id: 'referralEarningsNew', value: (data.stats?.totalEarnings || 0).toFixed(9) + ' S' },
        { id: 'referralLink', value: referralCode }
    ];
    
    elements.forEach(element => {
        const el = document.getElementById(element.id);
        if (el) el.textContent = element.value;
    });
    
    const referralLinkElement = document.getElementById('referralLinkCode');
    if (referralLinkElement) {
        referralLinkElement.textContent = referralLink;
        referralLinkElement.href = referralLink;
    }
    
    const copyButton = document.querySelector('[onclick="copyReferralLink()"]');
    if (copyButton) {
        copyButton.onclick = function() {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(referralLink).then(() => {
                    showNotification('Ссылка скопирована в буфер обмена!', 'success');
                }).catch(() => {
                    fallbackCopy(referralLink);
                });
            } else {
                fallbackCopy(referralLink);
            }
        };
    }
}

window.copyReferralLink = function() {
    const linkElement = document.getElementById('referralLinkCode');
    if (linkElement) {
        const link = linkElement.textContent || linkElement.href;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(link).then(() => {
                showNotification('Ссылка скопирована в буфер обмена!', 'success');
            }).catch(() => {
                fallbackCopy(link);
            });
        } else {
            fallbackCopy(link);
        }
    }
};

function fallbackCopy(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        showNotification('Ссылка скопирована в буфер обмена!', 'success');
    } catch (err) {
        showNotification('Не удалось скопировать ссылку', 'error');
    }
    document.body.removeChild(textArea);
}

// МАГАЗИН
window.updateShopUIFixed = function() {
    console.log('🛒 Обновляем интерфейс магазина');
    
    if (!window.userData || !window.isDataLoaded) {
        console.log('⏳ Данные не загружены, откладываем обновление магазина');
        setTimeout(window.updateShopUIFixed, 1000);
        return;
    }
    
    try {
        updateShopCategory('gpu');
        updateShopCategory('cpu'); 
        updateShopCategory('mouse');
        
        console.log('✅ Магазин обновлен');
    } catch (error) {
        console.error('❌ Ошибка обновления магазина:', error);
    }
};

function updateShopCategory(category) {
    const prefix = category;
    const upgrades = Object.keys(UPGRADES).filter(key => key.startsWith(prefix));
    
    upgrades.forEach(upgradeId => {
        const upgrade = UPGRADES[upgradeId];
        if (!upgrade) return;
        
        const currentLevel = window.upgrades[upgradeId]?.level || 0;
        const price = upgrade.basePrice * Math.pow(2, currentLevel);
        
        const ownedElement = document.getElementById(upgradeId + '-owned');
        const priceElement = document.getElementById(upgradeId + '-price');
        
        if (ownedElement) ownedElement.textContent = currentLevel;
        if (priceElement) priceElement.textContent = price.toFixed(9);
        
        const buyButton = document.querySelector(`button[onclick="buyUpgrade('${upgradeId}')"]`);
        if (buyButton) {
            const canAfford = window.userData && parseFloat(window.userData.balance) >= price;
            buyButton.disabled = !canAfford;
            buyButton.innerHTML = canAfford ? 
                'Купить' : 
                'Недостаточно средств';
            buyButton.style.opacity = canAfford ? '1' : '0.6';
        }
    });
}

// ОБНОВЛЕНИЕ БАЛАНСА
window.updateBalanceImmediately = function() {
    if (!window.userData) return;
    
    const balanceElement = document.getElementById('balanceValue');
    if (balanceElement) {
        balanceElement.textContent = (window.userData.balance || 0.000000100).toFixed(9) + ' S';
    }
    
    const clickValueElement = document.getElementById('clickValue');
    if (clickValueElement) {
        const clickPower = typeof calculateClickPower === 'function' ? calculateClickPower() : 0.000000001;
        clickValueElement.textContent = clickPower.toFixed(9);
    }
};

// ЗАГЛУШКИ ДЛЯ ОТСУТСТВУЮЩИХ ФУНКЦИЙ
if (typeof updateTopWinners === 'undefined') {
    window.updateTopWinners = updateTopWinners;
}

if (typeof updateUsersList === 'undefined') {
    window.updateUsersList = updateUsersList;
}

if (typeof updateLeaderboard === 'undefined') {
    window.updateLeaderboard = updateLeaderboard;
}

if (typeof updateSpeedLeaderboard === 'undefined') {
    window.updateSpeedLeaderboard = updateSpeedLeaderboard;
}

if (typeof updateShopUI === 'undefined') {
    window.updateShopUI = function() {
        console.log('🛒 Обновляем интерфейс магазина');
        if (window.updateShopUIFixed) {
            window.updateShopUIFixed();
        }
    };
}

if (typeof startLotteryAutoUpdate === 'undefined') {
    window.startLotteryAutoUpdate = function() {
        console.log('🎰 Запускаем автообновление лотереи');
    };
}

if (typeof startClassicLotteryUpdate === 'undefined') {
    window.startClassicLotteryUpdate = function() {
        console.log('🎲 Запускаем автообновление классической лотереи');
    };
}

if (typeof loadReferralStats === 'undefined') {
    window.loadReferralStats = loadReferralStats;
}

if (typeof calculateClickPower === 'undefined') {
    window.calculateClickPower = function() {
        return 0.000000001;
    };
}

if (typeof calculateMiningSpeed === 'undefined') {
    window.calculateMiningSpeed = function() {
        return 0.000000000;
    };
}

if (typeof saveUserData === 'undefined') {
    window.saveUserData = function() {
        console.log('💾 Сохранение данных');
    };
}

// ГЛОБАЛЬНЫЕ ФУНКЦИИ
window.makeTransfer = makeTransfer;
window.searchUsers = searchUsers;
window.selectUserForTransfer = selectUserForTransfer;
window.closeResultPopup = closeResultPopup;

// ИНИЦИАЛИЗАЦИЯ
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 Инициализация UI...');
    
    // Инициализация полей ввода
    const betInputs = document.querySelectorAll('.bet-input, .transfer-amount-input');
    betInputs.forEach(input => {
        input.addEventListener('input', function() {
            const minValue = parseFloat(this.getAttribute('min')) || 0.000000001;
            if (this.value < minValue) {
                this.value = minValue;
            }
        });
    });
    
    // Инициализация поиска
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        searchInput.addEventListener('input', searchUsers);
    }
    
    // Инициализация реферальной системы
    setTimeout(() => {
        if (window.userData && window.isDataLoaded) {
            loadReferralStats();
        }
    }, 2000);
    
    // Инициализация кнопок "Назад"
    const backButtons = document.querySelectorAll('.back-button');
    backButtons.forEach(button => {
        if (!button.onclick) {
            button.onclick = function() {
                showSection('main');
            };
        }
    });
    
    console.log('✅ UI полностью инициализирован!');
});

console.log('✅ ui.js загружен! Все функции интерфейса готовы к работе!');
