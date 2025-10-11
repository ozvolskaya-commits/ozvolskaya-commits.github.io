// main.js - полностью исправленная версия
console.log('🎮 Загружаем исправленный main.js...');

const tg = window.Telegram.WebApp;

// Базовые функции
function getTelegramUserId() {
    if (typeof tg === 'undefined') {
        return 'web_' + Math.random().toString(36).substr(2, 9);
    }
    
    const user = tg.initDataUnsafe?.user;
    if (user && user.username) {
        return 'tg_' + user.username.toLowerCase();
    } else if (user && user.id) {
        return 'tg_' + user.id;
    }
    return 'test_' + Math.random().toString(36).substr(2, 9);
}

function getTelegramUsername() {
    if (typeof tg === 'undefined') {
        return 'Веб-Игрок';
    }
    
    const user = tg.initDataUnsafe?.user;
    if (user) {
        if (user.username) {
            return '@' + user.username;
        } else if (user.first_name) {
            return user.first_name;
        }
    }
    return 'Игрок';
}

function createNewUserData(userId, username) {
    return {
        userId: userId,
        username: username,
        balance: 0.000000100,
        totalEarned: 0.000000100,
        totalClicks: 0,
        lastUpdate: Date.now(),
        joinedDate: new Date().toISOString(),
        lotteryWins: 0,
        totalBet: 0,
        telegramId: tg?.initDataUnsafe?.user?.id || null,
        transfers: {
            sent: 0,
            received: 0
        },
        referralEarnings: 0,
        referralsCount: 0,
        totalWinnings: 0,
        totalLosses: 0
    };
}

function showSessionError() {
    document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; padding: 20px; text-align: center;">
            <h1 style="color: #f44336; margin-bottom: 20px;">❌ Ошибка доступа</h1>
            <p style="color: white; margin-bottom: 20px;">Приложение уже открыто в другой сессии Telegram.</p>
            <p style="color: #ccc; font-size: 14px;">Закройте другие вкладки с Sparkcoin и обновите страницу.</p>
        </div>
    `;
}

// Загрузка данных пользователя
function loadUserData() {
    const userId = getTelegramUserId();
    const username = getTelegramUsername();

    // Проверка сессии
    const currentSession = localStorage.getItem('sparkcoin_current_session');
    if (currentSession && currentSession !== userId) {
        showSessionError();
        return;
    }

    localStorage.setItem('sparkcoin_current_session', userId);

    // Загрузка данных из localStorage
    try {
        const savedData = localStorage.getItem('sparkcoin_user_data');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            if (parsedData.userId === userId) {
                window.userData = parsedData;
                if (window.lastUpdateTime !== undefined) {
                    window.lastUpdateTime = window.userData.lastUpdate || Date.now();
                }
                console.log('✅ Данные пользователя загружены из localStorage');
            } else {
                window.userData = createNewUserData(userId, username);
                console.log('🆕 Созданы новые данные пользователя');
            }
        } else {
            window.userData = createNewUserData(userId, username);
            console.log('🆕 Созданы начальные данные пользователя');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки данных:', error);
        window.userData = createNewUserData(userId, username);
    }

    // Загрузка улучшений
    try {
        const savedUpgrades = localStorage.getItem('sparkcoin_upgrades_' + userId);
        if (savedUpgrades && window.upgrades) {
            const upgradesData = JSON.parse(savedUpgrades);
            for (const key in upgradesData) {
                if (window.upgrades[key]) {
                    window.upgrades[key].level = upgradesData[key];
                }
            }
            console.log('✅ Улучшения загружены');
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки улучшений:', error);
    }

    // Обновление интерфейса
    setTimeout(() => {
        if (typeof updateUI === 'function') {
            updateUI();
        }
        if (typeof updateShopUI === 'function') {
            updateShopUI();
        }
    }, 100);

    console.log('👤 Пользователь:', window.userData.username, 'Баланс:', window.userData.balance);
}

// Инициализация монетки
function initializeCoin() {
    console.log('🎯 Инициализация монетки...');
    
    const coin = document.getElementById('clickCoin');
    
    if (!coin) {
        console.log('⏳ Монетка не найдена, повтор через 1 секунду...');
        setTimeout(initializeCoin, 1000);
        return;
    }
    
    console.log('✅ Монетка найдена');
    
    // Очистка старых обработчиков
    coin.onclick = null;
    coin.ontouchstart = null;
    
    // Добавление новых обработчиков
    coin.addEventListener('click', function(event) {
        handleCoinEvent(event);
    });
    
    coin.addEventListener('touchstart', function(event) {
        handleCoinEvent(event);
    }, { passive: false });
    
    // Стили для мобильных
    coin.style.cursor = 'pointer';
    coin.style.webkitTapHighlightColor = 'transparent';
    coin.style.touchAction = 'manipulation';
    
    console.log('✅ Обработчики монетки установлены');
}

// Обработчик кликов по монетке
function handleCoinEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('💰 Клик по монетке:', event.type);
    
    // Проверяем наличие userData
    if (!window.userData) {
        console.error('❌ userData не определен');
        return false;
    }
    
    // Проверяем античит
    if (window.antiCheatBlocked) {
        console.log('⏸️ Античит заблокирован');
        return false;
    }
    
    // Проверяем кулдаун
    const now = Date.now();
    if (window.lastClickTime && (now - window.lastClickTime < 25)) {
        console.log('⏳ Кулдаун');
        return false;
    }
    
    window.lastClickTime = now;
    
    // Вычисляем силу клика
    let clickPower = 0.000000001;
    if (typeof calculateClickPower === 'function') {
        try {
            clickPower = calculateClickPower();
        } catch (error) {
            console.error('❌ Ошибка calculateClickPower:', error);
        }
    }
    
    // Обновляем баланс
    window.userData.balance += clickPower;
    window.userData.totalEarned += clickPower;
    window.userData.totalClicks = (window.userData.totalClicks || 0) + 1;
    window.userData.lastUpdate = Date.now();
    
    console.log('💵 Баланс обновлен:', window.userData.balance.toFixed(9));
    
    // Обновляем интерфейс
    if (typeof updateUI === 'function') {
        updateUI();
    } else {
        // Аварийное обновление
        const balanceElement = document.getElementById('balanceValue');
        if (balanceElement) {
            balanceElement.textContent = window.userData.balance.toFixed(9) + ' S';
        }
    }
    
    // Сохраняем данные
    if (typeof saveUserData === 'function') {
        saveUserData();
    } else {
        // Аварийное сохранение
        try {
            localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
        } catch (error) {
            console.error('❌ Ошибка сохранения:', error);
        }
    }
    
    // Создаем попап
    createClickPopup(event, clickPower);
    
    // Анимация монетки
    const coin = event.currentTarget;
    coin.style.transform = 'scale(0.95)';
    setTimeout(() => {
        coin.style.transform = 'scale(1)';
    }, 100);
    
    return false;
}

// Создание попапа
function createClickPopup(event, amount) {
    let x, y;
    
    if (event.touches && event.touches[0]) {
        x = event.touches[0].clientX;
        y = event.touches[0].clientY;
    } else {
        x = event.clientX;
        y = event.clientY;
    }
    
    const popup = document.createElement('div');
    popup.textContent = '+' + amount.toFixed(9);
    popup.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        color: #4CAF50;
        font-weight: bold;
        font-size: 18px;
        font-family: 'Courier New', monospace;
        z-index: 10000;
        pointer-events: none;
        animation: floatUp 1s ease-out forwards;
        transform: translate(-50%, -50%);
        text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    `;
    
    document.body.appendChild(popup);
    
    setTimeout(() => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    }, 1000);
}

// Добавление CSS анимации
function addPopupAnimation() {
    if (!document.querySelector('#popup-animation')) {
        const style = document.createElement('style');
        style.id = 'popup-animation';
        style.textContent = `
            @keyframes floatUp {
                0% {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
                50% {
                    transform: translate(-50%, -100%) scale(1.1);
                    opacity: 0.8;
                }
                100% {
                    transform: translate(-50%, -150%) scale(1.2);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Основная функция инициализации
function initializeApp() {
    console.log('🚀 Инициализация приложения...');
    
    // Инициализация Telegram Web App
    if (typeof tg !== 'undefined') {
        try {
            tg.expand();
            tg.enableClosingConfirmation();
            console.log('✅ Telegram Web App инициализирован');
        } catch (error) {
            console.log('⚠️ Ошибка инициализации Telegram:', error);
        }
    } else {
        console.log('🌐 Режим веб-браузера');
    }
    
    // Добавляем анимацию
    addPopupAnimation();
    
    // Загружаем данные пользователя
    loadUserData();
    
    // Инициализируем монетку
    initializeCoin();
    
    // Запускаем обновление интерфейса
    const uiInterval = setInterval(() => {
        if (typeof updateUI === 'function') {
            updateUI();
        }
    }, 100);
    
    // Автосохранение
    const saveInterval = setInterval(() => {
        if (window.userData && typeof saveUserData === 'function') {
            saveUserData();
        }
    }, 5000);
    
    // Показываем главный экран
    setTimeout(() => {
        if (typeof showSection === 'function') {
            showSection('main');
        }
    }, 500);
    
    console.log('✅ Приложение успешно инициализировано');
    
    // Очистка при закрытии
    window.addEventListener('beforeunload', () => {
        clearInterval(uiInterval);
        clearInterval(saveInterval);
        if (window.userData) {
            try {
                localStorage.setItem('sparkcoin_user_data', JSON.stringify(window.userData));
            } catch (error) {
                console.error('❌ Ошибка финального сохранения:', error);
            }
        }
    });
}

// Запуск приложения
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

console.log('🎮 Исправленный main.js загружен и готов к работе!');
