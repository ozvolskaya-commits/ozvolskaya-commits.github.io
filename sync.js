// sync.js - улучшенная синхронизация с пассивным майнингом
console.log('🔗 Загружаем улучшенную систему синхронизации...');

// Переменные для майнинга
let miningInterval = null;
let lastMiningTime = Date.now();

// Основная функция синхронизации
window.syncUserData = async function() {
    console.log('🔄 Синхронизация данных...');
    
    if (!window.userData) {
        console.log('❌ Нет данных пользователя');
        return false;
    }
    
    try {
        // Получаем Telegram ID пользователя
        const telegramId = getTelegramUserId();
        const username = getTelegramUsername();
        
        console.log(`👤 Синхронизация для: ${username} (${telegramId})`);
        
        // Рассчитываем майнинг перед синхронизацией
        calculateOfflineMining();
        
        // Сохраняем в API
        const syncData = {
            telegramId: telegramId,
            username: username,
            balance: window.userData.balance,
            totalEarned: window.userData.totalEarned,
            totalClicks: window.userData.totalClicks,
            upgrades: window.upgrades,
            lastUpdate: new Date().toISOString(),
            mineSpeed: calculateMiningSpeed()
        };
        
        const response = await window.apiRequest('/api/sync/user', {
            method: 'POST',
            body: JSON.stringify(syncData)
        });
        
        if (response && response.success) {
            console.log('✅ Данные синхронизированы с сервером');
            localStorage.setItem('last_sync_time', Date.now());
            localStorage.setItem('last_mining_time', Date.now());
            return true;
        }
        
    } catch (error) {
        console.log('📴 Ошибка синхронизации:', error);
    }
    
    return false;
};

// Загрузка данных с сервера
window.loadSyncedData = async function() {
    console.log('📥 Загрузка синхронизированных данных...');
    
    try {
        const telegramId = getTelegramUserId();
        const response = await window.apiRequest(`/api/sync/user/${telegramId}`);
        
        if (response && response.success && response.userData) {
            console.log('✅ Данные загружены с сервера:', response.userData);
            
            // Сохраняем время последней синхронизации
            const now = Date.now();
            localStorage.setItem('last_sync_time', now);
            localStorage.setItem('last_mining_time', now);
            
            // Восстанавливаем данные
            window.userData = {
                ...window.userData,
                ...response.userData,
                userId: getTelegramUserId(),
                username: getTelegramUsername()
            };
            
            // Восстанавливаем улучшения
            if (response.userData.upgrades) {
                window.upgrades = response.userData.upgrades;
            }
            
            // Сохраняем локально
            saveUserData();
            
            // Обновляем интерфейс
            updateUI();
            updateShopUI();
            
            showNotification('Данные синхронизированы!', 'success');
            return true;
        }
        
    } catch (error) {
        console.log('📴 Ошибка загрузки данных:', error);
    }
    
    return false;
};

// Расчет офлайн майнинга
function calculateOfflineMining() {
    const lastMining = parseInt(localStorage.getItem('last_mining_time')) || Date.now();
    const now = Date.now();
    const timeDiff = (now - lastMining) / 1000; // разница в секундах
    
    if (timeDiff > 1 && window.userData) {
        const miningSpeed = calculateMiningSpeed();
        const minedAmount = miningSpeed * timeDiff;
        
        if (minedAmount > 0) {
            window.userData.balance += minedAmount;
            window.userData.totalEarned += minedAmount;
            
            console.log(`⛏️ Начислен офлайн майнинг: ${minedAmount.toFixed(9)} S за ${timeDiff.toFixed(0)} сек`);
            
            // Обновляем время майнинга
            localStorage.setItem('last_mining_time', now);
            
            // Сохраняем и обновляем UI
            saveUserData();
            updateUI();
        }
    }
}

// Система активного майнинга
function startMiningSystem() {
    console.log('⛏️ Запуск системы майнинга...');
    
    // Останавливаем предыдущий интервал
    if (miningInterval) {
        clearInterval(miningInterval);
    }
    
    // Запускаем майнинг каждую секунду
    miningInterval = setInterval(() => {
        if (window.userData && window.isDataLoaded) {
            const miningSpeed = calculateMiningSpeed();
            
            if (miningSpeed > 0) {
                window.userData.balance += miningSpeed;
                window.userData.totalEarned += miningSpeed;
                
                // Обновляем баланс каждые 10 секунд
                if (Date.now() - lastMiningTime > 10000) {
                    updateUI();
                    saveUserData();
                    lastMiningTime = Date.now();
                }
                
                // Быстрое обновление баланса
                updateBalanceImmediately();
            }
        }
    }, 1000); // Каждую секунду
    
    // Синхронизация каждые 30 секунд
    setInterval(() => {
        if (window.userData) {
            window.syncUserData();
        }
    }, 30000);
}

// Улучшенная функция скорости майнинга
function calculateMiningSpeed() {
    let speed = 0.000000000;
    
    if (!window.upgrades) return speed;
    
    // Бонус от видеокарт
    for (const key in window.upgrades) {
        if (key.startsWith('gpu') && window.upgrades[key]) {
            const level = window.upgrades[key].level || 0;
            const upgrade = UPGRADES[key];
            if (upgrade) {
                speed += level * upgrade.baseBonus;
            }
        }
    }
    
    // Бонус от процессоров
    for (const key in window.upgrades) {
        if (key.startsWith('cpu') && window.upgrades[key]) {
            const level = window.upgrades[key].level || 0;
            const upgrade = UPGRADES[key];
            if (upgrade) {
                speed += level * upgrade.baseBonus;
            }
        }
    }
    
    return speed;
}

// Автоматическая синхронизация при изменении данных
function setupAutoSync() {
    console.log('⚡ Настройка автосинхронизации...');
    
    // Перехватываем сохранение данных
    const originalSaveUserData = window.saveUserData;
    window.saveUserData = function() {
        originalSaveUserData();
        
        // Синхронизируем с сервером каждые 10 секунд
        const lastSync = localStorage.getItem('last_sync_time');
        const now = Date.now();
        
        if (!lastSync || (now - lastSync) > 10000) {
            setTimeout(() => window.syncUserData(), 2000);
        }
    };
    
    // Синхронизация при загрузке страницы
    setTimeout(() => {
        calculateOfflineMining(); // Сначала начисляем офлайн майнинг
        window.loadSyncedData();  // Потом загружаем данные
    }, 2000);
    
    // Синхронизация при видимости страницы
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            calculateOfflineMining();
            window.loadSyncedData();
        }
    });
}

// Обновляем функцию получения Telegram ID
function getTelegramUserId() {
    if (typeof tg === 'undefined') {
        // Для веб-версии используем localStorage
        let webId = localStorage.getItem('web_user_id');
        if (!webId) {
            webId = 'web_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('web_user_id', webId);
        }
        return webId;
    }
    
    const user = tg.initDataUnsafe?.user;
    
    // ВАЖНО: Используем Telegram ID как основной идентификатор
    if (user && user.id) {
        return 'tg_' + user.id;
    } else if (user && user.username) {
        return 'tg_' + user.username.toLowerCase();
    }
    
    return 'unknown_user';
}

// Добавляем информацию о майнинге в интерфейс
function addMiningInfo() {
    const balanceSection = document.querySelector('.balance-section');
    if (balanceSection && !document.getElementById('miningInfo')) {
        const miningInfo = document.createElement('div');
        miningInfo.id = 'miningInfo';
        miningInfo.innerHTML = `
            <div style="margin-top: 10px; padding: 10px; background: rgba(76, 175, 80, 0.1); border-radius: 8px; border: 1px solid #4CAF50;">
                <div style="font-size: 12px; color: #4CAF50;">⛏️ Пассивный майнинг: <span id="currentMiningSpeed">0.000000000</span> S/сек</div>
                <div style="font-size: 10px; color: #888;">Баланс обновляется в реальном времени</div>
            </div>
        `;
        balanceSection.appendChild(miningInfo);
    }
}

// Обновляем информацию о майнинге
function updateMiningInfo() {
    const miningSpeedElement = document.getElementById('currentMiningSpeed');
    if (miningSpeedElement) {
        const miningSpeed = calculateMiningSpeed();
        miningSpeedElement.textContent = miningSpeed.toFixed(9);
    }
}

// Инициализация системы синхронизации и майнинга
function initializeSyncAndMiningSystem() {
    console.log('🚀 Инициализация системы синхронизации и майнинга...');
    
    // Добавляем информацию о майнинге
    addMiningInfo();
    
    // Настраиваем автосинхронизацию
    setupAutoSync();
    
    // Запускаем систему майнинга
    startMiningSystem();
    
    // Обновляем информацию о майнинге каждые 5 секунд
    setInterval(updateMiningInfo, 5000);
    
    console.log('✅ Система синхронизации и майнинга готова!');
}

// Переопределяем обновление UI для отображения майнинга
const originalUpdateUI = window.updateUI;
window.updateUI = function() {
    if (originalUpdateUI) originalUpdateUI();
    updateMiningInfo();
    
    // Обновляем скорость майнинга в статистике
    const mineSpeedElement = document.getElementById('mineSpeed');
    if (mineSpeedElement) {
        mineSpeedElement.textContent = calculateMiningSpeed().toFixed(9) + ' S/сек';
    }
};

// Запускаем при загрузке
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeSyncAndMiningSystem, 1000);
});

console.log('🔗 Улучшенная система синхронизации загружена!');
