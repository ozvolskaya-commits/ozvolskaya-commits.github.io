// balance-fix.js - ФИКС баланса и синхронизации
console.log('💰 ЗАГРУЖАЕМ ФИКС БАЛАНСА...');

class BalanceFixer {
    constructor() {
        this.balanceKey = 'sparkcoin_balance_fixed';
        this.lastSyncKey = 'sparkcoin_last_sync_fixed';
    }

    // ГАРАНТИРОВАННАЯ загрузка данных
    async loadUserDataGuaranteed() {
        console.log('📥 ГАРАНТИРОВАННАЯ загрузка данных...');
        
        const userId = this.getUnifiedUserId();
        const telegramId = this.getTelegramId();
        
        // 1. Пытаемся загрузить с сервера
        let serverData = await this.loadFromServer(telegramId, userId);
        
        if (serverData) {
            console.log('✅ Данные с сервера:', serverData.balance);
            this.applyServerData(serverData);
            return;
        }
        
        // 2. Загружаем из localStorage
        const localData = this.loadFromLocalStorage(userId);
        if (localData) {
            console.log('✅ Данные из localStorage:', localData.balance);
            window.userData = localData;
            return;
        }
        
        // 3. Создаем новые данные
        console.log('🆕 Создаем новые данные');
        window.userData = this.createNewUserData();
    }

    // Загрузка с сервера с приоритетом
    async loadFromServer(telegramId, userId) {
        try {
            // Сначала по telegramId
            if (telegramId) {
                const response = await apiRequest(`/api/sync/telegram/${telegramId}`);
                if (response && response.success && response.userData) {
                    console.log('✅ Найден по telegramId');
                    return response.userData;
                }
            }
            
            // Затем по userId
            const response = await apiRequest(`/api/sync/unified/${userId}`);
            if (response && response.success && response.userData) {
                console.log('✅ Найден по userId');
                return response.userData;
            }
        } catch (error) {
            console.log('📴 Сервер недоступен');
        }
        return null;
    }

    // Загрузка из localStorage с проверкой
    loadFromLocalStorage(userId) {
        try {
            const savedData = localStorage.getItem('sparkcoin_user_data');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                // Проверяем совпадение userId ИЛИ telegramId
                if (parsedData.userId === userId || parsedData.telegramId === this.getTelegramId()) {
                    return parsedData;
                }
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки из localStorage');
        }
        return null;
    }

    // Применяем серверные данные (сохраняем максимальный баланс)
    applyServerData(serverData) {
        const localData = this.loadFromLocalStorage(this.getUnifiedUserId());
        
        if (localData) {
            // Берем МАКСИМАЛЬНЫЙ баланс из всех источников
            serverData.balance = Math.max(serverData.balance, localData.balance);
            serverData.totalEarned = Math.max(serverData.totalEarned, localData.totalEarned);
            serverData.totalClicks = Math.max(serverData.totalClicks, localData.totalClicks);
        }
        
        window.userData = serverData;
        this.saveUserDataGuaranteed();
    }

    // ГАРАНТИРОВАННОЕ сохранение
    saveUserDataGuaranteed() {
        if (!window.userData) return;
        
        try {
            // Сохраняем в localStorage
            localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
            
            // Дублируем в отдельное хранилище для надежности
            localStorage.setItem(this.balanceKey, window.userData.balance.toString());
            localStorage.setItem(this.lastSyncKey, Date.now().toString());
            
            console.log('💾 Данные СОХРАНЕНЫ:', window.userData.balance);
            
            // Синхронизируем с сервером
            this.syncToServer();
            
        } catch (error) {
            console.error('❌ Критическая ошибка сохранения:', error);
        }
    }

    // Синхронизация с сервером
    async syncToServer() {
        if (!window.userData) return;
        
        try {
            const syncData = {
                userId: window.userData.userId,
                telegramId: window.userData.telegramId,
                username: window.userData.username,
                balance: window.userData.balance,
                totalEarned: window.userData.totalEarned,
                totalClicks: window.userData.totalClicks,
                upgrades: window.upgrades,
                deviceId: window.hardSessionBlocker ? window.hardSessionBlocker.generateSuperDeviceId() : 'unknown'
            };
            
            const response = await apiRequest('/api/sync/unified', {
                method: 'POST',
                body: JSON.stringify(syncData)
            });
            
            if (response && response.success) {
                console.log('✅ Синхронизировано с сервером');
            }
        } catch (error) {
            console.log('📴 Ошибка синхронизации');
        }
    }

    // Восстановление баланса при загрузке
    restoreBalance() {
        const savedBalance = localStorage.getItem(this.balanceKey);
        if (savedBalance && window.userData) {
            const balance = parseFloat(savedBalance);
            if (balance > window.userData.balance) {
                console.log('💰 ВОССТАНАВЛИВАЕМ баланс:', balance);
                window.userData.balance = balance;
            }
        }
    }

    getUnifiedUserId() {
        if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user?.id) {
            return `tg_${Telegram.WebApp.initDataUnsafe.user.id}`;
        }
        return localStorage.getItem('sparkcoin_unified_user_id') || 'web_user';
    }

    getTelegramId() {
        if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user?.id) {
            return Telegram.WebApp.initDataUnsafe.user.id.toString();
        }
        return null;
    }

    createNewUserData() {
        return {
            userId: this.getUnifiedUserId(),
            username: this.getTelegramUsername(),
            balance: 0.000000100,
            totalEarned: 0.000000100,
            totalClicks: 0,
            lastUpdate: Date.now(),
            telegramId: this.getTelegramId()
        };
    }

    getTelegramUsername() {
        if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user) {
            const user = Telegram.WebApp.initDataUnsafe.user;
            return user.username ? `@${user.username}` : user.first_name || 'Игрок';
        }
        return 'Веб-Игрок';
    }
}

// Инициализация фиксера баланса
window.balanceFixer = new BalanceFixer();

// Переопределяем ключевые функции
const originalSaveUserData = window.saveUserData;
window.saveUserData = function() {
    if (window.balanceFixer) {
        window.balanceFixer.saveUserDataGuaranteed();
    } else if (originalSaveUserData) {
        originalSaveUserData();
    }
};

// Запуск при загрузке
document.addEventListener('DOMContentLoaded', async function() {
    console.log('💰 ИНИЦИАЛИЗАЦИЯ ФИКСА БАЛАНСА...');
    
    await window.balanceFixer.loadUserDataGuaranteed();
    window.balanceFixer.restoreBalance();
    
    // Постоянное сохранение каждые 5 секунд
    setInterval(() => {
        if (window.userData) {
            window.balanceFixer.saveUserDataGuaranteed();
        }
    }, 5000);
});
