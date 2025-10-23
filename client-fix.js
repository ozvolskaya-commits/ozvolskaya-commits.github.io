// client-fix.js - ИСПРАВЛЕНИЕ КЛИЕНТСКОЙ ЧАСТИ
console.log('🔧 ЗАГРУЖАЕМ КЛИЕНТСКИЕ ИСПРАВЛЕНИЯ...');

// ПЕРЕОПРЕДЕЛЯЕМ ВСЕ КЛЮЧЕВЫЕ ФУНКЦИИ

// 1. ИСПРАВЛЕННАЯ СИНХРОНИЗАЦИЯ
window.syncUserData = async function(force = false) {
    if (!window.userData) return false;
    
    console.log('🔄 Синхронизация данных...');
    
    try {
        const deviceId = window.generateDeviceId();
        const syncData = {
            userId: window.userData.userId,
            telegramId: window.userData.telegramId,
            username: window.userData.username,
            balance: window.userData.balance,
            totalEarned: window.userData.totalEarned,
            totalClicks: window.userData.totalClicks,
            upgrades: window.getUpgradesForSync ? window.getUpgradesForSync() : window.upgrades,
            deviceId: deviceId
        };
        
        const response = await window.apiRequest('/api/sync/unified', {
            method: 'POST',
            body: JSON.stringify(syncData)
        });
        
        if (response && response.success) {
            console.log('✅ Синхронизировано. Баланс:', response.bestBalance);
            
            // ОБНОВЛЯЕМ ЛОКАЛЬНЫЕ ДАННЫЕ С СЕРВЕРНЫМИ
            if (response.bestBalance > window.userData.balance) {
                window.userData.balance = response.bestBalance;
                updateUI();
                saveUserData();
            }
            
            // Если сервер вернул другой userId (при объединении записей)
            if (response.userId && response.userId !== window.userData.userId) {
                console.log(`🆔 Объединение записей: ${window.userData.userId} -> ${response.userId}`);
                window.userData.userId = response.userId;
                saveUserData();
            }
            
            // ЕСЛИ ОБНАРУЖЕНА МУЛЬТИСЕССИЯ - ПРЕДУПРЕЖДАЕМ
            if (response.multisessionDetected) {
                console.log('🚨 Обнаружена мультисессия при синхронизации');
                showNotification('⚠️ Обнаружена активность на другом устройстве!', 'warning');
                
                if (window.multiSessionDetector) {
                    window.multiSessionDetector.showWarning();
                }
            }
            
            return true;
        }
    } catch (error) {
        console.log('📴 Ошибка синхронизации:', error);
    }
    return false;
};

// 2. ИСПРАВЛЕННАЯ ЗАГРУЗКА ДАННЫХ
window.loadUserDataFixed = async function() {
    console.log('📥 ЗАГРУЗКА ДАННЫХ...');
    
    const userId = window.getUnifiedUserId();
    const telegramId = window.getTelegramId();
    const username = window.getTelegramUsername();
    
    // СОЗДАЕМ БАЗОВЫЕ ДАННЫЕ
    window.userData = {
        userId: userId,
        username: username,
        balance: 0.000000100,
        totalEarned: 0.000000100,
        totalClicks: 0,
        lastUpdate: Date.now(),
        telegramId: telegramId,
        lotteryWins: 0,
        totalBet: 0,
        transfers: {
            sent: 0,
            received: 0
        },
        referralEarnings: 0,
        referralsCount: 0,
        totalWinnings: 0,
        totalLosses: 0
    };
    
    // ЗАГРУЖАЕМ С СЕРВЕРА
    try {
        let serverData = null;
        
        // Пробуем загрузить по telegramId
        if (telegramId) {
            const response = await window.apiRequest(`/api/sync/telegram/${telegramId}`);
            if (response && response.success) {
                serverData = response.userData;
                console.log('✅ Загружено по telegramId');
            }
        }
        
        // Если не нашли, пробуем по userId
        if (!serverData) {
            const response = await window.apiRequest(`/api/sync/unified/${userId}`);
            if (response && response.success) {
                serverData = response.userData;
                console.log('✅ Загружено по userId');
            }
        }
        
        // ЕСЛИ НАШЛИ ДАННЫЕ НА СЕРВЕРЕ - ИСПОЛЬЗУЕМ ИХ
        if (serverData) {
            window.userData = serverData;
            console.log('🎯 Серверные данные. Баланс:', window.userData.balance);
        } else {
            // ИНАЧЕ ПРОБУЕМ LOCALSTORAGE
            const localData = localStorage.getItem('sparkcoin_user_data');
            if (localData) {
                const parsed = JSON.parse(localData);
                if (parsed.userId === userId || parsed.telegramId === telegramId) {
                    window.userData = {...window.userData, ...parsed};
                    console.log('💾 Локальные данные. Баланс:', window.userData.balance);
                }
            }
        }
        
    } catch (error) {
        console.log('📴 Ошибка загрузки, используем локальные данные');
        const localData = localStorage.getItem('sparkcoin_user_data');
        if (localData) {
            const parsed = JSON.parse(localData);
            window.userData = {...window.userData, ...parsed};
        }
    }
    
    // ЗАГРУЖАЕМ УЛУЧШЕНИЯ
    try {
        const savedUpgrades = localStorage.getItem('sparkcoin_upgrades_' + userId);
        if (savedUpgrades) {
            const upgradesData = JSON.parse(savedUpgrades);
            if (typeof window.upgrades === 'undefined') {
                window.upgrades = {};
            }
            for (const key in upgradesData) {
                if (!window.upgrades[key]) {
                    window.upgrades[key] = {};
                }
                window.upgrades[key].level = upgradesData[key];
            }
            console.log('✅ Улучшения загружены из localStorage');
        } else {
            // Инициализируем пустые улучшения
            window.upgrades = {};
            console.log('🆕 Созданы пустые улучшения');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки улучшений');
        window.upgrades = {};
    }
    
    window.isDataLoaded = true;
    console.log('👤 Данные загружены:', window.userData.username, 'Баланс:', window.userData.balance);
    
    // СИНХРОНИЗИРУЕМ С СЕРВЕРОМ
    setTimeout(() => window.syncUserData(), 1000);
    
    // ЗАГРУЖАЕМ СИНХРОНИЗИРОВАННЫЕ ДАННЫЕ
    setTimeout(() => {
        if (window.loadSyncedData) {
            window.loadSyncedData();
        }
    }, 2000);
};

// 3. ИСПРАВЛЕННОЕ СОХРАНЕНИЕ
window.saveUserDataFixed = function() {
    if (!window.userData) return;
    
    try {
        window.userData.lastUpdate = Date.now();
        
        // СОХРАНЯЕМ В LOCALSTORAGE
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
        
        console.log('💾 Локальное сохранение. Баланс:', window.userData.balance);
        
        // СИНХРОНИЗИРУЕМ С СЕРВЕРОМ (асинхронно)
        setTimeout(() => window.syncUserData(), 500);
        
    } catch (error) {
        console.error('❌ Ошибка сохранения:', error);
    }
};

// 4. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
window.generateDeviceId = function() {
    let deviceId = localStorage.getItem('sparkcoin_device_id');
    if (!deviceId) {
        deviceId = btoa(navigator.userAgent + navigator.platform + Math.random()).substring(0, 20);
        localStorage.setItem('sparkcoin_device_id', deviceId);
    }
    return deviceId;
};

window.getUnifiedUserId = function() {
    if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user?.id) {
        return `tg_${Telegram.WebApp.initDataUnsafe.user.id}`;
    }
    let webId = localStorage.getItem('sparkcoin_web_user_id');
    if (!webId) {
        webId = 'web_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sparkcoin_web_user_id', webId);
    }
    return webId;
};

window.getTelegramId = function() {
    if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user?.id) {
        return Telegram.WebApp.initDataUnsafe.user.id.toString();
    }
    return null;
};

window.getTelegramUsername = function() {
    if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user) {
        const user = Telegram.WebApp.initDataUnsafe.user;
        return user.username ? `@${user.username}` : user.first_name || 'Игрок';
    }
    return 'Веб-Игрок';
};

// 5. ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ УЛУЧШЕНИЙ ДЛЯ СИНХРОНИЗАЦИИ
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

// 6. ИСПРАВЛЕННЫЙ МАЙНИНГ (без дублирования) с синхронизацией
window.startFixedMining = function() {
    // Очищаем существующий интервал если есть
    if (window.miningInterval) {
        clearInterval(window.miningInterval);
    }
    
    let lastMiningUpdate = 0;
    let lastSyncTime = 0;
    
    window.miningInterval = setInterval(() => {
        if (!window.userData || !window.isDataLoaded) return;
        
        const miningSpeed = calculateMiningSpeed();
        if (miningSpeed > 0) {
            // ДОБАВЛЯЕМ ТОЛЬКО ЕСЛИ ПРОШЛО ДОСТАТОЧНО ВРЕМЕНИ
            const now = Date.now();
            if (now - lastMiningUpdate > 1000) {
                window.userData.balance += miningSpeed;
                window.userData.totalEarned += miningSpeed;
                lastMiningUpdate = now;
                
                // ОБНОВЛЯЕМ ТОЛЬКО БАЛАНС (не сохраняем каждую секунду)
                updateBalanceImmediately();
                
                // Синхронизируем каждые 30 секунд
                if (now - lastSyncTime > 30000) {
                    window.syncUserData();
                    lastSyncTime = now;
                }
            }
        }
    }, 1000);
    
    console.log('⛏️ Исправленный майнинг запущен');
};

// 7. ФУНКЦИЯ ЗАГРУЗКИ СИНХРОНИЗИРОВАННЫХ ДАННЫХ
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
                        if (!window.upgrades[key]) {
                            window.upgrades[key] = {};
                        }
                        window.upgrades[key].level = serverLevel;
                    }
                }
            }
            
            saveUserDataFixed();
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

// 8. ПЕРЕОПРЕДЕЛЯЕМ СТАРЫЕ ФУНКЦИИ
window.loadUserData = window.loadUserDataFixed;
window.saveUserData = window.saveUserDataFixed;

// 9. ФУНКЦИЯ РАСЧЕТА СКОРОСТИ МАЙНИНГА
function calculateMiningSpeed() {
    let speed = 0.000000000;
    
    if (!window.upgrades) return speed;
    
    for (const key in window.upgrades) {
        if ((key.startsWith('gpu') || key.startsWith('cpu')) && window.upgrades[key]) {
            const level = window.upgrades[key].level || 0;
            const upgrade = UPGRADES[key];
            if (upgrade) {
                speed += level * upgrade.baseBonus;
            }
        }
    }
    
    return speed;
}

// 10. ФУНКЦИЯ РАСЧЕТА СИЛЫ КЛИКА
function calculateClickPower() {
    let power = 0.000000001;
    
    if (!window.upgrades) return power;
    
    for (const key in window.upgrades) {
        if (key.startsWith('mouse') && window.upgrades[key]) {
            const level = window.upgrades[key].level || 0;
            const upgrade = UPGRADES[key];
            if (upgrade) {
                power += level * upgrade.baseBonus;
            }
        }
    }
    
    return power;
}

// 11. ФУНКЦИЯ ОБНОВЛЕНИЯ БАЛАНСА
function updateBalanceImmediately() {
    if (!window.userData) return;
    
    const balanceElement = document.getElementById('balanceValue');
    if (balanceElement) {
        balanceElement.textContent = (window.userData.balance || 0.000000100).toFixed(9) + ' S';
    }
    
    const clickValueElement = document.getElementById('clickValue');
    if (clickValueElement) {
        clickValueElement.textContent = calculateClickPower().toFixed(9);
    }
}

// 12. ФУНКЦИЯ ОБНОВЛЕНИЯ ИНТЕРФЕЙСА
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
        clickSpeedElement.textContent = calculateClickPower().toFixed(9) + ' S/сек';
    }
    
    if (mineSpeedElement) {
        mineSpeedElement.textContent = calculateMiningSpeed().toFixed(9) + ' S/сек';
    }
}

// 13. ФУНКЦИЯ ОБНОВЛЕНИЯ МАГАЗИНА
function updateShopUI() {
    if (!window.upgrades || !window.userData) return;
    
    for (const upgradeId in UPGRADES) {
        const upgrade = UPGRADES[upgradeId];
        
        if (!window.upgrades[upgradeId]) {
            window.upgrades[upgradeId] = { level: 0 };
        }
        
        const currentLevel = window.upgrades[upgradeId].level || 0;
        const price = upgrade.basePrice * Math.pow(2, currentLevel);
        
        const ownedElement = document.getElementById(upgradeId + '-owned');
        const priceElement = document.getElementById(upgradeId + '-price');
        
        if (ownedElement) ownedElement.textContent = currentLevel;
        if (priceElement) priceElement.textContent = price.toFixed(9);
        
        const buyButton = document.querySelector(`[onclick="buyUpgrade('${upgradeId}')"]`);
        if (buyButton) {
            if (window.userData.balance >= price) {
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

// 14. ФУНКЦИЯ УВЕДОМЛЕНИЙ
function showNotification(message, type = 'info') {
    console.log('🔔 ' + type + ': ' + message);
    
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
    }, 3000);
}

// ЗАПУСК ИСПРАВЛЕНИЙ ПРИ ЗАГРУЗКЕ
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 ЗАПУСК КЛИЕНТСКИХ ИСПРАВЛЕНИЙ...');
    
    setTimeout(() => {
        // ЗАГРУЖАЕМ ДАННЫЕ
        window.loadUserDataFixed().then(() => {
            // ЗАПУСКАЕМ МАЙНИНГ
            window.startFixedMining();
            
            // СОХРАНЯЕМ КАЖДЫЕ 10 СЕКУНД
            setInterval(() => {
                if (window.userData) {
                    window.saveUserDataFixed();
                }
            }, 10000);
            
            // СИНХРОНИЗИРУЕМ КАЖДЫЕ 30 СЕКУНД
            setInterval(() => {
                if (window.userData) {
                    window.syncUserData();
                }
            }, 30000);
        });
    }, 1000);
});

console.log('✅ КЛИЕНТСКИЕ ИСПРАВЛЕНИЯ ЗАГРУЖЕНЫ!');
