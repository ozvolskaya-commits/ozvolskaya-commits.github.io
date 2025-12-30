// sync.js - исправленная система синхронизации с мультисессией
console.log('🔗 Загружаем исправленную систему синхронизации...');

let miningInterval = null;
let lastMiningTime = Date.now();
let isSyncing = false;
let currentSessionId = generateSessionId();

// Основная функция синхронизации
window.syncUserData = async function(force = false) {
    if (isSyncing && !force) return false;
    
    console.log('🔄 Синхронизация данных...');
    isSyncing = true;
    
    if (!window.userData) {
        console.log('❌ Нет данных пользователя');
        isSyncing = false;
        return false;
    }
    
    // Проверяем мультисессию перед синхронизацией
    if (window.multiSessionDetector) {
        const status = window.multiSessionDetector.getStatus();
        if (status.isMultiSession && status.timeSinceLastActivity < 10000) {
            console.log('⏸️ Синхронизация приостановлена из-за мультисессии');
            isSyncing = false;
            return false;
        }
    }
    
    try {
        const syncData = {
            userId: window.userData.userId,
            username: window.userData.username,
            balance: window.userData.balance,
            totalEarned: window.userData.totalEarned,
            totalClicks: window.userData.totalClicks,
            upgrades: window.getUpgradesForSync(), // Используем новую функцию
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
            isSyncing = false;
            return true;
        }
        
    } catch (error) {
        console.log('📴 Ошибка синхронизации:', error);
    }
    
    isSyncing = false;
    return false;
};

// Загрузка данных с сервера с синхронизацией улучшений
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

// Функция для получения улучшений для синхронизации
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

function generateSessionId() {
    let sessionId = localStorage.getItem('user_session_id');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('user_session_id', sessionId);
    }
    return sessionId;
}

function calculateOfflineMining() {
    const lastMining = parseInt(localStorage.getItem('last_mining_time')) || Date.now();
    const now = Date.now();
    const timeDiff = (now - lastMining) / 1000;

    if (timeDiff > 1 && window.userData) {
        const miningSpeed = calculateMiningSpeed();
        const minedAmount = miningSpeed * timeDiff;
        
        if (minedAmount > 0) {
            window.userData.balance += minedAmount;
            window.userData.totalEarned += minedAmount;
            
            console.log(`⛏️ Начислен офлайн майнинг: ${minedAmount.toFixed(9)} S за ${timeDiff.toFixed(0)} сек`);
            
            localStorage.setItem('last_mining_time', now);
            saveUserData();
            updateUI();
        }
    }
}

function startMiningSystem() {
    console.log('⛏️ Запуск системы майнинга...');
    
    if (miningInterval) {
        clearInterval(miningInterval);
    }
    
    miningInterval = setInterval(() => {
        if (window.userData && window.isDataLoaded) {
            const miningSpeed = calculateMiningSpeed();
            
            if (miningSpeed > 0) {
                window.userData.balance += miningSpeed;
                window.userData.totalEarned += miningSpeed;
                
                updateBalanceImmediately();
                
                if (Date.now() - lastMiningTime > 5000) {
                    updateUI();
                    saveUserData();
                    lastMiningTime = Date.now();
                }
            }
        }
    }, 1000);
}

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

// Автоматическая синхронизация
function setupAutoSync() {
    console.log('⚡ Настройка автосинхронизации...');
    
    // Синхронизация при каждом сохранении
    const originalSaveUserData = window.saveUserData;
    window.saveUserData = function() {
        originalSaveUserData();
        setTimeout(() => window.syncUserData(), 1000);
    };
    
    // Синхронизация при загрузке
    setTimeout(() => {
        calculateOfflineMining();
        window.loadSyncedData();
    }, 2000);
    
    // Синхронизация при возвращении на вкладку
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            calculateOfflineMining();
            setTimeout(() => window.loadSyncedData(), 1000);
        }
    });
    
    // Периодическая синхронизация
    setInterval(() => {
        if (window.userData && window.multiSessionDetector) {
            const status = window.multiSessionDetector.getStatus();
            if (!status.isMultiSession || status.timeSinceLastActivity > 30000) {
                window.syncUserData();
            }
        }
    }, 30000); // Каждые 30 секунд
}

// Инициализация системы
function initializeSyncAndMiningSystem() {
    console.log('🚀 Инициализация исправленной системы...');
    
    setupAutoSync();
    startMiningSystem();
    
    console.log('✅ Исправленная система готова!');
}

// Запускаем при загрузке
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeSyncAndMiningSystem, 1000);
});

console.log('🔗 Исправленная система синхронизации загружена!');
