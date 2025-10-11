// mobile-fix.js - фиксы для мобильных устройств
console.log('📱 Загружаем мобильные фиксы...');

// Инициализация для мобильных устройств
function initMobileFeatures() {
    console.log('📱 Инициализация мобильных функций...');
    
    // Предотвращение масштабирования при двойном тапе
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Улучшенная обработка кликов для мобильных
    const coin = document.getElementById('clickCoin');
    if (coin) {
        coin.style.cursor = 'pointer';
        coin.style.webkitTapHighlightColor = 'transparent';
        coin.style.touchAction = 'manipulation';
    }
    
    // Адаптация интерфейса для мобильных
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        document.body.classList.add('mobile-device');
        console.log('📱 Мобильное устройство обнаружено');
        
        // Дополнительные стили для мобильных
        const style = document.createElement('style');
        style.textContent = `
            .mobile-device .click-coin {
                width: 180px !important;
                height: 180px !important;
            }
            .mobile-device .coin-letter {
                font-size: 64px !important;
            }
            .mobile-device .menu-button {
                padding: 16px !important;
                font-size: 16px !important;
            }
            .mobile-device .buy-button {
                padding: 14px !important;
                font-size: 14px !important;
            }
        `;
        document.head.appendChild(style);
    }
}

// Запуск при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileFeatures);
} else {
    initMobileFeatures();
}

console.log('✅ Мобильные фиксы загружены!');
