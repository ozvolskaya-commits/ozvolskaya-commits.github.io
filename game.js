// game.js - полностью исправленная версия
console.log('🎮 Загружаем исправленный game.js...');

// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================

// Проверяем и инициализируем глобальные переменные
if (typeof window.userData === 'undefined') {
    window.userData = {
        userId: 'default_user',
        username: 'Игрок',
        balance: 0.000000100,
        totalEarned: 0.000000100,
        totalClicks: 0,
        lastUpdate: Date.now(),
        lotteryWins: 0,
        totalBet: 0,
        transfers: { sent: 0, received: 0 }
    };
}

if (typeof window.upgrades === 'undefined') {
    window.upgrades = {};
}

if (typeof window.lastUpdateTime === 'undefined') {
    window.lastUpdateTime = Date.now();
}

if (typeof window.accumulatedIncome === 'undefined') {
    window.accumulatedIncome = 0;
}

if (typeof window.lastClickTime === 'undefined') {
    window.lastClickTime = 0;
}

if (typeof window.antiCheatBlocked === 'undefined') {
    window.antiCheatBlocked = false;
}

if (typeof window.clickTimes === 'undefined') {
    window.clickTimes = [];
}

if (typeof window.antiCheatTimeout === 'undefined') {
    window.antiCheatTimeout = null;
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ИГРЫ ====================

function calculateClickPower() {
    let power = 0.000000001;
    
    // Безопасный расчет силы клика
    if (window.upgrades) {
        for (const upgrade in window.upgrades) {
            const upgradeData = window.upgrades[upgrade];
            if (upgradeData && upgradeData.type === 'click') {
                const level = upgradeData.level || 0;
                const bonus = upgradeData.baseBonus || 0;
                power += level * bonus;
            }
        }
    }
    
    return power;
}

function calculateMiningSpeed() {
    let speed = 0;
    
    // Безопасный расчет скорости майнинга
    if (window.upgrades) {
        for (const upgrade in window.upgrades) {
            const upgradeData = window.upgrades[upgrade];
            if (upgradeData && upgradeData.type === 'mining') {
                const level = upgradeData.level || 0;
                const bonus = upgradeData.baseBonus || 0;
                speed += level * bonus;
            }
        }
    }
    
    return speed;
}

function checkAutoClick() {
    const now = Date.now();
    window.clickTimes.push(now);
    
    // Фильтруем клики по временному окну
    window.clickTimes = window.clickTimes.filter(time => {
        return now - time < (CONFIG?.ANTI_CHEAT_WINDOW || 2000);
    });
    
    const maxClicks = CONFIG?.ANTI_CHEAT_CLICKS || 15;
    const blockTime = CONFIG?.ANTI_CHEAT_BLOCK_TIME || 30000;
    
    if (window.clickTimes.length > maxClicks && !window.antiCheatBlocked) {
        window.antiCheatBlocked = true;
        
        // Показываем сообщение о блокировке
        const antiCheatElement = document.getElementById('antiCheat');
        if (antiCheatElement) {
            antiCheatElement.style.display = 'flex';
        }
        
        // Снимаем блокировку через время
        window.antiCheatTimeout = setTimeout(() => {
            window.antiCheatBlocked = false;
            const antiCheatElement = document.getElementById('antiCheat');
            if (antiCheatElement) {
                antiCheatElement.style.display = 'none';
            }
            window.clickTimes = [];
        }, blockTime);
        
        return true;
    }
    
    return false;
}

function clickCoin(event) {
    // Проверяем блокировку античитом
    if (window.antiCheatBlocked) {
        console.log('⏸️ Античит заблокирован');
        return;
    }
    
    // Проверяем кулдаун
    const now = Date.now();
    const cooldown = CONFIG?.CLICK_COOLDOWN || 25;
    if (now - window.lastClickTime < cooldown) {
        console.log('⏳ Кулдаун');
        return;
    }
    
    // Проверяем автокликер
    if (checkAutoClick()) {
        return;
    }
    
    window.lastClickTime = now;
    
    // Вычисляем силу клика
    const clickPower = calculateClickPower();
    
    // Обновляем данные пользователя
    if (window.userData) {
        window.userData.balance = (window.userData.balance || 0) + clickPower;
        window.userData.totalEarned = (window.userData.totalEarned || 0) + clickPower;
        window.userData.totalClicks = (window.userData.totalClicks || 0) + 1;
        window.userData.lastUpdate = Date.now();
    }
    
    // Создаем попап
    createClickPopup(event, clickPower);
    
    // Анимация монетки
    const coin = document.getElementById('clickCoin');
    if (coin) {
        coin.classList.add('cooldown');
        setTimeout(() => {
            coin.classList.remove('cooldown');
        }, cooldown);
    }
    
    // Обновляем интерфейс и сохраняем
    updateUI();
    saveUserData();
}

function createClickPopup(event, amount) {
    const popup = document.createElement('div');
    popup.className = 'click-popup';
    popup.textContent = '+' + amount.toFixed(9);
    
    // Позиционируем попап
    const rect = event.target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    
    // Добавляем в монетку
    const coin = document.getElementById('clickCoin');
    if (coin) {
        coin.appendChild(popup);
    }
    
    // Удаляем через секунду
    setTimeout(() => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    }, 1000);
}

function buyUpgrade(upgradeType) {
    // Проверяем наличие данных
    if (!window.upgrades || !window.upgrades[upgradeType] || !window.userData) {
        showGameNotification('Ошибка покупки улучшения', 'error');
        return;
    }
    
    const upgrade = window.upgrades[upgradeType];
    const currentLevel = upgrade.level || 0;
    const currentPrice = upgrade.basePrice * Math.pow(1.59375, currentLevel);
    
    // Проверяем баланс
    if (window.userData.balance < currentPrice) {
        showGameNotification('Недостаточно средств', 'error');
        return;
    }
    
    // Покупаем улучшение
    window.userData.balance -= currentPrice;
    upgrade.level = currentLevel + 1;
    window.userData.lastUpdate = Date.now();
    
    // Обновляем интерфейс
    updateUI();
    updateShopUI();
    saveUserData();
    
    showGameNotification(`${upgrade.name} куплено! Уровень ${upgrade.level}`, 'success');
}

function updateShopUI() {
    // Проверяем наличие улучшений
    if (!window.upgrades) return;
    
    // Обновляем каждый элемент улучшения
    for (const upgradeKey in window.upgrades) {
        const upgrade = window.upgrades[upgradeKey];
        if (!upgrade) continue;
        
        const currentLevel = upgrade.level || 0;
        const currentPrice = upgrade.basePrice * Math.pow(1.59375, currentLevel);
        
        // Обновляем отображение количества
        const ownedElement = document.getElementById(upgradeKey + '-owned');
        if (ownedElement) {
            ownedElement.textContent = currentLevel;
        }
        
        // Обновляем цену
        const priceElement = document.getElementById(upgradeKey + '-price');
        if (priceElement) {
            priceElement.textContent = currentPrice.toFixed(9);
        }
        
        // Обновляем кнопку покупки
        const button = document.querySelector(`button[onclick="buyUpgrade('${upgradeKey}')"]`);
        if (button) {
            const canAfford = window.userData && window.userData.balance >= currentPrice;
            button.disabled = !canAfford;
        }
    }
}

function updateUI() {
    try {
        // Проверяем наличие userData
        if (!window.userData) {
            console.warn('⚠️ userData не определен в updateUI');
            updateElement('balanceValue', '0.000000100 S');
            updateElement('clickValue', '0.000000001');
            updateElement('clickSpeed', '0.000000001 S/сек');
            updateElement('mineSpeed', '0.000000000 S/сек');
            return;
        }

        // Вычисляем прошедшее время
        const currentTime = Date.now();
        const elapsedSeconds = (currentTime - (window.lastUpdateTime || currentTime)) / 1000;
        
        // Пассивный доход от майнинга
        const miningSpeed = calculateMiningSpeed();
        window.accumulatedIncome = (window.accumulatedIncome || 0) + miningSpeed * elapsedSeconds;
        
        // Начисляем накопленный доход если достаточно
        if (window.accumulatedIncome >= 0.000000001) {
            window.userData.balance += window.accumulatedIncome;
            window.userData.totalEarned += window.accumulatedIncome;
            window.userData.lastUpdate = currentTime;
            window.accumulatedIncome = 0;
            
            saveUserData();
        }
        
        window.lastUpdateTime = currentTime;
        
        // Вычисляем текущие значения
        const clickPower = calculateClickPower();
        
        // БЕЗОПАСНОЕ ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
        updateElement('balanceValue', (window.userData.balance || 0.000000100).toFixed(9) + ' S');
        updateElement('clickValue', clickPower.toFixed(9));
        updateElement('clickSpeed', clickPower.toFixed(9) + ' S/сек');
        updateElement('mineSpeed', miningSpeed.toFixed(9) + ' S/сек');
        
    } catch (error) {
        console.error('❌ Ошибка в updateUI:', error);
        // Аварийное обновление
        updateElement('balanceValue', '0.000000100 S');
        updateElement('clickValue', '0.000000001');
        updateElement('clickSpeed', '0.000000001 S/сек');
        updateElement('mineSpeed', '0.000000000 S/сек');
    }
}

// Вспомогательная функция для безопасного обновления элементов
function updateElement(elementId, text) {
    try {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    } catch (error) {
        console.error(`❌ Ошибка обновления элемента ${elementId}:`, error);
    }
}

function saveUserData() {
    try {
        // Проверяем наличие данных для сохранения
        if (!window.userData) {
            console.log('⚠️ Нет данных для сохранения');
            return;
        }
        
        window.userData.lastUpdate = Date.now();
        
        // Сохраняем в localStorage
        localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
        
        // Сохраняем улучшения
        if (window.upgrades) {
            const upgradesData = {};
            for (const key in window.upgrades) {
                if (window.upgrades[key]) {
                    upgradesData[key] = window.upgrades[key].level || 0;
                }
            }
            localStorage.setItem('sparkcoin_upgrades_' + window.userData.userId, JSON.stringify(upgradesData));
        }
        
        console.log('💾 Данные сохранены');
        
        // Пытаемся сохранить на API если функция доступна
        if (typeof saveUserDataToAPI === 'function') {
            try {
                saveUserDataToAPI();
            } catch (apiError) {
                console.log('⚠️ Ошибка сохранения на API:', apiError);
            }
        }
        
    } catch (error) {
        console.error('❌ Критическая ошибка сохранения:', error);
    }
}

// Функция для показа уведомлений в игре
function showGameNotification(message, type = 'info') {
    if (typeof showNotification === 'function') {
        showNotification(message, type);
    } else {
        // Простая реализация если основной функции нет
        console.log(`🔔 ${type}: ${message}`);
        
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#FF9800' : '#2196F3'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// ==================== ИНИЦИАЛИЗАЦИЯ УЛУЧШЕНИЙ ====================

function initializeUpgrades() {
    try {
        // Используем UPGRADES из config.js или создаем базовые
        if (typeof UPGRADES !== 'undefined') {
            window.upgrades = JSON.parse(JSON.stringify(UPGRADES));
            console.log('✅ Улучшения загружены из config.js');
        } else {
            // Создаем базовые улучшения если UPGRADES не определен
            window.upgrades = {
                gpu1: { 
                    name: "Интегрированная видеокарта", 
                    basePrice: 0.000000016, 
                    baseBonus: 0.000000001, 
                    level: 0, 
                    type: 'mining' 
                },
                gpu2: { 
                    name: "Видеокарта-затычка", 
                    basePrice: 0.000000256, 
                    baseBonus: 0.000000008, 
                    level: 0, 
                    type: 'mining' 
                },
                cpu1: { 
                    name: "Обычный процессор", 
                    basePrice: 0.000000032, 
                    baseBonus: 0.000000001, 
                    level: 0, 
                    type: 'mining' 
                },
                mouse1: { 
                    name: "Обычная мышка", 
                    basePrice: 0.000000064, 
                    baseBonus: 0.000000004, 
                    level: 0, 
                    type: 'click' 
                },
                mouse2: { 
                    name: "Мышка с автокликером", 
                    basePrice: 0.000001024, 
                    baseBonus: 0.000000008, 
                    level: 0, 
                    type: 'click' 
                }
            };
            console.log('✅ Созданы базовые улучшения');
        }
        
        // Загружаем сохраненные уровни улучшений
        loadUpgradeLevels();
        
    } catch (error) {
        console.error('❌ Ошибка инициализации улучшений:', error);
    }
}

function loadUpgradeLevels() {
    try {
        if (!window.userData || !window.userData.userId) return;
        
        const savedUpgrades = localStorage.getItem('sparkcoin_upgrades_' + window.userData.userId);
        if (savedUpgrades) {
            const upgradesData = JSON.parse(savedUpgrades);
            for (const key in upgradesData) {
                if (window.upgrades[key]) {
                    window.upgrades[key].level = upgradesData[key] || 0;
                }
            }
            console.log('✅ Уровни улучшений загружены');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки уровней улучшений:', error);
    }
}

// ==================== ЗАГРУЗКА ДАННЫХ ====================

function loadGameData() {
    try {
        // Загружаем данные пользователя
        const savedData = localStorage.getItem('sparkcoin_user_data');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            window.userData = { ...window.userData, ...parsedData };
            console.log('✅ Данные игры загружены');
        }
        
        // Инициализируем улучшения
        initializeUpgrades();
        
        // Обновляем интерфейс
        setTimeout(() => {
            updateUI();
            updateShopUI();
        }, 100);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных игры:', error);
    }
}

// ==================== АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ ====================

// Запускаем когда DOM готов
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 DOM загружен, инициализируем игру...');
        setTimeout(loadGameData, 500);
    });
} else {
    console.log('⚡ Страница уже загружена, инициализируем игру...');
    setTimeout(loadGameData, 500);
}

// Добавляем CSS для анимаций если нужно
if (!document.querySelector('#game-styles')) {
    const style = document.createElement('style');
    style.id = 'game-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}

console.log('🎮 Game.js полностью загружен и готов к работе!');
