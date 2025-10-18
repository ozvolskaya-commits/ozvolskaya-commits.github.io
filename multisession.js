// multisession.js - УСИЛЕННАЯ система блокировки мультисессий
console.log('🔍 Загружаем УСИЛЕННУЮ систему блокировки мультисессий...');

class MultiSessionDetector {
    constructor() {
        this.sessionKey = 'sparkcoin_device_session';
        this.syncKey = 'sparkcoin_sync_data';
        this.activityKey = 'sparkcoin_last_activity';
        this.blockedKey = 'sparkcoin_blocked_session';
        this.telegramKey = 'sparkcoin_telegram_user';
        this.checkInterval = null;
        this.isMonitoring = false;
        this.lastBlockTime = 0;
        this.blockTimeout = 30000; // 30 секунд блокировки
    }
    
    // Генерируем уникальный ID устройства
    generateDeviceId() {
        let deviceId = localStorage.getItem('sparkcoin_device_id');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('sparkcoin_device_id', deviceId);
        }
        return deviceId;
    }
    
    // Получаем Telegram username
    getTelegramUsername() {
        if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user) {
            const user = Telegram.WebApp.initDataUnsafe.user;
            if (user.username) {
                return '@' + user.username;
            } else if (user.first_name) {
                return user.first_name;
            } else if (user.id) {
                return 'user_' + user.id;
            }
        }
        
        // Для веб-версии
        return localStorage.getItem('sparkcoin_web_username') || 'web_user';
    }
    
    // Получаем Telegram ID
    getTelegramId() {
        if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user?.id) {
            return Telegram.WebApp.initDataUnsafe.user.id.toString();
        }
        return null;
    }
    
    // ЖЕСТКАЯ ПРОВЕРКА МУЛЬТИСЕССИИ ПРИ ЗАГРУЗКЕ
    async checkMultiSessionOnLoad() {
        try {
            const currentDevice = this.generateDeviceId();
            const telegramId = this.getTelegramId();
            const username = this.getTelegramUsername();
            
            if (!telegramId) {
                console.log('ℹ️ Telegram ID не найден, пропускаем проверку');
                return true; // Разрешаем доступ для веб-версии
            }
            
            console.log('🔍 Проверка мультисессии для:', { telegramId, username, currentDevice });
            
            // Проверяем, не заблокирована ли текущая сессия
            const blockedSession = localStorage.getItem(this.blockedKey);
            if (blockedSession === currentDevice) {
                console.log('🚫 Сессия заблокирована, перенаправляем...');
                this.redirectToBlockPage();
                return false;
            }
            
            // Проверяем мультисессию через сервер
            const sessionCheck = await this.checkServerSession(telegramId, currentDevice, username);
            
            if (!sessionCheck.allowed) {
                console.log('🚫 Сервер заблокировал доступ из-за мультисессии');
                this.blockCurrentSession();
                this.redirectToBlockPage();
                return false;
            }
            
            // Если есть активная сессия на другом устройстве
            if (sessionCheck.activeSession && sessionCheck.activeSession.deviceId !== currentDevice) {
                console.log('🚫 Обнаружена активная сессия на другом устройстве');
                this.blockCurrentSession();
                this.redirectToBlockPage();
                return false;
            }
            
            // Обновляем сессию
            this.updateSession(telegramId, currentDevice, username);
            
            console.log('✅ Доступ разрешен');
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка проверки мультисессии:', error);
            return true; // В случае ошибки разрешаем доступ
        }
    }
    
    // Проверка сессии на сервере
    async checkServerSession(telegramId, deviceId, username) {
        try {
            const response = await fetch('https://sparkcoin.ru/api/session/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    telegramId: telegramId,
                    deviceId: deviceId,
                    username: username
                })
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.log('📴 Сервер недоступен, используем локальную проверку');
        }
        
        // Fallback: локальная проверка
        return this.checkLocalSession(telegramId, deviceId);
    }
    
    // Локальная проверка сессии
    checkLocalSession(telegramId, deviceId) {
        const lastSync = JSON.parse(localStorage.getItem(this.syncKey) || '{}');
        const currentTime = Date.now();
        
        // Если есть активная сессия (менее 15 секунд) и устройство другое
        if (lastSync.telegramId === telegramId && 
            lastSync.deviceId && 
            lastSync.deviceId !== deviceId &&
            currentTime - lastSync.timestamp < 15000) {
            
            return {
                allowed: false,
                activeSession: {
                    deviceId: lastSync.deviceId,
                    username: lastSync.username
                }
            };
        }
        
        return { allowed: true };
    }
    
    // Блокировка текущей сессии
    blockCurrentSession() {
        const currentDevice = this.generateDeviceId();
        localStorage.setItem(this.blockedKey, currentDevice);
        this.lastBlockTime = Date.now();
        
        // Авторазблокировка через 30 секунд
        setTimeout(() => {
            localStorage.removeItem(this.blockedKey);
        }, this.blockTimeout);
    }
    
    // ПЕРЕНАПРАВЛЕНИЕ НА СТРАНИЦУ БЛОКИРОВКИ
    redirectToBlockPage() {
        // Сохраняем текущий URL для возврата
        sessionStorage.setItem('original_url', window.location.href);
        
        // Перенаправляем на страницу блокировки
        setTimeout(() => {
            window.location.href = 'multisession-blocked.html';
        }, 1000);
    }
    
    // Обновляем данные сессии
    updateSession(telegramId, deviceId, username) {
        try {
            const sessionData = {
                telegramId: telegramId,
                deviceId: deviceId,
                username: username,
                timestamp: Date.now(),
                userAgent: navigator.userAgent.substring(0, 100)
            };
            
            localStorage.setItem(this.syncKey, JSON.stringify(sessionData));
            localStorage.setItem(this.activityKey, Date.now().toString());
            localStorage.setItem(this.telegramKey, telegramId);
            
        } catch (error) {
            console.error('❌ Ошибка обновления сессии:', error);
        }
    }
    
    // Запуск мониторинга
    startMonitoring() {
        if (this.isMonitoring) return;
        
        console.log('🔍 Запуск мониторинга мультисессий...');
        
        // Проверяем каждые 5 секунд
        this.checkInterval = setInterval(() => {
            this.checkActiveSession();
        }, 5000);
        
        // Обновляем сессию при активности пользователя
        const activityEvents = ['click', 'keypress', 'mousemove', 'touchstart', 'scroll'];
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.updateActivity();
            }, { passive: true });
        });
        
        this.isMonitoring = true;
    }
    
    // Проверка активной сессии
    async checkActiveSession() {
        const telegramId = this.getTelegramId();
        const deviceId = this.generateDeviceId();
        
        if (!telegramId) return;
        
        try {
            const sessionCheck = await this.checkServerSession(telegramId, deviceId, this.getTelegramUsername());
            
            if (!sessionCheck.allowed) {
                console.log('🚫 Обнаружена мультисессия во время работы');
                this.blockCurrentSession();
                this.redirectToBlockPage();
                return;
            }
            
            // Обновляем сессию
            this.updateSession(telegramId, deviceId, this.getTelegramUsername());
            
        } catch (error) {
            console.log('📴 Ошибка проверки сессии');
        }
    }
    
    // Обновление активности
    updateActivity() {
        localStorage.setItem(this.activityKey, Date.now().toString());
    }
    
    // Останавливаем мониторинг
    stopMonitoring() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isMonitoring = false;
        console.log('🛑 Мониторинг мультисессий остановлен');
    }
    
    // Получаем статус мультисессии
    getStatus() {
        const lastSync = JSON.parse(localStorage.getItem(this.syncKey) || '{}');
        const currentDevice = this.generateDeviceId();
        const isBlocked = localStorage.getItem(this.blockedKey) === currentDevice;
        
        return {
            isBlocked: isBlocked,
            currentDevice: currentDevice,
            telegramId: lastSync.telegramId,
            lastDevice: lastSync.deviceId,
            lastActivity: lastSync.timestamp ? new Date(lastSync.timestamp) : null
        };
    }
}

// Инициализация системы мультисессий
window.multiSessionDetector = new MultiSessionDetector();

// АВТОМАТИЧЕСКАЯ ПРОВЕРКА ПРИ ЗАГРУЗКЕ
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async function() {
        console.log('🔍 Запуск проверки мультисессии при загрузке...');
        
        const allowed = await window.multiSessionDetector.checkMultiSessionOnLoad();
        
        if (!allowed) {
            return; // Доступ запрещен, страница будет перенаправлена
        }
        
        // Если доступ разрешен, запускаем мониторинг
        setTimeout(() => {
            window.multiSessionDetector.startMonitoring();
        }, 2000);
    });
} else {
    setTimeout(async () => {
        const allowed = await window.multiSessionDetector.checkMultiSessionOnLoad();
        if (allowed) {
            window.multiSessionDetector.startMonitoring();
        }
    }, 2000);
}

console.log('✅ УСИЛЕННАЯ система блокировки мультисессий загружена!');
