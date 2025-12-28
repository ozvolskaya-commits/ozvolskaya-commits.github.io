# bot.py - УЛУЧШЕННАЯ ВЕРСИЯ С ИСПРАВЛЕННЫМИ ПЕРЕВОДАМИ
import os
import json
import logging
import sqlite3
import random
import time
import threading
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
import uuid
import hashlib

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO)
logger = logging.getLogger(__name__)

flask_app = Flask(__name__)

# СИНХРОНИЗАЦИЯ ВРЕМЕНИ ЛОТЕРЕЙ
LOTTERY_START_TIME = time.time()
CLASSIC_LOTTERY_START_TIME = time.time()


def get_synced_lottery_timer():
    """Синхронизированный таймер для командной лотереи"""
    global LOTTERY_START_TIME
    elapsed = int(time.time() - LOTTERY_START_TIME)
    timer = 60 - (elapsed % 60)
    return max(1, timer)


def get_synced_classic_timer():
    """Синхронизированный таймер для классической лотереи"""
    global CLASSIC_LOTTERY_START_TIME
    elapsed = int(time.time() - CLASSIC_LOTTERY_START_TIME)
    timer = 120 - (elapsed % 120)
    return max(1, timer)


# УЛУЧШЕННАЯ СИСТЕМА МУЛЬТИСЕССИИ
ACTIVE_SESSIONS = {}
SESSION_TIMEOUT = 15  # 15 секунд
MAX_BALANCE = 1000.0
MAX_EARNED = 10000.0
MAX_CLICKS = 10000000


def start_session_cleanup():
    """Запуск фоновой очистки сессий"""

    def cleanup_loop():
        while True:
            try:
                EnhancedSessionManager.cleanup_sessions()
                time.sleep(30)
            except Exception as e:
                print(f"❌ Ошибка в cleanup_loop: {e}")
                time.sleep(60)

    cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
    cleanup_thread.start()
    print("✅ Фоновая очистка сессий запущена")


def backup_database():
    """Создание резервной копии базы данных"""
    try:
        if os.path.exists('sparkcoin.db'):
            backup_name = f"backup_sparkcoin_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
            import shutil
            shutil.copy2('sparkcoin.db', backup_name)
            print(f"✅ Создана резервная копия: {backup_name}")
            return backup_name
    except Exception as e:
        print(f"❌ Ошибка создания бэкапа: {e}")
    return None


class EnhancedSessionManager:

    @staticmethod
    def update_session(telegram_id, device_id, username):
        """Обновляет сессию - УЛУЧШЕННАЯ ВЕРСИЯ"""
        if not telegram_id:
            return

        current_time = time.time()

        # Очищаем старые сессии этого пользователя
        sessions_to_remove = []
        for tid, session in ACTIVE_SESSIONS.items():
            if tid == telegram_id or session.get('username') == username:
                if session.get('device_id'
                               ) == device_id and current_time - session.get(
                                   'last_activity', 0) < SESSION_TIMEOUT:
                    continue
                sessions_to_remove.append(tid)

        for tid in sessions_to_remove:
            if tid in ACTIVE_SESSIONS:
                del ACTIVE_SESSIONS[tid]

        # Создаем/обновляем сессию
        ACTIVE_SESSIONS[telegram_id] = {
            'device_id': device_id,
            'username': username,
            'last_activity': current_time,
            'timestamp': current_time,
            'ip_address': request.remote_addr
        }

    @staticmethod
    def check_multi_session(telegram_id, current_device_id):
        """Проверяет мультисессию - УЛУЧШЕННАЯ ВЕРСИЯ"""
        if not telegram_id:
            return False

        current_time = time.time()

        for tid, session in ACTIVE_SESSIONS.items():
            if tid == telegram_id:
                session_age = current_time - session['last_activity']
                if (session_age < SESSION_TIMEOUT
                        and session['device_id'] != current_device_id):
                    return True
        return False

    @staticmethod
    def cleanup_sessions():
        """Очищает старые сессии"""
        current_time = time.time()
        expired = []

        for tid, session in ACTIVE_SESSIONS.items():
            if current_time - session['last_activity'] > SESSION_TIMEOUT * 3:
                expired.append(tid)

        for tid in expired:
            if tid in ACTIVE_SESSIONS:
                del ACTIVE_SESSIONS[tid]

    @staticmethod
    def get_session_stats():
        """Статистика сессий"""
        active_count = 0
        current_time = time.time()

        for session in ACTIVE_SESSIONS.values():
            if current_time - session['last_activity'] < SESSION_TIMEOUT:
                active_count += 1

        return {
            'total_sessions': len(ACTIVE_SESSIONS),
            'active_sessions': active_count,
            'session_timeout': SESSION_TIMEOUT
        }


def validate_sync_data(data):
    """Проверяет корректность данных синхронизации"""
    try:
        if not data.get('username') or not isinstance(data.get('username'),
                                                      str):
            return False

        balance = float(data.get('balance', 0))
        total_earned = float(data.get('totalEarned', 0))
        total_clicks = int(data.get('totalClicks', 0))

        if balance < 0 or total_earned < 0 or total_clicks < 0:
            return False

        if balance > MAX_BALANCE:
            return False

        if total_earned > MAX_EARNED:
            return False

        if total_clicks > MAX_CLICKS:
            return False

        upgrades = data.get('upgrades', {})
        if upgrades:
            if not isinstance(upgrades, dict):
                return False

            for key, value in upgrades.items():
                if not isinstance(key, str) or not key:
                    return False

                if isinstance(value, (int, float)):
                    if value < 0 or value > 1000:
                        return False
                elif isinstance(value, dict):
                    level = value.get('level', 0)
                    if not isinstance(
                            level, (int, float)) or level < 0 or level > 1000:
                        return False
                else:
                    return False

        device_id = data.get('deviceId')
        if device_id and (not isinstance(device_id, str)
                          or len(device_id) > 100):
            return False

        return True

    except Exception as e:
        return False


def get_db_connection():
    """Улучшенное подключение к БД"""
    try:
        conn = sqlite3.connect('sparkcoin.db',
                               check_same_thread=False,
                               timeout=30.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA busy_timeout = 5000")
        conn.execute("PRAGMA journal_mode = WAL")
        return conn
    except Exception as e:
        logger.error(f"❌ Database connection error: {e}")
        return None


def init_db():
    """Улучшенная инициализация БД"""
    try:
        conn = get_db_connection()
        if not conn:
            raise Exception("Не удалось подключиться к БД")

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
                referral_earnings REAL DEFAULT 0,
                referrals_count INTEGER DEFAULT 0,
                total_winnings REAL DEFAULT 0,
                total_losses REAL DEFAULT 0,
                telegram_id TEXT,
                telegram_username TEXT,
                last_device_id TEXT,
                referral_code TEXT UNIQUE,
                referred_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_ip TEXT,
                version TEXT DEFAULT '2.0.0',
                first_deposit_bonus BOOLEAN DEFAULT FALSE,
                click_speed REAL DEFAULT 0.000000001,
                mine_speed REAL DEFAULT 0.000000000,
                total_speed REAL DEFAULT 0.000000001
            )
        ''')

        # Таблицы для лотерей
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS lottery_bets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                username TEXT,
                team TEXT,
                amount REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS classic_lottery_bets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                username TEXT,
                amount REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS lottery_timer (
                id INTEGER PRIMARY KEY,
                timer INTEGER DEFAULT 60,
                last_winner TEXT,
                last_prize REAL DEFAULT 0,
                last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS classic_lottery_timer (
                id INTEGER PRIMARY KEY,
                timer INTEGER DEFAULT 120,
                total_pot REAL DEFAULT 0,
                last_winner TEXT,
                last_prize REAL DEFAULT 0,
                last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS lottery_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lottery_type TEXT,
                winner_user_id TEXT,
                winner_username TEXT,
                prize REAL,
                participants INTEGER,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT
            )
        ''')

        # Таблица переводов
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transfers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_user_id TEXT,
                from_username TEXT,
                to_user_id TEXT,
                to_username TEXT,
                amount REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address TEXT
            )
        ''')

        # Таблица рефералов
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS referrals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                referrer_user_id TEXT,
                referred_user_id TEXT,
                referral_code TEXT,
                earnings REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Таблица системных логов
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS system_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level TEXT,
                message TEXT,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Инициализация таймеров
        cursor.execute(
            'INSERT OR IGNORE INTO lottery_timer (id, timer) VALUES (1, 60)')
        cursor.execute(
            'INSERT OR IGNORE INTO classic_lottery_timer (id, timer) VALUES (1, 120)'
        )

        conn.commit()
        conn.close()
        print("✅ База данных инициализирована успешно")

    except Exception as e:
        print(f"❌ Ошибка инициализации БД: {e}")


def log_system_event(level, message, details=None):
    """Логирование системных событий"""
    try:
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO system_logs (level, message, details) VALUES (?, ?, ?)',
                (level, message, json.dumps(details) if details else None))
            conn.commit()
            conn.close()
    except Exception as e:
        print(f"❌ Ошибка логирования: {e}")


def apply_referral_bonus(user_id, referrer_id, amount):
    """Применение реферального бонуса"""
    try:
        conn = get_db_connection()
        if not conn:
            return False

        cursor = conn.cursor()

        # Начисляем бонус новому пользователю (10%)
        cursor.execute(
            'UPDATE players SET balance = balance + ?, referral_earnings = referral_earnings + ? WHERE user_id = ?',
            (amount * 0.10, amount * 0.10, user_id))

        # Начисляем бонус пригласившему (5%)
        cursor.execute(
            'UPDATE players SET balance = balance + ?, referral_earnings = referral_earnings + ?, referrals_count = referrals_count + 1 WHERE user_id = ?',
            (amount * 0.05, amount * 0.05, referrer_id))

        # Записываем реферала
        cursor.execute(
            'INSERT INTO referrals (referrer_user_id, referred_user_id, referral_code, earnings) VALUES (?, ?, ?, ?)',
            (referrer_id, user_id, f"REF-{referrer_id[-8:]}", amount * 0.05))

        conn.commit()
        conn.close()
        return True

    except Exception as e:
        print(f"❌ Ошибка применения реферального бонуса: {e}")
        return False


# CORS
@flask_app.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers[
        'Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Device-ID'
    response.headers[
        'Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['X-Server-Version'] = 'Sparkcoin-2.0.0'
    return response


# OPTIONS handlers
@flask_app.route('/api/<path:path>', methods=['OPTIONS'])
def options_handler(path):
    return jsonify({'status': 'preflight'}), 200


# API ENDPOINTS


@flask_app.route('/api/health', methods=['GET'])
def health_check():
    session_stats = EnhancedSessionManager.get_session_stats()
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'Sparkcoin API - ENHANCED VERSION',
        'version': '2.0.0',
        'sessions': session_stats,
        'database': 'connected'
    })


@flask_app.route('/api/session/check', methods=['POST'])
def check_session():
    try:
        data = request.get_json()
        telegram_id = data.get('telegramId')
        device_id = data.get('deviceId')
        username = data.get('username')

        if not telegram_id or not device_id:
            return jsonify({
                'success': False,
                'allowed': False,
                'error': 'Missing telegramId or deviceId'
            })

        if EnhancedSessionManager.check_multi_session(telegram_id, device_id):
            return jsonify({
                'success':
                False,
                'allowed':
                False,
                'error':
                'multisession_blocked',
                'message':
                'Обнаружена активная сессия на другом устройстве'
            })

        EnhancedSessionManager.update_session(telegram_id, device_id, username)

        return jsonify({
            'success': True,
            'allowed': True,
            'message': 'Session access granted'
        })

    except Exception as e:
        return jsonify({'success': False, 'allowed': False, 'error': str(e)})


@flask_app.route('/api/sync/unified', methods=['POST'])
def sync_unified():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        telegram_id = data.get('telegramId')
        username = data.get('username')
        balance = float(data.get('balance', 0))
        total_earned = float(data.get('totalEarned', 0))
        total_clicks = int(data.get('totalClicks', 0))
        upgrades = data.get('upgrades', {})
        device_id = data.get('deviceId', 'unknown')
        referral_code = data.get('referralCode')
        click_speed = float(data.get('clickSpeed', 0.000000001))
        mine_speed = float(data.get('mineSpeed', 0.000000000))
        total_speed = click_speed + mine_speed

        if not user_id and not telegram_id:
            return jsonify({
                'success': False,
                'error': 'No user ID or telegram ID'
            })

        if not validate_sync_data(data):
            return jsonify({
                'success': False,
                'error': 'Invalid data values detected'
            })

        multisession_detected = False
        if telegram_id:
            if EnhancedSessionManager.check_multi_session(
                    telegram_id, device_id):
                multisession_detected = True
            EnhancedSessionManager.update_session(telegram_id, device_id,
                                                  username)

        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'error': 'Database connection failed'
            })

        cursor = conn.cursor()

        # Проверяем реферальный код
        referrer_id = None
        if referral_code and not referral_code.startswith('REF-'):
            referral_code = f"REF-{referral_code}"

        if referral_code:
            cursor.execute(
                'SELECT user_id FROM players WHERE referral_code = ?',
                (referral_code, ))
            referrer = cursor.fetchone()
            if referrer:
                referrer_id = referrer['user_id']

        # Поиск существующих записей
        search_params = []
        if user_id:
            search_params.append(user_id)
        if telegram_id:
            search_params.append(telegram_id)
            search_params.append(f'tg_{telegram_id}')

        placeholders = ','.join(['?'] * len(search_params))
        query = f'''
            SELECT * FROM players 
            WHERE user_id IN ({placeholders}) OR telegram_id = ?
            ORDER BY last_update DESC
        '''

        cursor.execute(query, search_params + [telegram_id])
        existing_records = cursor.fetchall()

        # Определяем лучшие данные
        best_balance = balance
        best_total_earned = total_earned
        best_total_clicks = total_clicks
        best_upgrades = upgrades.copy() if upgrades else {}
        best_user_id = user_id or (f'tg_{telegram_id}' if telegram_id else
                                   f'user_{int(time.time())}')
        best_click_speed = click_speed
        best_mine_speed = mine_speed
        best_total_speed = total_speed

        is_new_user = False

        if existing_records:
            max_balance_record = None
            max_balance = best_balance

            for record in existing_records:
                try:
                    record_balance = float(
                        record['balance']
                    ) if record['balance'] is not None else 0
                    if record_balance > max_balance:
                        max_balance = record_balance
                        max_balance_record = record
                except (TypeError, ValueError):
                    continue

            if max_balance_record:
                best_balance = max_balance
                best_total_earned = max(
                    total_earned, float(max_balance_record['total_earned']
                                        or 0))
                best_total_clicks = max(
                    total_clicks, int(max_balance_record['total_clicks'] or 0))
                best_user_id = max_balance_record['user_id']

                # Сохраняем лучшие скорости
                best_click_speed = max(
                    click_speed, float(max_balance_record['click_speed'] or 0))
                best_mine_speed = max(
                    mine_speed, float(max_balance_record['mine_speed'] or 0))
                best_total_speed = best_click_speed + best_mine_speed

                if max_balance_record['upgrades']:
                    try:
                        existing_upgrades = json.loads(
                            max_balance_record['upgrades'])
                        if isinstance(existing_upgrades, dict):
                            for key, level in existing_upgrades.items():
                                server_level = level
                                if isinstance(level,
                                              dict) and 'level' in level:
                                    server_level = level['level']

                                current_level = best_upgrades.get(key, 0)
                                if isinstance(
                                        current_level,
                                        dict) and 'level' in current_level:
                                    current_level = current_level['level']

                                if isinstance(server_level,
                                              (int, float)) and isinstance(
                                                  current_level, (int, float)):
                                    best_upgrades[key] = max(
                                        current_level, server_level)
                                elif isinstance(server_level, (int, float)):
                                    best_upgrades[key] = server_level
                                else:
                                    best_upgrades[key] = current_level
                    except Exception as e:
                        print(f"⚠️ Ошибка объединения улучшений: {e}")

            for record in existing_records:
                cursor.execute(
                    '''
                    UPDATE players SET 
                    username=?, balance=?, total_earned=?, total_clicks=?,
                    upgrades=?, last_update=CURRENT_TIMESTAMP,
                    telegram_id=?, telegram_username=?, last_device_id=?, last_ip=?,
                    click_speed=?, mine_speed=?, total_speed=?
                    WHERE user_id=?
                ''', (username, best_balance,
                      best_total_earned, best_total_clicks,
                      json.dumps(best_upgrades), telegram_id, username,
                      device_id, request.remote_addr, best_click_speed,
                      best_mine_speed, best_total_speed, record['user_id']))

        else:
            is_new_user = True
            best_user_id = user_id or (f'tg_{telegram_id}' if telegram_id else
                                       f'user_{int(time.time())}')

            # Генерируем уникальный реферальный код
            referral_code_new = f"REF-{str(uuid.uuid4())[:8].upper()}"

            # Применяем реферальный бонус для нового пользователя
            if referrer_id:
                apply_referral_bonus(best_user_id, referrer_id, 0.000000100)

            cursor.execute(
                '''
                INSERT INTO players 
                (user_id, username, balance, total_earned, total_clicks, upgrades, 
                 telegram_id, telegram_username, last_device_id, referral_code, last_ip, 
                 referred_by, click_speed, mine_speed, total_speed)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (best_user_id, username, balance, total_earned, total_clicks,
                  json.dumps(upgrades), telegram_id, username, device_id,
                  referral_code_new, request.remote_addr, referrer_id,
                  click_speed, mine_speed, total_speed))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Sync successful',
            'userId': best_user_id,
            'bestBalance': best_balance,
            'multisessionDetected': multisession_detected,
            'upgradesCount': len(best_upgrades),
            'isNewUser': is_new_user,
            'referralApplied': referrer_id is not None,
            'clickSpeed': best_click_speed,
            'mineSpeed': best_mine_speed,
            'totalSpeed': best_total_speed
        })

    except Exception as e:
        print(f"❌ Sync error: {e}")
        return jsonify({'success': False, 'error': str(e)})


@flask_app.route('/api/sync/unified/<user_id>', methods=['GET'])
def get_unified_user(user_id):
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'error': 'Database connection failed'
            })

        cursor = conn.cursor()

        cursor.execute(
            '''
            SELECT * FROM players 
            WHERE user_id = ? OR user_id LIKE ? OR user_id LIKE ?
            ORDER BY last_update DESC 
            LIMIT 1
        ''', (user_id, f'tg_%', f'%{user_id}%'))

        player = cursor.fetchone()
        conn.close()

        if player:
            upgrades_data = {}
            if player['upgrades']:
                try:
                    upgrades_data = json.loads(player['upgrades'])
                except:
                    upgrades_data = {}

            return jsonify({
                'success': True,
                'userData': {
                    'userId': player['user_id'],
                    'username': player['username'],
                    'balance': player['balance'],
                    'totalEarned': player['total_earned'],
                    'totalClicks': player['total_clicks'],
                    'upgrades': upgrades_data,
                    'lastUpdate': player['last_update'],
                    'lotteryWins': player['lottery_wins'] or 0,
                    'totalBet': player['total_bet'] or 0,
                    'referralEarnings': player['referral_earnings'] or 0,
                    'referralsCount': player['referrals_count'] or 0,
                    'totalWinnings': player['total_winnings'] or 0,
                    'totalLosses': player['total_losses'] or 0,
                    'telegramId': player['telegram_id'],
                    'telegramUsername': player['telegram_username'],
                    'referralCode': player['referral_code'],
                    'referredBy': player['referred_by'],
                    'version': player['version'] or '2.0.0',
                    'clickSpeed': player['click_speed'] or 0.000000001,
                    'mineSpeed': player['mine_speed'] or 0.000000000,
                    'totalSpeed': player['total_speed'] or 0.000000001
                }
            })
        else:
            return jsonify({'success': False, 'message': 'User not found'})

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


# ЛОТЕРЕЙНЫЕ ENDPOINTS С СИНХРОНИЗАЦИЕЙ ВРЕМЕНИ


@flask_app.route('/api/lottery/bet', methods=['POST'])
def lottery_bet():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        team = data.get('team')
        amount = float(data.get('amount', 0))
        username = data.get('username')

        if not user_id or not team or not amount or not username:
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            })

        if team not in ['eagle', 'tails']:
            return jsonify({'success': False, 'error': 'Invalid team'})

        if amount <= 0:
            return jsonify({'success': False, 'error': 'Invalid amount'})

        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'error': 'Database connection failed'
            })

        cursor = conn.cursor()

        cursor.execute('SELECT balance FROM players WHERE user_id = ?',
                       (user_id, ))
        player = cursor.fetchone()

        if not player or player['balance'] < amount:
            return jsonify({'success': False, 'error': 'Insufficient funds'})

        cursor.execute(
            'UPDATE players SET balance = balance - ?, total_bet = total_bet + ? WHERE user_id = ?',
            (amount, amount, user_id))

        cursor.execute(
            'INSERT INTO lottery_bets (user_id, username, team, amount, ip_address) VALUES (?, ?, ?, ?, ?)',
            (user_id, username, team, amount, request.remote_addr))

        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Bet placed'})
    except Exception as e:
        return jsonify({'success': False, 'error': 'Bet failed'})


@flask_app.route('/api/classic-lottery/bet', methods=['POST'])
def classic_lottery_bet():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        amount = float(data.get('amount', 0))
        username = data.get('username')

        if not user_id or not amount or not username:
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            })

        if amount <= 0:
            return jsonify({'success': False, 'error': 'Invalid amount'})

        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'error': 'Database connection failed'
            })

        cursor = conn.cursor()

        cursor.execute('SELECT balance FROM players WHERE user_id = ?',
                       (user_id, ))
        player = cursor.fetchone()

        if not player or player['balance'] < amount:
            return jsonify({'success': False, 'error': 'Insufficient funds'})

        cursor.execute(
            'UPDATE players SET balance = balance - ?, total_bet = total_bet + ? WHERE user_id = ?',
            (amount, amount, user_id))

        cursor.execute(
            'INSERT INTO classic_lottery_bets (user_id, username, amount, ip_address) VALUES (?, ?, ?, ?)',
            (user_id, username, amount, request.remote_addr))

        conn.commit()
        conn.close()

        return jsonify({'success': True, 'message': 'Bet placed'})
    except Exception as e:
        return jsonify({'success': False, 'error': 'Bet failed'})


@flask_app.route('/api/classic-lottery/status', methods=['GET'])
def classic_lottery_status():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': True,
                'lottery': {
                    'bets': [],
                    'total_pot': 0,
                    'timer': get_synced_classic_timer(),
                    'participants_count': 0,
                    'history': []
                }
            })

        cursor = conn.cursor()

        cursor.execute('''
            SELECT user_id, username, amount, timestamp
            FROM classic_lottery_bets 
            WHERE timestamp > datetime('now', '-10 minutes')
            ORDER BY timestamp DESC
        ''')

        bets = []
        total_pot = 0

        for row in cursor.fetchall():
            bet = {
                'userId': row['user_id'],
                'username': row['username'],
                'amount': row['amount'],
                'timestamp': row['timestamp']
            }
            bets.append(bet)
            total_pot += row['amount']

        cursor.execute('''
            SELECT winner_username, prize, participants, timestamp
            FROM lottery_history 
            WHERE lottery_type = 'classic'
            ORDER BY timestamp DESC
            LIMIT 10
        ''')

        history = []
        for row in cursor.fetchall():
            history.append({
                'winner': row['winner_username'],
                'prize': row['prize'],
                'participants': row['participants'],
                'timestamp': row['timestamp']
            })

        # Используем синхронизированный таймер
        current_timer = get_synced_classic_timer()

        # Проверяем, нужно ли проводить розыгрыш
        if current_timer == 1:
            if bets and total_pot > 0:
                winning_user = random.choice(bets)
                prize = total_pot * 0.9

                cursor.execute(
                    'UPDATE players SET balance = balance + ?, total_winnings = total_winnings + ? WHERE user_id = ?',
                    (prize, prize, winning_user['user_id']))

                cursor.execute(
                    '''
                    INSERT INTO lottery_history (lottery_type, winner_user_id, winner_username, prize, participants, ip_address)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', ('classic',
                      winning_user['user_id'], winning_user['username'], prize,
                      len(bets), request.remote_addr))

            cursor.execute(
                "DELETE FROM classic_lottery_bets WHERE timestamp < datetime('now', '-1 hour')"
            )

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'lottery': {
                'bets': bets,
                'total_pot': total_pot,
                'timer': current_timer,
                'participants_count': len(bets),
                'history': history
            }
        })
    except Exception as e:
        return jsonify({
            'success': True,
            'lottery': {
                'bets': [],
                'total_pot': 0,
                'timer': get_synced_classic_timer(),
                'participants_count': 0,
                'history': []
            }
        })


@flask_app.route('/api/lottery/status', methods=['GET'])
def lottery_status():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': True,
                'lottery': {
                    'eagle': [],
                    'tails': [],
                    'last_winner': None,
                    'timer': get_synced_lottery_timer(),
                    'total_eagle': 0,
                    'total_tails': 0,
                    'participants_count': 0
                }
            })

        cursor = conn.cursor()

        cursor.execute('''
            SELECT user_id, username, team, amount, timestamp
            FROM lottery_bets 
            WHERE timestamp > datetime('now', '-5 minutes')
            ORDER BY timestamp DESC
        ''')

        eagle_bets = []
        tails_bets = []
        total_eagle = 0
        total_tails = 0

        for row in cursor.fetchall():
            bet = {
                'userId': row['user_id'],
                'username': row['username'],
                'amount': row['amount'],
                'timestamp': row['timestamp']
            }

            if row['team'] == 'eagle':
                eagle_bets.append(bet)
                total_eagle += row['amount']
            else:
                tails_bets.append(bet)
                total_tails += row['amount']

        # Используем синхронизированный таймер
        current_timer = get_synced_lottery_timer()

        # Проверяем, нужно ли проводить розыгрыш
        if current_timer == 1:
            winner = random.choice(['eagle', 'tails'])
            total_pot = total_eagle + total_tails

            if total_pot > 0 and (eagle_bets or tails_bets):
                winning_bets = eagle_bets if winner == 'eagle' else tails_bets
                if winning_bets:
                    winning_user = random.choice(winning_bets)
                    prize = total_pot * 0.9

                    cursor.execute(
                        'UPDATE players SET balance = balance + ?, total_winnings = total_winnings + ? WHERE user_id = ?',
                        (prize, prize, winning_user['user_id']))

                    cursor.execute(
                        '''
                        INSERT INTO lottery_history (lottery_type, winner_user_id, winner_username, prize, participants, ip_address)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', ('team', winning_user['user_id'],
                          winning_user['username'], prize, len(eagle_bets) +
                          len(tails_bets), request.remote_addr))

                cursor.execute(
                    "DELETE FROM lottery_bets WHERE timestamp < datetime('now', '-1 hour')"
                )

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'lottery': {
                'eagle': eagle_bets,
                'tails': tails_bets,
                'last_winner': None,
                'timer': current_timer,
                'total_eagle': total_eagle,
                'total_tails': total_tails,
                'participants_count': len(eagle_bets) + len(tails_bets)
            }
        })
    except Exception as e:
        return jsonify({
            'success': True,
            'lottery': {
                'eagle': [],
                'tails': [],
                'last_winner': None,
                'timer': get_synced_lottery_timer(),
                'total_eagle': 0,
                'total_tails': 0,
                'participants_count': 0
            }
        })


# РЕФЕРАЛЬНАЯ СИСТЕМА


@flask_app.route('/api/referral/stats/<user_id>', methods=['GET'])
def referral_stats(user_id):
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': True,
                'stats': {
                    'referralsCount': 0,
                    'totalEarnings': 0
                },
                'referralCode': f'REF-{user_id[-8:].upper()}',
                'referralsList': []
            })

        cursor = conn.cursor()

        cursor.execute(
            '''
            SELECT referrals_count, referral_earnings, referral_code
            FROM players WHERE user_id = ?
        ''', (user_id, ))

        player = cursor.fetchone()

        if player:
            # Получаем список рефералов
            cursor.execute(
                '''
                SELECT referred_user_id, earnings, created_at 
                FROM referrals 
                WHERE referrer_user_id = ?
                ORDER BY created_at DESC
            ''', (user_id, ))

            referrals_list = []
            for row in cursor.fetchall():
                cursor.execute(
                    'SELECT username FROM players WHERE user_id = ?',
                    (row['referred_user_id'], ))
                referred_user = cursor.fetchone()
                referrals_list.append({
                    'username':
                    referred_user['username'] if referred_user else 'Игрок',
                    'earnings':
                    row['earnings'],
                    'joined_at':
                    row['created_at']
                })

            conn.close()

            return jsonify({
                'success': True,
                'stats': {
                    'referralsCount': player['referrals_count'] or 0,
                    'totalEarnings': player['referral_earnings'] or 0
                },
                'referralCode': player['referral_code']
                or f'REF-{user_id[-8:].upper()}',
                'referralsList': referrals_list
            })
        else:
            conn.close()
            return jsonify({
                'success': True,
                'stats': {
                    'referralsCount': 0,
                    'totalEarnings': 0
                },
                'referralCode': f'REF-{user_id[-8:].upper()}',
                'referralsList': []
            })
    except Exception as e:
        return jsonify({
            'success': True,
            'stats': {
                'referralsCount': 0,
                'totalEarnings': 0
            },
            'referralCode': f'REF-{user_id[-8:].upper()}',
            'referralsList': []
        })


@flask_app.route('/api/referral/apply', methods=['POST'])
def apply_referral():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        referral_code = data.get('referralCode')

        if not user_id or not referral_code:
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            })

        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'error': 'Database connection failed'
            })

        cursor = conn.cursor()

        # Проверяем существование реферального кода
        cursor.execute('SELECT user_id FROM players WHERE referral_code = ?',
                       (referral_code, ))
        referrer = cursor.fetchone()

        if not referrer:
            return jsonify({
                'success': False,
                'error': 'Invalid referral code'
            })

        referrer_id = referrer['user_id']

        # Проверяем, не использовал ли уже пользователь реферальный код
        cursor.execute('SELECT referred_by FROM players WHERE user_id = ?',
                       (user_id, ))
        user = cursor.fetchone()

        if user and user['referred_by']:
            return jsonify({
                'success': False,
                'error': 'Referral code already used'
            })

        # Применяем бонусы
        bonus_amount = 0.000000100
        success = apply_referral_bonus(user_id, referrer_id, bonus_amount)

        if success:
            # Обновляем запись пользователя
            cursor.execute(
                'UPDATE players SET referred_by = ? WHERE user_id = ?',
                (referrer_id, user_id))
            conn.commit()
            conn.close()

            return jsonify({
                'success': True,
                'message': 'Referral bonus applied',
                'bonus': bonus_amount
            })
        else:
            conn.close()
            return jsonify({
                'success': False,
                'error': 'Failed to apply bonus'
            })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


# ДОПОЛНИТЕЛЬНЫЕ ENDPOINTS


@flask_app.route('/api/all_players', methods=['GET'])
def all_players():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': True, 'players': []})

        cursor = conn.cursor()

        cursor.execute('''
            SELECT user_id, username, balance, total_earned, total_clicks,
                   click_speed, mine_speed, (click_speed + mine_speed) as total_speed
            FROM players 
            ORDER BY balance DESC 
            LIMIT 50
        ''')

        players = []
        for row in cursor.fetchall():
            players.append({
                'userId': row['user_id'],
                'username': row['username'],
                'balance': row['balance'],
                'totalEarned': row['total_earned'],
                'totalClicks': row['total_clicks'],
                'clickSpeed': row['click_speed'] or 0.000000001,
                'mineSpeed': row['mine_speed'] or 0.000000000,
                'totalSpeed': row['total_speed'] or 0.000000001
            })

        conn.close()

        return jsonify({'success': True, 'players': players})

    except Exception as e:
        return jsonify({'success': True, 'players': []})


@flask_app.route('/api/leaderboard', methods=['GET'])
def leaderboard():
    leaderboard_type = request.args.get('type', 'balance')
    limit = int(request.args.get('limit', 20))

    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': True, 'leaderboard': []})

        cursor = conn.cursor()

        if leaderboard_type == 'balance':
            cursor.execute(
                '''
                SELECT user_id, username, balance, total_earned, total_clicks,
                       click_speed, mine_speed, (click_speed + mine_speed) as total_speed
                FROM players 
                ORDER BY balance DESC 
                LIMIT ?
            ''', (limit, ))
        elif leaderboard_type == 'speed':
            cursor.execute(
                '''
                SELECT user_id, username, balance, total_earned, total_clicks,
                       click_speed, mine_speed, (click_speed + mine_speed) as total_speed
                FROM players 
                ORDER BY total_speed DESC 
                LIMIT ?
            ''', (limit, ))
        else:
            cursor.execute(
                '''
                SELECT user_id, username, balance, total_earned, total_clicks,
                       click_speed, mine_speed, (click_speed + mine_speed) as total_speed
                FROM players 
                ORDER BY total_earned DESC 
                LIMIT ?
            ''', (limit, ))

        leaders = []
        rank = 1
        for row in cursor.fetchall():
            leaders.append({
                'rank': rank,
                'userId': row['user_id'],
                'username': row['username'],
                'balance': row['balance'],
                'totalEarned': row['total_earned'],
                'totalClicks': row['total_clicks'],
                'clickSpeed': row['click_speed'] or 0.000000001,
                'mineSpeed': row['mine_speed'] or 0.000000000,
                'totalSpeed': row['total_speed'] or 0.000000001
            })
            rank += 1

        conn.close()

        return jsonify({
            'success': True,
            'leaderboard': leaders,
            'type': leaderboard_type
        })

    except Exception as e:
        return jsonify({
            'success': True,
            'leaderboard': [],
            'type': leaderboard_type
        })


@flask_app.route('/api/transfer', methods=['POST'])
def transfer():
    try:
        data = request.get_json()
        from_user_id = data.get('fromUserId')
        to_user_id = data.get('toUserId')
        amount = float(data.get('amount', 0))
        from_username = data.get('fromUsername')
        to_username = data.get('toUsername')

        if not from_user_id or not to_user_id or not amount:
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            })

        if amount <= 0:
            return jsonify({'success': False, 'error': 'Invalid amount'})

        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'error': 'Database connection failed'
            })

        cursor = conn.cursor()

        # Проверяем баланс отправителя
        cursor.execute(
            'SELECT balance, username FROM players WHERE user_id = ?',
            (from_user_id, ))
        sender = cursor.fetchone()

        if not sender:
            return jsonify({
                'success': False,
                'error': 'Отправитель не найден'
            })

        if sender['balance'] < amount:
            return jsonify({'success': False, 'error': 'Недостаточно средств'})

        # Проверяем получателя
        cursor.execute(
            'SELECT user_id, username FROM players WHERE user_id = ?',
            (to_user_id, ))
        receiver = cursor.fetchone()

        if not receiver:
            return jsonify({'success': False, 'error': 'Получатель не найден'})

        if from_user_id == to_user_id:
            return jsonify({
                'success': False,
                'error': 'Нельзя переводить самому себе'
            })

        # Выполняем перевод
        try:
            # Снимаем деньги у отправителя
            cursor.execute(
                'UPDATE players SET balance = balance - ? WHERE user_id = ?',
                (amount, from_user_id))

            # Добавляем деньги получателю
            cursor.execute(
                'UPDATE players SET balance = balance + ? WHERE user_id = ?',
                (amount, to_user_id))

            # Обновляем статистику переводов
            cursor.execute(
                'UPDATE players SET transfers_sent = COALESCE(transfers_sent, 0) + ? WHERE user_id = ?',
                (amount, from_user_id))
            cursor.execute(
                'UPDATE players SET transfers_received = COALESCE(transfers_received, 0) + ? WHERE user_id = ?',
                (amount, to_user_id))

            # Записываем перевод в историю
            cursor.execute(
                '''
                INSERT INTO transfers (from_user_id, from_username, to_user_id, to_username, amount, ip_address)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (from_user_id, sender['username'], to_user_id,
                  receiver['username'], amount, request.remote_addr))

            conn.commit()
            conn.close()

            # Получаем обновленный баланс отправителя
            new_balance = sender['balance'] - amount

            return jsonify({
                'success': True,
                'message': 'Перевод выполнен успешно',
                'newBalance': new_balance
            })

        except Exception as e:
            conn.rollback()
            conn.close()
            print(f"❌ Ошибка при выполнении перевода: {e}")
            return jsonify({
                'success': False,
                'error': 'Ошибка при выполнении перевода'
            })

    except Exception as e:
        print(f"❌ Общая ошибка перевода: {e}")
        return jsonify({'success': False, 'error': 'Ошибка перевода'})


@flask_app.route('/api/top/winners', methods=['GET'])
def top_winners():
    limit = request.args.get('limit', 50, type=int)

    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': True, 'winners': []})

        cursor = conn.cursor()

        cursor.execute(
            '''
            SELECT username, total_winnings, total_losses, 
                   (COALESCE(total_winnings, 0) - COALESCE(total_losses, 0)) as net_winnings
            FROM players 
            WHERE COALESCE(total_winnings, 0) > 0 
            ORDER BY net_winnings DESC 
            LIMIT ?
        ''', (limit, ))

        winners = []
        for row in cursor.fetchall():
            winners.append({
                'username': row['username'],
                'totalWinnings': row['total_winnings'] or 0,
                'totalLosses': row['total_losses'] or 0,
                'netWinnings': row['net_winnings'] or 0
            })

        conn.close()

        return jsonify({'success': True, 'winners': winners})

    except Exception as e:
        return jsonify({'success': True, 'winners': []})


@flask_app.route('/api/admin/stats', methods=['GET'])
def admin_stats():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': False,
                'error': 'Database connection failed'
            })

        cursor = conn.cursor()

        cursor.execute('SELECT COUNT(*) as total_players FROM players')
        total_players = cursor.fetchone()['total_players']

        cursor.execute('SELECT SUM(balance) as total_balance FROM players')
        total_balance = cursor.fetchone()['total_balance'] or 0

        cursor.execute('SELECT SUM(total_earned) as total_earned FROM players')
        total_earned = cursor.fetchone()['total_earned'] or 0

        cursor.execute(
            'SELECT COUNT(*) as active_bets FROM lottery_bets WHERE timestamp > datetime("now", "-5 minutes")'
        )
        active_bets = cursor.fetchone()['active_bets']

        cursor.execute(
            'SELECT COUNT(*) as classic_bets FROM classic_lottery_bets WHERE timestamp > datetime("now", "-10 minutes")'
        )
        classic_bets = cursor.fetchone()['classic_bets']

        cursor.execute('SELECT COUNT(*) as total_transfers FROM transfers')
        total_transfers = cursor.fetchone()['total_transfers']

        conn.close()

        session_stats = EnhancedSessionManager.get_session_stats()

        return jsonify({
            'success': True,
            'stats': {
                'total_players': total_players,
                'total_balance': total_balance,
                'total_earned': total_earned,
                'active_sessions': session_stats['active_sessions'],
                'total_sessions': session_stats['total_sessions'],
                'active_lottery_bets': active_bets,
                'active_classic_bets': classic_bets,
                'total_transfers': total_transfers,
                'server_time': datetime.now().isoformat(),
                'version': '2.0.0'
            }
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})


@flask_app.route('/')
def index():
    return jsonify({
        'message': 'Sparkcoin API - ENHANCED COMPLETE VERSION',
        'status': 'running',
        'version': '2.0.0',
        'sessions': EnhancedSessionManager.get_session_stats(),
        'timestamp': datetime.now().isoformat()
    })


# ЗАПУСК СЕРВЕРА
if __name__ == "__main__":
    print("🚀 Инициализация базы данных...")
    init_db()

    print("🔧 Запуск очистки сессий...")
    start_session_cleanup()

    print("🎯 Запуск УЛУЧШЕННОГО Sparkcoin API на порту 5000...")
    print("📊 Доступные эндпоинты:")
    print("   /api/health - Проверка здоровья")
    print("   /api/sync/unified - Синхронизация данных")
    print("   /api/lottery/status - Статус лотереи")
    print("   /api/classic-lottery/status - Классическая лотерея")
    print("   /api/referral/stats - Реферальная система")
    print("   /api/referral/apply - Применить реферальный код")
    print("   /api/transfer - Перевод средств")

    flask_app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
