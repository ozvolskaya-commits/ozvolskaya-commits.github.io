// multisession-hard-fix.js - ЖЕСТКАЯ блокировка мультисессии
console.log('🔒 ЗАГРУЖАЕМ ЖЕСТКУЮ БЛОКИРОВКУ МУЛЬТИСЕССИИ...');

class HardSessionBlocker {
    constructor() {
        this.sessionKey = 'sparkcoin_hard_session';
        this.blockKey = 'sparkcoin_hard_blocked';
        this.lastActivityKey = 'sparkcoin_last_activity_hard';
        this.checkInterval = null;
        this.isBlocked = false;
    }

    // Генерируем SUPER-уникальный ID устройства
    generateSuperDeviceId() {
        let deviceId = localStorage.getItem('sparkcoin_super_device_id');
        if (!deviceId) {
            const userAgent = navigator.userAgent;
            const platform = navigator.platform;
            const language = navigator.language;
            deviceId = btoa(`${userAgent}-${platform}-${language}-${Date.now()}`).substring(0, 32);
            localStorage.setItem('sparkcoin_super_device_id', deviceId);
        }
        return deviceId;
    }

    // ЖЕСТКАЯ проверка при загрузке
    async checkHardSessionOnLoad() {
        const currentDevice = this.generateSuperDeviceId();
        const telegramId = this.getTelegramId();
        
        console.log('🔍 ЖЕСТКАЯ ПРОВЕРКА СЕССИИ:', { 
            telegramId, 
            currentDevice,
            hasTelegram: !!telegramId
        });

        if (!telegramId) {
            console.log('ℹ️ Нет Telegram ID, пропускаем проверку для веб-версии');
            return true;
        }

        // Проверяем блокировку в localStorage
        const blockedDevice = localStorage.getItem(this.blockKey);
        if (blockedDevice && blockedDevice !== currentDevice) {
            console.log('🚫 СЕССИЯ ЗАБЛОКИРОВАНА В LOCALSTORAGE!');
            this.showBlockMessage();
            return false;
        }

        // Проверяем на сервере
        try {
            const serverCheck = await this.checkServerSession(telegramId, currentDevice);
            if (!serverCheck.allowed) {
                console.log('🚫 СЕРВЕР ЗАБЛОКИРОВАЛ СЕССИЮ!');
                this.showBlockMessage();
                return false;
            }
        } catch (error) {
            console.log('📴 Сервер недоступен, продолжаем локально');
        }

        // Обновляем активную сессию
        this.updateHardSession(telegramId, currentDevice);
        return true;
    }

    // Проверка сессии на сервере
    async checkServerSession(telegramId, deviceId) {
        try {
            const response = await fetch('https://b9339c3b-8a22-434d-b97a-a426ac75c328-00-2vzfhw3hnozb6.sisko.replit.dev/api/session/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    telegramId: telegramId,
                    deviceId: deviceId,
                    username: this.getTelegramUsername()
                })
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.log('📴 Сервер проверки сессий недоступен');
        }
        
        // Fallback: локальная проверка
        return this.checkLocalSession(telegramId, deviceId);
    }

    // Локальная проверка сессии
    checkLocalSession(telegramId, deviceId) {
        const lastSession = JSON.parse(localStorage.getItem(this.sessionKey) || '{}');
        const currentTime = Date.now();
        
        // Если есть активная сессия (менее 15 секунд) и устройство другое - БЛОКИРУЕМ
        if (lastSession.telegramId === telegramId && 
            lastSession.deviceId && 
            lastSession.deviceId !== deviceId &&
            currentTime - lastSession.timestamp < 15000) {
            
            return {
                allowed: false,
                activeSession: {
                    deviceId: lastSession.deviceId,
                    username: lastSession.username
                }
            };
        }
        
        return { allowed: true };
    }

    // Обновляем сессию (ТОЛЬКО ОДНА АКТИВНАЯ)
    updateHardSession(telegramId, deviceId) {
        const sessionData = {
            telegramId: telegramId,
            deviceId: deviceId,
            username: this.getTelegramUsername(),
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

    getTelegramUsername() {
        if (typeof Telegram !== 'undefined' && Telegram.WebApp && Telegram.WebApp.initDataUnsafe?.user) {
            const user = Telegram.WebApp.initDataUnsafe.user;
            return user.username ? `@${user.username}` : user.first_name || 'Игрок';
        }
        return 'Веб-Игрок';
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

    async checkActiveSession() {
        const currentSession = JSON.parse(localStorage.getItem(this.sessionKey) || '{}');
        const currentDevice = this.generateSuperDeviceId();
        const telegramId = this.getTelegramId();
        
        if (!telegramId) return;
        
        // Проверяем на сервере
        try {
            const serverCheck = await this.checkServerSession(telegramId, currentDevice);
            if (!serverCheck.allowed) {
                console.log('🚫 ОБНАРУЖЕНА МУЛЬТИСЕССИЯ ВО ВРЕМЯ РАБОТЫ!');
                this.showBlockMessage();
                return;
            }
        } catch (error) {
            // Локальная проверка
            if (currentSession.deviceId && currentSession.deviceId !== currentDevice) {
                console.log('🚫 ОБНАРУЖЕНА МУЛЬТИСЕССИЯ! Блокируем...');
                this.showBlockMessage();
            }
        }
    }

    // Показываем сообщение о блокировке
    showBlockMessage() {
        if (this.isBlocked) return;
        
        this.isBlocked = true;
        
        const blockOverlay = document.createElement('div');
        blockOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.95);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(10px);
        `;
        
        blockOverlay.innerHTML = `
            <div style="
                background: linear-gradient(135deg, rgba(255, 0, 0, 0.2), rgba(255, 0, 0, 0.1));
                border-radius: 20px;
                padding: 30px;
                text-align: center;
                max-width: 400px;
                width: 90%;
                border: 2px solid rgba(255, 0, 0, 0.5);
                box-shadow: 0 20px 40px rgba(255, 0, 0, 0.4);
            ">
                <div style="font-size: 64px; margin-bottom: 20px;">🚫</div>
                <div style="font-size: 24px; font-weight: bold; margin-bottom: 15px; color: #ff4444;">
                    СЕССИЯ ЗАБЛОКИРОВАНА
                </div>
                <div style="font-size: 16px; line-height: 1.5; margin-bottom: 30px; color: white;">
                    Обнаружена активная сессия на другом устройстве.<br>
                    Одновременно может быть активна только ОДНА сессия.
                </div>
                <button onclick="location.reload()" style="
                    background: #2196F3; color: white; border: none; 
                    padding: 15px 30px; border-radius: 10px; cursor: pointer;
                    font-size: 16px; margin: 10px;
                ">Попробовать снова</button>
            </div>
        `;
        
        document.body.appendChild(blockOverlay);
        
        // Блокируем взаимодействие с игрой
        document.body.style.pointerEvents = 'none';
        document.body.style.overflow = 'hidden';
    }

    updateActivity() {
        localStorage.setItem(this.lastActivityKey, Date.now().toString());
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
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🔒 ЗАПУСК ЖЕСТКОЙ ПРОВЕРКИ ПРИ ЗАГРУЗКЕ...');
    
    setTimeout(async () => {
        const allowed = await window.hardSessionBlocker.checkHardSessionOnLoad();
        if (allowed) {
            window.hardSessionBlocker.startHardMonitoring();
            console.log('✅ ЖЕСТКАЯ БЛОКИРОВКА АКТИВИРОВАНА');
        } else {
            console.log('🚫 ДОСТУП ЗАБЛОКИРОВАН');
        }
    }, 1000);
});
