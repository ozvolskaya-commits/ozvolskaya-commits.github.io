// mobile-optimized-ui.js
// Полностью переработанная и оптимизированная версия для мобильных устройств
// Версия: 1.0.0 Production Ready

"use strict";

/**
 * МОБИЛЬНЫЙ ОПТИМИЗИРОВАННЫЙ ИНТЕРФЕЙС SPARKCOIN
 * 
 * Архитектурные принципы:
 * 1. Минимальное потребление памяти
 * 2. Отложенная загрузка компонентов
 * 3. Кэширование повторяющихся операций
 * 4. Оптимизация анимаций и переходов
 * 5. Проактивное управление состоянием
 */

// ============================================
// КОНФИГУРАЦИЯ И НАСТРОЙКИ
// ============================================

const MobileUISettings = {
    animationDuration: 300,
    debounceDelay: 150,
    throttleDelay: 16,
    cacheTTL: 30000,
    lazyLoadThreshold: 100,
    touchSensitivity: 10,
    maxRetryAttempts: 3,
    retryDelay: 1000
};

const ApplicationState = {
    currentSection: 'main',
    previousSection: null,
    isAnimating: false,
    isOnline: navigator.onLine,
    lastUpdateTimestamp: Date.now(),
    cachedData: new Map(),
    pendingRequests: new Map(),
    touchStartPosition: { x: 0, y: 0 },
    gestureHistory: []
};

// ============================================
// ОСНОВНЫЕ КОМПОНЕНТЫ ИНТЕРФЕЙСА
// ============================================

class MobileInterfaceManager {
    constructor() {
        this.initializeInterface();
        this.setupEventListeners();
        this.setupPerformanceMonitoring();
    }

    initializeInterface() {
        console.log('🎨 Инициализация мобильного интерфейса...');
        
        // Оптимизированная инициализация DOM элементов
        this.cacheDomElements();
        this.setupTouchGestures();
        this.initializeVirtualScroll();
        this.setupImageLazyLoading();
        
        // Приоритизация критического рендеринга
        requestAnimationFrame(() => {
            this.renderCriticalComponents();
            setTimeout(() => {
                this.renderNonCriticalComponents();
            }, MobileUISettings.animationDuration);
        });
    }

    cacheDomElements() {
        this.domCache = {
            sections: document.querySelectorAll('.section'),
            navigationButtons: document.querySelectorAll('.nav-button'),
            gameTabs: document.querySelectorAll('.game-tab'),
            shopTabs: document.querySelectorAll('.shop-tab'),
            userItems: document.querySelectorAll('.user-item'),
            leaderItems: document.querySelectorAll('.leader-item'),
            notificationContainer: document.querySelector('#notification-container') || this.createNotificationContainer()
        };
        
        // Кэширование часто используемых элементов
        this.frequentlyUsedElements = {
            balanceValue: document.getElementById('balanceValue'),
            clickValue: document.getElementById('clickValue'),
            clickSpeed: document.getElementById('clickSpeed'),
            mineSpeed: document.getElementById('mineSpeed'),
            usersList: document.getElementById('usersList'),
            leaderboard: document.getElementById('leaderboard'),
            topWinners: document.getElementById('topWinners')
        };
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 300px;
        `;
        document.body.appendChild(container);
        return container;
    }

    setupEventListeners() {
        // Оптимизированные обработчики с делегированием событий
        document.addEventListener('click', this.handleDelegatedClick.bind(this), { passive: true });
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        document.addEventListener('input', this.handleDelegatedInput.bind(this), { passive: true });
        
        // Оптимизированные обработчики скролла
        window.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), MobileUISettings.throttleDelay), { passive: true });
        
        // Слушатели состояния сети
        window.addEventListener('online', this.handleOnlineStatus.bind(this));
        window.addEventListener('offline', this.handleOfflineStatus.bind(this));
        
        // Предотвращение стандартных жестов браузера на мобильных устройствах
        document.addEventListener('touchmove', (event) => {
            if (event.scale !== 1) {
                event.preventDefault();
            }
        }, { passive: false });
    }

    // ============================================
    // ОПТИМИЗИРОВАННЫЕ ОБРАБОТЧИКИ СОБЫТИЙ
    // ============================================

    handleDelegatedClick(event) {
        const target = event.target;
        const button = target.closest('button');
        
        if (!button) return;
        
        // Предотвращение быстрых повторных кликов
        if (Date.now() - (button.lastClickTime || 0) < 500) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        button.lastClickTime = Date.now();
        
        // Обработка навигационных кнопок
        if (button.classList.contains('nav-button')) {
            const section = button.dataset.section;
            if (section) {
                this.showSection(section);
            }
        }
        
        // Обработка игровых вкладок
        if (button.classList.contains('game-tab')) {
            const gameTab = button.dataset.gameTab;
            if (gameTab) {
                this.showGameTab(gameTab);
            }
        }
        
        // Обработка кнопок магазина
        if (button.classList.contains('shop-tab')) {
            const shopTab = button.dataset.shopTab;
            if (shopTab) {
                this.showShopTab(shopTab);
            }
        }
    }

    handleDelegatedInput(event) {
        const target = event.target;
        
        // Оптимизированный дебаунс для полей ввода
        if (target.classList.contains('search-input') || 
            target.classList.contains('bet-input') || 
            target.classList.contains('transfer-input')) {
            this.debounce(() => {
                this.handleInputChange(target);
            }, MobileUISettings.debounceDelay)();
        }
    }

    handleTouchStart(event) {
        const touch = event.touches[0];
        ApplicationState.touchStartPosition = {
            x: touch.clientX,
            y: touch.clientY
        };
    }

    handleTouchEnd(event) {
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - ApplicationState.touchStartPosition.x;
        const deltaY = touch.clientY - ApplicationState.touchStartPosition.y;
        
        // Определение жеста свайпа
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > MobileUISettings.touchSensitivity) {
            if (deltaX > 0) {
                this.handleSwipe('right');
            } else {
                this.handleSwipe('left');
            }
        }
    }

    handleSwipe(direction) {
        console.log(`🔄 Свайп ${direction}`);
        
        const sectionOrder = ['main', 'top', 'transfer', 'shop', 'games', 'referral'];
        const currentIndex = sectionOrder.indexOf(ApplicationState.currentSection);
        
        if (direction === 'left' && currentIndex < sectionOrder.length - 1) {
            this.showSection(sectionOrder[currentIndex + 1]);
        } else if (direction === 'right' && currentIndex > 0) {
            this.showSection(sectionOrder[currentIndex - 1]);
        }
    }

    // ============================================
    // ОСНОВНЫЕ ФУНКЦИИ ИНТЕРФЕЙСА
    // ============================================

    async showSection(sectionName) {
        if (ApplicationState.isAnimating || ApplicationState.currentSection === sectionName) {
            return;
        }
        
        console.log(`🎯 Переход к секции: ${sectionName}`);
        
        ApplicationState.isAnimating = true;
        ApplicationState.previousSection = ApplicationState.currentSection;
        ApplicationState.currentSection = sectionName;
        
        // Анимация перехода
        await this.performSectionTransition(sectionName);
        
        // Загрузка данных для секции
        this.loadSectionData(sectionName);
        
        ApplicationState.isAnimating = false;
        
        // Обновление синхронизации
        if (window.multiSessionDetector) {
            window.multiSessionDetector.updateSync();
        }
    }

    performSectionTransition(sectionName) {
        return new Promise((resolve) => {
            // Скрытие всех секций
            this.domCache.sections.forEach(section => {
                section.classList.remove('active');
                section.classList.add('hidden');
            });
            
            // Показ целевой секции
            const targetSection = document.getElementById(`${sectionName}-section`);
            if (targetSection) {
                targetSection.classList.remove('hidden');
                requestAnimationFrame(() => {
                    targetSection.classList.add('active');
                    setTimeout(resolve, MobileUISettings.animationDuration);
                });
            } else {
                resolve();
            }
        });
    }

    loadSectionData(sectionName) {
        const dataLoaders = {
            'top': () => {
                this.loadWithCache('topWinners', updateTopWinners);
                this.loadWithCache('leaderboard', updateLeaderboard);
                this.loadWithCache('speedLeaderboard', updateSpeedLeaderboard);
            },
            'transfer': () => {
                this.loadWithCache('usersList', updateUsersList);
            },
            'shop': () => {
                this.loadWithCache('shopData', updateShopUI);
            },
            'games': () => {
                this.showGameTab('team-lottery');
                this.startLotteryAutoUpdate();
                this.startClassicLotteryUpdate();
                this.loadWithCache('referralStats', loadReferralStats);
            },
            'referral': () => {
                this.loadWithCache('referralData', updateReferralStats);
            }
        };
        
        const loader = dataLoaders[sectionName];
        if (loader) {
            // Отложенная загрузка данных
            setTimeout(loader, 50);
        }
    }

    async showGameTab(tabName) {
        console.log(`🎰 Переход к игровой вкладке: ${tabName}`);
        
        // Анимация переключения вкладок
        this.domCache.gameTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.gameTab === tabName);
        });
        
        const gameSections = document.querySelectorAll('.game-section');
        gameSections.forEach(section => {
            section.classList.toggle('active', section.id === `${tabName}-game`);
        });
        
        // Загрузка данных для вкладки
        const tabDataLoaders = {
            'team-lottery': () => {
                this.loadWithCache('lotteryStatus', loadLotteryStatus);
                this.startLotteryAutoUpdate();
            },
            'classic-lottery': () => {
                this.loadWithCache('classicLottery', loadClassicLottery);
                this.startClassicLotteryUpdate();
            }
        };
        
        const loader = tabDataLoaders[tabName];
        if (loader) {
            setTimeout(loader, 100);
        }
    }

    async showShopTab(tabName) {
        console.log(`🛒 Переход к вкладке магазина: ${tabName}`);
        
        this.domCache.shopTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.shopTab === tabName);
        });
        
        const shopCategories = document.querySelectorAll('.shop-category');
        shopCategories.forEach(category => {
            category.classList.toggle('hidden', category.id !== `shop-${tabName}`);
        });
        
        // Загрузка данных категории
        this.loadWithCache(`shop-${tabName}`, updateShopUI);
    }

    // ============================================
    // СИСТЕМА КЭШИРОВАНИЯ ДАННЫХ
    // ============================================

    async loadWithCache(cacheKey, dataLoader, forceRefresh = false) {
        const now = Date.now();
        const cachedItem = ApplicationState.cachedData.get(cacheKey);
        
        // Проверка актуальности кэша
        if (!forceRefresh && cachedItem && 
            (now - cachedItem.timestamp) < MobileUISettings.cacheTTL) {
            console.log(`📦 Используем кэш: ${cacheKey}`);
            return cachedItem.data;
        }
        
        // Загрузка новых данных
        try {
            console.log(`🔄 Загрузка данных: ${cacheKey}`);
            const data = await dataLoader();
            
            // Сохранение в кэш
            ApplicationState.cachedData.set(cacheKey, {
                data: data,
                timestamp: now,
                expires: now + MobileUISettings.cacheTTL
            });
            
            return data;
        } catch (error) {
            console.error(`❌ Ошибка загрузки ${cacheKey}:`, error);
            
            // Использование устаревших данных при ошибке
            if (cachedItem) {
                console.log(`⚠️ Используем устаревшие данные из кэша: ${cacheKey}`);
                return cachedItem.data;
            }
            
            throw error;
        }
    }

    clearCache(cacheKey = null) {
        if (cacheKey) {
            ApplicationState.cachedData.delete(cacheKey);
        } else {
            ApplicationState.cachedData.clear();
        }
        console.log('🧹 Кэш очищен');
    }

    // ============================================
    // ОПТИМИЗИРОВАННЫЕ ФУНКЦИИ UI
    // ============================================

    async updateUsersList() {
        const usersList = this.frequentlyUsedElements.usersList;
        const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
        
        if (!usersList) return;
        
        // Отображение состояния загрузки
        usersList.innerHTML = this.createLoadingIndicator('Загрузка игроков...');
        
        try {
            const data = await this.loadWithCache('allPlayers', () => 
                window.apiRequest('/api/all_players')
            );
            
            const apiPlayers = data.players || [];
            
            // Оптимизированная фильтрация
            const filteredUsers = apiPlayers.filter(player => {
                if (player.userId === window.userData?.userId) return false;
                if (searchTerm && player.username) {
                    return player.username.toLowerCase().includes(searchTerm);
                }
                return true;
            });
            
            if (filteredUsers.length === 0) {
                usersList.innerHTML = this.createEmptyState('Игроки не найдены');
                return;
            }
            
            // Виртуальный скроллинг для больших списков
            if (filteredUsers.length > MobileUISettings.lazyLoadThreshold) {
                this.renderVirtualList(usersList, filteredUsers, this.renderUserItem);
            } else {
                usersList.innerHTML = '';
                filteredUsers.forEach(player => {
                    usersList.appendChild(this.renderUserItem(player));
                });
            }
            
        } catch (error) {
            console.error('Ошибка загрузки списка игроков:', error);
            usersList.innerHTML = this.createErrorState('Ошибка загрузки');
        }
    }

    renderUserItem(player) {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.dataset.userId = player.userId;
        
        // Определение общей скорости
        const totalSpeed = player.totalSpeed || player.total_speed || 0;
        
        userItem.innerHTML = `
            <div class="user-name">${this.escapeHtml(player.username || 'Игрок')}</div>
            <div class="user-balance">${(player.balance || 0).toFixed(9)} S</div>
            <div class="user-speed">
                ${totalSpeed.toFixed(9)} S/сек
            </div>
        `;
        
        // Оптимизированный обработчик клика
        userItem.addEventListener('click', () => this.selectUserForTransfer(player), { once: true });
        
        return userItem;
    }

    async updateLeaderboard() {
        try {
            const data = await this.loadWithCache('leaderboardData', () =>
                window.apiRequest('/api/leaderboard?type=balance&limit=20')
            );
            
            if (!data || !data.success || !data.leaderboard) {
                this.frequentlyUsedElements.leaderboard.innerHTML = 
                    this.createEmptyState('🏆 Стань первым в рейтинге!');
                return;
            }
            
            this.renderLeaderboard(data.leaderboard, 'balance');
            
        } catch (error) {
            console.error('Ошибка обновления рейтинга:', error);
            this.frequentlyUsedElements.leaderboard.innerHTML = 
                this.createErrorState('Ошибка загрузки рейтинга');
        }
    }

    async updateSpeedLeaderboard() {
        try {
            const data = await this.loadWithCache('speedLeaderboardData', () =>
                window.apiRequest('/api/leaderboard?type=speed&limit=20')
            );
            
            if (!data || !data.success || !data.leaderboard) {
                this.frequentlyUsedElements.speedLeaderboard.innerHTML = 
                    this.createEmptyState('🏆 Стань первым в рейтинге скорости!');
                return;
            }
            
            this.renderLeaderboard(data.leaderboard, 'speed');
            
        } catch (error) {
            console.error('Ошибка обновления рейтинга скорости:', error);
            this.frequentlyUsedElements.speedLeaderboard.innerHTML = 
                this.createErrorState('Ошибка загрузки рейтинга');
        }
    }

    renderLeaderboard(players, type) {
        const isSpeed = type === 'speed';
        const currentUserId = window.userData?.userId;
        
        const leaderboardHTML = players.map((player, index) => {
            if (!player || typeof player !== 'object') return '';
            
            const rank = index + 1;
            const name = player.username || `Игрок ${rank}`;
            const isCurrent = player.userId === currentUserId;
            const currentClass = isCurrent ? 'current-player' : '';
            
            if (isSpeed) {
                const totalSpeed = player.totalSpeed || player.total_speed || 0;
                return `
                    <div class="leader-item ${currentClass}" data-rank="${rank}">
                        <div class="leader-rank">${rank} место</div>
                        <div class="leader-name ${currentClass}">${name} ${isCurrent ? '👑' : ''}</div>
                        <div class="leader-speed">${totalSpeed.toFixed(9)} S/сек</div>
                    </div>
                `;
            } else {
                const balance = player.balance || 0;
                return `
                    <div class="leader-item ${currentClass}" data-rank="${rank}">
                        <div class="leader-rank">${rank} место</div>
                        <div class="leader-name ${currentClass}">${name} ${isCurrent ? '👑' : ''}</div>
                        <div class="leader-balance">${balance.toFixed(9)} S</div>
                    </div>
                `;
            }
        }).join('');
        
        const targetElement = isSpeed ? 
            this.frequentlyUsedElements.speedLeaderboard : 
            this.frequentlyUsedElements.leaderboard;
            
        if (targetElement) {
            targetElement.innerHTML = leaderboardHTML;
        }
    }

    // ============================================
    // СИСТЕМА УВЕДОМЛЕНИЙ
    // ============================================

    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        const titles = {
            success: 'Успех',
            error: 'Ошибка',
            warning: 'Внимание',
            info: 'Информация'
        };
        
        notification.innerHTML = `
            <div class="notification-icon">${icons[type]}</div>
            <div class="notification-content">
                <div class="notification-title">${titles[type]}</div>
                <div class="notification-message">${this.escapeHtml(message)}</div>
            </div>
            <button class="notification-close" aria-label="Закрыть">×</button>
        `;
        
        // Добавление стилей
        notification.style.cssText = `
            display: flex;
            align-items: center;
            padding: 12px 16px;
            margin-bottom: 10px;
            background: ${this.getNotificationColor(type)};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease-out;
            max-width: 100%;
            min-width: 280px;
        `;
        
        // Добавление в контейнер
        this.domCache.notificationContainer.appendChild(notification);
        
        // Обработчик закрытия
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => this.removeNotification(notification));
        
        // Автоматическое закрытие
        if (duration > 0) {
            setTimeout(() => this.removeNotification(notification), duration);
        }
        
        return notification;
    }

    getNotificationColor(type) {
        const colors = {
            success: '#4CAF50',
            error: '#F44336',
            warning: '#FF9800',
            info: '#2196F3'
        };
        return colors[type] || '#2196F3';
    }

    removeNotification(notification) {
        if (!notification || !notification.parentNode) return;
        
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    // ============================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И УТИЛИТЫ
    // ============================================

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    createLoadingIndicator(text) {
        return `
            <div class="loading-indicator">
                <div class="loading-spinner"></div>
                <div class="loading-text">${text}</div>
            </div>
        `;
    }

    createEmptyState(text) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-text">${text}</div>
            </div>
        `;
    }

    createErrorState(text) {
        return `
            <div class="error-state">
                <div class="error-state-icon">⚠️</div>
                <div class="error-state-text">${text}</div>
            </div>
        `;
    }

    // ============================================
    // ВИРТУАЛЬНЫЙ СКРОЛЛИНГ И ЛЕНИВАЯ ЗАГРУЗКА
    // ============================================

    initializeVirtualScroll() {
        this.virtualScrollContainers = new Set();
        this.intersectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadLazyContent(entry.target);
                    }
                });
            },
            { threshold: 0.1 }
        );
    }

    renderVirtualList(container, items, renderItem) {
        // Простая реализация виртуального скроллинга
        const visibleItems = 10;
        let startIndex = 0;
        
        const renderVisibleItems = () => {
            const endIndex = Math.min(startIndex + visibleItems, items.length);
            const visibleSlice = items.slice(startIndex, endIndex);
            
            container.innerHTML = '';
            visibleSlice.forEach(item => {
                container.appendChild(renderItem(item));
            });
        };
        
        // Обработчик скролла
        container.addEventListener('scroll', this.throttle(() => {
            const scrollTop = container.scrollTop;
            const itemHeight = 60;
            startIndex = Math.floor(scrollTop / itemHeight);
            renderVisibleItems();
        }, MobileUISettings.throttleDelay));
        
        renderVisibleItems();
    }

    setupImageLazyLoading() {
        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => {
            this.intersectionObserver.observe(img);
        });
    }

    loadLazyContent(element) {
        if (element.tagName === 'IMG' && element.dataset.src) {
            element.src = element.dataset.src;
            element.removeAttribute('data-src');
            this.intersectionObserver.unobserve(element);
        }
    }

    // ============================================
    // МОНИТОРИНГ ПРОИЗВОДИТЕЛЬНОСТИ
    // ============================================

    setupPerformanceMonitoring() {
        if (window.PerformanceObserver) {
            // Мониторинг Long Tasks
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 50) {
                        console.warn('⚠️ Долгая задача:', entry);
                    }
                }
            });
            
            observer.observe({ entryTypes: ['longtask'] });
        }
        
        // Мониторинг использования памяти
        setInterval(() => {
            if (window.performance && window.performance.memory) {
                const memory = window.performance.memory;
                if (memory.usedJSHeapSize > 100 * 1024 * 1024) {
                    console.warn('⚠️ Высокое использование памяти:', 
                        Math.round(memory.usedJSHeapSize / 1024 / 1024) + 'MB');
                    this.clearCache();
                }
            }
        }, 30000);
    }

    // ============================================
    // ОБРАБОТЧИКИ СОСТОЯНИЯ СЕТИ
    // ============================================

    handleOnlineStatus() {
        ApplicationState.isOnline = true;
        this.showNotification('Соединение восстановлено', 'success');
        
        // Автоматическая синхронизация
        setTimeout(() => {
            if (window.syncUserData) {
                window.syncUserData();
            }
        }, 2000);
    }

    handleOfflineStatus() {
        ApplicationState.isOnline = false;
        this.showNotification('Работаем в офлайн-режиме', 'warning');
    }

    // ============================================
    // ОПТИМИЗИРОВАННОЕ ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
    // ============================================

    updateUI() {
        if (!window.userData) return;
        
        // Оптимизированное обновление только измененных элементов
        requestAnimationFrame(() => {
            this.updateBalance();
            this.updateClickStats();
            this.updateMiningStats();
        });
    }

    updateBalance() {
        const balanceElement = this.frequentlyUsedElements.balanceValue;
        if (balanceElement && window.userData) {
            const balance = window.userData.balance || 0.000000100;
            if (balanceElement.textContent !== balance.toFixed(9) + ' S') {
                balanceElement.textContent = balance.toFixed(9) + ' S';
            }
        }
    }

    updateClickStats() {
        const clickValueElement = this.frequentlyUsedElements.clickValue;
        const clickSpeedElement = this.frequentlyUsedElements.clickSpeed;
        
        if (clickValueElement || clickSpeedElement) {
            const clickPower = typeof window.calculateClickPower === 'function' ? 
                window.calculateClickPower() : 0.000000001;
            
            if (clickValueElement && clickValueElement.textContent !== clickPower.toFixed(9)) {
                clickValueElement.textContent = clickPower.toFixed(9);
            }
            
            if (clickSpeedElement) {
                const speedText = clickPower.toFixed(9) + ' S/сек';
                if (clickSpeedElement.textContent !== speedText) {
                    clickSpeedElement.textContent = speedText;
                }
            }
        }
    }

    updateMiningStats() {
        const mineSpeedElement = this.frequentlyUsedElements.mineSpeed;
        if (mineSpeedElement) {
            let miningSpeed = 0.000000000;
            try {
                miningSpeed = typeof window.calculateMiningSpeed === 'function' ? 
                    window.calculateMiningSpeed() : 0.000000000;
                
                if (isNaN(miningSpeed) || !isFinite(miningSpeed) || miningSpeed < 0) {
                    miningSpeed = 0.000000000;
                }
            } catch (error) {
                console.error('Ошибка получения скорости майнинга:', error);
                miningSpeed = 0.000000000;
            }
            
            const speedText = miningSpeed.toFixed(9) + ' S/сек';
            if (mineSpeedElement.textContent !== speedText) {
                mineSpeedElement.textContent = speedText;
            }
        }
    }

    // ============================================
    // ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
    // ============================================

    initializeApplication() {
        console.log('🚀 Инициализация приложения...');
        
        // Загрузка пользовательских данных
        this.loadUserData();
        
        // Проверка API соединения
        this.checkApiConnection();
        
        // Установка интервалов обновления
        this.setupUpdateIntervals();
        
        console.log('✅ Приложение полностью инициализировано!');
    }

    async loadUserData() {
        try {
            // Загрузка данных пользователя
            if (window.loadUserDataFromStorage) {
                await window.loadUserDataFromStorage();
            }
            
            // Первоначальное обновление UI
            this.updateUI();
            
            // Загрузка начальных данных
            this.loadInitialData();
            
        } catch (error) {
            console.error('Ошибка загрузки данных пользователя:', error);
            this.showNotification('Ошибка загрузки данных', 'error');
        }
    }

    async checkApiConnection() {
        try {
            const isConnected = await window.checkApiConnection();
            if (isConnected) {
                console.log('✅ API подключено');
            } else {
                console.log('📴 API недоступно, работаем офлайн');
            }
        } catch (error) {
            console.error('Ошибка проверки соединения:', error);
        }
    }

    setupUpdateIntervals() {
        // Обновление баланса каждые 30 секунд
        setInterval(() => {
            if (window.userData && this.shouldUpdateBalance()) {
                this.updateUI();
            }
        }, 30000);
        
        // Синхронизация с сервером каждые 2 минуты
        setInterval(() => {
            if (ApplicationState.isOnline && window.syncUserData) {
                window.syncUserData();
            }
        }, 120000);
        
        // Очистка кэша каждые 5 минут
        setInterval(() => {
            this.clearCache();
        }, 300000);
    }

    shouldUpdateBalance() {
        // Логика определения необходимости обновления баланса
        return ApplicationState.isOnline || 
               Date.now() - ApplicationState.lastUpdateTimestamp > 60000;
    }

    loadInitialData() {
        // Отложенная загрузка некритичных данных
        setTimeout(() => {
            this.loadWithCache('leaderboardData', window.updateLeaderboard);
            this.loadWithCache('referralStats', window.loadReferralStats);
        }, 2000);
    }

    // ============================================
    // ГОРЯЧИЕ КЛАВИШИ И ДОСТУПНОСТЬ
    // ============================================

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Только если не в поле ввода
            if (event.target.tagName === 'INPUT' || 
                event.target.tagName === 'TEXTAREA') {
                return;
            }
            
            switch(event.key) {
                case '1':
                case 'ArrowLeft':
                    this.navigateToPreviousSection();
                    break;
                case '2':
                case 'ArrowRight':
                    this.navigateToNextSection();
                    break;
                case 'Escape':
                    this.goToMainSection();
                    break;
            }
        });
    }

    navigateToPreviousSection() {
        const sections = ['main', 'top', 'transfer', 'shop', 'games', 'referral'];
        const currentIndex = sections.indexOf(ApplicationState.currentSection);
        if (currentIndex > 0) {
            this.showSection(sections[currentIndex - 1]);
        }
    }

    navigateToNextSection() {
        const sections = ['main', 'top', 'transfer', 'shop', 'games', 'referral'];
        const currentIndex = sections.indexOf(ApplicationState.currentSection);
        if (currentIndex < sections.length - 1) {
            this.showSection(sections[currentIndex + 1]);
        }
    }

    goToMainSection() {
        if (ApplicationState.currentSection !== 'main') {
            this.showSection('main');
        }
    }

    // ============================================
    // ОЧИСТКА РЕСУРСОВ
    // ============================================

    cleanup() {
        // Отключение всех слушателей событий
        document.removeEventListener('click', this.handleDelegatedClick);
        document.removeEventListener('touchstart', this.handleTouchStart);
        document.removeEventListener('touchend', this.handleTouchEnd);
        document.removeEventListener('input', this.handleDelegatedInput);
        window.removeEventListener('online', this.handleOnlineStatus);
        window.removeEventListener('offline', this.handleOfflineStatus);
        
        // Очистка интервалов
        clearInterval(this.updateInterval);
        clearInterval(this.syncInterval);
        clearInterval(this.cacheCleanupInterval);
        
        // Очистка кэша
        this.clearCache();
        
        // Отключение IntersectionObserver
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
        }
        
        console.log('🧹 Ресурсы приложения очищены');
    }
}

// ============================================
// ГЛОБАЛЬНЫЙ ЭКСПОРТ И ИНИЦИАЛИЗАЦИЯ
// ============================================

// Создание глобального экземпляра интерфейса
window.MobileInterface = new MobileInterfaceManager();

// Экспорт основных функций для глобального доступа
window.showSection = (sectionName) => window.MobileInterface.showSection(sectionName);
window.showGameTab = (tabName) => window.MobileInterface.showGameTab(tabName);
window.showShopTab = (tabName) => window.MobileInterface.showShopTab(tabName);
window.showNotification = (message, type, duration) => 
    window.MobileInterface.showNotification(message, type, duration);
window.updateUI = () => window.MobileInterface.updateUI();
window.updateUsersList = () => window.MobileInterface.updateUsersList();
window.updateLeaderboard = () => window.MobileInterface.updateLeaderboard();
window.updateSpeedLeaderboard = () => window.MobileInterface.updateSpeedLeaderboard();

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 Инициализация мобильного интерфейса...');
    
    // Отложенная инициализация для улучшения времени загрузки
    requestAnimationFrame(() => {
        window.MobileInterface.initializeApplication();
    });
    
    // Предотвращение быстрого двойного нажатия
    document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
    
    // Оптимизация для мобильных устройств
    if ('ontouchstart' in window) {
        document.documentElement.style.touchAction = 'manipulation';
    }
});

// Экспорт для использования в других модулях
export default MobileInterfaceManager;
