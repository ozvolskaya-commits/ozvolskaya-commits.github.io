// api-fix.js - фикс для всех отсутствующих API функций
console.log('🔧 Загружаем API фикс...');

// Создаем все отсутствующие функции
if (typeof window.checkApiConnection === 'undefined') {
    window.checkApiConnection = function() {
        console.log('📡 checkApiConnection (заглушка)');
        return true;
    };
}

if (typeof window.saveUserDataToAPI === 'undefined') {
    window.saveUserDataToAPI = function() {
        console.log('💾 saveUserDataToAPI (заглушка)');
        return Promise.resolve(true);
    };
}

if (typeof window.syncPlayerDataWithAPI === 'undefined') {
    window.syncPlayerDataWithAPI = function() {
        console.log('🔄 syncPlayerDataWithAPI (заглушка)');
        return Promise.resolve(true);
    };
}

if (typeof window.loadAllPlayers === 'undefined') {
    window.loadAllPlayers = function() {
        console.log('👥 loadAllPlayers (заглушка)');
    };
}

if (typeof window.saveAllPlayers === 'undefined') {
    window.saveAllPlayers = function() {
        console.log('💾 saveAllPlayers (заглушка)');
    };
}

if (typeof window.startLotteryAutoUpdate === 'undefined') {
    window.startLotteryAutoUpdate = function() {
        console.log('🎰 startLotteryAutoUpdate (заглушка)');
    };
}

if (typeof window.startClassicLotteryUpdate === 'undefined') {
    window.startClassicLotteryUpdate = function() {
        console.log('🎲 startClassicLotteryUpdate (заглушка)');
    };
}

if (typeof window.loadReferralStats === 'undefined') {
    window.loadReferralStats = function() {
        console.log('👥 loadReferralStats (заглушка)');
    };
}

// Функции для уведомлений
if (typeof window.showNotification === 'undefined') {
    window.showNotification = function(message, type = 'info') {
        console.log('🔔 ' + type + ': ' + message);
    };
}

console.log('✅ API фикс загружен! Все функции определены.');
