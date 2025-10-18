// multisession.js - система обнаружения мультисессий
console.log('🔍 Загружаем систему мультисессий...');

class MultiSessionDetector {
    constructor() {
        this.sessionKey = 'sparkcoin_device_session';
        this.syncKey = 'sparkcoin_sync_data';
        this.activityKey = 'sparkcoin_last_activity';
        this.checkInterval = null;
        this.isMonitoring = false;
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
    
    // Проверяем мультисессию
    checkMultiSession() {
        try {
            const currentDevice = this.generateDeviceId();
            const currentTime = Date.now();
            const lastSync = JSON.parse(localStorage.getItem(this.syncKey) || '{}');
            
            // Если другое устройство активно в последние 10 секунд
            if (lastSync.deviceId && lastSync.deviceId !== currentDevice && 
                currentTime - lastSync.timestamp < 10000) {
                
                console.warn('⚠️ Обнаружена мультисессия! Устройство:', lastSync.deviceId);
                this.showWarning();
                return true;
            }
            
            // Обновляем данные синхронизации
            this.updateSync();
            return false;
            
        } catch (error) {
            console.error('❌ Ошибка проверки мультисессии:', error);
            return false;
        }
    }
    
    // Показываем предупреждение
    showWarning() {
        // Проверяем, не показано ли уже предупреждение
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
                background: rgba(0, 0, 0, 0.95);
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
                        Пожалуйста, используйте только одно устройство для корректной синхронизации данных.
                    </div>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button onclick="window.multiSessionDetector.handleReload()" style="
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
                            🔄 Перезагрузить
                        </button>
                        <button onclick="window.multiSessionDetector.continueAnyway()" style="
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
                            Продолжить
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
    
    // Обработка перезагрузки
    handleReload() {
        // Очищаем все данные сессии
        localStorage.removeItem('sparkcoin_sync_data');
        localStorage.removeItem('sparkcoin_active_session');
        localStorage.removeItem('sparkcoin_last_activity');
        
        // Перезагружаем страницу
        location.reload();
    }
    
    // Продолжить использование
    continueAnyway() {
        const warning = document.getElementById('multisessionWarning');
        if (warning) {
            warning.remove();
        }
        
        // Обновляем синхронизацию, чтобы это устройство стало основным
        this.updateSync();
        
        // Показываем уведомление
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
                userAgent: navigator.userAgent.substring(0, 100)
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
        
        // Проверяем сразу при запуске
        setTimeout(() => {
            this.checkMultiSession();
        }, 2000);
        
        // Проверяем каждые 5 секунд
        this.checkInterval = setInterval(() => {
            this.checkMultiSession();
        }, 5000);
        
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
        
        return {
            isMultiSession: isMultiSession,
            currentDevice: currentDevice,
            lastDevice: lastSync.deviceId,
            lastActivity: lastSync.timestamp ? new Date(lastSync.timestamp) : null,
            timeSinceLastActivity: lastSync.timestamp ? Date.now() - lastSync.timestamp : null
        };
    }
}

// Инициализация системы мультисессий
window.multiSessionDetector = new MultiSessionDetector();

// Автоматический запуск после загрузки страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            window.multiSessionDetector.startMonitoring();
        }, 3000);
    });
} else {
    setTimeout(() => {
        window.multiSessionDetector.startMonitoring();
    }, 3000);
}

console.log('✅ Система мультисессий загружена и готова к работе!');
