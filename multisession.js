// multisession.js - УСИЛЕННАЯ система обнаружения мультисессий
console.log('🔍 Загружаем УСИЛЕННУЮ систему мультисессий...');

class MultiSessionDetector {
    constructor() {
        this.sessionKey = 'sparkcoin_device_session';
        this.syncKey = 'sparkcoin_sync_data';
        this.activityKey = 'sparkcoin_last_activity';
        this.blockedKey = 'sparkcoin_blocked_session';
        this.checkInterval = null;
        this.isMonitoring = false;
        this.lastBlockTime = 0;
        this.warningShown = false;
        this.lastWarningTime = 0;
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
    
    // ПРОВЕРКА МУЛЬТИСЕССИИ С ПРЕДУПРЕЖДЕНИЕМ
    checkMultiSession() {
        try {
            const currentDevice = this.generateDeviceId();
            const currentTime = Date.now();
            const lastSync = JSON.parse(localStorage.getItem(this.syncKey) || '{}');
            
            // Проверяем, не заблокирована ли текущая сессия
            const blockedSession = localStorage.getItem(this.blockedKey);
            if (blockedSession === currentDevice) {
                console.log('🚫 Сессия заблокирована, перенаправляем...');
                this.redirectToWarning();
                return true;
            }
            
            // Если другое устройство активно в последние 5 секунд - ПРЕДУПРЕЖДАЕМ
            if (lastSync.deviceId && lastSync.deviceId !== currentDevice && 
                currentTime - lastSync.timestamp < 5000) {
                
                console.warn('⚠️ Обнаружена мультисессия! Устройство:', lastSync.deviceId);
                
                // Показываем предупреждение не чаще чем раз в 30 секунд
                if (!this.warningShown && (currentTime - this.lastWarningTime > 30000)) {
                    this.showWarning();
                    this.warningShown = true;
                    this.lastWarningTime = currentTime;
                }
                
                return true; // Возвращаем true, но не блокируем
            }
            
            // Сбрасываем флаг предупреждения если нет мультисессии
            if (this.warningShown && (!lastSync.deviceId || lastSync.deviceId === currentDevice)) {
                this.warningShown = false;
            }
            
            // Если с момента блокировки прошло больше 30 секунд, разблокируем
            if (blockedSession && currentTime - this.lastBlockTime > 30000) {
                localStorage.removeItem(this.blockedKey);
            }
            
            // Обновляем данные синхронизации
            this.updateSync();
            return false;
            
        } catch (error) {
            console.error('❌ Ошибка проверки мультисессии:', error);
            return false;
        }
    }
    
    // ПЕРЕНАПРАВЛЕНИЕ НА СТРАНИЦУ ПРЕДУПРЕЖДЕНИЯ
    redirectToWarning() {
        // Сохраняем текущий URL для возврата
        sessionStorage.setItem('original_url', window.location.href);
        
        // Перенаправляем на страницу предупреждения
        setTimeout(() => {
            window.location.href = 'multisession-warning.html';
        }, 1000);
    }
    
    // ПОКАЗЫВАЕМ ПРЕДУПРЕЖДЕНИЕ (всплывающее)
    showWarning() {
        if (document.getElementById('multisessionWarning')) {
            return;
        }
        
        const warningHTML = `
            <div id="multisessionWarning" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                backdrop-filter: blur(10px);
                animation: fadeIn 0.3s ease;
            ">
                <div style="
                    background: linear-gradient(135deg, rgba(255, 152, 0, 0.2), rgba(255, 152, 0, 0.1));
                    border-radius: 20px;
                    padding: 30px;
                    text-align: center;
                    max-width: 400px;
                    width: 90%;
                    border: 2px solid rgba(255, 152, 0, 0.5);
                    box-shadow: 0 20px 40px rgba(255, 152, 0, 0.4);
                    animation: scaleIn 0.3s ease;
                ">
                    <div style="font-size: 28px; margin-bottom: 15px;">⚠️</div>
                    <div style="font-size: 20px; font-weight: bold; color: #FF9800; margin-bottom: 10px;">
                        Мультисессия
                    </div>
                    <div style="color: white; margin-bottom: 25px; line-height: 1.5; font-size: 14px;">
                        Обнаружена активность с другого устройства.<br>
                        Данные будут синхронизированы автоматически.
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="window.multiSessionDetector.closeWarning()" style="
                            background: linear-gradient(135deg, #2196F3, #1976D2);
                            color: white;
                            border: none;
                            padding: 12px 25px;
                            border-radius: 10px;
                            font-weight: bold;
                            cursor: pointer;
                            font-size: 14px;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                            Продолжить
                        </button>
                        <button onclick="window.multiSessionDetector.handleReload()" style="
                            background: rgba(255, 255, 255, 0.1);
                            color: white;
                            border: 1px solid #666;
                            padding: 12px 25px;
                            border-radius: 10px;
                            font-weight: bold;
                            cursor: pointer;
                            font-size: 14px;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                            Перезагрузить
                        </button>
                    </div>
                    <div style="margin-top: 15px; font-size: 11px; color: rgba(255, 255, 255, 0.5);">
                        Рекомендуется использовать одно устройство
                    </div>
                </div>
            </div>
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            </style>
        `;
        
        document.body.insertAdjacentHTML('beforeend', warningHTML);
    }
    
    // Закрыть предупреждение
    closeWarning() {
        const warning = document.getElementById('multisessionWarning');
        if (warning) {
            warning.remove();
        }
        this.warningShown = false;
    }
    
    // Обработка перезагрузки
    handleReload() {
        // Очищаем все данные сессии
        localStorage.removeItem('sparkcoin_sync_data');
        localStorage.removeItem('sparkcoin_active_session');
        localStorage.removeItem('sparkcoin_last_activity');
        localStorage.removeItem('sparkcoin_blocked_session');
        
        // Перезагружаем страницу
        location.reload();
    }
    
    // Продолжить использование (только для тестирования)
    continueAnyway() {
        const warning = document.getElementById('multisessionWarning');
        if (warning) {
            warning.remove();
        }
        
        // Разблокируем сессию
        localStorage.removeItem('sparkcoin_blocked_session');
        
        // Обновляем синхронизацию, чтобы это устройство стало основным
        this.updateSync();
        
        this.showContinueNotification();
    }
    
    // Уведомление о продолжении
    showContinueNotification() {
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #FF9800, #F57C00);
                color: white;
                padding: 12px 20px;
                border-radius: 10px;
                font-weight: bold;
                z-index: 10001;
                box-shadow: 0 5px 15px rgba(255, 152, 0, 0.4);
                animation: slideInRight 0.3s ease;
            ">
                ⚠️ Используется мультисессия
            </div>
            <style>
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            </style>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
    
    // Обновляем данные синхронизации
    updateSync() {
        try {
            const syncData = {
                deviceId: this.generateDeviceId(),
                timestamp: Date.now(),
                userId: window.userData?.userId || 'unknown',
                userAgent: navigator.userAgent.substring(0, 100),
                telegramId: window.userData?.telegramId || 'unknown'
            };
            localStorage.setItem(this.syncKey, JSON.stringify(syncData));
            localStorage.setItem(this.activityKey, Date.now().toString());
        } catch (error) {
            console.error('❌ Ошибка обновления синхронизации:', error);
        }
    }
    
    // Запуск мониторинга
    startMonitoring() {
        if (this.isMonitoring) return;
        
        console.log('🔍 Запуск мониторинга мультисессий...');
        
        // СРАЗУ проверяем при запуске
        setTimeout(() => {
            if (this.checkMultiSession()) {
                return; // Если мультисессия, останавливаем
            }
        }, 1000);
        
        // Проверяем каждые 3 секунды
        this.checkInterval = setInterval(() => {
            this.checkMultiSession();
        }, 3000);
        
        // Обновляем синхронизацию при активности пользователя
        const activityEvents = ['click', 'keypress', 'mousemove', 'touchstart', 'scroll'];
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.updateSync();
            }, { passive: true });
        });
        
        // Обновляем при изменении видимости страницы
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateSync();
                // При возвращении на вкладку проверяем мультисессию
                setTimeout(() => this.checkMultiSession(), 1000);
            }
        });
        
        this.isMonitoring = true;
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
        const isMultiSession = lastSync.deviceId && lastSync.deviceId !== currentDevice;
        const isBlocked = localStorage.getItem(this.blockedKey) === currentDevice;
        
        return {
            isMultiSession: isMultiSession,
            isBlocked: isBlocked,
            currentDevice: currentDevice,
            lastDevice: lastSync.deviceId,
            lastActivity: lastSync.timestamp ? new Date(lastSync.timestamp) : null,
            timeSinceLastActivity: lastSync.timestamp ? Date.now() - lastSync.timestamp : null
        };
    }
}

// Инициализация системы мультисессий
window.multiSessionDetector = new MultiSessionDetector();

// АВТОМАТИЧЕСКИЙ ЗАПУСК ПРОВЕРКИ
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            window.multiSessionDetector.startMonitoring();
        }, 2000);
    });
} else {
    setTimeout(() => {
        window.multiSessionDetector.startMonitoring();
    }, 2000);
}

console.log('✅ УСИЛЕННАЯ система мультисессий загружена!');
