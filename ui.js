// ui.js - функции интерфейса
console.log('🖥️ Загружаем ui.js...');

let allPlayers = [];
let selectedTransferUser = null;
let currentRatingTab = 'balance';

function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
        
        switch(sectionName) {
            case 'top':
                updateTopWinners();
                updateLeaderboard();
                break;
            case 'transfer':
                updateUsersList();
                break;
            case 'shop':
                updateShopUI();
                break;
            case 'games':
                showGameTab('team-lottery');
                startLotteryAutoUpdate();
                startClassicLotteryUpdate();
                loadReferralStats();
                break;
        }
    }
}

function showGamesSection() {
    showSection('games');
}

function showGameTab(tabName) {
    document.querySelectorAll('.game-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.game-section').forEach(section => {
        section.classList.remove('active');
    });
    
    event.target.classList.add('active');
    document.getElementById(tabName + '-game').classList.add('active');
}

function showTopTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.game-section').forEach(section => {
        section.classList.remove('active');
    });
    
    event.target.classList.add('active');
    document.getElementById(tabName + '-tab').classList.add('active');
    
    switch(tabName) {
        case 'winners':
            updateTopWinners();
            break;
        case 'balance':
            updateLeaderboard();
            break;
        case 'speed':
            updateSpeedLeaderboard();
            break;
    }
}

function showShopTab(tabName) {
    document.querySelectorAll('.shop-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.shop-category').forEach(category => {
        category.classList.add('hidden');
    });
    
    event.target.classList.add('active');
    document.getElementById('shop-' + tabName).classList.remove('hidden');
}

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
});

console.log('✅ ui.js загружен!');
