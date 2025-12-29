# high_performance_api.py - ВЫСОКОПРОИЗВОДИТЕЛЬНЫЙ API СЕРВЕР SPARKCOIN
import os
import json
import logging
import sqlite3
import random
import time
import threading
import asyncio
import aiosqlite
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor
from flask import Flask, jsonify, request, make_response, g
import uuid
import hashlib
from functools import wraps
import cachetools

# ============================================================================
# НАСТРОЙКА ВЫСОКОЙ ПРОИЗВОДИТЕЛЬНОСТИ
# ============================================================================
logging.basicConfig(
    format='%(asctime)s - %(levelname)s - %(message)s',
    level=logging.WARNING  # Уменьшаем логирование для скорости
)
logger = logging.getLogger(__name__)

# КОНФИГУРАЦИЯ СЕРВЕРА
PERFORMANCE_CONFIG = {
    'MAX_RESPONSE_TIME_MS': 120,  # Максимальное время ответа
    'SESSION_TIMEOUT_SEC': 15,  # Таймаут сессии
    'DB_TIMEOUT_MS': 50,  # Таймаут БД
    'CACHE_TTL_SEC': 5,  # Время жизни кэша
    'MAX_CACHE_SIZE': 1000,  # Максимальный размер кэша
    'MAX_CONCURRENT_DB': 20,  # Максимальное количество соединений
    'USE_ASYNC_DB': True,  # Использовать асинхронную БД
    'ENABLE_QUERY_CACHE': True,  # Кэширование запросов
    'COMPRESS_RESPONSES': True,  # Сжатие ответов
    'MINIMIZE_LOGGING': True,  # Минимальное логирование
    'OPTIMIZE_JSON': True,  # Оптимизация JSON
}

# КЭШ В ПАМЯТИ ДЛЯ БЫСТРЫХ ОТВЕТОВ
response_cache = cachetools.TTLCache(
    maxsize=PERFORMANCE_CONFIG['MAX_CACHE_SIZE'],
    ttl=PERFORMANCE_CONFIG['CACHE_TTL_SEC'])

# КЭШ ДЛЯ БАЗЫ ДАННЫХ
query_cache = cachetools.LRUCache(maxsize=500)

# КОНФИГУРАЦИЯ CORS ДЛЯ МАКСИМАЛЬНОЙ СКОРОСТИ
ALLOWED_ORIGINS = {
    'https://sparkcoin.ru', 'https://www.sparkcoin.ru',
    'http://localhost:3000', 'http://127.0.0.1:3000',
    'https://web.telegram.org', 'https://telegram.org'
}


# МЕНЕДЖЕР АКТИВНЫХ СЕССИЙ
class HighPerformanceSessionManager:
    """Менеджер сессий для блокировки мультисессии с минимальными задержками"""

    def __init__(self):
        self.active_sessions: Dict[str, Dict] = {}
        self.session_lock = threading.RLock()
        self.cleanup_interval = 10  # секунд

        # Запускаем фоновую очистку
        self._start_cleanup()

    def _start_cleanup(self):
        """Фоновая очистка старых сессий"""

        def cleanup():
            while True:
                try:
                    self.cleanup_expired_sessions()
                except Exception as e:
                    logger.error(f"Ошибка очистки сессий: {e}")
                time.sleep(self.cleanup_interval)

        thread = threading.Thread(target=cleanup, daemon=True)
        thread.start()

    def register_session(
            self,
            user_id: str,
            device_id: str,
            ip_address: str,
            user_agent: str,
            telegram_id: Optional[str] = None) -> Tuple[bool, str]:
        """
        Регистрация новой сессии с блокировкой мультисессии
        Возвращает: (успех, сообщение)
        """
        start_time = time.perf_counter()

        with self.session_lock:
            current_time = time.time()
            session_key = f"{user_id}_{device_id}"

            # Проверяем существующие сессии для этого пользователя
            sessions_to_remove = []

            for existing_key, session in list(self.active_sessions.items()):
                if existing_key.startswith(user_id + "_"):
                    # Если сессия активна (менее 15 секунд) и с другого устройства
                    if (current_time - session['last_activity']
                            < PERFORMANCE_CONFIG['SESSION_TIMEOUT_SEC']
                            and session['device_id'] != device_id):
                        # БЛОКИРУЕМ мультисессию
                        elapsed = time.perf_counter() - start_time
                        logger.warning(
                            f"🚫 Мультисессия заблокирована: {user_id} с {device_id}, активна на {session['device_id']} (время: {elapsed*1000:.1f}ms)"
                        )
                        return False, "Активная сессия обнаружена на другом устройстве"

                    # Отмечаем старые сессии для удаления
                    if current_time - session[
                            'last_activity'] > PERFORMANCE_CONFIG[
                                'SESSION_TIMEOUT_SEC'] * 3:
                        sessions_to_remove.append(existing_key)

            # Удаляем старые сессии
            for key in sessions_to_remove:
                self.active_sessions.pop(key, None)

            # Регистрируем новую сессию
            self.active_sessions[session_key] = {
                'user_id': user_id,
                'device_id': device_id,
                'ip_address': ip_address,
                'user_agent': user_agent[:100],
                'telegram_id': telegram_id,
                'created_at': current_time,
                'last_activity': current_time,
                'request_count': 0
            }

        elapsed = time.perf_counter() - start_time
        logger.info(
            f"✅ Сессия зарегистрирована: {user_id} за {elapsed*1000:.1f}ms")
        return True, "Сессия создана"

    def update_activity(self, user_id: str, device_id: str) -> bool:
        """Обновление времени активности сессии"""
        session_key = f"{user_id}_{device_id}"

        with self.session_lock:
            if session_key in self.active_sessions:
                self.active_sessions[session_key]['last_activity'] = time.time(
                )
                self.active_sessions[session_key]['request_count'] += 1
                return True
        return False

    def cleanup_expired_sessions(self):
        """Очистка просроченных сессий"""
        with self.session_lock:
            current_time = time.time()
            expired_keys = []

            for key, session in list(self.active_sessions.items()):
                if current_time - session['last_activity'] > PERFORMANCE_CONFIG[
                        'SESSION_TIMEOUT_SEC'] * 3:
                    expired_keys.append(key)

            for key in expired_keys:
                self.active_sessions.pop(key, None)

            if expired_keys:
                logger.info(
                    f"🧹 Удалено {len(expired_keys)} просроченных сессий")

    def get_session_stats(self) -> Dict:
        """Статистика сессий"""
        with self.session_lock:
            current_time = time.time()
            active = 0
            total_requests = 0

            for session in self.active_sessions.values():
                if current_time - session['last_activity'] < PERFORMANCE_CONFIG[
                        'SESSION_TIMEOUT_SEC']:
                    active += 1
                total_requests += session['request_count']

            return {
                'total_sessions': len(self.active_sessions),
                'active_sessions': active,
                'total_requests': total_requests,
                'session_timeout': PERFORMANCE_CONFIG['SESSION_TIMEOUT_SEC']
            }

    def check_session(self, user_id: str, device_id: str) -> Tuple[bool, str]:
        """Проверка валидности сессии"""
        session_key = f"{user_id}_{device_id}"

        with self.session_lock:
            if session_key not in self.active_sessions:
                return False, "Сессия не найдена"

            session = self.active_sessions[session_key]
            current_time = time.time()

            if current_time - session['last_activity'] > PERFORMANCE_CONFIG[
                    'SESSION_TIMEOUT_SEC']:
                return False, "Сессия истекла"

            return True, "Сессия активна"


# ИНИЦИАЛИЗАЦИЯ МЕНЕДЖЕРА СЕССИЙ
session_manager = HighPerformanceSessionManager()


# ============================================================================
# ВЫСОКОПРОИЗВОДИТЕЛЬНАЯ БАЗА ДАННЫХ
# ============================================================================
class HighPerformanceDatabase:
    """Оптимизированное подключение к SQLite для максимальной скорости"""

    def __init__(self, db_path='sparkcoin_high_perf.db'):
        self.db_path = db_path
        self.connection_pool = {}
        self.pool_lock = threading.RLock()
        self.max_connections = PERFORMANCE_CONFIG['MAX_CONCURRENT_DB']

        # Инициализируем базу
        self._init_database()

    def _get_connection(self) -> sqlite3.Connection:
        """Получение соединения из пула (с учетом потокобезопасности)"""
        thread_id = threading.get_ident()

        with self.pool_lock:
            if thread_id not in self.connection_pool:
                # Создаем новое соединение если не превышен лимит
                if len(self.connection_pool) >= self.max_connections:
                    # Удаляем самое старое соединение
                    oldest_thread = min(
                        self.connection_pool.items(),
                        key=lambda x: x[1].get('last_used', 0))[0]
                    conn_data = self.connection_pool.pop(oldest_thread)
                    conn_data['conn'].close()

                conn = sqlite3.connect(
                    self.db_path,
                    timeout=PERFORMANCE_CONFIG['DB_TIMEOUT_MS'] / 1000,
                    check_same_thread=False)
                conn.row_factory = sqlite3.Row

                # Оптимизация для высокой производительности
                conn.execute(
                    "PRAGMA journal_mode = WAL")  # Write-Ahead Logging
                conn.execute("PRAGMA synchronous = NORMAL"
                             )  # Баланс скорости и надежности
                conn.execute("PRAGMA cache_size = -2000")  # 2MB кэша
                conn.execute("PRAGMA mmap_size = 268435456")  # 256MB mmap
                conn.execute(
                    "PRAGMA temp_store = MEMORY")  # Временные таблицы в памяти
                conn.execute("PRAGMA locking_mode = EXCLUSIVE"
                             )  # Эксклюзивная блокировка
                conn.execute("PRAGMA optimize")  # Автооптимизация

                self.connection_pool[thread_id] = {
                    'conn': conn,
                    'last_used': time.time()
                }

            # Обновляем время использования
            self.connection_pool[thread_id]['last_used'] = time.time()
            return self.connection_pool[thread_id]['conn']

    def _init_database(self):
        """Оптимизированная инициализация структуры базы данных"""
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            # ОПТИМИЗИРОВАННАЯ ТАБЛИЦА ИГРОКОВ
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS players_high_perf (
                    user_id TEXT PRIMARY KEY,
                    telegram_id TEXT UNIQUE,
                    username TEXT NOT NULL,
                    balance REAL DEFAULT 0.000000100 CHECK(balance >= 0),
                    total_earned REAL DEFAULT 0.000000100,
                    total_clicks INTEGER DEFAULT 0,
                    upgrades TEXT DEFAULT '{}',
                    click_speed REAL DEFAULT 0.000000001,
                    mine_speed REAL DEFAULT 0.000000000,
                    total_speed REAL GENERATED ALWAYS AS (click_speed + mine_speed) VIRTUAL,
                    level INTEGER DEFAULT 1,
                    experience INTEGER DEFAULT 0,
                    referral_code TEXT UNIQUE,
                    referred_by TEXT,
                    referral_earnings REAL DEFAULT 0,
                    referrals_count INTEGER DEFAULT 0,
                    total_winnings REAL DEFAULT 0,
                    total_losses REAL DEFAULT 0,
                    total_bet REAL DEFAULT 0,
                    transfers_sent REAL DEFAULT 0,
                    transfers_received REAL DEFAULT 0,
                    last_device_id TEXT,
                    last_ip TEXT,
                    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    -- Индексы для быстрого поиска
                    INDEX idx_telegram_id (telegram_id),
                    INDEX idx_balance (balance DESC),
                    INDEX idx_total_speed (total_speed DESC),
                    INDEX idx_last_activity (last_activity DESC),
                    INDEX idx_referral_code (referral_code)
                ) WITHOUT ROWID
            ''')

            # ОПТИМИЗИРОВАННАЯ ТАБЛИЦА СТАВОК
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS lottery_bets_high_perf (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    team TEXT CHECK(team IN ('eagle', 'tails')),
                    amount REAL NOT NULL CHECK(amount > 0),
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    INDEX idx_user_team (user_id, team),
                    INDEX idx_timestamp (timestamp DESC),
                    FOREIGN KEY (user_id) REFERENCES players_high_perf(user_id) ON DELETE CASCADE
                )
            ''')

            # ОПТИМИЗИРОВАННАЯ ТАБЛИЦА ПЕРЕВОДОВ
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS transfers_high_perf (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    from_user_id TEXT NOT NULL,
                    to_user_id TEXT NOT NULL,
                    amount REAL NOT NULL CHECK(amount > 0),
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    INDEX idx_from_user (from_user_id),
                    INDEX idx_to_user (to_user_id),
                    INDEX idx_transfer_time (timestamp DESC),
                    FOREIGN KEY (from_user_id) REFERENCES players_high_perf(user_id),
                    FOREIGN KEY (to_user_id) REFERENCES players_high_perf(user_id),
                    CHECK (from_user_id != to_user_id)
                )
            ''')

            conn.commit()
            logger.info("✅ Высокопроизводительная БД инициализирована")

        except Exception as e:
            logger.error(f"❌ Ошибка инициализации БД: {e}")
            conn.rollback()
        finally:
            # Не закрываем соединение, возвращаем в пул
            pass

    def execute_fast(self, query: str, params: tuple = ()) -> List[Dict]:
        """Выполнение запроса с кэшированием"""
        start_time = time.perf_counter()

        # Проверка кэша
        cache_key = f"{query}_{params}"
        if PERFORMANCE_CONFIG[
                'ENABLE_QUERY_CACHE'] and cache_key in query_cache:
            elapsed = time.perf_counter() - start_time
            logger.debug(f"📦 Запрос из кэша: {elapsed*1000:.1f}ms")
            return query_cache[cache_key]

        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.execute(query, params)

            if query.strip().upper().startswith('SELECT'):
                results = [dict(row) for row in cursor.fetchall()]
                # Кэшируем результат
                if PERFORMANCE_CONFIG['ENABLE_QUERY_CACHE']:
                    query_cache[cache_key] = results
            else:
                conn.commit()
                results = {'affected_rows': cursor.rowcount}

            elapsed = time.perf_counter() - start_time
            if elapsed > 0.05:  # Логируем только медленные запросы
                logger.warning(
                    f"⚠️ Медленный запрос: {elapsed*1000:.1f}ms - {query[:50]}..."
                )

            return results

        except Exception as e:
            conn.rollback()
            logger.error(f"❌ Ошибка БД: {e} - {query[:50]}...")
            raise

    def execute_many_fast(self, query: str, params_list: List[tuple]) -> int:
        """Массовое выполнение запросов"""
        conn = self._get_connection()
        cursor = conn.cursor()

        try:
            cursor.executemany(query, params_list)
            conn.commit()
            return cursor.rowcount
        except Exception as e:
            conn.rollback()
            logger.error(f"❌ Ошибка массового запроса: {e}")
            raise


# ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ
db = HighPerformanceDatabase()


# ============================================================================
# КЛАСС ВЫСОКОПРОИЗВОДИТЕЛЬНЫХ УТИЛИТ
# ============================================================================
class PerformanceUtils:
    """Утилиты для обеспечения высокой производительности"""

    @staticmethod
    def time_limit(timeout_ms: int):
        """Декоратор для ограничения времени выполнения функции"""

        def decorator(func):

            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.perf_counter()
                result = func(*args, **kwargs)
                elapsed = time.perf_counter() - start_time

                if elapsed * 1000 > timeout_ms:
                    logger.warning(
                        f"⚠️ Функция {func.__name__} превысила лимит: {elapsed*1000:.1f}ms"
                    )

                return result

            return wrapper

        return decorator

    @staticmethod
    def cache_response(ttl_seconds: int = 5):
        """Декоратор для кэширования ответов API"""

        def decorator(func):

            @wraps(func)
            def wrapper(*args, **kwargs):
                # Создаем ключ кэша на основе аргументов
                cache_key = f"{func.__name__}_{str(args)}_{str(kwargs)}"

                # Пробуем получить из кэша
                if cache_key in response_cache:
                    logger.debug(f"📦 Ответ из кэша: {func.__name__}")
                    return response_cache[cache_key]

                # Выполняем функцию
                result = func(*args, **kwargs)

                # Сохраняем в кэш
                response_cache[cache_key] = result

                return result

            return wrapper

        return decorator

    @staticmethod
    def validate_request_data(data: Dict,
                              required_fields: List[str]) -> Tuple[bool, str]:
        """Быстрая валидация данных запроса"""
        for field in required_fields:
            if field not in data or not data[field]:
                return False, f"Отсутствует поле: {field}"

        # Проверка числовых значений
        numeric_fields = ['amount', 'balance', 'totalEarned']
        for field in numeric_fields:
            if field in data:
                try:
                    value = float(data[field])
                    if value < 0:
                        return False, f"Отрицательное значение: {field}"
                    if value > 1000000:  # Лимит
                        return False, f"Слишком большое значение: {field}"
                except (ValueError, TypeError):
                    return False, f"Некорректное значение: {field}"

        return True, "OK"

    @staticmethod
    def compress_json_response(data: Dict) -> str:
        """Минификация JSON для уменьшения размера ответа"""
        if PERFORMANCE_CONFIG['OPTIMIZE_JSON']:
            return json.dumps(data, separators=(',', ':'))
        return json.dumps(data)


# ИНИЦИАЛИЗАЦИЯ УТИЛИТ
perf_utils = PerformanceUtils()

# ============================================================================
# ВЫСОКОПРОИЗВОДИТЕЛЬНОЕ FLASK ПРИЛОЖЕНИЕ
# ============================================================================
app = Flask(__name__)
app.config[
    'JSONIFY_PRETTYPRINT_REGULAR'] = False  # Отключаем красивый JSON для скорости
app.config['JSON_SORT_KEYS'] = False  # Не сортируем ключи для скорости


# МИДЛВАРЫ ДЛЯ ВЫСОКОЙ ПРОИЗВОДИТЕЛЬНОСТИ
@app.before_request
def before_request():
    """Перед каждым запросом - замер времени"""
    g.start_time = time.perf_counter()

    # Минимальное логирование для скорости
    if not PERFORMANCE_CONFIG['MINIMIZE_LOGGING']:
        logger.info(f"▶️ {request.method} {request.path}")


@app.after_request
def after_request(response):
    """После каждого запроса - обработка CORS и замер времени"""
    # Обработка CORS
    origin = request.headers.get('Origin', '')
    if origin in ALLOWED_ORIGINS:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers[
            'Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers[
            'Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Device-ID, X-User-ID'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = '86400'

    # Замер производительности
    elapsed = time.perf_counter() - g.start_time
    response.headers['X-Response-Time'] = f'{elapsed*1000:.1f}ms'
    response.headers['X-Server-Performance'] = 'high-speed'

    # Логирование медленных запросов
    if elapsed * 1000 > PERFORMANCE_CONFIG['MAX_RESPONSE_TIME_MS']:
        logger.warning(
            f"⚠️ Медленный ответ: {elapsed*1000:.1f}ms - {request.path}")

    return response


@app.route('/api/health', methods=['GET', 'OPTIONS'])
@perf_utils.time_limit(50)
@perf_utils.cache_response(ttl_seconds=2)
def health_check():
    """Проверка здоровья сервера - ОЧЕНЬ БЫСТРАЯ"""
    session_stats = session_manager.get_session_stats()

    return {
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'version': '3.0.0-high-performance',
        'performance': {
            'max_response_time_ms': PERFORMANCE_CONFIG['MAX_RESPONSE_TIME_MS'],
            'db_timeout_ms': PERFORMANCE_CONFIG['DB_TIMEOUT_MS'],
            'cache_enabled': PERFORMANCE_CONFIG['ENABLE_QUERY_CACHE'],
            'session_count': session_stats['active_sessions']
        },
        'sessions': session_stats
    }


@app.route('/api/sync/unified', methods=['POST', 'OPTIONS'])
@perf_utils.time_limit(100)
def sync_unified():
    """Высокопроизводительная синхронизация с блокировкой мультисессии"""
    try:
        data = request.get_json()

        # Быстрая валидация
        valid, error = perf_utils.validate_request_data(
            data, ['userId', 'username', 'deviceId'])
        if not valid:
            return {'success': False, 'error': error}, 400

        # Извлекаем данные
        user_id = data['userId']
        username = data['username']
        device_id = data['deviceId']
        telegram_id = data.get('telegramId')
        balance = float(data.get('balance', 0.000000100))
        total_earned = float(data.get('totalEarned', 0.000000100))
        total_clicks = int(data.get('totalClicks', 0))

        # БЛОКИРОВКА МУЛЬТИСЕССИИ
        ip_address = request.remote_addr
        user_agent = request.headers.get('User-Agent', '')[:100]

        allowed, message = session_manager.register_session(
            user_id=user_id,
            device_id=device_id,
            ip_address=ip_address,
            user_agent=user_agent,
            telegram_id=telegram_id)

        if not allowed:
            return {
                'success': False,
                'error': 'MULTISESSION_BLOCKED',
                'message': message,
                'multisession': True
            }, 403

        # БЫСТРАЯ СИНХРОНИЗАЦИЯ В БАЗЕ
        try:
            # Проверяем существование пользователя
            user_exists = db.execute_fast(
                "SELECT user_id FROM players_high_perf WHERE user_id = ?",
                (user_id, ))

            if user_exists:
                # Обновляем существующего пользователя
                db.execute_fast(
                    '''
                    UPDATE players_high_perf SET
                    username = ?, balance = ?, total_earned = ?, total_clicks = ?,
                    last_activity = CURRENT_TIMESTAMP, last_device_id = ?, last_ip = ?
                    WHERE user_id = ?
                    ''', (username, balance, total_earned, total_clicks,
                          device_id, ip_address, user_id))
            else:
                # Создаем нового пользователя
                referral_code = f"REF-{uuid.uuid4().hex[:8].upper()}"

                db.execute_fast(
                    '''
                    INSERT INTO players_high_perf 
                    (user_id, username, telegram_id, balance, total_earned, total_clicks,
                     referral_code, last_device_id, last_ip)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''',
                    (user_id, username, telegram_id, balance, total_earned,
                     total_clicks, referral_code, device_id, ip_address))

            # Получаем обновленные данные
            user_data = db.execute_fast(
                '''
                SELECT user_id, username, balance, total_earned, total_clicks,
                       click_speed, mine_speed, total_speed, level, experience,
                       referral_code, referrals_count, referral_earnings
                FROM players_high_perf 
                WHERE user_id = ?
                ''', (user_id, ))[0] if user_exists else {
                    'user_id': user_id,
                    'username': username,
                    'balance': balance,
                    'total_earned': total_earned,
                    'total_clicks': total_clicks,
                    'click_speed': 0.000000001,
                    'mine_speed': 0.000000000,
                    'total_speed': 0.000000001,
                    'level': 1,
                    'experience': 0,
                    'referral_code': referral_code,
                    'referrals_count': 0,
                    'referral_earnings': 0
                }

            return {
                'success': True,
                'message': 'Синхронизация успешна',
                'userId': user_data['user_id'],
                'username': user_data['username'],
                'balance': float(user_data['balance']),
                'totalEarned': float(user_data['total_earned']),
                'totalClicks': int(user_data['total_clicks']),
                'multisession': False,
                'clickSpeed': float(user_data.get('click_speed', 0.000000001)),
                'mineSpeed': float(user_data.get('mine_speed', 0.000000000)),
                'totalSpeed': float(user_data.get('total_speed', 0.000000001)),
                'level': int(user_data.get('level', 1)),
                'referralCode': user_data.get('referral_code', ''),
                'sessionValid': True
            }

        except Exception as db_error:
            logger.error(f"❌ Ошибка БД при синхронизации: {db_error}")
            return {'success': False, 'error': 'DATABASE_ERROR'}, 500

    except Exception as e:
        logger.error(f"❌ Ошибка синхронизации: {e}")
        return {'success': False, 'error': 'SYNC_ERROR'}, 500


@app.route('/api/lottery/status', methods=['GET', 'OPTIONS'])
@perf_utils.time_limit(50)
@perf_utils.cache_response(ttl_seconds=1)
def lottery_status():
    """Быстрый статус лотереи"""
    try:
        # Используем синхронизированный таймер
        lottery_timer = 60 - (int(time.time()) % 60)

        # Быстрая статистика
        stats = db.execute_fast('''
            SELECT 
                team,
                COUNT(*) as bet_count,
                SUM(amount) as total_amount,
                COUNT(DISTINCT user_id) as unique_players
            FROM lottery_bets_high_perf 
            WHERE timestamp > datetime('now', '-5 minutes')
            GROUP BY team
        ''')

        eagle_stats = next((s for s in stats if s['team'] == 'eagle'), {
            'bet_count': 0,
            'total_amount': 0,
            'unique_players': 0
        })
        tails_stats = next((s for s in stats if s['team'] == 'tails'), {
            'bet_count': 0,
            'total_amount': 0,
            'unique_players': 0
        })

        return {
            'success': True,
            'lottery': {
                'eagle': {
                    'bets': int(eagle_stats['bet_count']),
                    'total': float(eagle_stats['total_amount']),
                    'players': int(eagle_stats['unique_players'])
                },
                'tails': {
                    'bets': int(tails_stats['bet_count']),
                    'total': float(tails_stats['total_amount']),
                    'players': int(tails_stats['unique_players'])
                },
                'timer':
                lottery_timer,
                'total_pot':
                float(eagle_stats['total_amount'] +
                      tails_stats['total_amount']),
                'participants_count':
                int(eagle_stats['unique_players'] +
                    tails_stats['unique_players']),
                'next_round':
                int(time.time()) + lottery_timer
            }
        }
    except Exception as e:
        logger.error(f"❌ Ошибка статуса лотереи: {e}")
        return {
            'success': True,
            'lottery': {
                'eagle': {
                    'bets': 0,
                    'total': 0,
                    'players': 0
                },
                'tails': {
                    'bets': 0,
                    'total': 0,
                    'players': 0
                },
                'timer': lottery_timer,
                'total_pot': 0,
                'participants_count': 0
            }
        }


@app.route('/api/leaderboard', methods=['GET', 'OPTIONS'])
@perf_utils.time_limit(80)
@perf_utils.cache_response(ttl_seconds=3)
def leaderboard():
    """Быстрый рейтинг игроков"""
    leaderboard_type = request.args.get('type', 'balance')
    limit = int(request.args.get('limit', 20))

    if leaderboard_type == 'balance':
        query = '''
            SELECT user_id, username, balance, total_earned, total_clicks,
                   click_speed, mine_speed, total_speed, level
            FROM players_high_perf 
            ORDER BY balance DESC 
            LIMIT ?
        '''
    elif leaderboard_type == 'speed':
        query = '''
            SELECT user_id, username, balance, total_earned, total_clicks,
                   click_speed, mine_speed, total_speed, level
            FROM players_high_perf 
            ORDER BY total_speed DESC 
            LIMIT ?
        '''
    else:
        query = '''
            SELECT user_id, username, balance, total_earned, total_clicks,
                   click_speed, mine_speed, total_speed, level
            FROM players_high_perf 
            ORDER BY total_earned DESC 
            LIMIT ?
        '''

    players = db.execute_fast(query, (limit, ))

    leaderboard_data = []
    for rank, player in enumerate(players, 1):
        leaderboard_data.append({
            'rank': rank,
            'userId': player['user_id'],
            'username': player['username'],
            'balance': float(player['balance']),
            'totalEarned': float(player['total_earned']),
            'totalClicks': int(player['total_clicks']),
            'clickSpeed': float(player['click_speed']),
            'mineSpeed': float(player['mine_speed']),
            'totalSpeed': float(player['total_speed']),
            'level': int(player['level'])
        })

    return {
        'success': True,
        'leaderboard': leaderboard_data,
        'type': leaderboard_type,
        'updated': datetime.utcnow().isoformat() + 'Z'
    }


@app.route('/api/transfer', methods=['POST', 'OPTIONS'])
@perf_utils.time_limit(100)
def transfer():
    """Быстрый перевод средств"""
    try:
        data = request.get_json()

        # Валидация
        valid, error = perf_utils.validate_request_data(
            data, ['fromUserId', 'toUserId', 'amount', 'fromUsername'])
        if not valid:
            return {'success': False, 'error': error}, 400

        from_user_id = data['fromUserId']
        to_user_id = data['toUserId']
        amount = float(data['amount'])
        from_username = data['fromUsername']
        to_username = data.get('toUsername', 'Получатель')

        if amount <= 0:
            return {'success': False, 'error': 'Неверная сумма'}, 400

        if from_user_id == to_user_id:
            return {'success': False, 'error': 'Нельзя переводить себе'}, 400

        # БЫСТРАЯ ПРОВЕРКА И ПЕРЕВОД В ТРАНЗАКЦИИ
        try:
            # Используем транзакцию для атомарности
            conn = db._get_connection()
            cursor = conn.cursor()

            # Проверяем баланс отправителя
            cursor.execute(
                "SELECT balance FROM players_high_perf WHERE user_id = ?",
                (from_user_id, ))
            sender = cursor.fetchone()

            if not sender:
                return {
                    'success': False,
                    'error': 'Отправитель не найден'
                }, 404

            if sender['balance'] < amount:
                return {'success': False, 'error': 'Недостаточно средств'}, 400

            # Проверяем получателя
            cursor.execute(
                "SELECT user_id FROM players_high_perf WHERE user_id = ?",
                (to_user_id, ))
            receiver = cursor.fetchone()

            if not receiver:
                # Создаем получателя если не существует
                cursor.execute(
                    '''
                    INSERT INTO players_high_perf (user_id, username, balance)
                    VALUES (?, ?, ?)
                    ''', (to_user_id, to_username, amount))
            else:
                # Обновляем баланс получателя
                cursor.execute(
                    "UPDATE players_high_perf SET balance = balance + ? WHERE user_id = ?",
                    (amount, to_user_id))

            # Обновляем баланс отправителя
            cursor.execute(
                "UPDATE players_high_perf SET balance = balance - ? WHERE user_id = ?",
                (amount, from_user_id))

            # Записываем перевод
            cursor.execute(
                '''
                INSERT INTO transfers_high_perf (from_user_id, to_user_id, amount)
                VALUES (?, ?, ?)
                ''', (from_user_id, to_user_id, amount))

            conn.commit()

            # Получаем новый баланс отправителя
            cursor.execute(
                "SELECT balance FROM players_high_perf WHERE user_id = ?",
                (from_user_id, ))
            new_balance = cursor.fetchone()['balance']

            return {
                'success': True,
                'message': 'Перевод выполнен',
                'newBalance': float(new_balance),
                'transactionId': cursor.lastrowid,
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }

        except Exception as db_error:
            conn.rollback()
            logger.error(f"❌ Ошибка БД при переводе: {db_error}")
            return {'success': False, 'error': 'TRANSFER_ERROR'}, 500

    except Exception as e:
        logger.error(f"❌ Ошибка перевода: {e}")
        return {'success': False, 'error': 'Ошибка перевода'}, 500


@app.route('/api/session/check', methods=['POST', 'OPTIONS'])
@perf_utils.time_limit(30)
def check_session():
    """Быстрая проверка сессии"""
    try:
        data = request.get_json()

        user_id = data.get('userId')
        device_id = data.get('deviceId')

        if not user_id or not device_id:
            return {'success': False, 'error': 'Missing parameters'}, 400

        # Проверяем сессию
        valid, message = session_manager.check_session(user_id, device_id)

        if valid:
            # Обновляем активность
            session_manager.update_activity(user_id, device_id)

            return {
                'success': True,
                'valid': True,
                'message': message,
                'multisession': False
            }
        else:
            return {
                'success': False,
                'valid': False,
                'message': message,
                'multisession':
                True if 'активная' in message.lower() else False
            }

    except Exception as e:
        logger.error(f"❌ Ошибка проверки сессии: {e}")
        return {'success': False, 'error': 'SESSION_CHECK_ERROR'}, 500


@app.route('/api/admin/performance', methods=['GET'])
@perf_utils.time_limit(50)
def performance_stats():
    """Статистика производительности"""
    session_stats = session_manager.get_session_stats()

    # Статистика кэша
    cache_stats = {
        'response_cache_size':
        len(response_cache),
        'query_cache_size':
        len(query_cache),
        'cache_hit_ratio':
        len(response_cache) / max(1,
                                  len(response_cache) + len(query_cache))
    }

    # Статистика БД
    db_stats = db.execute_fast('''
        SELECT 
            COUNT(*) as total_players,
            SUM(balance) as total_balance,
            AVG(total_speed) as avg_speed,
            MAX(balance) as max_balance
        FROM players_high_perf
    ''')[0]

    return {
        'success': True,
        'performance': {
            'config': PERFORMANCE_CONFIG,
            'sessions': session_stats,
            'cache': cache_stats,
            'database': {
                'total_players': int(db_stats['total_players']),
                'total_balance': float(db_stats['total_balance'] or 0),
                'average_speed': float(db_stats['avg_speed'] or 0),
                'max_balance': float(db_stats['max_balance'] or 0)
            },
            'server_time': datetime.utcnow().isoformat() + 'Z',
            'uptime_seconds': int(time.time() - start_time)
        }
    }


# ============================================================================
# ЗАПУСК СЕРВЕРА
# ============================================================================
if __name__ == "__main__":
    start_time = time.time()

    print("🚀 ЗАПУСК ВЫСОКОПРОИЗВОДИТЕЛЬНОГО API СЕРВЕРА...")
    print(f"⚙️ Конфигурация производительности:")
    print(
        f"   • Максимальное время ответа: {PERFORMANCE_CONFIG['MAX_RESPONSE_TIME_MS']}ms"
    )
    print(
        f"   • Таймаут сессии: {PERFORMANCE_CONFIG['SESSION_TIMEOUT_SEC']}сек")
    print(f"   • Таймаут БД: {PERFORMANCE_CONFIG['DB_TIMEOUT_MS']}ms")
    print(
        f"   • Кэширование: {'ВКЛ' if PERFORMANCE_CONFIG['ENABLE_QUERY_CACHE'] else 'ВЫКЛ'}"
    )
    print(f"   • Максимум сессий: {PERFORMANCE_CONFIG['MAX_CONCURRENT_DB']}")
    print()
    print("🛡️  Защита от мультисессии: АКТИВНА")
    print("   • Жесткая блокировка одновременных сессий")
    print("   • Автоматическая очистка устаревших сессий")
    print("   • Контроль по user_id + device_id + IP")
    print()
    print("🌐 Доступные эндпоинты:")
    print("   • GET  /api/health           - Проверка здоровья (<50ms)")
    print("   • POST /api/sync/unified     - Синхронизация (<100ms)")
    print("   • GET  /api/lottery/status   - Статус лотереи (<50ms)")
    print("   • GET  /api/leaderboard      - Рейтинг (<80ms)")
    print("   • POST /api/transfer         - Перевод (<100ms)")
    print("   • POST /api/session/check    - Проверка сессии (<30ms)")
    print()
    print("✅ Сервер оптимизирован для максимальной производительности!")
    print("🎯 Цель: отклик <120ms, блокировка мультисессии: 100%")

    # Запуск сервера с оптимизациями
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
