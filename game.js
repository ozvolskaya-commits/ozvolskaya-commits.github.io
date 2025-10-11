// ==================== ОСНОВНЫЕ ФУНКЦИИ ИГРЫ ====================

// Глобальные переменные игры
let userData = {};
let upgrades = JSON.parse(JSON.stringify(UPGRADES));
let lastUpdateTime = Date.now();
let accumulatedIncome = 0;
let lastClickTime = 0;
let antiCheatBlocked = false;
let clickTimes = [];
let antiCheatTimeout = null;

function calculateClickPower() {
    let power = 0.000000001;
    for (const upgrade in upgrades) {
        if (upgrades[upgrade].type === 'click') {
            power += upgrades[upgrade].level * upgrades[upgrade].baseBonus;
        }
    }
    return power;
}

function calculateMiningSpeed() {
    let speed = 0;
    for (const upgrade in upgrades) {
        if (upgrades[upgrade].type === 'mining') {
            speed += upgrades[upgrade].level * upgrades[upgrade].baseBonus;
        }
    }
    return speed;
}

function checkAutoClick() {
    const now = Date.now();
    clickTimes.push(now);
    
    clickTimes = clickTimes.filter(time => now - time < CONFIG.ANTI_CHEAT_WINDOW);
    
    if (clickTimes.length > CONFIG.ANTI_CHEAT_CLICKS && !antiCheatBlocked) {
        antiCheatBlocked = true;
        document.getElementById('antiCheat').style.display = 'flex';
        
        antiCheatTimeout = setTimeout(() => {
            antiCheatBlocked = false;
            document.getElementById('antiCheat').style.display = 'none';
            clickTimes = [];
        }, CONFIG.ANTI_CHEAT_BLOCK_TIME);
        
        return true;
    }
    
    return false;
}

function clickCoin(event) {
    if (antiCheatBlocked) return;
    
    const now = Date.now();
    if (now - lastClickTime < CONFIG.CLICK_COOLDOWN) return;
    
    if (checkAutoClick()) return;
    
    lastClickTime = now;
    
    const clickPower = calculateClickPower();
    userData.balance += clickPower;
    userData.totalEarned += clickPower;
    userData.totalClicks++;
    userData.lastUpdate = Date.now();
    
    // ИСПРАВЛЕНИЕ ДЛЯ МОБИЛЬНЫХ УСТРОЙСТВ
    let clientX, clientY;
    if (event.type === 'touchstart' || event.type === 'touchend') {
        // Для тач-событий
        const touch = event.touches[0] || event.changedTouches[0];
        clientX = touch.clientX;
        clientY = touch.clientY;
    } else {
        // Для мыши
        clientX = event.clientX;
        clientY = event.clientY;
    }
    
    createClickPopup(clientX, clientY, clickPower);
    
    const coin = document.getElementById('clickCoin');
    coin.classList.add('cooldown');
    setTimeout(() => coin.classList.remove('cooldown'), CONFIG.CLICK_COOLDOWN);
    
    updateUI();
    saveUserData();
}

// ОБНОВЛЕННАЯ ФУНКЦИЯ СОЗДАНИЯ ПОПАПА
function createClickPopup(x, y, amount) {
    const popup = document.createElement('div');
    popup.className = 'click-popup';
    popup.textContent = '+' + amount.toFixed(9);
    
    // Позиционируем относительно окна просмотра
    popup.style.position = 'fixed';
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.zIndex = '10000';
    popup.style.pointerEvents = 'none';
    popup.style.color = '#4CAF50';
    popup.style.fontWeight = 'bold';
    popup.style.fontSize = '18px';
    popup.style.fontFamily = 'Courier New, monospace';
    popup.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
    popup.style.animation = 'floatUp 1s ease-out forwards';
    
    document.body.appendChild(popup);
    
    setTimeout(() => {
        if (popup.parentNode) {
            popup.parentNode.removeChild(popup);
        }
    }, 1000);
}

function buyUpgrade(upgradeType) {
    const upgrade = upgrades[upgradeType];
    const currentPrice = upgrade.basePrice * Math.pow(1.59375, upgrade.level);
    
    if (userData.balance >= currentPrice) {
        userData.balance -= currentPrice;
        upgrade.level++;
        userData.lastUpdate = Date.now();
        
        updateUI();
        updateShopUI();
        saveUserData();
        
        showNotification(`${upgrade.name} куплено! Уровень ${upgrade.level}`, 'success');
    } else {
        showNotification('Недостаточно средств', 'error');
    }
}

function updateShopUI() {
    for (const upgrade in upgrades) {
        const currentPrice = upgrades[upgrade].basePrice * Math.pow(1.59375, upgrades[upgrade].level);
        const ownedElement = document.getElementById(upgrade + '-owned');
        const priceElement = document.getElementById(upgrade + '-price');
        const button = document.querySelector(`button[onclick="buyUpgrade('${upgrade}')"]`);
        
        if (ownedElement) ownedElement.textContent = upgrades[upgrade].level;
        if (priceElement) priceElement.textContent = currentPrice.toFixed(9);
        if (button) button.disabled = userData.balance < currentPrice;
    }
}

function updateUI() {
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - lastUpdateTime) / 1000;
    
    const miningSpeed = calculateMiningSpeed();
    accumulatedIncome += miningSpeed * elapsedSeconds;
    
    if (accumulatedIncome >= 0.000000001) {
        userData.balance += accumulatedIncome;
        userData.totalEarned += accumulatedIncome;
        userData.lastUpdate = currentTime;
        accumulatedIncome = 0;
        
        saveUserData();
    }
    
    lastUpdateTime = currentTime;
    
    const clickPower = calculateClickPower();
    document.getElementById('balanceValue').textContent = userData.balance.toFixed(9) + ' S';
    document.getElementById('clickValue').textContent = clickPower.toFixed(9);
    document.getElementById('clickSpeed').textContent = clickPower.toFixed(9) + ' S/сек';
    document.getElementById('mineSpeed').textContent = miningSpeed.toFixed(9) + ' S/сек';
}

function saveUserData() {
    userData.lastUpdate = Date.now();
    
    localStorage.setItem('sparkcoin_user_data', JSON.stringify(userData));
    
    const upgradesData = {};
    for (const key in upgrades) {
        upgradesData[key] = upgrades[key].level;
    }
    localStorage.setItem('sparkcoin_upgrades_' + userData.userId, JSON.stringify(upgradesData));
    
    saveUserDataToAPI();
}
