import os
import json
import logging
import sqlite3
import random
import time
import threading
from datetime import datetime, timedelta
from telegram import Update, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
from dotenv import load_dotenv
from flask import Flask, jsonify, request
import threading
from functools import wraps
from collections import OrderedDict
import psutil

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO)
logger = logging.getLogger(__name__)

# Загрузка переменных окружения
load_dotenv()
TOKEN = os.getenv('BOT_TOKEN')
API_PORT = int(os.getenv('API_PORT', 5000))

# Конфигурация для слабых соединений
API_CONFIG = {
    'max_retries': 5,
    'base_delay': 0.5,
    'max_delay': 10.0,
    'request_timeout': 30,
    'keep_alive': True,
    'compression': True
}

# Инициализация Flask приложения
flask_app = Flask(__name__)

# Конфигурация для медленных соединений
flask_app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False
flask_app.config['JSON_SORT_KEYS'] = False

# Улучшенная CORS обработка
@flask_app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({'status': 'preflight'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 
                           'Content-Type,Authorization,If-None-Match,If-Modified-Since,Cache-Control,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 
                           'GET,PUT,POST,DELETE,OPTIONS,PATCH')
        response.headers.add('Access-Control-Max-Age', '86400')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response, 200

@flask_app.after_request
def after_request(response):
    # Добавляем CORS headers ко всем ответам
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 
                       'Content-Type,Authorization,If-None-Match,If-Modified-Since,Cache-Control,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 
                       'GET,PUT,POST,DELETE,OPTIONS,PATCH')
    response.headers.add('Access-Control-Max-Age', '86400')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    
    # Оптимизации для медленных соединений
    response.headers.add('Connection', 'keep-alive')
    response.headers.add('Keep-Alive', 'timeout=30, max=100')
    
    # Логируем медленные запросы
    if hasattr(request, 'start_time'):
        duration = time.time() - request.start_time
        if duration > 2.0:
            logger.warning(f"Slow request: {request.method} {request.path} - {duration:.2f}s")
    
    # Добавляем headers для кэширования
    if request.method == 'GET':
        response.headers.add('Cache-Control', 'public, max-age=30')
    else:
        response.headers.add('Cache-Control', 'no-cache, no-store')
    
    return response

@flask_app.before_request
def before_request_logging():
    request.start_time = time.time()

# Система кэширования с приоритетом для часто запрашиваемых данных
class AdaptiveCache:
    def __init__(self, max_size=1000, default_ttl=300):
        self._cache = OrderedDict()
        self._max_size = max_size
        self._default_ttl = default_ttl
        self._lock = threading.RLock()
        self._access_count = {}
    
    def get(self, key):
        with self._lock:
            if key not in self._cache:
                return None
                
            value, expiry, access_count = self._cache[key]
            if datetime.now() > expiry:
                del self._cache[key]
                if key in self._access_count:
                    del self._access_count[key]
                return None
                
            # Увеличиваем счетчик доступа
            self._access_count[key] = self._access_count.get(key, 0) + 1
            
            # Перемещаем в конец (самый свежий)
            self._cache.move_to_end(key)
            return value
    
    def set(self, key, value, ttl=None, priority=1):
        with self._lock:
            if ttl is None:
                ttl = self._default_ttl
                
            expiry = datetime.now() + timedelta(seconds=ttl)
            access_count = self._access_count.get(key, 0) + priority
            self._cache[key] = (value, expiry, access_count)
            self._access_count[key] = access_count
            
            # Удаляем самые редко используемые записи если превышен лимит
            while len(self._cache) > self._max_size:
                # Находим наименее используемый ключ
                least_used = min(self._access_count.items(), key=lambda x: x[1])[0]
                if least_used in self._cache:
                    del self._cache[least_used]
                if least_used in self._access_count:
                    del self._access_count[least_used]
    
    def delete(self, key):
        with self._lock:
            if key in self._cache:
                del self._cache[key]
            if key in self._access_count:
                del self._access_count[key]
    
    def clear(self):
        with self._lock:
            self._cache.clear()
            self._access_count.clear()
    
    def size(self):
        with self._lock:
            return len(self._cache)

# Глобальный адаптивный кэш
adaptive_cache = AdaptiveCache(max_size=500, default_ttl=30)

def cache_response(ttl=30, priority=1):
    """Декоратор для кэширования ответов API с приоритетами"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Пытаемся получить из кэша
            cached_result = adaptive_cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_result
            
            # Выполняем функцию и кэшируем результат
            result = func(*args, **kwargs)
            adaptive_cache.set(cache_key, result, ttl=ttl, priority=priority)
            return result
        return wrapper
    return decorator

# Улучшенная система ретраев с адаптивными задержками
def adaptive_retry_db_operation(max_retries=5, base_delay=0.5, max_delay=10.0):
    """Декоратор для повторных попыток операций с БД с адаптивными задержками"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except (sqlite3.OperationalError, sqlite3.DatabaseError) as e:
                    last_exception = e
                    if "database is locked" in str(e).lower() and attempt < max_retries:
                        # Адаптивная задержка в зависимости от попытки
                        delay = min(base_delay * (2 ** attempt) + random.uniform(0, 0.1), max_delay)
                        logger.warning(f"DB locked, retrying in {delay:.2f}s (attempt {attempt + 1})")
                        time.sleep(delay)
                        continue
                    else:
                        raise
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries:
                        delay = min(base_delay * (2 ** attempt), max_delay)
                        logger.warning(f"DB error, retrying in {delay:.2f}s (attempt {attempt + 1}): {e}")
                        time.sleep(delay)
                    else:
                        raise
            raise last_exception
        return wrapper
    return decorator

@adaptive_retry_db_operation(**API_CONFIG)
def get_db_connection():
    """Создает соединение с базой данных с улучшенными настройками для слабых соединений"""
    try:
        conn = sqlite3.connect('sparkcoin.db', check_same_thread=False, timeout=30.0)
        conn.row_factory = sqlite3.Row
        
        # Улучшенные настройки для слабых соединений
        conn.execute('PRAGMA journal_mode=WAL')
        conn.execute('PRAGMA synchronous=NORMAL')
        conn.execute('PRAGMA cache_size=-128000')  # 128MB кэша
        conn.execute('PRAGMA foreign_keys=ON')
        conn.execute('PRAGMA temp_store=MEMORY')
        conn.execute('PRAGMA mmap_size=268435456')  # 256MB mmap
        
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        raise

def api_response(success=True, data=None, error=None, status_code=200, cache_control=None):
    """Стандартизированный ответ API с оптимизациями"""
    response_data = {
        'success': success,
        'timestamp': datetime.now().isoformat(),
        'data': data if data is not None else {},
        'error': error
    }
    
    response = jsonify(response_data)
    response.status_code = status_code
    
    # Добавляем headers для кэширования если указано
    if cache_control:
        response.headers.add('Cache-Control', cache_control)
    
    return response

def handle_api_errors(func):
    """Декоратор для обработки ошибок API с улучшенным логированием"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            start_time = time.time()
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            
            # Логируем медленные обработчики
            if duration > 1.0:
                logger.warning(f"Slow API handler {func.__name__}: {duration:.2f}s")
                
            return result
            
        except sqlite3.OperationalError as e:
            logger.error(f"Database operational error in {func.__name__}: {e}")
            return api_response(
                success=False, 
                error="Database temporarily unavailable", 
                status_code=503
            )
        except sqlite3.DatabaseError as e:
            logger.error(f"Database error in {func.__name__}: {e}")
            return api_response(
                success=False, 
                error="Database error", 
                status_code=500
            )
        except ValueError as e:
            logger.error(f"Validation error in {func.__name__}: {e}")
            return api_response(
                success=False, 
                error=str(e), 
                status_code=400
            )
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {e}")
            return api_response(
                success=False, 
                error="Internal server error", 
                status_code=500
            )
    return wrapper

# Функции работы с базой данных
@adaptive_retry_db_operation(**API_CONFIG)
def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Основная таблица игроков
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS players (
                user_id TEXT PRIMARY KEY,
                username TEXT,
                balance REAL DEFAULT 0.000000100,
                total_earned REAL DEFAULT 0.000000100,
                total_clicks INTEGER DEFAULT 0,
                upgrades TEXT DEFAULT '{}',
                last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                lottery_wins INTEGER DEFAULT 0,
                total_bet REAL DEFAULT 0,
                transfers_sent REAL DEFAULT 0,
                transfers_received REAL DEFAULT 0,
                click_speed REAL DEFAULT 0.000000001,
                mine_speed REAL DEFAULT 0.000000000,
                referral_code TEXT UNIQUE,
                referred_by TEXT,
                referral_earnings REAL DEFAULT 0,
                referrals_count INTEGER DEFAULT 0,
                total_winnings REAL DEFAULT 0,
                total_losses REAL DEFAULT 0
            )
        ''')

        # Таблица для командной лотереи
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS lottery (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team TEXT NOT NULL,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                amount REAL NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES players (user_id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS lottery_winners (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team TEXT NOT NULL,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                prize REAL NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS lottery_timer (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                timer INTEGER DEFAULT 60,
                last_draw TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Таблица для классической лотереи
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS classic_lottery (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                username TEXT NOT NULL,
                amount REAL NOT NULL,
                round_id INTEGER NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES players (user_id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS classic_lottery_rounds (
                round_id INTEGER PRIMARY KEY AUTOINCREMENT,
                pot REAL DEFAULT 0,
                winner_user_id TEXT,
                winner_username TEXT,
                prize REAL DEFAULT 0,
                participants_count INTEGER DEFAULT 0,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS classic_lottery_timer (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                timer INTEGER DEFAULT 120,
                last_draw TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Таблица для реферальных связей
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                referrer_user_id TEXT NOT NULL,
                referred_user_id TEXT NOT NULL,
                earnings REAL DEFAULT 0,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (referrer_user_id) REFERENCES players (user_id),
                FOREIGN KEY (referred_user_id) REFERENCES players (user_id)
            )
        ''')

        # Инициализируем таймеры
        cursor.execute(
            'INSERT OR IGNORE INTO lottery_timer (id, timer) VALUES (1, 60)')
        cursor.execute(
            'INSERT OR IGNORE INTO classic_lottery_timer (id, timer) VALUES (1, 120)'
        )

        conn.commit()
        conn.close()
        logger.info("Database initialized with all tables")

    except Exception as e:
        logger.error(f"Database init error: {e}")
        raise

def generate_referral_code():
    import string
    chars = string.ascii_uppercase + string.digits
    return 'REF-' + ''.join(random.choices(chars, k=8))

def calculate_click_speed(upgrades):
    try:
        speed = 0.000000001
        if not upgrades:
            return speed

        bonuses = {
            1: 0.000000004,
            2: 0.000000008,
            3: 0.000000064,
            4: 0.000000512,
            5: 0.000004096,
            6: 0.000032768,
            7: 0.000262144,
            8: 0.002097152
        }

        for i in range(1, 9):
            mouse_key = f"mouse{i}"
            if mouse_key in upgrades:
                level = upgrades[mouse_key].get('level', 0)
                speed += level * bonuses.get(i, 0)

        return speed
    except Exception as e:
        logger.error(f"Click speed calculation error: {e}")
        return 0.000000001

def calculate_mine_speed(upgrades):
    try:
        speed = 0.000000000
        if not upgrades:
            return speed

        bonuses = {
            1: 0.000000001,
            2: 0.000000008,
            3: 0.000000064,
            4: 0.000000512,
            5: 0.000004096,
            6: 0.000032768,
            7: 0.000262144,
            8: 0.002097152
        }

        for i in range(1, 9):
            for component in [f"gpu{i}", f"cpu{i}"]:
                if component in upgrades:
                    level = upgrades[component].get('level', 0)
                    speed += level * bonuses.get(i, 0)

        return speed
    except Exception as e:
        logger.error(f"Mine speed calculation error: {e}")
        return 0.000000000

@adaptive_retry_db_operation(**API_CONFIG)
def update_player(data):
    """Обновление данных игрока с кэшированием и ретраями"""
    try:
        user_id = data.get('userId')
        if not user_id:
            logger.error("No user_id provided in update_player")
            return

        conn = get_db_connection()
        cursor = conn.cursor()

        upgrades_data = data.get('upgrades', {})
        click_speed = calculate_click_speed(upgrades_data)
        mine_speed = calculate_mine_speed(upgrades_data)

        cursor.execute('SELECT * FROM players WHERE user_id = ?', (user_id, ))
        existing_player = cursor.fetchone()

        upgrades_json = json.dumps(upgrades_data)

        username = data.get('username', f'Player_{user_id[-8:]}')

        try:
            balance = float(data.get('balance', 0.000000100))
        except (TypeError, ValueError):
            balance = 0.000000100

        try:
            total_earned = float(
                data.get('totalEarned', data.get('total_earned', 0.000000100)))
        except (TypeError, ValueError):
            total_earned = 0.000000100

        try:
            total_clicks = int(
                data.get('totalClicks', data.get('total_clicks', 0)))
        except (TypeError, ValueError):
            total_clicks = 0

        try:
            lottery_wins = int(
                data.get('lotteryWins', data.get('lottery_wins', 0)))
        except (TypeError, ValueError):
            lottery_wins = 0

        try:
            total_bet = float(data.get('totalBet', data.get('total_bet', 0)))
        except (TypeError, ValueError):
            total_bet = 0

        transfers_data = data.get('transfers', {})
        try:
            transfers_sent = float(transfers_data.get('sent', 0))
        except (TypeError, ValueError):
            transfers_sent = 0

        try:
            transfers_received = float(transfers_data.get('received', 0))
        except (TypeError, ValueError):
            transfers_received = 0

        # Новые поля для реферальной системы
        referral_code = data.get('referralCode')
        referred_by = data.get('referredBy')
        referral_earnings = float(data.get('referralEarnings', 0))
        referrals_count = int(data.get('referralsCount', 0))
        total_winnings = float(data.get('totalWinnings', 0))
        total_losses = float(data.get('totalLosses', 0))

        if existing_player:
            cursor.execute(
                '''
                UPDATE players SET 
                username=?, balance=?, total_earned=?, total_clicks=?, 
                upgrades=?, lottery_wins=?, total_bet=?,
                transfers_sent=?, transfers_received=?, 
                click_speed=?, mine_speed=?, last_update=?,
                referral_code=?, referred_by=?, referral_earnings=?, referrals_count=?,
                total_winnings=?, total_losses=?
                WHERE user_id=?
            ''',
                (username, balance, total_earned, total_clicks, upgrades_json,
                 lottery_wins, total_bet,
                 transfers_sent, transfers_received, click_speed, mine_speed,
                 datetime.now(), referral_code, referred_by, referral_earnings,
                 referrals_count, total_winnings, total_losses, user_id))
            logger.info(f"Player updated: {username}")
        else:
            # Генерируем реферальный код для нового пользователя
            if not referral_code:
                referral_code = generate_referral_code()

            cursor.execute(
                '''
                INSERT INTO players 
                (user_id, username, balance, total_earned, total_clicks, upgrades, 
                 lottery_wins, total_bet, transfers_sent, transfers_received,
                 click_speed, mine_speed, last_update, referral_code, referred_by,
                 referral_earnings, referrals_count, total_winnings, total_losses)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
                (user_id, username, balance, total_earned, total_clicks,
                 upgrades_json, lottery_wins, total_bet,
                 transfers_sent, transfers_received, click_speed, mine_speed,
                 datetime.now(), referral_code, referred_by, referral_earnings,
                 referrals_count, total_winnings, total_losses))
            logger.info(f"New player created: {username}")

        conn.commit()
        conn.close()

        # Инвалидируем кэш для этого пользователя
        adaptive_cache.delete(f"get_player_data:{user_id}")
        adaptive_cache.delete("get_leaderboard:balance:10")
        adaptive_cache.delete("get_leaderboard:speed:10")
        adaptive_cache.delete("get_leaderboard:earned:10")

    except Exception as e:
        logger.error(f"Update player error: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise

@adaptive_retry_db_operation(**API_CONFIG)
@cache_response(ttl=15, priority=10)  # Кэшируем на 15 секунд с высоким приоритетом
def get_player_data(user_id):
    """Получение данных игрока с кэшированием и ретраями"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM players WHERE user_id = ?', (user_id, ))
        player = cursor.fetchone()
        conn.close()

        if player:
            upgrades_data = player[5] if player[5] else '{}'
            try:
                upgrades_dict = json.loads(upgrades_data)
            except:
                upgrades_dict = {}

            try:
                balance = float(
                    player[2]) if player[2] is not None else 0.000000100
            except (TypeError, ValueError):
                balance = 0.000000100

            try:
                total_earned = float(
                    player[3]) if player[3] is not None else 0.000000100
            except (TypeError, ValueError):
                total_earned = 0.000000100

            try:
                total_clicks = player[4] if player[4] is not None else 0
            except (TypeError, ValueError):
                total_clicks = 0

            return {
                'userId':
                player[0],
                'username':
                player[1] if player[1] else f'Player_{user_id[-8:]}',
                'balance':
                balance,
                'totalEarned':
                total_earned,
                'totalClicks':
                total_clicks,
                'upgrades':
                upgrades_dict,
                'lastUpdate':
                player[6],
                'lotteryWins':
                player[7] if player[7] is not None else 0,
                'totalBet':
                float(player[8]) if player[8] is not None else 0,
                'transfers': {
                    'sent': float(player[9]) if player[9] is not None else 0,
                    'received':
                    float(player[10]) if player[10] is not None else 0
                },
                'clickSpeed':
                float(player[11]) if player[11] is not None else 0.000000001,
                'mineSpeed':
                float(player[12]) if player[12] is not None else 0.000000000,
                'referralCode':
                player[13],
                'referredBy':
                player[14],
                'referralEarnings':
                float(player[15]) if player[15] is not None else 0,
                'referralsCount':
                player[16] if player[16] is not None else 0,
                'totalWinnings':
                float(player[17]) if player[17] is not None else 0,
                'totalLosses':
                float(player[18]) if player[18] is not None else 0
            }
        return None
    except Exception as e:
        logger.error(f"Get player data error: {e}")
        return None

@adaptive_retry_db_operation(**API_CONFIG)
@cache_response(ttl=30, priority=5)  # Кэшируем лидерборд на 30 секунд
def get_leaderboard(limit=10, leaderboard_type='balance'):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        if leaderboard_type == 'balance':
            query = 'SELECT user_id, username, balance, total_earned, total_clicks, click_speed, mine_speed FROM players ORDER BY balance DESC LIMIT ?'
        elif leaderboard_type == 'speed':
            query = 'SELECT user_id, username, balance, total_earned, total_clicks, click_speed, mine_speed FROM players ORDER BY mine_speed DESC LIMIT ?'
        else:
            query = 'SELECT user_id, username, balance, total_earned, total_clicks, click_speed, mine_speed FROM players ORDER BY total_earned DESC LIMIT ?'

        cursor.execute(query, (limit, ))
        leaderboard = cursor.fetchall()
        conn.close()

        valid_leaderboard = []
        for player in leaderboard:
            if player and len(
                    player) >= 3 and player[0] and player[2] is not None:
                valid_leaderboard.append(player)

        return valid_leaderboard

    except Exception as e:
        logger.error(f"Get leaderboard error: {e}")
        return []

@adaptive_retry_db_operation(**API_CONFIG)
@cache_response(ttl=60, priority=3)  # Кэшируем список игроков на 60 секунд
def get_all_players():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'SELECT user_id, username, balance FROM players ORDER BY username')
        players = cursor.fetchall()
        conn.close()

        valid_players = []
        for player in players:
            if player and len(
                    player) >= 3 and player[0] and player[2] is not None:
                valid_players.append(player)

        return valid_players
    except Exception as e:
        logger.error(f"Get all players error: {e}")
        return []

@adaptive_retry_db_operation(**API_CONFIG)
def transfer_coins(from_user_id, to_user_id, amount):
    try:
        if amount <= 0:
            return False, "Invalid amount"

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('SELECT balance FROM players WHERE user_id = ?',
                       (from_user_id, ))
        sender = cursor.fetchone()
        if not sender or sender[0] < amount:
            conn.close()
            return False, "Insufficient funds"

        cursor.execute('SELECT user_id FROM players WHERE user_id = ?',
                       (to_user_id, ))
        receiver = cursor.fetchone()
        if not receiver:
            conn.close()
            return False, "Recipient not found"

        cursor.execute(
            'UPDATE players SET balance = balance - ? WHERE user_id = ?',
            (amount, from_user_id))
        cursor.execute(
            'UPDATE players SET balance = balance + ? WHERE user_id = ?',
            (amount, to_user_id))
        cursor.execute(
            'UPDATE players SET transfers_sent = transfers_sent + ? WHERE user_id = ?',
            (amount, from_user_id))
        cursor.execute(
            'UPDATE players SET transfers_received = transfers_received + ? WHERE user_id = ?',
            (amount, to_user_id))

        conn.commit()
        conn.close()

        # Инвалидируем кэш для затронутых пользователей
        adaptive_cache.delete(f"get_player_data:{from_user_id}")
        adaptive_cache.delete(f"get_player_data:{to_user_id}")
        adaptive_cache.delete("get_leaderboard:balance:10")

        return True, "Transfer successful"

    except Exception as e:
        logger.error(f"Transfer error: {e}")
        return False, f"Transfer error: {str(e)}"

# Функции для работы с лотереей в базе данных
@adaptive_retry_db_operation(**API_CONFIG)
@cache_response(ttl=10, priority=8)  # Кэшируем ставки лотереи на 10 секунд
def get_lottery_bets():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT team, user_id, username, amount, timestamp 
            FROM lottery 
            ORDER BY timestamp DESC
        ''')
        bets = cursor.fetchall()

        conn.close()

        # Группируем ставки по командам
        eagle_bets = []
        tails_bets = []

        for bet in bets:
            bet_data = {
                'userId': bet[1],
                'username': bet[2],
                'amount': float(bet[3]),
                'timestamp': bet[4]
            }

            if bet[0] == 'eagle':
                eagle_bets.append(bet_data)
            else:
                tails_bets.append(bet_data)

        return eagle_bets, tails_bets

    except Exception as e:
        logger.error(f"Get lottery bets error: {e}")
        return [], []

@adaptive_retry_db_operation(**API_CONFIG)
def add_lottery_bet(team, user_id, username, amount):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Удаляем старую ставку этого пользователя
        cursor.execute('DELETE FROM lottery WHERE user_id = ?', (user_id, ))

        # Добавляем новую ставку
        cursor.execute(
            '''
            INSERT INTO lottery (team, user_id, username, amount) 
            VALUES (?, ?, ?, ?)
        ''', (team, user_id, username, amount))

        conn.commit()
        conn.close()

        # Инвалидируем кэш лотереи
        adaptive_cache.delete("get_lottery_bets")
        adaptive_cache.delete("get_lottery_status")

        return True
    except Exception as e:
        logger.error(f"Add lottery bet error: {e}")
        return False

@adaptive_retry_db_operation(**API_CONFIG)
def clear_lottery_bets():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM lottery')
        conn.commit()
        conn.close()

        # Инвалидируем кэш лотереи
        adaptive_cache.delete("get_lottery_bets")
        adaptive_cache.delete("get_lottery_status")

        return True
    except Exception as e:
        logger.error(f"Clear lottery bets error: {e}")
        return False

@adaptive_retry_db_operation(**API_CONFIG)
@cache_response(ttl=5, priority=9)  # Кэшируем таймер на 5 секунд
def get_lottery_timer():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT timer FROM lottery_timer WHERE id = 1')
        result = cursor.fetchone()
        conn.close()
        return result[0] if result else 60
    except Exception as e:
        logger.error(f"Get lottery timer error: {e}")
        return 60

@adaptive_retry_db_operation(**API_CONFIG)
def update_lottery_timer(timer_value):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('UPDATE lottery_timer SET timer = ? WHERE id = 1',
                       (timer_value, ))
        conn.commit()
        conn.close()

        # Инвалидируем кэш таймера
        adaptive_cache.delete("get_lottery_timer")
        return True
    except Exception as e:
        logger.error(f"Update lottery timer error: {e}")
        return False

@adaptive_retry_db_operation(**API_CONFIG)
@cache_response(ttl=30, priority=6)  # Кэшируем последнего победителя на 30 секунд
def get_last_winner():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            SELECT team, username, prize, timestamp 
            FROM lottery_winners 
            ORDER BY timestamp DESC 
            LIMIT 1
        ''')
        winner = cursor.fetchone()
        conn.close()

        if winner:
            return {
                'team': winner[0],
                'username': winner[1],
                'prize': float(winner[2]),
                'timestamp': winner[3]
            }
        return None
    except Exception as e:
        logger.error(f"Get last winner error: {e}")
        return None

@adaptive_retry_db_operation(**API_CONFIG)
def add_winner(team, user_id, username, prize):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            '''
            INSERT INTO lottery_winners (team, user_id, username, prize) 
            VALUES (?, ?, ?, ?)
        ''', (team, user_id, username, prize))
        conn.commit()
        conn.close()

        # Инвалидируем кэш победителей
        adaptive_cache.delete("get_last_winner")
        return True
    except Exception as e:
        logger.error(f"Add winner error: {e}")
        return False

# Функции для классической лотереи
@adaptive_retry_db_operation(**API_CONFIG)
@cache_response(ttl=10, priority=8)  # Кэшируем ставки на 10 секунд
def get_classic_lottery_bets():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT user_id, username, amount, timestamp 
            FROM classic_lottery 
            ORDER BY timestamp DESC
        ''')
        bets = cursor.fetchall()

        conn.close()

        bets_data = []
        total_pot = 0

        for bet in bets:
            bet_data = {
                'userId': bet[0],
                'username': bet[1],
                'amount': float(bet[2]),
                'timestamp': bet[3]
            }
            bets_data.append(bet_data)
            total_pot += float(bet[2])

        return bets_data, total_pot

    except Exception as e:
        logger.error(f"Get classic lottery bets error: {e}")
        return [], 0

@adaptive_retry_db_operation(**API_CONFIG)
def add_classic_lottery_bet(user_id, username, amount):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Получаем текущий раунд
        cursor.execute('SELECT MAX(round_id) FROM classic_lottery_rounds')
        result = cursor.fetchone()
        current_round = result[0] if result[0] else 1

        # Добавляем ставку
        cursor.execute(
            '''
            INSERT INTO classic_lottery (user_id, username, amount, round_id) 
            VALUES (?, ?, ?, ?)
        ''', (user_id, username, amount, current_round))

        conn.commit()
        conn.close()

        # Инвалидируем кэш классической лотереи
        adaptive_cache.delete("get_classic_lottery_bets")
        adaptive_cache.delete("get_classic_lottery_status")

        return True
    except Exception as e:
        logger.error(f"Add classic lottery bet error: {e}")
        return False

@adaptive_retry_db_operation(**API_CONFIG)
def clear_classic_lottery_bets():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM classic_lottery')
        conn.commit()
        conn.close()

        # Инвалидируем кэш классической лотереи
        adaptive_cache.delete("get_classic_lottery_bets")
        adaptive_cache.delete("get_classic_lottery_status")

        return True
    except Exception as e:
        logger.error(f"Clear classic lottery bets error: {e}")
        return False

@adaptive_retry_db_operation(**API_CONFIG)
@cache_response(ttl=5, priority=9)  # Кэшируем таймер на 5 секунд
def get_classic_lottery_timer():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT timer FROM classic_lottery_timer WHERE id = 1')
        result = cursor.fetchone()
        conn.close()
        return result[0] if result else 120
    except Exception as e:
        logger.error(f"Get classic lottery timer error: {e}")
        return 120

@adaptive_retry_db_operation(**API_CONFIG)
def update_classic_lottery_timer(timer_value):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE classic_lottery_timer SET timer = ? WHERE id = 1',
            (timer_value, ))
        conn.commit()
        conn.close()

        # Инвалидируем кэш таймера
        adaptive_cache.delete("get_classic_lottery_timer")
        return True
    except Exception as e:
        logger.error(f"Update classic lottery timer error: {e}")
        return False

@adaptive_retry_db_operation(**API_CONFIG)
def conduct_classic_lottery_draw():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Получаем все ставки текущего раунда
        cursor.execute('''
            SELECT user_id, username, amount 
            FROM classic_lottery
        ''')
        bets = cursor.fetchall()

        if not bets:
            conn.close()
            return False, "No bets placed"

        # Вычисляем общий банк и шансы
        total_pot = sum(float(bet[2]) for bet in bets)
        participants_count = len(bets)

        # Создаем список шансов
        chances = []
        for bet in bets:
            chance = float(bet[2]) / total_pot
            chances.append(chance)

        # Розыгрыш с элементом случайности
        winner_index = 0
        random_val = random.random()
        accumulated_chance = 0

        for i, chance in enumerate(chances):
            accumulated_chance += chance
            # 10% шанс, что победит игрок с меньшими шансами
            if random_val < accumulated_chance or (random.random() < 0.1
                                                   and i > 0):
                winner_index = i
                break

        winner = bets[winner_index]
        prize = total_pot

        # Сохраняем результат раунда
        cursor.execute(
            '''
            INSERT INTO classic_lottery_rounds 
            (pot, winner_user_id, winner_username, prize, participants_count)
            VALUES (?, ?, ?, ?, ?)
        ''', (total_pot, winner[0], winner[1], prize, participants_count))

        # Обновляем статистику победителя
        cursor.execute(
            '''
            UPDATE players 
            SET balance = balance + ?, total_winnings = total_winnings + ?
            WHERE user_id = ?
        ''', (prize, prize, winner[0]))

        # Обновляем статистику проигравших
        for bet in bets:
            if bet[0] != winner[0]:
                cursor.execute(
                    '''
                    UPDATE players 
                    SET total_losses = total_losses + ?
                    WHERE user_id = ?
                ''', (float(bet[2]), bet[0]))

        # Очищаем ставки
        cursor.execute('DELETE FROM classic_lottery')

        # Сбрасываем таймер
        cursor.execute(
            'UPDATE classic_lottery_timer SET timer = 120 WHERE id = 1')

        conn.commit()
        conn.close()

        # Инвалидируем все связанные кэши
        adaptive_cache.delete("get_classic_lottery_bets")
        adaptive_cache.delete("get_classic_lottery_status")
        adaptive_cache.delete("get_classic_lottery_timer")
        adaptive_cache.delete(f"get_player_data:{winner[0]}")
        adaptive_cache.delete("get_leaderboard:balance:10")

        return True, {
            'winner': {
                'userId': winner[0],
                'username': winner[1],
                'prize': prize
            },
            'pot': total_pot,
            'participants_count': participants_count
        }

    except Exception as e:
        logger.error(f"Classic lottery draw error: {e}")
        return False, f"Draw error: {str(e)}"

@adaptive_retry_db_operation(**API_CONFIG)
@cache_response(ttl=60, priority=4)  # Кэшируем историю на 60 секунд
def get_classic_lottery_history(limit=10):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            '''
            SELECT winner_username, prize, participants_count, timestamp 
            FROM classic_lottery_rounds 
            ORDER BY timestamp DESC 
            LIMIT ?
        ''', (limit, ))

        history = cursor.fetchall()
        conn.close()

        history_data = []
        for item in history:
            history_data.append({
                'winner': item[0],
                'prize': float(item[1]),
                'participants': item[2],
                'timestamp': item[3]
            })

        return history_data

    except Exception as e:
        logger.error(f"Get classic lottery history error: {e}")
        return []

# Функции для реферальной системы
@adaptive_retry_db_operation(**API_CONFIG)
@cache_response(ttl=30, priority=5)  # Кэшируем статистику на 30 секунд
def get_referral_stats(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Получаем количество рефералов
        cursor.execute(
            'SELECT COUNT(*) FROM referrals WHERE referrer_user_id = ?',
            (user_id, ))
        referrals_count = cursor.fetchone()[0]

        # Получаем суммарный заработок
        cursor.execute(
            'SELECT SUM(earnings) FROM referrals WHERE referrer_user_id = ?',
            (user_id, ))
        total_earnings = cursor.fetchone()[0] or 0

        conn.close()

        return {
            'referralsCount': referrals_count,
            'totalEarnings': float(total_earnings)
        }

    except Exception as e:
        logger.error(f"Get referral stats error: {e}")
        return {'referralsCount': 0, 'totalEarnings': 0}

@adaptive_retry_db_operation(**API_CONFIG)
def add_referral_earning(referrer_user_id, referred_user_id, amount,
                         earning_type):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Вычисляем комиссию в зависимости от типа заработка
        if earning_type == 'mining':
            commission = amount * 0.05  # 5% от майнинга
        else:  # betting
            commission = amount * 0.01  # 1% от ставок

        # Добавляем запись о заработке
        cursor.execute(
            '''
            INSERT INTO referrals (referrer_user_id, referred_user_id, earnings)
            VALUES (?, ?, ?)
        ''', (referrer_user_id, referred_user_id, commission))

        # Обновляем баланс реферера
        cursor.execute(
            '''
            UPDATE players 
            SET balance = balance + ?, referral_earnings = referral_earnings + ?
            WHERE user_id = ?
        ''', (commission, commission, referrer_user_id))

        conn.commit()
        conn.close()

        # Инвалидируем кэш реферальной статистики
        adaptive_cache.delete(f"get_referral_stats:{referrer_user_id}")
        adaptive_cache.delete(f"get_player_data:{referrer_user_id}")

        return True

    except Exception as e:
        logger.error(f"Add referral earning error: {e}")
        return False

@adaptive_retry_db_operation(**API_CONFIG)
@cache_response(ttl=60, priority=4)  # Кэшируем топ победителей на 60 секунд
def get_top_winners(limit=50):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            '''
            SELECT username, total_winnings, total_losses, 
                   (total_winnings - total_losses) as net_winnings
            FROM players 
            WHERE total_winnings > 0 OR total_losses > 0
            ORDER BY net_winnings DESC 
            LIMIT ?
        ''', (limit, ))

        winners = cursor.fetchall()
        conn.close()

        winners_data = []
        for winner in winners:
            winners_data.append({
                'username': winner[0],
                'totalWinnings': float(winner[1]),
                'totalLosses': float(winner[2]),
                'netWinnings': float(winner[3])
            })

        return winners_data

    except Exception as e:
        logger.error(f"Get top winners error: {e}")
        return []

def get_system_stats():
    """Получение статистики системы для мониторинга"""
    try:
        process = psutil.Process(os.getpid())
        system_memory = psutil.virtual_memory()
        
        return {
            'memory_mb': round(process.memory_info().rss / 1024 / 1024, 2),
            'cpu_percent': round(process.cpu_percent(), 2),
            'threads': process.num_threads(),
            'cache_size': adaptive_cache.size(),
            'system_memory_percent': round(system_memory.percent, 2),
            'timestamp': datetime.now().isoformat(),
            'active_requests': threading.active_count() - 1  # Минус main thread
        }
    except Exception as e:
        logger.error(f"Error getting system stats: {e}")
        return {'error': 'Unable to get system stats'}

# API endpoints
@flask_app.route('/api/health', methods=['GET', 'OPTIONS'])
@handle_api_errors
def health_check():
    if request.method == 'OPTIONS':
        return api_response()

    try:
        # Быстрая проверка БД
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT 1')
        conn.close()
        
        db_status = 'healthy'
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        db_status = 'unhealthy'

    health_info = {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'Sparkcoin API',
        'version': '1.0.0',
        'database': db_status,
        'cache_size': adaptive_cache.size(),
        'system': get_system_stats(),
        'config': {
            'max_retries': API_CONFIG['max_retries'],
            'request_timeout': API_CONFIG['request_timeout']
        }
    }

    status_code = 200 if db_status == 'healthy' else 503
    return api_response(data=health_info, status_code=status_code, cache_control='no-cache')

@flask_app.route('/api/player/<user_id>', methods=['GET', 'POST', 'OPTIONS'])
@handle_api_errors
def player_api(user_id):
    if request.method == 'OPTIONS':
        return api_response()

    if user_id == 'undefined' or not user_id:
        return api_response(success=False, error='Invalid user ID', status_code=400)

    try:
        if request.method == 'GET':
            # Используем кэш для GET запросов
            cache_key = f"player_{user_id}"
            cached_player = adaptive_cache.get(cache_key)
            if cached_player:
                logger.info(f"Cache hit for player: {user_id}")
                return api_response(data={'player': cached_player}, cache_control='public, max-age=15')
            
            logger.info(f"GET request for user: {user_id}")
            player_data = get_player_data(user_id)

            if player_data:
                # Кэшируем данные игрока
                adaptive_cache.set(cache_key, player_data, ttl=15, priority=10)
                return api_response(data={'player': player_data}, cache_control='public, max-age=15')
            else:
                # Создаем нового игрока если не найден
                new_player = {
                    'userId': user_id,
                    'username': f'Player_{user_id[-8:]}',
                    'balance': 0.000000100,
                    'totalEarned': 0.000000100,
                    'totalClicks': 0,
                    'lotteryWins': 0,
                    'totalBet': 0,
                    'transfers': {'sent': 0, 'received': 0},
                    'upgrades': {},
                    'referralEarnings': 0,
                    'referralsCount': 0,
                    'totalWinnings': 0,
                    'totalLosses': 0
                }

                # Базовые улучшения
                for i in range(1, 9):
                    new_player['upgrades'][f"gpu{i}"] = {"level": 0}
                    new_player['upgrades'][f"cpu{i}"] = {"level": 0}
                    new_player['upgrades'][f"mouse{i}"] = {"level": 0}

                update_player(new_player)
                created_player = get_player_data(user_id)

                if created_player:
                    adaptive_cache.set(cache_key, created_player, ttl=15, priority=10)
                    return api_response(
                        data={
                            'player': created_player,
                            'message': 'New player created'
                        },
                        cache_control='public, max-age=15'
                    )
                else:
                    return api_response(
                        success=False, 
                        error='Failed to create player', 
                        status_code=500
                    )

        elif request.method == 'POST':
            data = request.get_json()
            if not data:
                return api_response(success=False, error='No data provided', status_code=400)

            logger.info(f"POST request for user: {user_id}")

            player_data = {
                'userId': user_id,
                'username': data.get('username', f'Player_{user_id[-8:]}'),
                'balance': float(data.get('balance', 0.000000100)),
                'totalEarned': float(data.get('totalEarned', 0.000000100)),
                'totalClicks': int(data.get('totalClicks', 0)),
                'lotteryWins': int(data.get('lotteryWins', 0)),
                'totalBet': float(data.get('totalBet', 0)),
                'transfers': data.get('transfers', {'sent': 0, 'received': 0}),
                'upgrades': data.get('upgrades', {}),
                'referralCode': data.get('referralCode'),
                'referredBy': data.get('referredBy'),
                'referralEarnings': float(data.get('referralEarnings', 0)),
                'referralsCount': int(data.get('referralsCount', 0)),
                'totalWinnings': float(data.get('totalWinnings', 0)),
                'totalLosses': float(data.get('totalLosses', 0))
            }

            update_player(player_data)
            
            # Инвалидируем кэш
            adaptive_cache.delete(f"player_{user_id}")
            adaptive_cache.delete("get_leaderboard:balance:10")
            adaptive_cache.delete("get_leaderboard:speed:10")
            adaptive_cache.delete("get_leaderboard:earned:10")
            
            return api_response(data={'message': 'Player data updated'})

    except Exception as e:
        logger.error(f"API Error in player_api: {str(e)}")
        return api_response(success=False, error=str(e), status_code=500)

@flask_app.route('/api/leaderboard', methods=['GET', 'OPTIONS'])
@handle_api_errors
def get_leaderboard_api():
    if request.method == 'OPTIONS':
        return api_response()

    try:
        limit = request.args.get('limit', 10, type=int)
        leaderboard_type = request.args.get('type', 'balance')
        current_user = request.args.get('current_user')

        leaderboard_data = get_leaderboard(limit, leaderboard_type)

        formatted_leaderboard = []
        for i, player in enumerate(leaderboard_data, 1):
            if not player or len(player) < 3:
                logger.warning(
                    f"Skipping invalid player data at index {i}: {player}")
                continue

            user_id = player[0] if len(
                player) > 0 and player[0] else f"unknown_{i}"
            username = player[1] if len(
                player) > 1 and player[1] else f"Player_{i}"

            try:
                balance = float(
                    player[2]) if player[2] is not None else 0.000000100
            except (TypeError, ValueError):
                balance = 0.000000100

            try:
                total_earned = float(player[3]) if len(
                    player) > 3 and player[3] is not None else 0.000000100
            except (TypeError, ValueError):
                total_earned = 0.000000100

            try:
                total_clicks = int(player[4]) if len(
                    player) > 4 and player[4] is not None else 0
            except (TypeError, ValueError):
                total_clicks = 0

            try:
                click_speed = float(player[5]) if len(
                    player) > 5 and player[5] is not None else 0.000000001
            except (TypeError, ValueError):
                click_speed = 0.000000001

            try:
                mine_speed = float(player[6]) if len(
                    player) > 6 and player[6] is not None else 0.000000000
            except (TypeError, ValueError):
                mine_speed = 0.000000000

            formatted_leaderboard.append({
                'rank': i,
                'userId': user_id,
                'username': username,
                'balance': balance,
                'totalEarned': total_earned,
                'totalClicks': total_clicks,
                'clickSpeed': click_speed,
                'mineSpeed': mine_speed,
                'totalSpeed': click_speed + mine_speed,
                'isCurrent': user_id == current_user
            })

        return api_response(data={
            'leaderboard': formatted_leaderboard,
            'type': leaderboard_type
        }, cache_control='public, max-age=30')

    except Exception as e:
        logger.error(f"Leaderboard API error: {str(e)}")
        return api_response(
            success=False, 
            error=str(e), 
            data={'leaderboard': []},
            status_code=500
        )

@flask_app.route('/api/all_players', methods=['GET', 'OPTIONS'])
@handle_api_errors
def get_all_players_api():
    if request.method == 'OPTIONS':
        return api_response()

    try:
        players = get_all_players()
        players_data = []

        for player in players:
            if not player or len(player) < 3:
                continue

            try:
                user_id = player[0] if player[0] else "unknown"
                username = player[1] if player[1] else f"Player_{user_id[-8:]}"
                balance = float(player[2]) if player[2] is not None else 0.0

                players_data.append({
                    'userId': user_id,
                    'username': username,
                    'balance': balance
                })
            except (TypeError, ValueError) as e:
                logger.warning(
                    f"Skipping invalid player data: {player}, error: {e}")
                continue

        return api_response(data={'players': players_data}, cache_control='public, max-age=60')

    except Exception as e:
        logger.error(f"All players API error: {e}")
        return api_response(success=False, error=str(e), status_code=500)

@flask_app.route('/api/transfer', methods=['POST', 'OPTIONS'])
@handle_api_errors
def transfer_api():
    if request.method == 'OPTIONS':
        return api_response()

    try:
        data = request.get_json()
        from_user_id = data.get('fromUserId')
        to_user_id = data.get('toUserId')
        amount = float(data.get('amount', 0))

        success, message = transfer_coins(from_user_id, to_user_id, amount)
        return api_response(success=success, data={'message': message})

    except Exception as e:
        logger.error(f"Transfer API error: {e}")
        return api_response(success=False, error=str(e), status_code=500)

# ЭНДПОИНТЫ ЛОТЕРЕИ
@flask_app.route('/api/lottery/status', methods=['GET', 'OPTIONS'])
@handle_api_errors
def get_lottery_status():
    """Получить текущий статус лотереи"""
    if request.method == 'OPTIONS':
        return api_response()

    try:
        eagle_bets, tails_bets = get_lottery_bets()
        timer = get_lottery_timer()
        last_winner = get_last_winner()

        total_eagle = sum(bet['amount'] for bet in eagle_bets)
        total_tails = sum(bet['amount'] for bet in tails_bets)

        return api_response(data={
            'lottery': {
                'eagle': eagle_bets,
                'tails': tails_bets,
                'last_winner': last_winner,
                'timer': timer,
                'total_eagle': total_eagle,
                'total_tails': total_tails,
                'participants_count': len(eagle_bets) + len(tails_bets)
            }
        }, cache_control='public, max-age=10')
    except Exception as e:
        logger.error(f"Lottery status error: {e}")
        return api_response(success=False, error=str(e), status_code=500)

@flask_app.route('/api/lottery/bet', methods=['POST', 'OPTIONS'])
@handle_api_errors
def place_lottery_bet():
    """Сделать ставку в лотерее"""
    if request.method == 'OPTIONS':
        return api_response()

    try:
        data = request.get_json()
        user_id = data.get('userId')
        team = data.get('team')
        amount = float(data.get('amount', 0))

        if not user_id or team not in ['eagle', 'tails'] or amount <= 0:
            return api_response(success=False, error='Invalid data', status_code=400)

        # Проверяем баланс пользователя
        player_data = get_player_data(user_id)
        if not player_data or player_data['balance'] < amount:
            return api_response(
                success=False,
                error='Insufficient funds',
                status_code=400
            )

        # Списываем средства
        player_data['balance'] -= amount
        player_data['totalBet'] += amount
        update_player(player_data)

        # Сохраняем ставку в базу данных
        success = add_lottery_bet(team, user_id, player_data['username'],
                                  amount)

        if not success:
            return api_response(
                success=False,
                error='Failed to place bet',
                status_code=500
            )

        logger.info(f"User {user_id} bet {amount} on {team}")

        return api_response(data={'message': f'Bet placed on {team}'})

    except Exception as e:
        logger.error(f"Lottery bet error: {e}")
        return api_response(success=False, error=str(e), status_code=500)

@flask_app.route('/api/lottery/draw', methods=['POST', 'OPTIONS'])
@handle_api_errors
def conduct_lottery_draw():
    """Провести розыгрыш лотереи"""
    if request.method == 'OPTIONS':
        return api_response()

    try:
        eagle_bets, tails_bets = get_lottery_bets()

        total_eagle = sum(bet['amount'] for bet in eagle_bets)
        total_tails = sum(bet['amount'] for bet in tails_bets)
        total_pot = total_eagle + total_tails

        if total_pot == 0:
            return api_response(success=False, error='No bets placed', status_code=400)

        # Определяем победившую команду
        eagle_chance = total_eagle / total_pot if total_pot > 0 else 0.5
        winning_team = 'eagle' if random.random() < eagle_chance else 'tails'
        losing_team = 'tails' if winning_team == 'eagle' else 'eagle'

        # Вычисляем призовой фонд (все ставки проигравшей команды)
        prize_pool = total_tails if winning_team == 'eagle' else total_eagle

        # Распределяем выигрыш
        winners = eagle_bets if winning_team == 'eagle' else tails_bets
        total_winning_bets = sum(bet['amount'] for bet in winners)

        winning_data = []

        for winner in winners:
            if total_winning_bets > 0:
                win_share = winner['amount'] / total_winning_bets
                prize = prize_pool * win_share

                # Начисляем выигрыш
                player_data = get_player_data(winner['userId'])
                if player_data:
                    player_data['balance'] += prize
                    player_data['lotteryWins'] += 1
                    player_data['totalWinnings'] += prize
                    player_data['lastUpdate'] = datetime.now().isoformat()
                    update_player(player_data)

                    # Сохраняем информацию о победителе
                    add_winner(winning_team, winner['userId'],
                               winner['username'], prize)

                    winning_data.append({
                        'userId': winner['userId'],
                        'username': winner['username'],
                        'prize': prize,
                        'originalBet': winner['amount']
                    })

        # Обновляем статистику проигравших
        losers = tails_bets if winning_team == 'eagle' else eagle_bets
        for loser in losers:
            player_data = get_player_data(loser['userId'])
            if player_data:
                player_data['totalLosses'] += loser['amount']
                update_player(player_data)

        # Очищаем ставки для нового раунда
        clear_lottery_bets()
        update_lottery_timer(60)

        logger.info(
            f"Lottery draw completed. Winning team: {winning_team}, Prize pool: {prize_pool}"
        )

        return api_response(data={
            'winning_team': winning_team,
            'prize_pool': prize_pool,
            'winners': winning_data
        })

    except Exception as e:
        logger.error(f"Lottery draw error: {e}")
        return api_response(success=False, error=str(e), status_code=500)

# ЭНДПОИНТЫ КЛАССИЧЕСКОЙ ЛОТЕРЕИ
@flask_app.route('/api/classic-lottery/status', methods=['GET', 'OPTIONS'])
@handle_api_errors
def get_classic_lottery_status():
    """Получить текущий статус классической лотереи"""
    if request.method == 'OPTIONS':
        return api_response()

    try:
        bets, total_pot = get_classic_lottery_bets()
        timer = get_classic_lottery_timer()
        history = get_classic_lottery_history(10)

        return api_response(data={
            'lottery': {
                'bets': bets,
                'total_pot': total_pot,
                'timer': timer,
                'participants_count': len(bets),
                'history': history
            }
        }, cache_control='public, max-age=10')
    except Exception as e:
        logger.error(f"Classic lottery status error: {e}")
        return api_response(success=False, error=str(e), status_code=500)

@flask_app.route('/api/classic-lottery/bet', methods=['POST', 'OPTIONS'])
@handle_api_errors
def place_classic_lottery_bet():
    """Сделать ставку в классической лотерее"""
    if request.method == 'OPTIONS':
        return api_response()

    try:
        data = request.get_json()
        user_id = data.get('userId')
        amount = float(data.get('amount', 0))

        if not user_id or amount <= 0:
            return api_response(success=False, error='Invalid data', status_code=400)

        # Проверяем баланс пользователя
        player_data = get_player_data(user_id)
        if not player_data or player_data['balance'] < amount:
            return api_response(
                success=False,
                error='Insufficient funds',
                status_code=400
            )

        # Списываем средства
        player_data['balance'] -= amount
        player_data['totalBet'] += amount
        update_player(player_data)

        # Сохраняем ставку в базу данных
        success = add_classic_lottery_bet(user_id, player_data['username'],
                                          amount)

        if not success:
            return api_response(
                success=False,
                error='Failed to place bet',
                status_code=500
            )

        logger.info(f"User {user_id} bet {amount} in classic lottery")

        return api_response(data={'message': f'Bet placed: {amount} S'})

    except Exception as e:
        logger.error(f"Classic lottery bet error: {e}")
        return api_response(success=False, error=str(e), status_code=500)

@flask_app.route('/api/classic-lottery/draw', methods=['POST', 'OPTIONS'])
@handle_api_errors
def conduct_classic_lottery_draw_api():
    """Провести розыгрыш классической лотереи"""
    if request.method == 'OPTIONS':
        return api_response()

    try:
        success, result = conduct_classic_lottery_draw()

        if success:
            return api_response(data={'result': result})
        else:
            return api_response(success=False, error=result, status_code=400)

    except Exception as e:
        logger.error(f"Classic lottery draw API error: {e}")
        return api_response(success=False, error=str(e), status_code=500)

# ЭНДПОИНТЫ РЕФЕРАЛЬНОЙ СИСТЕМЫ
@flask_app.route('/api/referral/stats/<user_id>', methods=['GET', 'OPTIONS'])
@handle_api_errors
def get_referral_stats_api(user_id):
    """Получить статистику реферальной системы"""
    if request.method == 'OPTIONS':
        return api_response()

    try:
        stats = get_referral_stats(user_id)
        player_data = get_player_data(user_id)

        return api_response(data={
            'stats': stats,
            'referralCode': player_data.get('referralCode') if player_data else None
        }, cache_control='public, max-age=30')

    except Exception as e:
        logger.error(f"Referral stats error: {e}")
        return api_response(success=False, error=str(e), status_code=500)

@flask_app.route('/api/referral/add-earning', methods=['POST', 'OPTIONS'])
@handle_api_errors
def add_referral_earning_api():
    """Добавить заработок по реферальной системе"""
    if request.method == 'OPTIONS':
        return api_response()

    try:
        data = request.get_json()
        referrer_user_id = data.get('referrerUserId')
        referred_user_id = data.get('referredUserId')
        amount = float(data.get('amount', 0))
        earning_type = data.get('type', 'mining')  # 'mining' or 'betting'

        if not referrer_user_id or not referred_user_id or amount <= 0:
            return api_response(success=False, error='Invalid data', status_code=400)

        success = add_referral_earning(referrer_user_id, referred_user_id,
                                       amount, earning_type)

        if success:
            return api_response(data={'message': 'Referral earning added'})
        else:
            return api_response(
                success=False,
                error='Failed to add referral earning',
                status_code=500
            )

    except Exception as e:
        logger.error(f"Add referral earning error: {e}")
        return api_response(success=False, error=str(e), status_code=500)

# ЭНДПОИНТ ТОПА ПОБЕДИТЕЛЕЙ
@flask_app.route('/api/top/winners', methods=['GET', 'OPTIONS'])
@handle_api_errors
def get_top_winners_api():
    """Получить топ победителей"""
    if request.method == 'OPTIONS':
        return api_response()

    try:
        limit = request.args.get('limit', 50, type=int)
        winners = get_top_winners(limit)

        return api_response(data={'winners': winners}, cache_control='public, max-age=60')

    except Exception as e:
        logger.error(f"Top winners error: {e}")
        return api_response(success=False, error=str(e), status_code=500)

@flask_app.route('/api/debug/performance', methods=['GET'])
@handle_api_errors
def performance_stats():
    """Endpoint для мониторинга производительности"""
    stats = get_system_stats()
    
    # Статистика кэша
    cache_stats = {
        'size': adaptive_cache.size(),
        'max_size': 500
    }
    
    return api_response(data={
        'system': stats,
        'cache': cache_stats,
        'config': API_CONFIG
    })

@flask_app.route('/')
def index():
    return jsonify({
        'message':
        'Sparkcoin API Server - Optimized for Weak Internet',
        'status':
        'running',
        'version':
        '1.0.0',
        'optimized_for': 'weak and unstable internet connections',
        'endpoints': [
            '/api/health', '/api/player/<user_id>', '/api/leaderboard',
            '/api/all_players', '/api/transfer', '/api/lottery/status',
            '/api/lottery/bet', '/api/lottery/draw',
            '/api/classic-lottery/status', '/api/classic-lottery/bet',
            '/api/classic-lottery/draw', '/api/referral/stats/<user_id>',
            '/api/referral/add-earning', '/api/top/winners', '/api/debug/performance'
        ]
    })

# Улучшенные фоновые задачи с адаптивными интервалами
def adaptive_background_task(task_func, task_name, base_interval=1):
    """Запуск фоновой задачи с адаптивными интервалами"""
    def wrapper():
        consecutive_errors = 0
        max_consecutive_errors = 5
        current_interval = base_interval
        
        while True:
            try:
                task_func()
                consecutive_errors = 0
                current_interval = base_interval  # Возвращаем базовый интервал при успехе
                time.sleep(current_interval)
            except Exception as e:
                consecutive_errors += 1
                logger.error(f"Error in {task_name} (attempt {consecutive_errors}): {e}")
                
                if consecutive_errors >= max_consecutive_errors:
                    logger.error(f"Too many consecutive errors in {task_name}, restarting after long delay")
                    time.sleep(30)
                    consecutive_errors = 0
                    current_interval = base_interval
                else:
                    # Адаптивная задержка
                    current_interval = min(base_interval * (2 ** consecutive_errors), 60)
                    time.sleep(current_interval)
    
    return wrapper

def lottery_timer_task():
    """Фоновая задача для таймера лотереи с улучшенной обработкой ошибок"""
    while True:
        try:
            time.sleep(1)
            current_timer = get_lottery_timer()
            new_timer = current_timer - 1
            update_lottery_timer(new_timer)

            if new_timer <= 0:
                # Проводим розыгрыш с повторными попытками и таймаутами
                for attempt in range(3):
                    try:
                        with flask_app.app_context():
                            with flask_app.test_client() as client:
                                response = client.post('/api/lottery/draw', timeout=30)
                                if response.status_code == 200:
                                    logger.info("Auto lottery draw completed successfully")
                                    break
                                else:
                                    logger.warning(f"Auto lottery draw failed with status {response.status_code}, attempt {attempt + 1}")
                                    if attempt < 2:
                                        time.sleep(5 * (attempt + 1))  # Увеличивающаяся задержка
                    except Exception as e:
                        logger.error(f"Auto lottery draw error (attempt {attempt + 1}): {e}")
                        if attempt < 2:
                            time.sleep(5 * (attempt + 1))
                else:
                    logger.error("All lottery draw attempts failed")

                update_lottery_timer(60)

        except Exception as e:
            logger.error(f"Lottery timer task error: {e}")
            time.sleep(5)

def classic_lottery_timer_task():
    """Фоновая задача для таймера классической лотереи"""
    while True:
        try:
            time.sleep(1)
            current_timer = get_classic_lottery_timer()
            new_timer = current_timer - 1
            update_classic_lottery_timer(new_timer)

            if new_timer <= 0:
                # Проводим розыгрыш с повторными попытками
                for attempt in range(3):
                    try:
                        with flask_app.app_context():
                            with flask_app.test_client() as client:
                                response = client.post('/api/classic-lottery/draw', timeout=30)
                                if response.status_code == 200:
                                    logger.info("Auto classic lottery draw completed")
                                    break
                                else:
                                    logger.warning(f"Auto classic lottery draw failed with status {response.status_code}, attempt {attempt + 1}")
                                    if attempt < 2:
                                        time.sleep(5)
                    except Exception as e:
                        logger.error(f"Auto classic lottery draw error (attempt {attempt + 1}): {e}")
                        if attempt < 2:
                            time.sleep(5)
                else:
                    logger.error("All classic lottery draw attempts failed")

                update_classic_lottery_timer(120)

        except Exception as e:
            logger.error(f"Classic lottery timer error: {e}")
            time.sleep(5)

# Обработчики бота
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("🎮 Welcome to Sparkcoin!\n\n"
                                    "Available commands:\n"
                                    "/game - Start game\n"
                                    "/stats - Your statistics\n"
                                    "/leaderboard - Player ratings\n"
                                    "/shop - Upgrade store")

async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📊 Statistics available in web version. Use /game to start!")

async def leaderboard_command(update: Update,
                              context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🏆 Leaderboard available in web version. Use /game to start!")

async def transfer_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "💸 Transfers available in web version. Use /game to start!")

async def shop_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🛠️ Upgrade store available in web version. Use /game to start!")

async def lottery_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🎮 Team lottery available in web version. Use /game to start!")

async def handle_web_app_data(update: Update,
                              context: ContextTypes.DEFAULT_TYPE):
    pass

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    pass

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.error(f"Bot error: {context.error}")

# Запуск Flask с улучшенными настройками
def run_flask_app():
    try:
        logger.info(f"Starting Flask API on port {API_PORT} with optimized settings for weak connections")
        
        # Используем production-ready server с улучшенными настройками
        try:
            from waitress import serve
            serve(flask_app, host='0.0.0.0', port=API_PORT, threads=100, connection_limit=1000)
        except ImportError:
            # Fallback на development server
            logger.warning("Waitress not available, using development server")
            flask_app.run(host='0.0.0.0',
                          port=API_PORT,
                          debug=False,
                          use_reloader=False,
                          threaded=True)
        
    except Exception as e:
        logger.error(f"Flask startup error: {e}")

# Основная функция
def main():
    if not TOKEN:
        logger.error("BOT_TOKEN not found in .env")
        return

    # Инициализация БД
    init_db()

    # Запуск фоновых задач с адаптивными интервалами
    lottery_thread = threading.Thread(
        target=adaptive_background_task(lottery_timer_task, "Lottery Timer", 1), 
        daemon=True
    )
    lottery_thread.start()
    logger.info("Adaptive lottery timer thread started")

    classic_lottery_thread = threading.Thread(
        target=adaptive_background_task(classic_lottery_timer_task, "Classic Lottery Timer", 1),
        daemon=True
    )
    classic_lottery_thread.start()
    logger.info("Adaptive classic lottery timer thread started")

    # Запуск Flask в отдельном потоке
    flask_thread = threading.Thread(target=run_flask_app, daemon=True)
    flask_thread.start()
    logger.info(f"Optimized Flask API started on port {API_PORT}")

    # Создание приложения бота
    application = Application.builder().token(TOKEN).build()

    # Регистрация обработчиков
    handlers = [
        CommandHandler("start", start),
        CommandHandler("stats", stats_command),
        CommandHandler("leaderboard", leaderboard_command),
        CommandHandler("top", leaderboard_command),
        CommandHandler("transfer", transfer_command),
        CommandHandler("shop", shop_command),
        CommandHandler("lottery", lottery_command),
        CommandHandler("help", start),
        CommandHandler("game", start),
        MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_web_app_data),
        CallbackQueryHandler(button_handler)
    ]

    for handler in handlers:
        application.add_handler(handler)

    application.add_error_handler(error_handler)

    logger.info("Sparkcoin bot started with optimized API for weak internet connections!")
    logger.info(f"Adaptive cache initialized with {adaptive_cache.size()} items")
    application.run_polling()

if __name__ == "__main__":
    main()
