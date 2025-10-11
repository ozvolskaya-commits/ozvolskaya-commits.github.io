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
            const response = await window.apiRequest(`/api/player/${window.userData.userId}`, {
                method: 'POST',
                body: JSON.stringify(window.userData)
            });
            
            if (response && response.success) {
                console.log('✅ Данные синхронизированы с API');
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

console.log('✅ API фиксы загружены!');
