// mobile-fix.js - исправление для мобильных устройств
console.log('📱 Инициализация мобильного фикса...');

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM загружен, настраиваем монетку...');
    
    // Ждем немного чтобы все элементы точно были доступны
    setTimeout(function() {
        const coin = document.getElementById('clickCoin');
        
        if (!coin) {
            console.error('❌ Монетка не найдена!');
            return;
        }
        
        console.log('✅ Монетка найдена:', coin);
        
        // Полностью очищаем все старые обработчики
        coin.replaceWith(coin.cloneNode(true));
        const newCoin = document.getElementById('clickCoin');
        
        // Простой обработчик - работает на всех устройствах
        newCoin.addEventListener('click', handleCoinClick);
        newCoin.addEventListener('touchstart', handleCoinClick);
        
        console.log('🎯 Обработчики установлены!');
    }, 500);
});

function handleCoinClick(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    console.log('💰 Клик по монетке!', event.type);
    
    // Немедленное обновление баланса
    if (window.userData) {
        const clickPower = window.calculateClickPower ? window.calculateClickPower() : 0.000000001;
        
        window.userData.balance += clickPower;
        window.userData.totalEarned += clickPower;
        window.userData.totalClicks = (window.userData.totalClicks || 0) + 1;
        window.userData.lastUpdate = Date.now();
        
        console.log('💵 Баланс обновлен:', window.userData.balance);
        
        // Обновляем интерфейс
        if (window.updateUI) {
            window.updateUI();
        } else {
            // Аварийное обновление
            const balanceElement = document.getElementById('balanceValue');
            if (balanceElement) {
                balanceElement.textContent = window.userData.balance.toFixed(9) + ' S';
            }
        }
        
        // Сохраняем данные
        if (window.saveUserData) {
            window.saveUserData();
        }
        
        // Создаем попап
        createSimplePopup(event, clickPower);
        
    } else {
        console.error('❌ userData не определен!');
        // Создаем userData если его нет
        window.userData = {
            balance: 0.000000100,
            totalEarned: 0.000000100,
            totalClicks: 0,
            lastUpdate: Date.now()
        };
        console.log('📝 Создан новый userData');
    }
    
    return false;
}

function createSimplePopup(event, amount) {
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
    `;
    
    document.body.appendChild(popup);
    
    setTimeout(() => popup.remove(), 1000);
}

// Добавляем CSS анимацию если её нет
if (!document.querySelector('#mobile-fix-style')) {
    const style = document.createElement('style');
    style.id = 'mobile-fix-style';
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

console.log('📱 Мобильный фикс загружен!');
