// upgrades-fix.js - исправление системы улучшений с мультисессией
console.log('🔧 Исправляем систему улучшений...');

// Исправляем структуру upgrades
function initializeUpgrades() {
    if (!window.upgrades) {
        window.upgrades = {};
    }
    
    for (const upgradeId in UPGRADES) {
        if (UPGRADES.hasOwnProperty(upgradeId)) {
            if (!window.upgrades[upgradeId] || typeof window.upgrades[upgradeId] !== 'object') {
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
    
    // Проверяем мультисессию перед покупкой
    if (window.multiSessionDetector) {
        const status = window.multiSessionDetector.getStatus();
        if (status.isMultiSession && status.timeSinceLastActivity < 10000) {
            showNotification('Покупки временно недоступны из-за мультисессии', 'warning');
            return;
        }
    }
    
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
        
        // Обновляем синхронизацию после покупки
        if (window.multiSessionDetector) {
            window.multiSessionDetector.updateSync();
        }
        
        setTimeout(() => window.syncUserData(), 1000);
        
        showNotification(`Улучшение "${upgrade.name}" куплено! Уровень: ${currentLevel + 1}`, 'success');
    } else {
        showNotification('Недостаточно средств', 'error');
    }
}

// Исправленное обновление магазина
function updateShopUIFixed() {
    for (const upgradeId in UPGRADES) {
        const upgrade = UPGRADES[upgradeId];
        
        if (!window.upgrades[upgradeId]) {
            window.upgrades[upgradeId] = {
                level: 0,
                basePrice: upgrade.basePrice,
                baseBonus: upgrade.baseBonus
            };
        }
        
        const currentLevel = window.upgrades[upgradeId].level || 0;
        const price = upgrade.basePrice * Math.pow(2, currentLevel);
        
        const ownedElement = document.getElementById(upgradeId + '-owned');
        const priceElement = document.getElementById(upgradeId + '-price');
        
        if (ownedElement) ownedElement.textContent = currentLevel;
        if (priceElement) priceElement.textContent = price.toFixed(9);
        
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

// Исправленная функция расчета силы клика
function calculateClickPowerFixed() {
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

// РАСЧЕТ СКОРОСТИ МАЙНИНГА (полностью исправленная версия)
window.calculateMiningSpeed = function() {
    let speed = 0.000000000;
    
    if (!window.upgrades || !window.UPGRADES) return speed;
    
    try {
        // Проверяем GPU улучшения
        for (let i = 1; i <= 8; i++) {
            const gpuKey = `gpu${i}`;
            if (window.upgrades[gpuKey]) {
                const upgradeData = window.upgrades[gpuKey];
                const level = (upgradeData && typeof upgradeData.level !== 'undefined') ? upgradeData.level : 
                             (typeof upgradeData === 'number' ? upgradeData : 0);
                
                const upgrade = window.UPGRADES[gpuKey];
                if (upgrade && upgrade.baseBonus) {
                    speed += level * upgrade.baseBonus;
                }
            }
        }
        
        // Проверяем CPU улучшения
        for (let i = 1; i <= 8; i++) {
            const cpuKey = `cpu${i}`;
            if (window.upgrades[cpuKey]) {
                const upgradeData = window.upgrades[cpuKey];
                const level = (upgradeData && typeof upgradeData.level !== 'undefined') ? upgradeData.level : 
                             (typeof upgradeData === 'number' ? upgradeData : 0);
                
                const upgrade = window.UPGRADES[cpuKey];
                if (upgrade && upgrade.baseBonus) {
                    speed += level * upgrade.baseBonus;
                }
            }
        }
        
        // Гарантируем, что значение корректное
        if (isNaN(speed) || !isFinite(speed) || speed < 0) {
            speed = 0.000000000;
        }
        
    } catch (error) {
        console.error('❌ Критическая ошибка расчета скорости майнинга:', error);
        speed = 0.000000000;
    }
    
    console.log('⛏️ Рассчитанная скорость майнинга:', speed);
    return speed;
};

// Переопределяем старые функции
window.buyUpgrade = buyUpgradeFixed;
window.updateShopUI = updateShopUIFixed;
window.calculateClickPower = calculateClickPowerFixed;

// Запускаем инициализацию при загрузке
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeUpgrades();
        updateShopUIFixed();
    }, 1000);
});

console.log('✅ Система улучшений исправлена!');
