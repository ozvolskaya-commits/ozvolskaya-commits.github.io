// sync.js - синхронизация между устройствами через Telegram
console.log('🔗 Загружаем систему синхронизации...');

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
        
        // Сохраняем в API
        const syncData = {
            telegramId: telegramId,
            username: username,
            balance: window.userData.balance,
            totalEarned: window.userData.totalEarned,
            totalClicks: window.userData.totalClicks,
            upgrades: window.upgrades,
            lastUpdate: new Date().toISOString()
        };
        
        const response = await window.apiRequest('/api/sync/user', {
            method: 'POST',
            body: JSON.stringify(syncData)
        });
        
        if (response && response.success) {
            console.log('✅ Данные синхронизированы с сервером');
            localStorage.setItem('last_sync_time', Date.now());
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
            
            // Восстанавливаем данные
            window.userData = {
                ...window.userData, // сохраняем локальные настройки
                ...response.userData, // перезаписываем синхронизированными данными
                userId: getTelegramUserId(), // всегда используем текущий ID
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

// Автоматическая синхронизация при изменении данных
function setupAutoSync() {
    console.log('⚡ Настройка автосинхронизации...');
    
    // Перехватываем сохранение данных
    const originalSaveUserData = window.saveUserData;
    window.saveUserData = function() {
        originalSaveUserData();
        
        // Синхронизируем с сервером каждые 30 секунд
        const lastSync = localStorage.getItem('last_sync_time');
        const now = Date.now();
        
        if (!lastSync || (now - lastSync) > 30000) {
            setTimeout(() => window.syncUserData(), 1000);
        }
    };
    
    // Синхронизация при загрузке страницы
    setTimeout(() => {
        window.loadSyncedData();
    }, 2000);
    
    // Синхронизация при видимости страницы (переключении вкладок)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            window.loadSyncedData();
        }
    });
}

// Обновляем функцию получения Telegram ID
function getTelegramUserId() {
    if (typeof tg === 'undefined') {
        return 'web_' + Math.random().toString(36).substr(2, 9);
    }
    
    const user = tg.initDataUnsafe?.user;
    
    // ВАЖНО: Используем Telegram ID как основной идентификатор
    if (user && user.id) {
        return 'tg_' + user.id; // Уникальный ID аккаунта Telegram
    } else if (user && user.username) {
        return 'tg_' + user.username.toLowerCase();
    }
    
    return 'unknown_user';
}

// Переопределяем создание данных пользователя
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
        telegramId: tg?.initDataUnsafe?.user?.id || null,
        telegramUsername: tg?.initDataUnsafe?.user?.username || null,
        transfers: {
            sent: 0,
            received: 0
        },
        referralEarnings: 0,
        referralsCount: 0,
        totalWinnings: 0,
        totalLosses: 0,
        isSynced: false
    };
}

// Добавляем кнопку ручной синхронизации в интерфейс
function addSyncButton() {
    const header = document.querySelector('.header');
    if (header && !document.getElementById('syncButton')) {
        const syncButton = document.createElement('button');
        syncButton.id = 'syncButton';
        syncButton.innerHTML = '🔄 Синхронизировать';
        syncButton.style.cssText = `
            background: rgba(76, 201, 240, 0.2);
            border: 1px solid #4CC9F0;
            color: #4CC9F0;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            margin-top: 5px;
            transition: all 0.3s ease;
        `;
        
        syncButton.onclick = async function() {
            syncButton.innerHTML = '⏳ Синхронизация...';
            syncButton.disabled = true;
            
            const success = await window.syncUserData();
            
            if (success) {
                syncButton.innerHTML = '✅ Готово';
                setTimeout(() => {
                    syncButton.innerHTML = '🔄 Синхронизировать';
                    syncButton.disabled = false;
                }, 2000);
            } else {
                syncButton.innerHTML = '❌ Ошибка';
                setTimeout(() => {
                    syncButton.innerHTML = '🔄 Синхронизировать';
                    syncButton.disabled = false;
                }, 2000);
            }
        };
        
        header.appendChild(syncButton);
    }
}

// Инициализация системы синхронизации
function initializeSyncSystem() {
    console.log('🚀 Инициализация системы синхронизации...');
    
    // Добавляем кнопку синхронизации
    addSyncButton();
    
    // Настраиваем автосинхронизацию
    setupAutoSync();
    
    // Первая синхронизация при загрузке
    setTimeout(() => {
        window.loadSyncedData();
    }, 3000);
    
    console.log('✅ Система синхронизации готова!');
}

// Запускаем при загрузке
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeSyncSystem, 1000);
});

console.log('🔗 Система синхронизации загружена!');
