// ui.js - ОПТИМИЗИРОВАННЫЙ ИНТЕРФЕЙС С МНОГОЯЗЫЧНОСТЬЮ
console.log('🖥️ Загружаем оптимизированный ui.js...');

let allPlayers = [];
let selectedTransferUser = null;
let currentRatingTab = 'balance';

// ========== ЛОКАЛИЗАЦИЯ UI ==========
const UI_LOCALIZATION = {
    ru: {
        loading: "Загрузка...",
        error: "Ошибка",
        success: "Успех",
        warning: "Внимание",
        info: "Информация",
        buy: "Купить",
        insufficientFunds: "Недостаточно средств",
        selectUser: "Выберите пользователя для перевода",
        enterAmount: "Введите сумму",
        transferComplete: "Перевод выполнен",
        transferError: "Ошибка перевода",
        searchUsers: "Поиск игроков...",
        noUsers: "Игроки не найдены",
        loadError: "Ошибка загрузки",
        copySuccess: "Ссылка скопирована",
        copyError: "Не удалось скопировать",
        topWinners: "Топ победителей",
        balanceRating: "Рейтинг по балансу",
        speedRating: "Рейтинг по скорости",
        games: "Игры",
        shop: "Магазин",
        transfers: "Переводы",
        referrals: "Рефералы"
    },
    en: {
        loading: "Loading...",
        error: "Error",
        success: "Success",
        warning: "Warning",
        info: "Info",
        buy: "Buy",
        insufficientFunds: "Insufficient funds",
        selectUser: "Select user for transfer",
        enterAmount: "Enter amount",
        transferComplete: "Transfer completed",
        transferError: "Transfer error",
        searchUsers: "Search players...",
        noUsers: "Players not found",
        loadError: "Load error",
        copySuccess: "Link copied",
        copyError: "Copy failed",
        topWinners: "Top winners",
        balanceRating: "Balance rating",
        speedRating: "Speed rating",
        games: "Games",
        shop: "Shop",
        transfers: "Transfers",
        referrals: "Referrals"
    }
};

function getUIText(key) {
    const lang = window.CURRENT_LANG || 'ru';
    return UI_LOCALIZATION[lang][key] || key;
}

// ========== ОСНОВНЫЕ ФУНКЦИИ ИНТЕРФЕЙСА ==========
window.showSection = function(sectionName) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
        
        switch(sectionName) {
            case 'top':
                if (typeof updateTopWinners === 'function') updateTopWinners();
                if (typeof updateLeaderboard === 'function') updateLeaderboard();
                if (typeof updateSpeedLeaderboard === 'function') updateSpeedLeaderboard();
                break;
            case 'transfer':
                if (typeof updateUsersList === 'function') updateUsersList();
                break;
            case 'shop':
                if (typeof updateShopUI === 'function') updateShopUI();
                break;
            case 'games':
                if (typeof showGameTab === 'function') showGameTab('team-lottery');
                if (typeof startLotteryAutoUpdate === 'function') startLotteryAutoUpdate();
                if (typeof startClassicLotteryUpdate === 'function') startClassicLotteryUpdate();
                if (typeof loadReferralStats === 'function') loadReferralStats();
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

window.showGamesPopup = function() {
    const popup = document.getElementById('games-popup');
    if (popup) {
        popup.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
};

window.closeGamesPopup = function() {
    const popup = document.getElementById('games-popup');
    if (popup) {
        popup.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

window.openGame = function(gameType) {
    closeGamesPopup();
    
    switch(gameType) {
        case 'team-lottery':
            showSection('games');
            if (typeof showGameTab === 'function') {
                showGameTab('team-lottery');
            }
            break;
        case 'classic-lottery':
            showSection('games');
            if (typeof showGameTab === 'function') {
                showGameTab('classic-lottery');
            }
            break;
        case 'plinko':
        case 'dice':
            showNotification('Игра скоро будет доступна!', 'info');
            break;
    }
};

window.showGamesSection = function() {
    showSection('games');
};

window.showGameTab = function(tabName) {
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
            if (typeof loadLotteryStatus === 'function') {
                loadLotteryStatus();
            }
            if (typeof startLotteryAutoUpdate === 'function') {
                startLotteryAutoUpdate();
            }
            break;
        case 'classic-lottery':
            if (typeof loadClassicLottery === 'function') {
                loadClassicLottery();
            }
            if (typeof startClassicLotteryUpdate === 'function') {
                startClassicLotteryUpdate();
            }
            break;
    }
    
    if (window.multiSessionDetector) {
        window.multiSessionDetector.updateSync();
    }
};

window.showTopTab = function(tabName) {
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
    
    switch(tabName) {
        case 'winners':
            if (typeof updateTopWinners === 'function') updateTopWinners();
            break;
        case 'balance':
            if (typeof updateLeaderboard === 'function') updateLeaderboard();
            break;
        case 'speed':
            if (typeof updateSpeedLeaderboard === 'function') updateSpeedLeaderboard();
            break;
    }
    
    if (window.multiSessionDetector) {
        window.multiSessionDetector.updateSync();
    }
};

window.showShopTab = function(tabName) {
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

// ========== СИСТЕМА ПЕРЕВОДОВ ==========
async function updateUsersList() {
    const usersList = document.getElementById('usersList');
    const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
    
    if (!usersList) return;
    
    usersList.innerHTML = `<div style="text-align: center; padding: 10px; color: #ccc;">${getUIText('searchUsers')}</div>`;
    
    try {
        const data = await apiRequest('/api/all_players');
        const apiPlayers = data.players || [];
        
        const filteredUsers = apiPlayers.filter(player => 
            player.userId !== window.userData?.userId && 
            player.username?.toLowerCase().includes(searchTerm)
        );
        
        usersList.innerHTML = '';
        
        if (filteredUsers.length === 0) {
            usersList.innerHTML = `<div style="text-align: center; color: #ccc; padding: 20px;">${getUIText('noUsers')}</div>`;
            return;
        }
        
        filteredUsers.forEach(player => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.innerHTML = `
                <div class="user-name">${player.username || getUIText('player')}</div>
                <div class="user-balance">${(player.balance || 0).toFixed(9)} S</div>
            `;
            userItem.onclick = () => selectUserForTransfer(player);
            usersList.appendChild(userItem);
        });
        
    } catch (error) {
        usersList.innerHTML = `<div style="text-align: center; color: #ccc; padding: 20px;">${getUIText('loadError')}</div>`;
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
        document.getElementById('selectedUserName').textContent = user.username || getUIText('player');
        document.getElementById('selectedUserBalance').textContent = `${getUIText('balance')}: ${(user.balance || 0).toFixed(9)} S`;
        
        const transferAmount = document.getElementById('transferAmount');
        if (transferAmount) {
            transferAmount.value = '';
            transferAmount.addEventListener('input', function() {
                const amount = parseFloat(this.value);
                const transferButton = document.getElementById('transferButton');
                if (transferButton) {
                    transferButton.disabled = !amount || amount <= 0;
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
        showNotification(getUIText('selectUser'), 'error');
        return;
    }
    
    const amountInput = document.getElementById('transferAmount');
    if (!amountInput) return;
    
    const amount = parseFloat(amountInput.value);
    
    if (!amount || amount <= 0) {
        showNotification(getUIText('enterAmount'), 'error');
        return;
    }
    
    if (!window.userData || amount > window.userData.balance) {
        showNotification(getUIText('insufficientFunds'), 'error');
        return;
    }
    
    if (amount < 0.000000001) {
        showNotification('Минимальная сумма перевода: 0.000000001 S', 'error');
        return;
    }
    
    if (window.multiSessionDetector) {
        const status = window.multiSessionDetector.getStatus();
        if (status.isMultiSession && status.timeSinceLastActivity < 10000) {
            showNotification('Переводы временно недоступны из-за мультисессии', 'warning');
            return;
        }
    }
    
    try {
        const data = await apiRequest('/api/transfer', {
            method: 'POST',
            body: JSON.stringify({
                fromUserId: window.userData.userId,
                toUserId: selectedTransferUser.userId,
                amount: amount
            })
        });
        
        if (data.success) {
            window.userData.balance -= amount;
            window.userData.transfers = window.userData.transfers || { sent: 0, received: 0 };
            window.userData.transfers.sent += amount;
            window.userData.lastUpdate = Date.now();
            
            updateUI();
            saveUserData();
            
            const selectedUserElement = document.getElementById('selectedUser');
            if (selectedUserElement) {
                selectedUserElement.style.display = 'none';
            }
            selectedTransferUser = null;
            
            const userSearch = document.getElementById('userSearch');
            if (userSearch) {
                userSearch.value = '';
            }
            
            showNotification(getUIText('transferComplete'), 'success');
        } else {
            showNotification(`${getUIText('transferError')}: ${data.error || 'Неизвестная ошибка'}`, 'error');
        }
    } catch (error) {
        showNotification('Переводы временно недоступны', 'warning');
    }
}

function searchUsers() {
    updateUsersList();
}

// ========== ОБНОВЛЕНИЕ РЕЙТИНГОВ ==========
async function updateLeaderboard() {
    try {
        const userId = window.userData?.userId;
        const data = await apiRequest(`/api/leaderboard?type=balance&limit=20`);
        
        const leaderboard = document.getElementById('leaderboard');
        if (!leaderboard) return;
        
        if (!data || !data.success || !data.leaderboard) {
            leaderboard.innerHTML = `<div class="leader-item">🏆 ${getUIText('beFirst')}</div>`;
            return;
        }
        
        let newHTML = '';
        
        data.leaderboard.forEach((player, index) => {
            if (!player || typeof player !== 'object') return;
            
            const rank = index + 1;
            const name = player.username || `${getUIText('player')} ${rank}`;
            const balance = typeof player.balance === 'number' ? player.balance : 0;
            const isCurrent = player.userId === userId;
            const currentClass = isCurrent ? 'current-player' : '';
            
            newHTML += `
                <div class="leader-item ${currentClass}">
                    <div class="leader-rank">${rank} ${getUIText('place')}</div>
                    <div class="leader-name ${currentClass}">${name} ${isCurrent ? '👑' : ''}</div>
                    <div class="leader-balance">${balance.toFixed(9)} S</div>
                </div>
            `;
        });
        
        leaderboard.innerHTML = newHTML;
    } catch (error) {
        const leaderboard = document.getElementById('leaderboard');
        if (leaderboard) {
            leaderboard.innerHTML = `<div class="leader-item">${getUIText('loadError')}</div>`;
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
            leaderboard.innerHTML = `<div class="leader-item">🏆 ${getUIText('beFirstSpeed')}</div>`;
            return;
        }
        
        let newHTML = '';
        
        data.leaderboard.forEach((player, index) => {
            if (!player || typeof player !== 'object') return;
            
            const rank = index + 1;
            const name = player.username || `${getUIText('player')} ${rank}`;
            const mineSpeed = typeof player.mineSpeed === 'number' ? player.mineSpeed : 0.000000000;
            const clickSpeed = typeof player.clickSpeed === 'number' ? player.clickSpeed : 0.000000000;
            const totalSpeed = mineSpeed + clickSpeed;
            const isCurrent = player.userId === userId;
            const currentClass = isCurrent ? 'current-player' : '';
            
            newHTML += `
                <div class="leader-item ${currentClass}">
                    <div class="leader-rank">${rank} ${getUIText('place')}</div>
                    <div class="leader-name ${currentClass}">${name} ${isCurrent ? '👑' : ''}</div>
                    <div class="leader-speed">${totalSpeed.toFixed(9)} S/${getUIText('second')}</div>
                </div>
            `;
        });
        
        leaderboard.innerHTML = newHTML;
    } catch (error) {
        const leaderboard = document.getElementById('speedLeaderboard');
        if (leaderboard) {
            leaderboard.innerHTML = `<div class="leader-item">${getUIText('loadError')}</div>`;
        }
    }
}

// ========== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ==========
function updateUI() {
    if (!window.userData) return;
    
    const balanceElement = document.getElementById('balanceValue');
    const clickValueElement = document.getElementById('clickValue');
    const clickSpeedElement = document.getElementById('clickSpeed');
    const mineSpeedElement = document.getElementById('mineSpeed');
    
    if (balanceElement) {
        balanceElement.textContent = (window.userData.balance || 0.000000100).toFixed(9) + ' S';
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
            miningSpeed = 0.000000000;
        }
        mineSpeedElement.textContent = miningSpeed.toFixed(9) + ' S/сек';
    }
}

function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 90%;
        text-align: center;
    `;
    
    const title = type === 'success' ? '✅ ' + getUIText('success') : 
                 type === 'error' ? '❌ ' + getUIText('error') :
                 type === 'warning' ? '⚠️ ' + getUIText('warning') : 'ℹ️ ' + getUIText('info');
    
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

async function updateTopWinners() {
    try {
        const data = await apiRequest('/api/top/winners?limit=20');
        const topWinnersElement = document.getElementById('topWinners');
        
        if (!topWinnersElement) return;
        
        if (!data || !data.success || !data.winners) {
            topWinnersElement.innerHTML = `<div class="winner-item">🏆 ${getUIText('beFirstWinner')}</div>`;
            return;
        }
        
        let newHTML = '';
        
        data.winners.forEach((winner, index) => {
            if (!winner || typeof winner !== 'object') return;
            
            const rank = index + 1;
            const name = winner.username || `${getUIText('player')} ${rank}`;
            const netWinnings = winner.netWinnings || 0;
            
            newHTML += `
                <div class="winner-item">
                    <div class="winner-rank">${rank}</div>
                    <div class="winner-name">${name}</div>
                    <div class="winner-amount ${netWinnings >= 0 ? 'positive' : 'negative'}">
                        ${netWinnings.toFixed(9)} S
                    </div>
                </div>
            `;
        });
        
        topWinnersElement.innerHTML = newHTML;
    } catch (error) {
        const topWinnersElement = document.getElementById('topWinners');
        if (topWinnersElement) {
            topWinnersElement.innerHTML = `<div class="winner-item">${getUIText('loadError')}</div>`;
        }
    }
}

// ========== РЕФЕРАЛЬНАЯ СИСТЕМА ==========
async function loadReferralStats() {
    try {
        const userId = window.userData?.userId;
        if (!userId) return;
        
        const data = await apiRequest(`/api/referral/stats/${userId}`);
        
        if (data && data.success) {
            updateReferralUI(data);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки реферальной статистики:', error);
    }
}

window.updateReferralStats = async function() {
    try {
        const userId = window.userData?.userId;
        if (!userId) return;
        
        const data = await apiRequest(`/api/referral/stats/${userId}`);
        
        if (data && data.success) {
            updateReferralUI(data);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки реферальной статистики:', error);
    }
};

function updateReferralUI(data) {
    const elements = [
        { id: 'referralsCount', value: data.stats?.referralsCount || 0 },
        { id: 'referralEarnings', value: (data.stats?.totalEarnings || 0).toFixed(9) + ' S' },
        { id: 'referralsCountNew', value: data.stats?.referralsCount || 0 },
        { id: 'referralEarningsNew', value: (data.stats?.totalEarnings || 0).toFixed(9) + ' S' },
        { id: 'referralLink', value: data.referralCode || `REF-${window.userData?.userId?.slice(-8)?.toUpperCase() || 'DEFAULT'}` },
        { id: 'referralLinkCode', value: `https://t.me/bytecoinbeta_bot?start=${data.referralCode || `REF-${window.userData?.userId?.slice(-8)?.toUpperCase() || 'DEFAULT'}`}` }
    ];
    
    elements.forEach(element => {
        const el = document.getElementById(element.id);
        if (el) el.textContent = element.value;
    });
}

window.copyReferralLink = function() {
    const linkElement = document.getElementById('referralLinkCode');
    if (linkElement) {
        const link = linkElement.textContent;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(link).then(() => {
                showNotification(getUIText('copySuccess'), 'success');
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
        showNotification(getUIText('copySuccess'), 'success');
    } catch (err) {
        showNotification(getUIText('copyError'), 'error');
    }
    document.body.removeChild(textArea);
}

// ========== ОБНОВЛЕНИЕ МАГАЗИНА ==========
window.updateShopUIFixed = function() {
    if (!window.userData || !window.isDataLoaded) {
        setTimeout(window.updateShopUIFixed, 1000);
        return;
    }
    
    try {
        updateShopCategory('gpu');
        updateShopCategory('cpu'); 
        updateShopCategory('mouse');
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
                getUIText('buy') : 
                getUIText('insufficientFunds');
            buyButton.style.opacity = canAfford ? '1' : '0.6';
        }
    });
}

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

// ========== ПОЛИФИЛЛЫ ДЛЯ ОТСУТСТВУЮЩИХ ФУНКЦИЙ ==========
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
        if (window.updateShopUIFixed) {
            window.updateShopUIFixed();
        }
    };
}

if (typeof startLotteryAutoUpdate === 'undefined') {
    window.startLotteryAutoUpdate = function() {};
}

if (typeof startClassicLotteryUpdate === 'undefined') {
    window.startClassicLotteryUpdate = function() {};
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
    window.saveUserData = function() {};
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
document.addEventListener('DOMContentLoaded', function() {
    const betInputs = document.querySelectorAll('.bet-input, .transfer-amount-input');
    betInputs.forEach(input => {
        input.addEventListener('input', function() {
            if (this.value < 0.000000001) {
                this.value = 0.000000001;
            }
        });
    });
    
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        searchInput.addEventListener('input', searchUsers);
    }
    
    setTimeout(() => {
        if (window.userData && window.isDataLoaded) {
            loadReferralStats();
        }
    }, 2000);
    
    const backButtons = document.querySelectorAll('.back-button');
    backButtons.forEach(button => {
        if (!button.onclick) {
            button.onclick = function() {
                showSection('main');
            };
        }
    });
});

console.log('✅ Оптимизированный UI загружен!');
