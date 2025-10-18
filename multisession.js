// multisession-hard-fix.js - ЖЕСТКАЯ блокировка мультисессии
console.log('🔒 ЗАГРУЖАЕМ ЖЕСТКУЮ БЛОКИРОВКУ МУЛЬТИСЕССИИ...');

class HardSessionBlocker {
    constructor() {
        this.sessionKey = 'sparkcoin_hard_session';
        this.blockKey = 'sparkcoin_hard_blocked';
        this.lastActivityKey = 'sparkcoin_last_activity_hard';
        this.checkInterval = null;
    }

    // Генерируем SUPER-уникальный ID устройства
    generateSuperDeviceId() {
        let deviceId = localStorage.getItem('sparkcoin_super_device_id');
        if (!deviceId) {
            const userAgent = navigator.userAgent;
            const platform = navigator.platform;
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            deviceId = btoa(`${userAgent}-${platform}-${timezone}-${Date.now()}-${Math.random()}`).substring(0, 32);
            localStorage.setItem('sparkcoin_super_device_id', deviceId);
        }
        return deviceId;
    }

    // ЖЕСТКАЯ проверка при загрузке
    checkHardSessionOnLoad() {
        const currentDevice = this.generateSuperDeviceId();
        const telegramId = this.getTelegramId();
        
        console.log('🔍 ЖЕСТКАЯ ПРОВЕРКА СЕССИИ:', { telegramId, currentDevice });

        if (!telegramId) {
            console.log('ℹ️ Нет Telegram ID, пропускаем проверку');
            return true;
        }

        // Проверяем блокировку
        const blockedDevice = localStorage.getItem(this.blockKey);
        if (blockedDevice && blockedDevice !== currentDevice) {
            console.log('🚫 СЕССИЯ ЗАБЛОКИРОВАНА! Перенаправляем...');
            this.redirectToHardBlock();
            return false;
        }

        // Обновляем активную сессию
        this.updateHardSession(telegramId, currentDevice);
        return true;
    }

    // Обновляем сессию (ТОЛЬКО ОДНА АКТИВНАЯ)
    updateHardSession(telegramId, deviceId) {
        const sessionData = {
            telegramId: telegramId,
            deviceId: deviceId,
            timestamp: Date.now(),
            userAgent: navigator.userAgent
        };
        
        localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
        localStorage.setItem(this.lastActivityKey, Date.now().toString());
        
        console.log('✅ СЕССИЯ ОБНОВЛЕНА:', deviceId);
    }

    // Получаем Telegram ID
    getTelegramId() {
        if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user?.id) {
            return Telegram.WebApp.initDataUnsafe.user.id.toString();
        }
        return null;
    }

    // Мониторинг в реальном времени
    startHardMonitoring() {
        console.log('🔍 ЗАПУСК ЖЕСТКОГО МОНИТОРИНГА...');
        
        this.checkInterval = setInterval(() => {
            this.checkActiveSession();
        }, 3000);

        // Отслеживаем активность
        ['click', 'keypress', 'mousemove', 'touchstart', 'scroll'].forEach(event => {
            document.addEventListener(event, () => {
                this.updateActivity();
            }, { passive: true });
        });
    }

    checkActiveSession() {
        const currentSession = JSON.parse(localStorage.getItem(this.sessionKey) || '{}');
        const currentDevice = this.generateSuperDeviceId();
        
        if (currentSession.deviceId && currentSession.deviceId !== currentDevice) {
            console.log('🚫 ОБНАРУЖЕНА МУЛЬТИСЕССИЯ! Блокируем...');
            this.blockSession();
            this.redirectToHardBlock();
        }
    }

    blockSession() {
        const currentDevice = this.generateSuperDeviceId();
        localStorage.setItem(this.blockKey, currentDevice);
        
        // Авторазблокировка через 2 минуты
        setTimeout(() => {
            localStorage.removeItem(this.blockKey);
        }, 120000);
    }

    updateActivity() {
        localStorage.setItem(this.lastActivityKey, Date.now().toString());
    }

    redirectToHardBlock() {
        window.location.href = 'multisession-hard-block.html';
    }

    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
}

// Инициализация ЖЕСТКОЙ блокировки
window.hardSessionBlocker = new HardSessionBlocker();

// АВТОМАТИЧЕСКАЯ ПРОВЕРКА ПРИ ЗАГРУЗКЕ
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔒 ЗАПУСК ЖЕСТКОЙ ПРОВЕРКИ ПРИ ЗАГРУЗКЕ...');
    
    setTimeout(() => {
        const allowed = window.hardSessionBlocker.checkHardSessionOnLoad();
        if (allowed) {
            window.hardSessionBlocker.startHardMonitoring();
            console.log('✅ ЖЕСТКАЯ БЛОКИРОВКА АКТИВИРОВАНА');
        }
    }, 1000);
});
