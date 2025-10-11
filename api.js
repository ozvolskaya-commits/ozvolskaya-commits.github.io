// Временный тестовый api.js
console.log('🌐 API для тестирования CORS');

window.CONFIG = {
    API_BASE_URL: 'https://b9339c3b-8a22-434d-b97a-a426ac75c328-00-2vzfhw3hnozb6.sisko.replit.dev'
};

window.apiRequest = async function(endpoint, options = {}) {
    const url = `${window.CONFIG.API_BASE_URL}${endpoint}`;
    console.log(`🔄 API запрос: ${url}`);
    
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            mode: 'cors'
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ API ответ:`, data);
            return data;
        } else {
            console.warn(`⚠️ API ошибка: ${response.status}`);
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.log('📴 API недоступно:', error.message);
        // Простые заглушки
        return {
            success: true,
            offline: true,
            winners: [
                {username: 'Офлайн 1', netWinnings: 0.000000500},
                {username: 'Офлайн 2', netWinnings: 0.000000300}
            ]
        };
    }
};

console.log('✅ API загружен!');
