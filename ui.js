// ui.js - полностью исправленная версия с поддержкой мультисессии
console.log('🖥️ Загружаем ui.js...');

let allPlayers = [];
let selectedTransferUser = null;
let currentRatingTab = 'balance';

// Глобальные функции для кнопок - ОБЯЗАТЕЛЬНО ОПРЕДЕЛИТЬ ПЕРВЫМИ
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
                if (typeof updateTopWinners === 'function') updateTopWinners();
                if (typeof updateLeaderboard === 'function') updateLeaderboard();
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
    
    // Обновляем синхронизацию при смене секций
    if (window.multiSessionDetector) {
        window.multiSessionDetector.updateSync();
    }
};

window.showGamesSection = function() {
    console.log('🎮 Показываем секцию игр');
    showSection('games');
};

function showGameTab(tabName) {
    console.log('🎰 Показываем игровую вкладку:', tabName);
    
    document.querySelectorAll('.game-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.game-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // event может быть не определен, поэтому проверяем
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    const targetSection = document.getElementById(tabName + '-game');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Обновляем синхронизацию
    if (window.multiSessionDetector) {
        window.multiSessionDetector.updateSync();
    }
}

function showTopTab(tabName) {
    console.log('🏆 Показываем вкладку рейтинга:', tabName);
    
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.game-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // event может быть не определен
    if (event && event.target) {
        event.target.classList.add('active');
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
    
    // Обновляем синхронизацию
    if (window.multiSessionDetector) {
        window.multiSessionDetector.updateSync();
    }
}

// Функции для табов магазина
window.showShopTab = function(tabName) {
    console.log('🛒 Показываем вкладку:', tabName);
    
    document.querySelectorAll('.shop-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.shop-category').forEach(category => {
        category.classList.add('hidden');
    });
    
    // event может быть не определен
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    const targetCategory = document.getElementById('shop-' + tabName);
    if (targetCategory) {
        targetCategory.classList.remove('hidden');
    }
    
    // Обновляем синхронизацию
    if (window.multiSessionDetector) {
        window.multiSessionDetector.updateSync();
    }
};

// Управление переводом
async function updateUsersList() {
    const usersList = document.getElementById('usersList');
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    
    usersList.innerHTML = '<div style="text-align: center; padding: 10px; color: #ccc;">Загрузка игроков...</div>';
    
    try {
        const data = await apiRequest('/api/all_players');
        const apiPlayers = data.players || [];
        
        const filteredUsers = apiPlayers.filter(player => 
            player.userId !== window.userData.userId && 
            player.username.toLowerCase().includes(searchTerm)
        );
        
        usersList.innerHTML = '';
        
        if (filteredUsers.length === 0) {
            usersList.innerHTML = '<div style="text-align: center; color: #ccc; padding: 20px;">Игроки не найдены</div>';
            return;
        }
        
        filteredUsers.forEach(player => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.innerHTML = `
                <div class="user-name">${player.username}</div>
                <div class="user-balance">${player.balance.toFixed(9)} S</div>
            `;
            userItem.onclick = () => selectUserForTransfer(player);
            usersList.appendChild(userItem);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки списка игроков:', error);
        usersList.innerHTML = '<div style="text-align: center; color: #ccc; padding: 20px;">Ошибка загрузки</div>';
    }
}

function selectUserForTransfer(user) {
    selectedTransferUser = user;
    
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    event.target.closest('.user-item').classList.add('selected');
    
    document.getElementById('selectedUser').style.display = 'block';
    document.getElementById('selectedUserName').textContent = user.username;
    document.getElementById('selectedUserBalance').textContent = `Баланс: ${user.balance.toFixed(9)} S`;
    document.getElementById('transferAmount').value = '';
    document.getElementById('transferButton').disabled = true;
    
    // Включаем кнопку когда вводится сумма
    document.getElementById('transferAmount').addEventListener('input', function() {
        const amount = parseFloat(this.value);
        document.getElementById('transferButton').disabled = !amount || amount <= 0;
    });
    
    // Обновляем синхронизацию
    if (window.multiSessionDetector) {
        window.multiSessionDetector.updateSync();
    }
}

async function makeTransfer() {
    if (!selectedTransferUser) {
        showNotification('Выберите пользователя для перевода', 'error');
        return;
    }
    
    const amount = parseFloat(document.getElementById('transferAmount').value);
    
    if (!amount || amount <= 0) {
        showNotification('Введите корректную сумму', 'error');
        return;
    }
    
    if (amount > window.userData.balance) {
        showNotification('Недостаточно средств', 'error');
        return;
    }
    
    if (amount < 0.000000001) {
        showNotification('Минимальная сумма перевода: 0.000000001 S', 'error');
        return;
    }
    
    // Проверяем мультисессию перед переводом
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
            window.userData.transfers.sent += amount;
            window.userData.lastUpdate = Date.now();
            
            updateUI();
            saveUserData();
            
            document.getElementById('selectedUser').style.display = 'none';
            selectedTransferUser = null;
            document.getElementById('userSearch').value = '';
            
            showNotification(`Перевод ${amount.toFixed(9)} S выполнен!`, 'success');
        } else {
            showNotification(`Ошибка перевода: ${data.error}`, 'error');
        }
    } catch (error) {
        showNotification('Переводы временно недоступны', 'warning');
    }
}

function searchUsers() {
    updateUsersList();
}

// Таблицы лидеров
async function updateLeaderboard() {
    try {
        const data = await apiRequest(`/api/leaderboard?type=balance&limit=20&current_user=${window.userData.userId}`);
        
        const leaderboard = document.getElementById('leaderboard');
        
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
            const isCurrent = player.userId === window.userData.userId;
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
        document.getElementById('leaderboard').innerHTML = 
            '<div class="leader-item">Ошибка загрузки рейтинга</div>';
    }
}

async function updateSpeedLeaderboard() {
    try {
        const data = await apiRequest(`/api/leaderboard?type=speed&limit=20&current_user=${window.userData.userId}`);
        
        const leaderboard = document.getElementById('speedLeaderboard');
        
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
            const mineSpeed = typeof player.mineSpeed === 'number' ? player.mineSpeed : 0.000000000;
            const clickSpeed = typeof player.clickSpeed === 'number' ? player.clickSpeed : 0.000000000;
            const totalSpeed = mineSpeed + clickSpeed;
            const isCurrent = player.userId === window.userData.userId;
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
        document.getElementById('speedLeaderboard').innerHTML = 
            '<div class="leader-item">Ошибка загрузки рейтинга</div>';
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
        balanceElement.textContent = (window.userData.balance || 0.000000100).toFixed(9) + ' S';
    }
    
    if (clickValueElement) {
        clickValueElement.textContent = calculateClickPower().toFixed(9);
    }
    
    if (clickSpeedElement) {
        // СКОРОСТЬ КЛИКА = сила одного клика (так как клики вручную)
        clickSpeedElement.textContent = calculateClickPower().toFixed(9) + ' S/сек';
    }
    
    if (mineSpeedElement) {
        // СКОРОСТЬ МАЙНИНГА = пассивный доход в секунду
        mineSpeedElement.textContent = calculateMiningSpeed().toFixed(9) + ' S/сек';
    }
}

// Уведомления и попапы
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const title = type === 'success' ? '✅ Успех' : 
                 type === 'error' ? '❌ Ошибка' :
                 type === 'warning' ? '⚠️ Внимание' : 'ℹ️ Информация';
    
    notification.innerHTML = `
        <h4>${title}</h4>
        <p>${message}</p>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 400);
    }, duration);
}

function showResultPopup(isWin, amount, emoji) {
    const popup = document.getElementById('resultPopup');
    const emojiElement = document.getElementById('resultEmoji');
    const textElement = document.getElementById('resultText');
    const amountElement = document.getElementById('resultAmount');
    
    popup.className = `result-popup ${isWin ? 'win' : 'lose'}`;
    emojiElement.textContent = emoji;
    textElement.textContent = isWin ? 'Победа!' : 'Проигрыш';
    amountElement.textContent = `${amount >= 0 ? '+' : ''}${amount.toFixed(9)} S`;
    amountElement.style.color = isWin ? '#4CAF50' : '#f44336';
    
    popup.style.display = 'block';
}

function closeResultPopup() {
    document.getElementById('resultPopup').style.display = 'none';
}

// Функция для обновления топа победителей
async function updateTopWinners() {
    try {
        const data = await apiRequest('/api/top/winners?limit=20');
        const topWinnersElement = document.getElementById('topWinners');
        
        if (!data || !data.success || !data.winners) {
            topWinnersElement.innerHTML = '<div class="winner-item">🏆 Стань первым победителем!</div>';
            return;
        }
        
        let newHTML = '';
        
        data.winners.forEach((winner, index) => {
            if (!winner || typeof winner !== 'object') {
                return;
            }
            
            const rank = index + 1;
            const name = winner.username || `Игрок ${rank}`;
            const netWinnings = winner.netWinnings || 0;
            
            newHTML += `
                <div class="winner-item">
                    <div class="winner-rank">${rank}</div>
                    <div class="winner-name">${name}</div>
                    <div class="winner-amount">${netWinnings.toFixed(9)} S</div>
                </div>
            `;
        });
        
        topWinnersElement.innerHTML = newHTML;
        
    } catch (error) {
        console.error('Ошибка обновления топа победителей:', error);
        document.getElementById('topWinners').innerHTML = 
            '<div class="winner-item">Ошибка загрузки топа победителей</div>';
    }
}

// Функция для загрузки реферальной статистики
async function loadReferralStats() {
    try {
        const userId = window.userData?.userId;
        if (!userId) return;
        
        const data = await apiRequest(`/api/referral/stats/${userId}`);
        
        if (data && data.success) {
            const referralsCountElement = document.getElementById('referralsCount');
            const referralEarningsElement = document.getElementById('referralEarnings');
            const referralLinkElement = document.getElementById('referralLink');
            
            if (referralsCountElement) {
                referralsCountElement.textContent = data.stats.referralsCount || 0;
            }
            
            if (referralEarningsElement) {
                referralEarningsElement.textContent = (data.stats.totalEarnings || 0).toFixed(9) + ' S';
            }
            
            if (referralLinkElement) {
                referralLinkElement.textContent = data.referralCode || `REF-${userId.slice(-8).toUpperCase()}`;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки реферальной статистики:', error);
    }
}

// Функция для обновления реферальной статистики (новая)
window.updateReferralStats = async function() {
    try {
        const userId = window.userData?.userId;
        if (!userId) return;
        
        const data = await apiRequest(`/api/referral/stats/${userId}`);
        
        if (data && data.success) {
            // Обновляем все элементы реферальной статистики
            const elements = [
                { id: 'referralsCount', value: data.stats.referralsCount || 0 },
                { id: 'referralEarnings', value: (data.stats.totalEarnings || 0).toFixed(9) + ' S' },
                { id: 'referralsCountNew', value: data.stats.referralsCount || 0 },
                { id: 'referralEarningsNew', value: (data.stats.totalEarnings || 0).toFixed(9) + ' S' },
                { id: 'referralLink', value: data.referralCode || `REF-${userId.slice(-8).toUpperCase()}` },
                { id: 'referralLinkCode', value: `https://t.me/your_bot?start=${data.referralCode || `REF-${userId.slice(-8).toUpperCase()}`}` }
            ];
            
            elements.forEach(element => {
                const el = document.getElementById(element.id);
                if (el) el.textContent = element.value;
            });
            
            console.log('✅ Реферальная статистика обновлена');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки реферальной статистики:', error);
    }
};

// Функция для поделиться реферальной ссылкой
function shareReferral() {
    const referralLink = document.getElementById('referralLink');
    if (referralLink) {
        const link = referralLink.textContent;
        if (navigator.share) {
            navigator.share({
                title: 'Присоединяйся к Sparkcoin!',
                text: 'Зарабатывай Sparkcoin вместе со мной!',
                url: link
            }).then(() => {
                showNotification('Реферальная ссылка успешно отправлена!', 'success');
            }).catch(error => {
                console.log('Ошибка sharing:', error);
                copyToClipboard(link);
            });
        } else {
            copyToClipboard(link);
        }
    }
}

// Функция для копирования в буфер обмена
function copyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        showNotification('Реферальная ссылка скопирована в буфер обмена!', 'success');
    } catch (err) {
        console.error('Ошибка копирования:', err);
        showNotification('Не удалось скопировать ссылку', 'error');
    }
    document.body.removeChild(textArea);
}

// Функция для копирования реферальной ссылки (новая)
window.copyReferralLink = function() {
    const linkElement = document.getElementById('referralLinkCode');
    if (linkElement) {
        const link = linkElement.textContent;
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

// Функция обновления магазина (улучшенная)
window.updateShopUIFixed = function() {
    console.log('🛒 Обновляем интерфейс магазина (фиксированная версия)');
    
    if (!window.userData || !window.isDataLoaded) {
        console.log('⏳ Данные не загружены, откладываем обновление магазина');
        setTimeout(window.updateShopUIFixed, 1000);
        return;
    }
    
    try {
        // Обновляем все категории улучшений
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
        const currentLevel = window.upgrades[upgradeId] || 0;
        const price = upgrade.basePrice * Math.pow(2, currentLevel);
        
        // Обновляем отображение
        const ownedElement = document.getElementById(upgradeId + '-owned');
        const priceElement = document.getElementById(upgradeId + '-price');
        
        if (ownedElement) ownedElement.textContent = currentLevel;
        if (priceElement) priceElement.textContent = price.toFixed(9);
        
        // Обновляем кнопку
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

// Заглушки для отсутствующих функций
if (typeof updateTopWinners === 'undefined') {
    window.updateTopWinners = updateTopWinners;
}

if (typeof updateUsersList === 'undefined') {
    window.updateUsersList = updateUsersList;
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

// Инициализация интерфейса при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация полей ввода
    const betInputs = document.querySelectorAll('.bet-input, .transfer-amount-input');
    betInputs.forEach(input => {
        input.addEventListener('input', function() {
            // Ограничение минимального значения
            if (this.value < 0.000000001) {
                this.value = 0.000000001;
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
    
    console.log('✅ UI инициализирован!');
});

console.log('✅ ui.js загружен!');
