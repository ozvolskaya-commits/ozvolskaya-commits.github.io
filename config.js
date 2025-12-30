// config.js - ОПТИМИЗИРОВАННАЯ КОНФИГУРАЦИЯ
console.log('⚙️ Загружаем оптимизированную конфигурацию...');

window.CONFIG = {
    API_BASE_URL: 'https://b9339c3b-8a22-434d-b97a-a426ac75c328-00-2vzfhw3hnozb6.sisko.replit.dev',
    
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
    
    UPGRADES_CONFIG: {
        PRICE_GROWTH: 2.0,
        MAX_LEVEL: 100,
        CATEGORIES: {
            CLICK: 'click',
            MINING: 'mining'
        }
    },
    
    LOTTERY_CONFIG: {
        TEAM_TIMER: 60,
        CLASSIC_TIMER: 120,
        WIN_PERCENTAGE: 0.9,
        MIN_BET: 0.000000001
    },
    
    REFERRAL_CONFIG: {
        EARNINGS_PERCENT: 0.05,
        BET_PERCENT: 0.01,
        BONUS_PERCENT: 0.10,
        CODE_LENGTH: 8,
        BOT_LINK: 'https://t.me/bytecoinbeta_bot'
    },
    
    TRANSFER_CONFIG: {
        MIN_AMOUNT: 0.000000001,
        FEE_PERCENT: 0.0,
        DAILY_LIMIT: 1.000000000
    },
    
    UI_CONFIG: {
        ANIMATION_DURATION: 300,
        NOTIFICATION_DURATION: 3000,
        AUTO_SAVE_DELAY: 5000,
        SYNC_INTERVAL: 30000
    },
    
    SESSION_CONFIG: {
        TIMEOUT: 10000,
        CHECK_INTERVAL: 5000,
        MAX_SESSIONS: 1
    }
};

// ========== УЛУЧШЕНИЯ С МНОГОЯЗЫЧНОСТЬЮ ==========
window.UPGRADES = {
    gpu1: { name: "Интегрированная видеокарта", name_en: "Integrated Graphics Card", basePrice: 0.000000016, baseBonus: 0.000000001, type: "mining" },
    gpu2: { name: "Видеокарта-затычка", name_en: "Basic Graphics Card", basePrice: 0.000000256, baseBonus: 0.000000008, type: "mining" },
    gpu3: { name: "Видеокарта Mining V100", name_en: "Mining V100 Graphics Card", basePrice: 0.000004096, baseBonus: 0.000000064, type: "mining" },
    gpu4: { name: "Супер мощная видеокарта Mining V1000", name_en: "Super Mining V1000 Graphics Card", basePrice: 0.000065536, baseBonus: 0.000000512, type: "mining" },
    gpu5: { name: "Квантовая видеокарта Mining Q100", name_en: "Quantum Mining Q100 Graphics Card", basePrice: 0.001048576, baseBonus: 0.000004096, type: "mining" },
    gpu6: { name: "Видеокарта Думатель 42", name_en: "Thinker 42 Graphics Card", basePrice: 0.016777216, baseBonus: 0.000032768, type: "mining" },
    gpu7: { name: "Видеокарта Blue Earth 54", name_en: "Blue Earth 54 Graphics Card", basePrice: 0.268435456, baseBonus: 0.000262144, type: "mining" },
    gpu8: { name: "Видеокарта Big Bang", name_en: "Big Bang Graphics Card", basePrice: 4.294967296, baseBonus: 0.002097152, type: "mining" },

    cpu1: { name: "Обычный процессор", name_en: "Standard Processor", basePrice: 0.000000032, baseBonus: 0.000000001, type: "mining" },
    cpu2: { name: "Процессор Miner X100", name_en: "Miner X100 Processor", basePrice: 0.000000512, baseBonus: 0.000000008, type: "mining" },
    cpu3: { name: "Супер процессор Miner X1000", name_en: "Super Miner X1000 Processor", basePrice: 0.000008192, baseBonus: 0.000000064, type: "mining" },
    cpu4: { name: "Квантовый процессор Miner X10000", name_en: "Quantum Miner X10000 Processor", basePrice: 0.000131072, baseBonus: 0.000000512, type: "mining" },
    cpu5: { name: "Кроховселенный процессор", name_en: "Microverse Processor", basePrice: 0.002097152, baseBonus: 0.000004096, type: "mining" },
    cpu6: { name: "Минивселенный процессор", name_en: "Miniverse Processor", basePrice: 0.033554432, baseBonus: 0.000032768, type: "mining" },
    cpu7: { name: "Микровселенный процессор", name_en: "Nanoverse Processor", basePrice: 0.536870912, baseBonus: 0.000262144, type: "mining" },
    cpu8: { name: "Мультивселенный процессор", name_en: "Multiverse Processor", basePrice: 8.589934592, baseBonus: 0.002097152, type: "mining" },

    mouse1: { name: "Обычная мышка", name_en: "Standard Mouse", basePrice: 0.000000064, baseBonus: 0.000000004, type: "click" },
    mouse2: { name: "Мышка с автокликером", name_en: "Auto-clicker Mouse", basePrice: 0.000001024, baseBonus: 0.000000008, type: "click" },
    mouse3: { name: "Мышка с макросами", name_en: "Macro Mouse", basePrice: 0.000016384, baseBonus: 0.000000064, type: "click" },
    mouse4: { name: "Мышка программиста", name_en: "Programmer's Mouse", basePrice: 0.000262144, baseBonus: 0.000000512, type: "click" },
    mouse5: { name: "Мышка Сатоси Накамото", name_en: "Satoshi Nakamoto Mouse", basePrice: 0.004194304, baseBonus: 0.000004096, type: "click" },
    mouse6: { name: "Мышка хакера", name_en: "Hacker's Mouse", basePrice: 0.067108864, baseBonus: 0.000032768, type: "click" },
    mouse7: { name: "Мышка Сноулена", name_en: "Snowden's Mouse", basePrice: 1.073741824, baseBonus: 0.000262144, type: "click" },
    mouse8: { name: "Мышка Админа", name_en: "Admin's Mouse", basePrice: 17.179869184, baseBonus: 0.002097152, type: "click" }
};

// ========== УТИЛИТЫ КОНФИГУРАЦИИ ==========
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

window.getUpgradeName = function(upgradeId, language = 'ru') {
    const upgrade = UPGRADES[upgradeId];
    if (!upgrade) return '';
    
    if (language === 'en' && upgrade.name_en) {
        return upgrade.name_en;
    }
    return upgrade.name;
};

// ========== ФОРМАТИРОВАНИЕ ==========
window.formatBalance = function(balance) {
    return parseFloat(balance).toFixed(9) + ' S';
};

window.formatSpeed = function(speed) {
    return parseFloat(speed).toFixed(9) + ' S/сек';
};

window.calculateNetWinnings = function(winnings, losses) {
    return (parseFloat(winnings) - parseFloat(losses)).toFixed(9);
};

// ========== ФУНКЦИИ ЯЗЫКА ==========
window.getCurrentLanguage = function() {
    return window.CURRENT_LANG || 'ru';
};

window.setLanguage = function(lang) {
    if (['ru', 'en'].includes(lang)) {
        window.CURRENT_LANG = lang;
        localStorage.setItem('sparkcoin_language', lang);
        return true;
    }
    return false;
};

// ========== РЕФЕРАЛЬНЫЕ ФУНКЦИИ ==========
window.generateReferralLink = function(userId) {
    const code = userId ? `REF-${userId.slice(-8).toUpperCase()}` : 'REF-DEFAULT';
    return `https://t.me/bytecoinbeta_bot?start=${code}`;
};

window.getReferralBonus = function(amount, type = 'earnings') {
    const config = window.CONFIG.REFERRAL_CONFIG;
    switch(type) {
        case 'earnings':
            return amount * config.EARNINGS_PERCENT;
        case 'bet':
            return amount * config.BET_PERCENT;
        case 'bonus':
            return amount * config.BONUS_PERCENT;
        default:
            return 0;
    }
};

// ========== ИНИЦИАЛИЗАЦИЯ ==========
window.initializeConfig = function() {
    if (!window.CONFIG.API_BASE_URL) {
        window.CONFIG.API_BASE_URL = 'http://localhost:5000';
    }
    
    if (typeof window.userData === 'undefined') {
        window.userData = null;
    }
    if (typeof window.upgrades === 'undefined') {
        window.upgrades = {};
    }
    if (typeof window.isDataLoaded === 'undefined') {
        window.isDataLoaded = false;
    }
    
    const savedLang = localStorage.getItem('sparkcoin_language');
    if (savedLang && ['ru', 'en'].includes(savedLang)) {
        window.CURRENT_LANG = savedLang;
    } else if (navigator.language.startsWith('en')) {
        window.CURRENT_LANG = 'en';
    } else {
        window.CURRENT_LANG = 'ru';
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initializeConfig);
} else {
    window.initializeConfig();
}

console.log('✅ Оптимизированная конфигурация загружена!');
