// fix.js - исправление для немедленного применения
console.log('🔧 Немедленное исправление API...');

window.checkApiConnection = async function() {
    console.log('✅ checkApiConnection РАБОТАЕТ!');
    try {
        const response = await fetch('https://b9339c3b-8a22-434d-b97a-a426ac75c328-00-2vzfhw3hnozb6.sisko.replit.dev/api/health');
        if (response.ok) {
            window.updateApiStatus('connected', 'Sparkcoin API');
            return true;
        }
    } catch (e) {
        window.updateApiStatus('disconnected', 'Офлайн режим');
    }
    return false;
};

window.updateApiStatus = function(status, message) {
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.className = `api-status ${status}`;
        apiStatus.textContent = `API: ${message}`;
    }
    console.log(`📡 Статус: ${message}`);
};

console.log('✅ Исправление применено!');
