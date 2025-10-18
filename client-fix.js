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
            upgrades: window.upgrades,
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
            }
            
            // ЕСЛИ ОБНАРУЖЕНА МУЛЬТИСЕССИЯ - ПРЕДУПРЕЖДАЕМ
            if (response.multisessionDetected) {
                showNotification('⚠️ Обнаружена активность на другом устройстве!', 'warning');
            }
            
            return true;
        }
    } catch (error) {
        console.log('📴 Ошибка синхронизации');
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
        telegramId: telegramId
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
            window.upgrades = JSON.parse(savedUpgrades);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки улучшений');
        window.upgrades = {};
    }
    
    window.isDataLoaded = true;
    console.log('👤 Данные загружены:', window.userData.username, 'Баланс:', window.userData.balance);
    
    // СИНХРОНИЗИРУЕМ С СЕРВЕРОМ
    setTimeout(() => window.syncUserData(), 1000);
};

// 3. ИСПРАВЛЕННОЕ СОХРАНЕНИЕ
window.saveUserDataFixed = function() {
    if (!window.userData) return;
    
    try {
        window.userData.lastUpdate = Date.now();
        
        // СОХРАНЯЕМ В LOCALSTORAGE
        localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
        
        if (window.upgrades) {
            localStorage.setItem('sparkcoin_upgrades_' + window.userData.userId, JSON.stringify(window.upgrades));
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
    return btoa(navigator.userAgent + navigator.platform).substring(0, 20);
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

// 5. ПЕРЕОПРЕДЕЛЯЕМ СТАРЫЕ ФУНКЦИИ
window.loadUserData = window.loadUserDataFixed;
window.saveUserData = window.saveUserDataFixed;

// 6. ИСПРАВЛЕННЫЙ МАЙНИНГ (без дублирования)
let miningInterval = null;
let lastMiningUpdate = 0;

window.startFixedMining = function() {
    if (miningInterval) clearInterval(miningInterval);
    
    miningInterval = setInterval(() => {
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
            }
        }
    }, 1000);
};

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
        });
    }, 1000);
});

console.log('✅ КЛИЕНТСКИЕ ИСПРАВЛЕНИЯ ЗАГРУЖЕНЫ!');
