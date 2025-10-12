// upgrades-fix.js - исправление системы улучшений
console.log('🔧 Исправляем систему улучшений...');

// Исправляем структуру upgrades
function initializeUpgrades() {
    if (!window.upgrades) {
        window.upgrades = {};
    }
    
    // Инициализируем все улучшения с правильной структурой
    for (const upgradeId in UPGRADES) {
        if (UPGRADES.hasOwnProperty(upgradeId)) {
            // Если улучшение уже есть, но неправильной структуры
            if (window.upgrades[upgradeId] && typeof window.upgrades[upgradeId] === 'object') {
                // Уже правильная структура
                continue;
            }
            
            // Если есть число уровня, преобразуем в объект
            if (typeof window.upgrades[upgradeId] === 'number') {
                const level = window.upgrades[upgradeId];
                window.upgrades[upgradeId] = {
                    level: level,
                    basePrice: UPGRADES[upgradeId].basePrice,
                    baseBonus: UPGRADES[upgradeId].baseBonus
                };
            } else {
                // Создаем новое улучшение
                window.upgrades[upgradeId] = {
                    level: 0,
                    basePrice: UPGRADES[upgradeId].basePrice,
                    baseBonus: UPGRADES[upgradeId].baseBonus
                };
            }
        }
    }
    
    console.log('✅ Улучшения инициализированы:', window.upgrades);
}

// Исправленная функция покупки улучшений
function buyUpgradeFixed(upgradeId) {
    if (!window.userData || !UPGRADES[upgradeId]) {
        showNotification('Ошибка данных', 'error');
        return;
    }
    
    // Убеждаемся, что улучшение инициализировано
    if (!window.upgrades[upgradeId]) {
        window.upgrades[upgradeId] = {
            level: 0,
            basePrice: UPGRADES[upgradeId].basePrice,
            baseBonus: UPGRADES[upgradeId].baseBonus
        };
    }
    
    const upgrade = UPGRADES[upgradeId];
    const currentLevel = window.upgrades[upgradeId].level || 0;
    const price = upgrade.basePrice * Math.pow(2, currentLevel);
    
    console.log(`🛒 Покупка ${upgradeId}: уровень ${currentLevel}, цена ${price}`);
    
    if (window.userData.balance >= price) {
        window.userData.balance -= price;
        window.upgrades[upgradeId].level = currentLevel + 1;
        
        updateUI();
        updateShopUIFixed();
        saveUserData();
        
        showNotification(`Улучшение "${upgrade.name}" куплено! Уровень: ${currentLevel + 1}`, 'success');
    } else {
        showNotification('Недостаточно средств', 'error');
    }
}

// Исправленное обновление магазина
function updateShopUIFixed() {
    console.log('🛍️ Обновление интерфейса магазина...');
    
    for (const upgradeId in UPGRADES) {
        const upgrade = UPGRADES[upgradeId];
        
        // Убеждаемся, что данные улучшения существуют
        if (!window.upgrades[upgradeId]) {
            window.upgrades[upgradeId] = {
                level: 0,
                basePrice: upgrade.basePrice,
                baseBonus: upgrade.baseBonus
            };
        }
        
        const currentLevel = window.upgrades[upgradeId].level || 0;
        const price = upgrade.basePrice * Math.pow(2, currentLevel);
        
        console.log(`📊 ${upgradeId}: уровень ${currentLevel}, цена ${price}`);
        
        // Обновляем элементы интерфейса
        const ownedElement = document.getElementById(upgradeId + '-owned');
        const priceElement = document.getElementById(upgradeId + '-price');
        
        if (ownedElement) {
            ownedElement.textContent = currentLevel;
            console.log(`✅ Обновлен ${upgradeId}-owned: ${currentLevel}`);
        }
        
        if (priceElement) {
            priceElement.textContent = price.toFixed(9);
            console.log(`✅ Обновлен ${upgradeId}-price: ${price.toFixed(9)}`);
        }
        
        // Обновляем кнопку покупки
        const buyButton = document.querySelector(`[onclick="buyUpgrade('${upgradeId}')"]`);
        if (buyButton) {
            if (window.userData && window.userData.balance >= price) {
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

// Переопределяем старые функции
window.buyUpgrade = buyUpgradeFixed;
window.updateShopUI = updateShopUIFixed;

// Исправленная функция расчета силы клика
function calculateClickPowerFixed() {
    let power = 0.000000001;
    
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

// Исправленная функция скорости майнинга
function calculateMiningSpeedFixed() {
    let speed = 0.000000000;
    
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

// Переопределяем функции расчета
window.calculateClickPower = calculateClickPowerFixed;
window.calculateMiningSpeed = calculateMiningSpeedFixed;

// Запускаем инициализацию при загрузке
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeUpgrades();
        updateShopUIFixed();
    }, 1000);
});

console.log('✅ Система улучшений исправлена!');
