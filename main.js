// ==================== ОСНОВНАЯ ИНИЦИАЛИЗАЦИЯ ====================

const tg = window.Telegram.WebApp;

function getTelegramUserId() {
    const user = tg.initDataUnsafe?.user;
    if (user && user.username) {
        return 'tg_' + user.username.toLowerCase();
    } else if (user && user.id) {
        return 'tg_' + user.id;
    }
    return 'test_' + Math.random().toString(36).substr(2, 9);
}

function getTelegramUsername() {
    const user = tg.initDataUnsafe?.user;
    if (user) {
        if (user.username) {
            return '@' + user.username;
        } else if (user.first_name) {
            return user.first_name;
        }
    }
    return 'Игрок';
}

function createNewUserData(userId, username) {
    return {
        userId: userId,
        username: username,
        balance: 0.000000100,
        totalEarned: 0.000000100,
        totalClicks: 0,
        lastUpdate: Date.now(),
        joinedDate: new Date().toISOString(),
        lotteryWins: 0,
        totalBet: 0,
        telegramId: tg.initDataUnsafe?.user?.id || null,
        transfers: {
            sent: 0,
            received: 0
        },
        referralEarnings: 0,
        referralsCount: 0,
        totalWinnings: 0,
        totalLosses: 0
    };
}

function showSessionError() {
    document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; padding: 20px; text-align: center;">
            <h1 style="color: #f44336; margin-bottom: 20px;">❌ Ошибка доступа</h1>
            <p style="color: white; margin-bottom: 20px;">Приложение уже открыто в другой сессии Telegram.</p>
            <p style="color: #ccc; font-size: 14px;">Закройте другие вкладки с Sparkcoin и обновите страницу.</p>
        </div>
    `;
}

// НОВАЯ ФУНКЦИЯ ДЛЯ МОБИЛЬНОЙ ПОДДЕРЖКИ
function initializeMobileSupport() {
    const coin = document.getElementById('clickCoin');
    
    if (!coin) {
        console.error('Элемент монетки не найден');
        return;
    }
    
    // Обработчик для мыши
    coin.addEventListener('click', function(event) {
        event.preventDefault();
        clickCoin(event);
    });
    
    // Обработчик для тач-устройств
    coin.addEventListener('touchstart', function(event) {
        event.preventDefault();
        clickCoin(event);
    }, { passive: false });
    
    coin.addEventListener('touchend', function(event) {
        event.preventDefault();
    }, { passive: false });
    
    // Убираем стандартное выделение на мобильных
    coin.style.webkitTapHighlightColor = 'transparent';
    coin.style.webkitTouchCallout = 'none';
    coin.style.webkitUserSelect = 'none';
    coin.style.touchAction = 'manipulation';
    
    console.log('✅ Мобильная поддержка активирована');
}

function loadUserData() {
    const userId = getTelegramUserId();
    const username = getTelegramUsername();

    const currentSession = localStorage.getItem('sparkcoin_current_session');
    if (currentSession && currentSession !== userId) {
        showSessionError();
        return;
    }

    localStorage.setItem('sparkcoin_current_session', userId);

    const savedData = localStorage.getItem('sparkcoin_user_data');
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData.userId === userId) {
            userData = parsedData;
            lastUpdateTime = userData.lastUpdate || Date.now();
        } else {
            userData = createNewUserData(userId, username);
        }
    } else {
        userData = createNewUserData(userId, username);
    }
    
    const savedUpgrades = localStorage.getItem('sparkcoin_upgrades_' + userId);
    if (savedUpgrades) {
        const upgradesData = JSON.parse(savedUpgrades);
        for (const key in upgradesData) {
            if (upgrades[key]) {
                upgrades[key].level = upgradesData[key];
            }
        }
    }
    
    loadAllPlayers();
    updateUI();
    updateShopUI();
    
    checkApiConnection();
    
    setTimeout(syncPlayerDataWithAPI, 1000);
    startLotteryAutoUpdate();
    startClassicLotteryUpdate();
    loadReferralStats();
}

function loadAllPlayers() {
    const savedPlayers = localStorage.getItem('sparkcoin_all_players');
    if (savedPlayers) {
        allPlayers = JSON.parse(savedPlayers);
    } else {
        allPlayers = [];
    }
    
    const currentPlayerIndex = allPlayers.findIndex(p => p.userId === userData.userId);
    const currentPlayerData = {
        userId: userData.userId,
        username: userData.username,
        balance: userData.balance,
        totalEarned: userData.totalEarned,
        totalClicks: userData.totalClicks,
        clickSpeed: calculateClickPower(),
        mineSpeed: calculateMiningSpeed(),
        totalSpeed: calculateClickPower() + calculateMiningSpeed(),
        lastUpdate: userData.lastUpdate,
        joinedDate: userData.joinedDate,
        lotteryWins: userData.lotteryWins,
        totalBet: userData.totalBet,
        telegramId: userData.telegramId,
        transfers: userData.transfers,
        isCurrent: true
    };
    
    if (currentPlayerIndex !== -1) {
        allPlayers[currentPlayerIndex] = currentPlayerData;
    } else {
        allPlayers.push(currentPlayerData);
    }
    
    saveAllPlayers();
}

function saveAllPlayers() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    allPlayers = allPlayers.filter(player => {
        return new Date(player.joinedDate).getTime() > thirtyDaysAgo || 
               player.lastUpdate > thirtyDaysAgo;
    });
    
    localStorage.setItem('sparkcoin_all_players', JSON.stringify(allPlayers));
}

function initializeApp() {
    tg.expand();
    tg.enableClosingConfirmation();
    
    // ЗАМЕНА: вместо прямого добавления обработчика
    // document.getElementById('clickCoin').addEventListener('click', clickCoin);
    
    // ИСПРАВЛЕНИЕ: используем мобильную поддержку
    initializeMobileSupport();
    
    loadUserData();
    setInterval(updateUI, 100);
    setInterval(saveUserData, 5000);
    
    showSection('main');
    
    // Автоматическое восстановление подключения
    setInterval(async () => {
        if (!apiConnected) {
            try {
                await apiRequest('/health');
                showNotification('✅ Подключение восстановлено!', 'success', 2000);
            } catch (error) {
                // Тихий повтор при ошибке
            }
        }
    }, 30000);
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', initializeApp);

window.addEventListener('beforeunload', function() {
    localStorage.removeItem('sparkcoin_current_session');
});

document.addEventListener('input', function(e) {
    if (e.target.id === 'transferAmount') {
        const amount = parseFloat(e.target.value);
        const button = document.getElementById('transferButton');
        button.disabled = !amount || amount <= 0 || amount > userData.balance;
    }
});

// Полифилл для AbortSignal.timeout
if (!AbortSignal.timeout) {
    AbortSignal.timeout = function(ms) {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), ms);
        return controller.signal;
    };
}
