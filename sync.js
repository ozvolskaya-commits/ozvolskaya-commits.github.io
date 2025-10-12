// sync.js - исправленная система синхронизации
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
    
    try {
        const telegramId = getTelegramUserId();
        const username = getTelegramUsername();
        
        console.log(`👤 Синхронизация для: ${username} (${telegramId})`);
        
        // Рассчитываем майнинг перед синхронизацией
        calculateOfflineMining();
        
        const syncData = {
            telegramId: telegramId,
            username: username,
            balance: window.userData.balance,
            totalEarned: window.userData.totalEarned,
            totalClicks: window.userData.totalClicks,
            upgrades: window.upgrades,
            lastUpdate: Date.now(),
            mineSpeed: calculateMiningSpeed(),
            sessionId: currentSessionId
        };
        
        const response = await window.apiRequest('/api/sync/user', {
            method: 'POST',
            body: JSON.stringify(syncData)
        });
        
        if (response && response.success) {
            console.log('✅ Данные синхронизированы с сервером');
            
            // ОБНОВЛЯЕМ userId если сервер вернул другой
            if (response.userId && response.userId !== window.userData.userId) {
                console.log(`🆔 Смена userId: ${window.userData.userId} -> ${response.userId}`);
                window.userData.userId = response.userId;
                saveUserData();
            }
            
            localStorage.setItem('last_sync_time', Date.now());
            localStorage.setItem('last_mining_time', Date.now());
            isSyncing = false;
            return true;
        }
        
    } catch (error) {
        console.log('📴 Ошибка синхронизации:', error);
    }
    
    isSyncing = false;
    return false;
};

// Генерация ID сессии
function generateSessionId() {
    let sessionId = localStorage.getItem('user_session_id');
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('user_session_id', sessionId);
    }
    return sessionId;
}

// Загрузка данных с сервера
window.loadSyncedData = async function() {
    console.log('📥 Загрузка синхронизированных данных...');
    
    try {
        const telegramId = getTelegramUserId();
        const response = await window.apiRequest(`/api/sync/user/${telegramId}?session=${currentSessionId}`);
        
        if (response && response.success && response.userData) {
            console.log('✅ Данные загружены с сервера');
            
            const now = Date.now();
            localStorage.setItem('last_sync_time', now);
            localStorage.setItem('last_mining_time', now);
            
            // ВАЖНО: Объединяем данные, сохраняя локальный прогресс
            const mergedData = mergeUserData(window.userData, response.userData);
            
            window.userData = {
                ...mergedData,
                userId: response.userData.userId, // Используем userId с сервера
                username: getTelegramUsername()
            };
            
            // Восстанавливаем улучшения
            if (response.userData.upgrades) {
                window.upgrades = response.userData.upgrades;
            }
            
            saveUserData();
            updateUI();
            updateShopUI();
            
            showNotification('Данные синхронизированы!', 'success');
            return true;
        } else if (response && !response.success) {
            console.log('📱 Пользователь не найден на сервере, создаем новую запись');
            // Принудительно синхронизируем чтобы создать запись
            await window.syncUserData(true);
        }
        
    } catch (error) {
        console.log('📴 Ошибка загрузки данных:', error);
    }
    
    return false;
};

// Умное объединение данных
function mergeUserData(localData, serverData) {
    console.log('🔄 Объединение данных:', {
        localBalance: localData.balance,
        serverBalance: serverData.balance,
        localClicks: localData.totalClicks,
        serverClicks: serverData.totalClicks
    });
    
    return {
        // Баланс - берем максимальный
        balance: Math.max(localData.balance || 0, serverData.balance || 0),
        
        // Общий заработок - берем максимальный
        totalEarned: Math.max(localData.totalEarned || 0, serverData.totalEarned || 0),
        
        // Клики - берем максимальные
        totalClicks: Math.max(localData.totalClicks || 0, serverData.totalClicks || 0),
        
        // Остальные данные
        lastUpdate: Math.max(localData.lastUpdate || 0, new Date(serverData.lastUpdate).getTime() || 0),
        lotteryWins: Math.max(localData.lotteryWins || 0, serverData.lotteryWins || 0),
        totalBet: Math.max(localData.totalBet || 0, serverData.totalBet || 0),
        referralEarnings: Math.max(localData.referralEarnings || 0, serverData.referralEarnings || 0),
        referralsCount: Math.max(localData.referralsCount || 0, serverData.referralsCount || 0),
        totalWinnings: Math.max(localData.totalWinnings || 0, serverData.totalWinnings || 0),
        totalLosses: Math.max(localData.totalLosses || 0, serverData.totalLosses || 0),
        
        // Сохраняем трансферы
        transfers: {
            sent: Math.max(localData.transfers?.sent || 0, serverData.transfers?.sent || 0),
            received: Math.max(localData.transfers?.received || 0, serverData.transfers?.received || 0)
        },
        
        // Сохраняем Telegram данные
        telegramId: serverData.telegramId || localData.telegramId,
        telegramUsername: serverData.telegramUsername || localData.telegramUsername
    };
}

// Расчет офлайн майнинга
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

// Система активного майнинга
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

// Функция скорости майнинга
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
    
    const originalSaveUserData = window.saveUserData;
    window.saveUserData = function() {
        originalSaveUserData();
        setTimeout(() => window.syncUserData(), 2000);
    };
    
    setTimeout(() => {
        calculateOfflineMining();
        window.loadSyncedData();
    }, 1500);
    
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            calculateOfflineMining();
            setTimeout(() => window.loadSyncedData(), 1000);
        }
    });
    
    setInterval(() => {
        if (window.userData) {
            window.syncUserData();
        }
    }, 15000);
}

// Убираем дублирующую плашку
function removeDuplicateMiningInfo() {
    const duplicateMining = document.getElementById('miningInfo');
    if (duplicateMining) {
        duplicateMining.remove();
        console.log('✅ Убрана дублирующая плашка майнинга');
    }
}

// Инициализация системы
function initializeSyncAndMiningSystem() {
    console.log('🚀 Инициализация исправленной системы...');
    
    removeDuplicateMiningInfo();
    setupAutoSync();
    startMiningSystem();
    
    console.log('✅ Исправленная система готова!');
}

// Переопределяем обновление UI
const originalUpdateUI = window.updateUI;
window.updateUI = function() {
    if (originalUpdateUI) originalUpdateUI();
    
    const mineSpeedElement = document.getElementById('mineSpeed');
    if (mineSpeedElement) {
        mineSpeedElement.textContent = calculateMiningSpeed().toFixed(9) + ' S/сек';
    }
};

// Запускаем при загрузке
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeSyncAndMiningSystem, 1000);
});

console.log('🔗 Исправленная система синхронизации загружена!');
