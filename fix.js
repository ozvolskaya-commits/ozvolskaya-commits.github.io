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
                    upgrades: window.upgrades,
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
                const currentLevel = window.upgrades[upgradeId] || 0;
                const price = upgrade.basePrice * Math.pow(2, currentLevel);
                
                const ownedElement = document.getElementById(upgradeId + '-owned');
                const priceElement = document.getElementById(upgradeId + '-price');
                
                if (ownedElement) ownedElement.textContent = currentLevel;
                if (priceElement) priceElement.textContent = price.toFixed(9);
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
            let mineSpeed = 0.000000000;
            if (window.upgrades) {
                for (const key in window.upgrades) {
                    if ((key.startsWith('gpu') || key.startsWith('cpu')) && window.upgrades[key]) {
                        const level = window.upgrades[key].level || 0;
                        const upgrade = UPGRADES[key];
                        if (upgrade) {
                            mineSpeed += level * upgrade.baseBonus;
                        }
                    }
                }
            }
            mineSpeedElement.textContent = mineSpeed.toFixed(9) + ' S/сек';
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

console.log('✅ API фиксы загружены!');
