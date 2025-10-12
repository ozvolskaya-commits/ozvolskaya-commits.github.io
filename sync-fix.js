// sync-fix.js - дополнительный фикс синхронизации
console.log('🔗 Дополнительный фикс синхронизации...');

// Переопределяем функцию получения userID для единообразия
window.getUnifiedUserId = function() {
    if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user?.id) {
        return `tg_${Telegram.WebApp.initDataUnsafe.user.id}`;
    }
    
    let unifiedId = localStorage.getItem('sparkcoin_unified_user_id');
    if (!unifiedId) {
        unifiedId = 'web_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('sparkcoin_unified_user_id', unifiedId);
    }
    return unifiedId;
};

console.log('✅ Дополнительный фикс синхронизации загружен!');
