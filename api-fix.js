// api-fix.js - фикс для всех отсутствующих API функций
console.log('🔧 Загружаем API фикс...');

// Создаем все отсутствующие функции
if (typeof window.syncPlayerDataWithAPI === 'undefined') {
    window.syncPlayerDataWithAPI = async function() {
        console.log('🔄 Синхронизация с API...');
        
        if (!window.userData || !window.isDataLoaded) {
            console.log('❌ Данные пользователя не загружены');
            return false;
        }
        
        try {
            const deviceId = window.multiSessionDetector ? 
                window.multiSessionDetector.generateDeviceId() : 'unknown';
                
            const response = await window.apiRequest('/api/sync/unified', {
                method: 'POST',
                body: JSON.stringify({
                    userId: window.userData.userId,
                    telegramId: window.userData.telegramId,
                    username: window.userData.username,
                    balance: window.userData.balance,
                    totalEarned: window.userData.totalEarned,
                    totalClicks: window.userData.totalClicks,
                    upgrades: window.getUpgradesForSync ? window.getUpgradesForSync() : window.upgrades,
                    deviceId: deviceId
                })
            });
            
            if (response && response.success) {
                console.log('✅ Данные синхронизированы с API');
                
                // Если сервер вернул другой userId (при объединении записей)
                if (response.userId && response.userId !== window.userData.userId) {
                    console.log(`🆔 Объединение записей: ${window.userData.userId} -> ${response.userId}`);
                    window.userData.userId = response.userId;
                    saveUserData();
                }
                
                // Если серверный баланс больше - используем его
                if (response.bestBalance > window.userData.balance) {
                    console.log(`💰 Баланс обновлен: ${window.userData.balance} -> ${response.bestBalance}`);
                    window.userData.balance = response.bestBalance;
                    updateUI();
                    saveUserData();
                }
                
                // Если обнаружена мультисессия
                if (response.multisessionDetected) {
                    console.log('🚨 Обнаружена мультисессия на сервере');
                    if (window.multiSessionDetector) {
                        window.multiSessionDetector.showWarning();
                    }
                }
                
                return true;
            }
        } catch (error) {
            console.log('📴 Ошибка синхронизации, работаем локально');
        }
        
        return false;
    };
}

if (typeof window.saveUserDataToAPI === 'undefined') {
    window.saveUserDataToAPI = window.syncPlayerDataWithAPI;
}

if (typeof window.loadAllPlayers === 'undefined') {
    window.loadAllPlayers = async function() {
        console.log('👥 Загрузка списка игроков...');
        try {
            const data = await window.apiRequest('/api/all_players');
            if (data && data.success) {
                window.allPlayers = data.players || [];
                console.log(`✅ Загружено ${window.allPlayers.length} игроков`);
            }
        } catch (error) {
            console.log('📴 Ошибка загрузки игроков');
            window.allPlayers = [];
        }
    };
}

if (typeof window.startLotteryAutoUpdate === 'undefined') {
    window.startLotteryAutoUpdate = function() {
        console.log('🎰 Запуск автообновления лотереи...');
        if (typeof startLotteryAutoUpdate === 'function') {
            startLotteryAutoUpdate();
        }
    };
}

if (typeof window.startClassicLotteryUpdate === 'undefined') {
    window.startClassicLotteryUpdate = function() {
        console.log('🎲 Запуск автообновления классической лотереи...');
        if (typeof startClassicLotteryUpdate === 'function') {
            startClassicLotteryUpdate();
        }
    };
}

if (typeof window.loadReferralStats === 'undefined') {
    window.loadReferralStats = function() {
        console.log('👥 Загрузка реферальной статистики...');
        if (typeof loadReferralStats === 'function') {
            loadReferralStats();
        }
    };
}

// Функция для получения улучшений для синхронизации
if (typeof window.getUpgradesForSync === 'undefined') {
    window.getUpgradesForSync = function() {
        const upgradesData = {};
        if (window.upgrades) {
            for (const key in window.upgrades) {
                if (window.upgrades[key] && typeof window.upgrades[key].level !== 'undefined') {
                    upgradesData[key] = window.upgrades[key].level;
                }
            }
        }
        return upgradesData;
    };
}

// Функция для загрузки синхронизированных данных
if (typeof window.loadSyncedData === 'undefined') {
    window.loadSyncedData = async function() {
        console.log('📥 Загрузка синхронизированных данных...');
        
        try {
            const userId = window.userData?.userId;
            if (!userId) {
                console.log('❌ Нет userID для загрузки');
                return false;
            }
            
            const response = await window.apiRequest(`/api/sync/unified/${userId}`);
            
            if (response && response.success && response.userData) {
                console.log('✅ Данные загружены с сервера');
                
                // ОБЪЕДИНЯЕМ данные, сохраняя локальный прогресс
                const serverData = response.userData;
                
                // Используем максимальные значения
                window.userData.balance = Math.max(window.userData.balance, serverData.balance);
                window.userData.totalEarned = Math.max(window.userData.totalEarned, serverData.totalEarned);
                window.userData.totalClicks = Math.max(window.userData.totalClicks, serverData.totalClicks);
                
                // Обновляем другие данные с сервера
                window.userData.userId = serverData.userId;
                window.userData.username = serverData.username;
                window.userData.lotteryWins = serverData.lotteryWins;
                window.userData.totalBet = serverData.totalBet;
                window.userData.referralEarnings = serverData.referralEarnings;
                window.userData.referralsCount = serverData.referralsCount;
                window.userData.totalWinnings = serverData.totalWinnings;
                window.userData.totalLosses = serverData.totalLosses;
                
                // СИНХРОНИЗИРУЕМ УЛУЧШЕНИЯ
                if (serverData.upgrades) {
                    console.log('🔄 Синхронизация улучшений с сервера:', serverData.upgrades);
                    for (const key in serverData.upgrades) {
                        const serverLevel = serverData.upgrades[key];
                        const localLevel = window.upgrades[key]?.level || 0;
                        
                        // Берем максимальный уровень
                        if (serverLevel > localLevel) {
                            console.log(`📈 Обновление улучшения ${key}: ${localLevel} -> ${serverLevel}`);
                            window.upgrades[key] = { level: serverLevel };
                        }
                    }
                }
                
                saveUserData();
                updateUI();
                updateShopUI();
                
                showNotification('Данные синхронизированы с сервером!', 'success');
                return true;
            }
            
        } catch (error) {
            console.log('📴 Ошибка загрузки данных:', error);
        }
        
        return false;
    };
}

// Функция для синхронизации данных
if (typeof window.syncUserData === 'undefined') {
    window.syncUserData = async function(force = false) {
        console.log('🔄 Синхронизация данных...');
        
        if (!window.userData) return false;
        
        try {
            const syncData = {
                userId: window.userData.userId,
                username: window.userData.username,
                balance: window.userData.balance,
                totalEarned: window.userData.totalEarned,
                totalClicks: window.userData.totalClicks,
                upgrades: window.getUpgradesForSync(),
                lastUpdate: Date.now(),
                telegramId: window.userData.telegramId,
                deviceId: window.multiSessionDetector ? window.multiSessionDetector.generateDeviceId() : 'unknown'
            };
            
            const response = await window.apiRequest('/api/sync/unified', {
                method: 'POST',
                body: JSON.stringify(syncData)
            });
            
            if (response && response.success) {
                console.log('✅ Данные синхронизированы с сервером');
                
                // Если сервер вернул другой userId (при объединении записей)
                if (response.userId && response.userId !== window.userData.userId) {
                    console.log(`🆔 Объединение записей: ${window.userData.userId} -> ${response.userId}`);
                    window.userData.userId = response.userId;
                    saveUserData();
                }
                
                // Если серверный баланс больше - используем его
                if (response.bestBalance > window.userData.balance) {
                    console.log(`💰 Баланс обновлен: ${window.userData.balance} -> ${response.bestBalance}`);
                    window.userData.balance = response.bestBalance;
                    updateUI();
                    saveUserData();
                }
                
                localStorage.setItem('last_sync_time', Date.now());
                return true;
            }
            
        } catch (error) {
            console.log('📴 Ошибка синхронизации:', error);
        }
        
        return false;
    };
}

// Функция для уведомлений (если не определена)
if (typeof window.showNotification === 'undefined') {
    window.showNotification = function(message, type = 'info', duration = 3000) {
        console.log(`🔔 ${type.toUpperCase()}: ${message}`);
        
        // Создаем простое уведомление
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    };
}

// Функция для расчета силы клика (если не определена)
if (typeof window.calculateClickPower === 'undefined') {
    window.calculateClickPower = function() {
        let power = 0.000000001;
        
        if (window.upgrades) {
            for (const key in window.upgrades) {
                if (key.startsWith('mouse') && window.upgrades[key]) {
                    const level = window.upgrades[key].level || 0;
                    const upgrade = UPGRADES[key];
                    if (upgrade) {
                        power += level * upgrade.baseBonus;
                    }
                }
            }
        }
        
        return power;
    };
}

// Функция для расчета скорости майнинга (если не определена)
if (typeof window.calculateMiningSpeed === 'undefined') {
    window.calculateMiningSpeed = function() {
        let speed = 0.000000000;
        
        if (window.upgrades) {
            for (const key in window.upgrades) {
                if ((key.startsWith('gpu') || key.startsWith('cpu')) && window.upgrades[key]) {
                    const level = window.upgrades[key].level || 0;
                    const upgrade = UPGRADES[key];
                    if (upgrade) {
                        speed += level * upgrade.baseBonus;
                    }
                }
            }
        }
        
        return speed;
    };
}

// Функция для обновления магазина (если не определена)
if (typeof window.updateShopUI === 'undefined') {
    window.updateShopUI = function() {
        console.log('🛒 Обновляем интерфейс магазина');
        if (window.updateShopUIFixed) {
            window.updateShopUIFixed();
        } else {
            // Базовая реализация
            for (const upgradeId in UPGRADES) {
                const upgrade = UPGRADES[upgradeId];
                const currentLevel = window.upgrades[upgradeId]?.level || 0;
                const price = upgrade.basePrice * Math.pow(2, currentLevel);
                
                const ownedElement = document.getElementById(upgradeId + '-owned');
                const priceElement = document.getElementById(upgradeId + '-price');
                
                if (ownedElement) ownedElement.textContent = currentLevel;
                if (priceElement) priceElement.textContent = price.toFixed(9);
                
                const buyButton = document.querySelector(`[onclick="buyUpgrade('${upgradeId}')"]`);
                if (buyButton) {
                    if (window.userData && window.userData.balance >= price) {
                        buyButton.disabled = false;
                        buyButton.textContent = 'Купить';
                        buyButton.style.opacity = '1';
                    } else {
                        buyButton.disabled = true;
                        buyButton.textContent = 'Недостаточно средств';
                        buyButton.style.opacity = '0.6';
                    }
                }
            }
        }
    };
}

// Функция для обновления UI (если не определена)
if (typeof window.updateUI === 'undefined') {
    window.updateUI = function() {
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
            clickSpeedElement.textContent = calculateClickPower().toFixed(9) + ' S/сек';
        }
        
        if (mineSpeedElement) {
            mineSpeedElement.textContent = calculateMiningSpeed().toFixed(9) + ' S/сек';
        }
    };
}

// Функция для сохранения данных (если не определена)
if (typeof window.saveUserData === 'undefined') {
    window.saveUserData = function() {
        try {
            if (!window.userData) return;
            
            window.userData.lastUpdate = Date.now();
            localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
            
            if (window.upgrades) {
                const upgradesData = {};
                for (const key in window.upgrades) {
                    if (window.upgrades[key] && typeof window.upgrades[key].level !== 'undefined') {
                        upgradesData[key] = window.upgrades[key].level;
                    }
                }
                localStorage.setItem('sparkcoin_upgrades_' + window.userData.userId, JSON.stringify(upgradesData));
            }
            
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
        }
    };
}

// Функция для покупки улучшений (если не определена)
if (typeof window.buyUpgrade === 'undefined') {
    window.buyUpgrade = function(upgradeId) {
        if (!window.userData || !UPGRADES[upgradeId]) {
            showNotification('Ошибка данных', 'error');
            return;
        }
        
        const upgrade = UPGRADES[upgradeId];
        const currentLevel = window.upgrades[upgradeId]?.level || 0;
        const price = upgrade.basePrice * Math.pow(2, currentLevel);
        
        console.log(`🛒 Покупка ${upgradeId}: уровень ${currentLevel}, цена ${price}`);
        
        if (window.userData.balance >= price) {
            window.userData.balance -= price;
            if (!window.upgrades[upgradeId]) {
                window.upgrades[upgradeId] = { level: 0 };
            }
            window.upgrades[upgradeId].level = currentLevel + 1;
            
            updateUI();
            updateShopUI();
            saveUserData();
            
            setTimeout(() => window.syncUserData(), 1000);
            
            showNotification(`Улучшение "${upgrade.name}" куплено! Уровень: ${currentLevel + 1}`, 'success');
        } else {
            showNotification('Недостаточно средств', 'error');
        }
    };
}

// Функция для обновления баланса (если не определена)
if (typeof window.updateBalanceImmediately === 'undefined') {
    window.updateBalanceImmediately = function() {
        if (!window.userData) return;
        
        const balanceElement = document.getElementById('balanceValue');
        if (balanceElement) {
            balanceElement.textContent = (window.userData.balance || 0.000000100).toFixed(9) + ' S';
        }
        
        const clickValueElement = document.getElementById('clickValue');
        if (clickValueElement) {
            clickValueElement.textContent = calculateClickPower().toFixed(9);
        }
    };
}

console.log('✅ API фиксы загружены! Все функции определены.');
