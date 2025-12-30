// Sparkcoin Core - Оптимизированная версия
class SparkcoinCore {
  constructor() {
    this.config = {
      CLICK_COOLDOWN: 100,
      ANTI_CHEAT_CLICKS: 15,
      ANTI_CHEAT_WINDOW: 1500,
      INCOME_INTERVAL: 1000,
      SAVE_INTERVAL: 30000,
      BASE_CLICK_POWER: 0.000000001,
      BASE_MINING_SPEED: 0.000000000,
      VERSION: '2.0.0'
    };
    
    this.userData = null;
    this.upgrades = {};
    this.clickHistory = [];
    this.isInitialized = false;
    this.lastClickTime = 0;
    this.incomeAccumulator = 0;
    this.pendingActions = [];
    
    this.init();
  }

  async init() {
    console.log('🚀 Инициализация Sparkcoin Core v' + this.config.VERSION);
    
    await this.loadUserData();
    this.initializeEventListeners();
    this.startSystems();
    this.renderInitialUI();
    
    this.isInitialized = true;
    console.log('✅ Core успешно инициализирован');
  }

  generateUserId() {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const user = window.Telegram.WebApp.initDataUnsafe.user;
      return user.id ? `tg_${user.id}` : `tg_${Date.now()}`;
    }
    
    let webId = localStorage.getItem('sparkcoin_web_id');
    if (!webId) {
      webId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sparkcoin_web_id', webId);
    }
    return webId;
  }

  getUsername() {
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      const user = window.Telegram.WebApp.initDataUnsafe.user;
      return user.username ? `@${user.username}` : 
             user.first_name ? user.first_name : 
             `User${user.id}`;
    }
    
    return localStorage.getItem('sparkcoin_username') || 
           `Player_${Math.random().toString(36).substr(2, 6)}`;
  }

  async loadUserData() {
    const userId = this.generateUserId();
    const username = this.getUsername();
    
    try {
      const saved = localStorage.getItem(`sparkcoin_data_${userId}`);
      
      if (saved) {
        this.userData = JSON.parse(saved);
        // Проверка версии данных
        if (!this.userData.version || this.userData.version !== this.config.VERSION) {
          this.migrateUserData(this.userData);
        }
      } else {
        this.userData = this.createNewUser(userId, username);
      }
      
      // Загрузка улучшений
      this.upgrades = JSON.parse(localStorage.getItem(`sparkcoin_upgrades_${userId}`) || '{}');
      
      console.log('📊 Загружен пользователь:', this.userData.username);
    } catch (error) {
      console.error('❌ Ошибка загрузки данных:', error);
      this.userData = this.createNewUser(userId, username);
      this.upgrades = {};
    }
  }

  createNewUser(userId, username) {
    return {
      userId,
      username,
      balance: 0.000000100,
      totalEarned: 0.000000100,
      totalClicks: 0,
      lastUpdate: Date.now(),
      joinedDate: new Date().toISOString(),
      version: this.config.VERSION,
      deviceId: this.generateDeviceId(),
      upgrades: {}
    };
  }

  migrateUserData(oldData) {
    // Миграция данных между версиями
    oldData.version = this.config.VERSION;
    oldData.deviceId = oldData.deviceId || this.generateDeviceId();
    return oldData;
  }

  generateDeviceId() {
    let deviceId = localStorage.getItem('sparkcoin_device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sparkcoin_device_id', deviceId);
    }
    return deviceId;
  }

  initializeEventListeners() {
    // Клик по монетке
    const coin = document.getElementById('clickCoin');
    if (coin) {
      coin.addEventListener('click', (e) => this.handleCoinClick(e));
      coin.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleCoinClick(e);
      }, { passive: false });
    }
    
    // Изменение размера окна
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => this.handleResize(), 200);
    });
    
    // Видимость страницы
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveUserData();
      } else {
        this.updateUI();
      }
    });
  }

  handleCoinClick(event) {
    if (!this.userData) return;
    
    const now = Date.now();
    
    // Проверка античита
    if (this.isCheatDetected(now)) {
      this.showNotification('Слишком быстро! Подождите немного.', 'warning');
      return;
    }
    
    // Проверка кулдауна
    if (now - this.lastClickTime < this.config.CLICK_COOLDOWN) {
      return;
    }
    
    this.lastClickTime = now;
    this.clickHistory.push(now);
    this.clickHistory = this.clickHistory.filter(
      time => now - time < 60000 // Храним историю 60 секунд
    );
    
    // Начисление дохода
    const clickPower = this.calculateClickPower();
    this.userData.balance += clickPower;
    this.userData.totalEarned += clickPower;
    this.userData.totalClicks++;
    this.userData.lastUpdate = now;
    
    // Визуальные эффекты
    this.animateCoinClick(event);
    this.showClickPopup(event, clickPower);
    
    // Обновление интерфейса
    this.updateBalance();
    
    // Быстрое сохранение каждые 10 кликов
    if (this.userData.totalClicks % 10 === 0) {
      this.queueSave();
    }
  }

  isCheatDetected(currentTime) {
    // Фильтруем клики за последние 1.5 секунды
    const recentClicks = this.clickHistory.filter(
      time => currentTime - time < this.config.ANTI_CHEAT_WINDOW
    );
    
    return recentClicks.length >= this.config.ANTI_CHEAT_CLICKS;
  }

  calculateClickPower() {
    let power = this.config.BASE_CLICK_POWER;
    
    // Бонус от улучшений мыши
    Object.keys(this.upgrades).forEach(key => {
      if (key.startsWith('mouse')) {
        const level = this.upgrades[key] || 0;
        const upgrade = window.UPGRADES?.[key];
        if (upgrade?.type === 'click') {
          power += level * (upgrade.baseBonus || 0.000000001);
        }
      }
    });
    
    return power;
  }

  calculateMiningSpeed() {
    let speed = this.config.BASE_MINING_SPEED;
    
    if (!window.UPGRADES) return speed;
    
    // GPU улучшения
    for (let i = 1; i <= 8; i++) {
      const key = `gpu${i}`;
      const level = this.upgrades[key] || 0;
      const upgrade = window.UPGRADES[key];
      if (upgrade?.type === 'mining') {
        speed += level * (upgrade.baseBonus || 0.000000001);
      }
    }
    
    // CPU улучшения
    for (let i = 1; i <= 8; i++) {
      const key = `cpu${i}`;
      const level = this.upgrades[key] || 0;
      const upgrade = window.UPGRADES[key];
      if (upgrade?.type === 'mining') {
        speed += level * (upgrade.baseBonus || 0.000000001);
      }
    }
    
    return speed;
  }

  animateCoinClick(event) {
    const coin = document.getElementById('clickCoin');
    if (!coin) return;
    
    coin.style.transform = 'scale(0.9)';
    coin.style.transition = 'transform 0.1s ease';
    
    setTimeout(() => {
      coin.style.transform = 'scale(1)';
    }, 100);
  }

  showClickPopup(event, amount) {
    const popup = document.createElement('div');
    popup.className = 'click-popup';
    popup.textContent = `+${amount.toFixed(9)}`;
    popup.style.position = 'fixed';
    popup.style.left = `${event.clientX || event.touches[0].clientX}px`;
    popup.style.top = `${event.clientY || event.touches[0].clientY}px`;
    popup.style.zIndex = '10000';
    
    document.body.appendChild(popup);
    
    // Анимация
    requestAnimationFrame(() => {
      popup.style.transform = 'translate(-50%, -50%) scale(1)';
      popup.style.opacity = '1';
      
      setTimeout(() => {
        popup.style.transform = 'translate(-50%, -100px) scale(0.5)';
        popup.style.opacity = '0';
        
        setTimeout(() => popup.remove(), 500);
      }, 300);
    });
  }

  updateBalance() {
    const balanceEl = document.getElementById('balanceValue');
    const clickValueEl = document.getElementById('clickValue');
    const clickSpeedEl = document.getElementById('clickSpeed');
    const mineSpeedEl = document.getElementById('mineSpeed');
    
    if (balanceEl) {
      balanceEl.textContent = this.userData.balance.toFixed(9) + ' S';
    }
    
    if (clickValueEl) {
      clickValueEl.textContent = this.calculateClickPower().toFixed(9);
    }
    
    if (clickSpeedEl) {
      clickSpeedEl.textContent = this.calculateClickPower().toFixed(9) + ' S/сек';
    }
    
    if (mineSpeedEl) {
      const speed = this.calculateMiningSpeed();
      mineSpeedEl.textContent = speed.toFixed(9) + ' S/сек';
    }
  }

  startSystems() {
    // Пассивный доход
    setInterval(() => {
      if (this.userData) {
        const miningSpeed = this.calculateMiningSpeed();
        if (miningSpeed > 0) {
          this.userData.balance += miningSpeed;
          this.userData.totalEarned += miningSpeed;
          this.incomeAccumulator += miningSpeed;
          
          if (this.incomeAccumulator >= 0.000000100) {
            this.updateBalance();
            this.incomeAccumulator = 0;
          }
        }
      }
    }, this.config.INCOME_INTERVAL);
    
    // Автосохранение
    setInterval(() => this.saveUserData(), this.config.SAVE_INTERVAL);
    
    // Синхронизация с сервером
    setInterval(() => this.syncWithServer(), 60000);
  }

  async syncWithServer() {
    if (!this.userData || !navigator.onLine) return;
    
    try {
      const syncData = {
        userId: this.userData.userId,
        username: this.userData.username,
        balance: this.userData.balance,
        totalEarned: this.userData.totalEarned,
        totalClicks: this.userData.totalClicks,
        upgrades: this.upgrades,
        lastUpdate: Date.now(),
        version: this.config.VERSION
      };
      
      await window.apiRequest('/api/sync/unified', {
        method: 'POST',
        body: syncData
      });
      
      console.log('✅ Данные синхронизированы');
    } catch (error) {
      console.warn('⚠️ Ошибка синхронизации:', error);
    }
  }

  queueSave() {
    this.pendingActions.push('save');
    
    if (this.pendingActions.length === 1) {
      requestAnimationFrame(() => this.processPendingActions());
    }
  }

  processPendingActions() {
    while (this.pendingActions.length > 0) {
      const action = this.pendingActions.shift();
      if (action === 'save') {
        this.saveUserData();
      }
    }
  }

  saveUserData() {
    if (!this.userData) return;
    
    try {
      this.userData.lastUpdate = Date.now();
      this.userData.upgrades = this.upgrades;
      
      localStorage.setItem(
        `sparkcoin_data_${this.userData.userId}`,
        JSON.stringify(this.userData)
      );
      
      localStorage.setItem(
        `sparkcoin_upgrades_${this.userData.userId}`,
        JSON.stringify(this.upgrades)
      );
      
      console.log('💾 Данные сохранены');
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
    }
  }

  renderInitialUI() {
    this.updateBalance();
    
    // Показываем главный экран
    setTimeout(() => {
      if (typeof showSection === 'function') {
        showSection('main');
      }
    }, 100);
  }

  handleResize() {
    // Оптимизация для мобильных устройств
    const isMobile = window.innerWidth <= 480;
    
    if (isMobile) {
      document.documentElement.style.fontSize = '13px';
    } else {
      document.documentElement.style.fontSize = '14px';
    }
  }

  showNotification(message, type = 'info') {
    if (window.apiService) {
      window.apiService.showNotification(message, type);
    } else {
      console.log(`${type}: ${message}`);
    }
  }

  // Публичные методы
  buyUpgrade(upgradeId) {
    if (!this.userData || !window.UPGRADES?.[upgradeId]) return false;
    
    const upgrade = window.UPGRADES[upgradeId];
    const currentLevel = this.upgrades[upgradeId] || 0;
    const price = upgrade.basePrice * Math.pow(2, currentLevel);
    
    if (this.userData.balance >= price) {
      this.userData.balance -= price;
      this.upgrades[upgradeId] = currentLevel + 1;
      
      this.updateBalance();
      this.saveUserData();
      this.showNotification(`Улучшение "${upgrade.name}" куплено!`, 'success');
      
      return true;
    } else {
      this.showNotification('Недостаточно средств', 'error');
      return false;
    }
  }

  getStats() {
    return {
      balance: this.userData?.balance || 0,
      clickPower: this.calculateClickPower(),
      miningSpeed: this.calculateMiningSpeed(),
      totalClicks: this.userData?.totalClicks || 0,
      upgrades: { ...this.upgrades }
    };
  }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
  window.sparkcoinCore = new SparkcoinCore();
});

// Экспорт для глобального доступа
window.updateUI = function() {
  if (window.sparkcoinCore) {
    window.sparkcoinCore.updateBalance();
  }
};

window.saveUserData = function() {
  if (window.sparkcoinCore) {
    window.sparkcoinCore.saveUserData();
  }
};

window.buyUpgrade = function(upgradeId) {
  if (window.sparkcoinCore) {
    return window.sparkcoinCore.buyUpgrade(upgradeId);
  }
  return false;
};

window.calculateClickPower = function() {
  if (window.sparkcoinCore) {
    return window.sparkcoinCore.calculateClickPower();
  }
  return 0.000000001;
};

window.calculateMiningSpeed = function() {
  if (window.sparkcoinCore) {
    return window.sparkcoinCore.calculateMiningSpeed();
  }
  return 0.000000000;
};
