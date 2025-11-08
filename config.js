// config.js - полная конфигурация Sparkcoin
console.log('⚙️ Загружаем конфигурацию Sparkcoin...');

window.CONFIG = {
    // Основные настройки API
    API_BASE_URL: 'https://b9339c3b-8a22-434d-b97a-a426ac75c328-00-2vzfhw3hnozb6.sisko.replit.dev',
    
    // Настройки игры
    GAME_CONFIG: {
        BASE_CLICK_VALUE: 0.000000001,
        BASE_MINING_SPEED: 0.000000000,
        CLICK_COOLDOWN: 100,
        ANTI_CHEAT_CLICKS: 20,
        ANTI_CHEAT_WINDOW: 2000,
        ANTI_CHEAT_BLOCK_TIME: 30000,
        INCOME_INTERVAL: 1000,
        SAVE_INTERVAL: 30000,
        MAX_CLICKS_PER_SECOND: 15
    },
    
    // Настройки улучшений
    UPGRADES_CONFIG: {
        PRICE_GROWTH: 2.0,
        MAX_LEVEL: 100,
        CATEGORIES: {
            CLICK: 'click',
            MINING: 'mining'
        }
    },
    
    // Настройки лотерей
    LOTTERY_CONFIG: {
        TEAM_TIMER: 60,
        CLASSIC_TIMER: 120,
        WIN_PERCENTAGE: 0.9, // 90% банка победителю
        MIN_BET: 0.000000001
    },
    
    // Настройки реферальной системы
    REFERRAL_CONFIG: {
        EARNINGS_PERCENT: 0.05, // 5% от заработка реферала
        BET_PERCENT: 0.01,      // 1% от ставок реферала
        BONUS_PERCENT: 0.10,    // 10% бонус новому игроку
        CODE_LENGTH: 8
    },
    
    // Настройки перевода
    TRANSFER_CONFIG: {
        MIN_AMOUNT: 0.000000001,
        FEE_PERCENT: 0.0, // 0% комиссия
        DAILY_LIMIT: 1.000000000
    },
    
    // Настройки UI
    UI_CONFIG: {
        ANIMATION_DURATION: 300,
        NOTIFICATION_DURATION: 3000,
        AUTO_SAVE_DELAY: 5000,
        SYNC_INTERVAL: 30000
    },
    
    // Настройки мультисессии
    SESSION_CONFIG: {
        TIMEOUT: 10000,
        CHECK_INTERVAL: 5000,
        MAX_SESSIONS: 1
    }
};

// Конфигурация улучшений
window.UPGRADES = {
    gpu1: { name: "Интегрированная видеокарта", basePrice: 0.000000016, baseBonus: 0.000000001, type: "mining" },
    gpu2: { name: "Видеокарта-затычка", basePrice: 0.000000256, baseBonus: 0.000000008, type: "mining" },
    gpu3: { name: "Видеокарта Mining V100", basePrice: 0.000004096, baseBonus: 0.000000064, type: "mining" },
    gpu4: { name: "Супер мощная видеокарта Mining V1000", basePrice: 0.000065536, baseBonus: 0.000000512, type: "mining" },
    gpu5: { name: "Квантовая видеокарта Mining Q100", basePrice: 0.001048576, baseBonus: 0.000004096, type: "mining" },
    gpu6: { name: "Видеокарта Думатель 42", basePrice: 0.016777216, baseBonus: 0.000032768, type: "mining" },
    gpu7: { name: "Видеокарта Blue Earth 54", basePrice: 0.268435456, baseBonus: 0.000262144, type: "mining" },
    gpu8: { name: "Видеокарта Big Bang", basePrice: 4.294967296, baseBonus: 0.002097152, type: "mining" },

    cpu1: { name: "Обычный процессор", basePrice: 0.000000032, baseBonus: 0.000000001, type: "mining" },
    cpu2: { name: "Процессор Miner X100", basePrice: 0.000000512, baseBonus: 0.000000008, type: "mining" },
    cpu3: { name: "Супер процессор Miner X1000", basePrice: 0.000008192, baseBonus: 0.000000064, type: "mining" },
    cpu4: { name: "Квантовый процессор Miner X10000", basePrice: 0.000131072, baseBonus: 0.000000512, type: "mining" },
    cpu5: { name: "Кроховселенный процессор", basePrice: 0.002097152, baseBonus: 0.000004096, type: "mining" },
    cpu6: { name: "Минивселенный процессор", basePrice: 0.033554432, baseBonus: 0.000032768, type: "mining" },
    cpu7: { name: "Микровселенный процессор", basePrice: 0.536870912, baseBonus: 0.000262144, type: "mining" },
    cpu8: { name: "Мультивселенный процессор", basePrice: 8.589934592, baseBonus: 0.002097152, type: "mining" },

    mouse1: { name: "Обычная мышка", basePrice: 0.000000064, baseBonus: 0.000000004, type: "click" },
    mouse2: { name: "Мышка с автокликером", basePrice: 0.000001024, baseBonus: 0.000000008, type: "click" },
    mouse3: { name: "Мышка с макросами", basePrice: 0.000016384, baseBonus: 0.000000064, type: "click" },
    mouse4: { name: "Мышка программиста", basePrice: 0.000262144, baseBonus: 0.000000512, type: "click" },
    mouse5: { name: "Мышка Сатоси Накамото", basePrice: 0.004194304, baseBonus: 0.000004096, type: "click" },
    mouse6: { name: "Мышка хакера", basePrice: 0.067108864, baseBonus: 0.000032768, type: "click" },
    mouse7: { name: "Мышка Сноулена", basePrice: 1.073741824, baseBonus: 0.000262144, type: "click" },
    mouse8: { name: "Мышка Админа", basePrice: 17.179869184, baseBonus: 0.002097152, type: "click" }
};

// Утилитарные функции конфигурации
window.getUpgradePrice = function(upgradeId, currentLevel) {
    const upgrade = UPGRADES[upgradeId];
    if (!upgrade) return 0;
    return upgrade.basePrice * Math.pow(window.CONFIG.UPGRADES_CONFIG.PRICE_GROWTH, currentLevel);
};

window.getUpgradeBonus = function(upgradeId, currentLevel) {
    const upgrade = UPGRADES[upgradeId];
    if (!upgrade) return 0;
    return upgrade.baseBonus * currentLevel;
};

window.canAffordUpgrade = function(upgradeId, currentLevel, balance) {
    const price = window.getUpgradePrice(upgradeId, currentLevel);
    return balance >= price;
};

window.getCategoryUpgrades = function(category) {
    return Object.keys(UPGRADES).filter(key => key.startsWith(category));
};

// Функции для работы с игрой
window.formatBalance = function(balance) {
    return parseFloat(balance).toFixed(9) + ' S';
};

window.formatSpeed = function(speed) {
    return parseFloat(speed).toFixed(9) + ' S/сек';
};

window.calculateNetWinnings = function(winnings, losses) {
    return (parseFloat(winnings) - parseFloat(losses)).toFixed(9);
};

// Инициализация конфигурации
window.initializeConfig = function() {
    console.log('⚙️ Инициализация конфигурации Sparkcoin...');
    
    // Проверяем обязательные настройки
    if (!window.CONFIG.API_BASE_URL) {
        console.warn('⚠️ API_BASE_URL не настроен, используем офлайн режим');
        window.CONFIG.API_BASE_URL = 'http://localhost:5000';
    }
    
    // Инициализируем глобальные переменные если их нет
    if (typeof window.userData === 'undefined') {
        window.userData = null;
    }
    if (typeof window.upgrades === 'undefined') {
        window.upgrades = {};
    }
    if (typeof window.isDataLoaded === 'undefined') {
        window.isDataLoaded = false;
    }
    
    console.log('✅ Конфигурация Sparkcoin загружена');
};

// Автоматическая инициализация при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initializeConfig);
} else {
    window.initializeConfig();
}

console.log('✅ config.js загружен!');
