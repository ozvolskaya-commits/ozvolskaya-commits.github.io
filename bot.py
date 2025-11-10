# bot.py - ПОЛНЫЙ УЛУЧШЕННЫЙ СЕРВЕР SPARKCOIN
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

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO)
logger = logging.getLogger(__name__)

flask_app = Flask(__name__)

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
                time.sleep(30)  # Очистка каждые 30 секунд
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

def cleanup_old_backups():
    """Очистка старых резервных копий (оставляет только последние 5)"""
    try:
        backup_files = [f for f in os.listdir('.') if f.startswith('backup_sparkcoin_') and f.endswith('.db')]
        if len(backup_files) > 5:
            backup_files.sort(reverse=True)
            for old_backup in backup_files[5:]:
                os.remove(old_backup)
                print(f"🧹 Удален старый бэкап: {old_backup}")
    except Exception as e:
        print(f"❌ Ошибка очистки бэкапов: {e}")

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
                # Сохраняем сессию если она активна и устройство то же
                if session.get('device_id') == device_id and current_time - session.get('last_activity', 0) < SESSION_TIMEOUT:
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
        print(f"✅ Сессия обновлена: {username} на {device_id}")

    @staticmethod
    def check_multi_session(telegram_id, current_device_id):
        """Проверяет мультисессию - УЛУЧШЕННАЯ ВЕРСИЯ"""
        if not telegram_id:
            return False

        current_time = time.time()

        # Проверяем активные сессии этого пользователя
        for tid, session in ACTIVE_SESSIONS.items():
            if tid == telegram_id:
                session_age = current_time - session['last_activity']
                # Если сессия активна и устройство другое - МУЛЬТИСЕССИЯ
                if (session_age < SESSION_TIMEOUT and 
                    session['device_id'] != current_device_id):
                    print(f"🚫 Мультисессия ОБНАРУЖЕНА: {session['username']} на {session['device_id']} (возраст: {session_age:.1f}с)")
                    return True

        return False

    @staticmethod
    def cleanup_sessions():
        """Очищает старые сессии - УЛУЧШЕННАЯ ВЕРСИЯ"""
        current_time = time.time()
        expired = []

        for tid, session in ACTIVE_SESSIONS.items():
            if current_time - session['last_activity'] > SESSION_TIMEOUT * 3:
                expired.append(tid)

        for tid in expired:
            if tid in ACTIVE_SESSIONS:
                del ACTIVE_SESSIONS[tid]

        if expired:
            print(f"🧹 Очищено {len(expired)} устаревших сессий")

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
    """Проверяет корректность данных синхронизации - УЛУЧШЕННАЯ ВЕРСИЯ 2.0"""
    try:
        # Обязательные поля
        if not data.get('username') or not isinstance(data.get('username'), str):
            print("❌ Отсутствует или неверный username")
            return False

        # Числовые значения
        balance = float(data.get('balance', 0))
        total_earned = float(data.get('totalEarned', 0))
        total_clicks = int(data.get('totalClicks', 0))

        # Проверка диапазонов
        if balance < 0 or total_earned < 0 or total_clicks < 0:
            print(f"⚠️ Отрицательные значения: balance={balance}, earned={total_earned}, clicks={total_clicks}")
            return False

        if balance > MAX_BALANCE:
            print(f"⚠️ Подозрительный баланс: {balance} > {MAX_BALANCE}")
            return False

        if total_earned > MAX_EARNED:
            print(f"⚠️ Подозрительный total_earned: {total_earned} > {MAX_EARNED}")
            return False

        if total_clicks > MAX_CLICKS:
            print(f"⚠️ Подозрительное количество кликов: {total_clicks} > {MAX_CLICKS}")
            return False

        # Проверка улучшений
        upgrades = data.get('upgrades', {})
        if upgrades:
            if not isinstance(upgrades, dict):
                print("❌ Улучшения должны быть словарем")
                return False

            for key, value in upgrades.items():
                if not isinstance(key, str) or not key:
                    print(f"❌ Неверный ключ улучшения: {key}")
                    return False

                if isinstance(value, (int, float)):
                    if value < 0 or value > 1000:  # Максимальный уровень улучшения
                        print(f"⚠️ Неверный уровень улучшения {key}: {value}")
                        return False
                elif isinstance(value, dict):
                    level = value.get('level', 0)
                    if not isinstance(level, (int, float)) or level < 0 or level > 1000:
                        print(f"⚠️ Неверный уровень улучшения {key}: {level}")
                        return False
                else:
                    print(f"❌ Неверный формат улучшения {key}: {type(value)}")
                    return False

        # Проверка device_id
        device_id = data.get('deviceId')
        if device_id and (not isinstance(device_id, str) or len(device_id) > 100):
            print(f"❌ Неверный device_id: {device_id}")
            return False

        return True

    except Exception as e:
        print(f"❌ Ошибка валидации данных: {e}")
        return False

def debug_upgrades(upgrades, source):
    """Дебаг функция для логирования улучшений - УЛУЧШЕННАЯ ВЕРСИЯ"""
    if not upgrades:
        print(f"🔍 {source}: улучшений нет")
        return

    try:
        if isinstance(upgrades, str):
            upgrades = json.loads(upgrades)

        if isinstance(upgrades, dict):
            count = len(upgrades)
            total_level = 0
            max_level = 0

            for key, value in upgrades.items():
                if isinstance(value, (int, float)):
                    level = value
                elif isinstance(value, dict) and 'level' in value:
                    level = value['level']
                else:
                    level = 0

                total_level += level
                if level > max_level:
                    max_level = level

            print(f"🔍 {source}: {count} улучшений, суммарный уровень: {total_level}, макс. уровень: {max_level}")

            # Логируем топ улучшений
            if count > 0:
                top_upgrades = sorted([(k, v if isinstance(v, (int, float)) else v.get('level', 0) if isinstance(v, dict) else 0) 
                                     for k, v in upgrades.items()], 
                                    key=lambda x: x[1], reverse=True)[:3]
                print(f"🔍 Топ улучшения: {top_upgrades}")

        else:
            print(f"🔍 {source}: неверный формат улучшений: {type(upgrades)}")
    except Exception as e:
        print(f"🔍 {source}: ошибка анализа улучшений: {e}")

def get_db_connection():
    """Улучшенное подключение к БД"""
    try:
        conn = sqlite3.connect('sparkcoin.db', check_same_thread=False, timeout=30.0)
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
                referral_code TEXT,
                referred_by TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_ip TEXT,
                version TEXT DEFAULT '2.0.0'
            )
        ''')

        # Добавляем недостающие колонки
        columns_to_add = [
            'telegram_id TEXT',
            'telegram_username TEXT', 
            'last_device_id TEXT',
            'lottery_wins INTEGER DEFAULT 0',
            'total_bet REAL DEFAULT 0',
            'transfers_sent REAL DEFAULT 0',
            'transfers_received REAL DEFAULT 0',
            'referral_earnings REAL DEFAULT 0',
            'referrals_count INTEGER DEFAULT 0',
            'total_winnings REAL DEFAULT 0',
            'total_losses REAL DEFAULT 0',
            'referral_code TEXT',
            'referred_by TEXT',
            'last_ip TEXT',
            'version TEXT DEFAULT "2.0.0"'
        ]

        for column in columns_to_add:
            try:
                column_name = column.split(' ')[0]
                cursor.execute(f"ALTER TABLE players ADD COLUMN {column}")
                print(f"✅ Добавлена колонка: {column_name}")
            except sqlite3.OperationalError:
                pass  # Колонка уже существует

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
        cursor.execute('INSERT OR IGNORE INTO lottery_timer (id, timer) VALUES (1, 60)')
        cursor.execute('INSERT OR IGNORE INTO classic_lottery_timer (id, timer) VALUES (1, 120)')

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
                (level, message, json.dumps(details) if details else None)
            )
            conn.commit()
            conn.close()
    except Exception as e:
        print(f"❌ Ошибка логирования: {e}")

# CORS
@flask_app.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Device-ID'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['X-Server-Version'] = 'Sparkcoin-2.0.0'
    return response

# OPTIONS handlers для всех endpoint-ов
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

# ENDPOINT ДЛЯ ПРОВЕРКИ СЕССИЙ
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

        print(f"🔍 Проверка сессии: {username} ({telegram_id}) на устройстве {device_id}")

        # ПРОВЕРКА МУЛЬТИСЕССИИ
        if EnhancedSessionManager.check_multi_session(telegram_id, device_id):
            print(f"🚫 МУЛЬТИСЕССИЯ ОБНАРУЖЕНА: {username}")
            log_system_event('WARNING', 'Multisession detected', {
                'telegram_id': telegram_id,
                'username': username,
                'device_id': device_id
            })
            return jsonify({
                'success': False,
                'allowed': False,
                'error': 'multisession_blocked',
                'message': 'Обнаружена активная сессия на другом устройстве'
            })

        # РАЗРЕШАЕМ ДОСТУП И ОБНОВЛЯЕМ СЕССИЮ
        EnhancedSessionManager.update_session(telegram_id, device_id, username)

        return jsonify({
            'success': True,
            'allowed': True,
            'message': 'Session access granted'
        })

    except Exception as e:
        print(f"❌ Session check error: {e}")
        return jsonify({'success': False, 'allowed': False, 'error': str(e)})

# ГЛАВНЫЙ УЛУЧШЕННЫЙ ENDPOINT ДЛЯ СИНХРОНИЗАЦИИ
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

        if not user_id and not telegram_id:
            return jsonify({
                'success': False,
                'error': 'No user ID or telegram ID'
            })

        # ВАЛИДАЦИЯ ДАННЫХ
        if not validate_sync_data(data):
            return jsonify({
                'success': False,
                'error': 'Invalid data values detected'
            })

        print(f"🔄 Синхронизация: {username}, баланс: {balance:.9f} S")

        # ДЕБАГ УЛУЧШЕНИЙ
        debug_upgrades(upgrades, "Клиентские улучшения")

        # ПРОВЕРКА МУЛЬТИСЕССИИ
        multisession_detected = False
        if telegram_id:
            if EnhancedSessionManager.check_multi_session(telegram_id, device_id):
                multisession_detected = True
                print(f"🚨 МУЛЬТИСЕССИЯ ОБНАРУЖЕНА: {username}")
                log_system_event('WARNING', 'Multisession sync attempt', {
                    'telegram_id': telegram_id,
                    'username': username,
                    'device_id': device_id
                })

            # ОБНОВЛЯЕМ СЕССИЮ
            EnhancedSessionManager.update_session(telegram_id, device_id, username)

        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Database connection failed'})

        cursor = conn.cursor()

        # ИЩЕМ СУЩЕСТВУЮЩИЕ ЗАПИСИ
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

        # ОПРЕДЕЛЯЕМ ЛУЧШИЕ ДАННЫЕ
        best_balance = balance
        best_total_earned = total_earned  
        best_total_clicks = total_clicks
        best_upgrades = upgrades.copy() if upgrades else {}
        best_user_id = user_id or (f'tg_{telegram_id}' if telegram_id else f'user_{int(time.time())}')

        if existing_records:
            # НАХОДИМ ЗАПИСЬ С МАКСИМАЛЬНЫМ БАЛАНСОМ
            max_balance_record = None
            max_balance = best_balance

            for record in existing_records:
                try:
                    record_balance = float(record['balance']) if record['balance'] is not None else 0
                    if record_balance > max_balance:
                        max_balance = record_balance
                        max_balance_record = record
                except (TypeError, ValueError):
                    continue

            if max_balance_record:
                best_balance = max_balance
                best_total_earned = max(total_earned, float(max_balance_record['total_earned'] or 0))
                best_total_clicks = max(total_clicks, int(max_balance_record['total_clicks'] or 0))
                best_user_id = max_balance_record['user_id']

                # УЛУЧШЕННОЕ ОБЪЕДИНЕНИЕ УЛУЧШЕНИЙ
                if max_balance_record['upgrades']:
                    try:
                        existing_upgrades = json.loads(max_balance_record['upgrades'])
                        debug_upgrades(existing_upgrades, "Серверные улучшения")

                        if isinstance(existing_upgrades, dict):
                            for key, level in existing_upgrades.items():
                                # Получаем уровень с сервера
                                server_level = level
                                if isinstance(level, dict) and 'level' in level:
                                    server_level = level['level']

                                # Получаем текущий уровень
                                current_level = best_upgrades.get(key, 0)
                                if isinstance(current_level, dict) and 'level' in current_level:
                                    current_level = current_level['level']

                                # Берем максимальный уровень
                                if isinstance(server_level, (int, float)) and isinstance(current_level, (int, float)):
                                    best_upgrades[key] = max(current_level, server_level)
                                elif isinstance(server_level, (int, float)):
                                    best_upgrades[key] = server_level
                                else:
                                    best_upgrades[key] = current_level

                        print(f"🔄 Улучшения объединены: {len(best_upgrades)} шт")
                    except Exception as e:
                        print(f"⚠️ Ошибка объединения улучшений: {e}")
                        # Сохраняем текущие улучшения при ошибке

            print(f"🔄 Объединено {len(existing_records)} записей. Баланс: {best_balance:.9f} S")

            # ОБНОВЛЯЕМ ВСЕ ЗАПИСИ ЭТОГО ПОЛЬЗОВАТЕЛЯ
            for record in existing_records:
                cursor.execute('''
                    UPDATE players SET 
                    username=?, balance=?, total_earned=?, total_clicks=?,
                    upgrades=?, last_update=CURRENT_TIMESTAMP,
                    telegram_id=?, telegram_username=?, last_device_id=?, last_ip=?
                    WHERE user_id=?
                ''', (username, best_balance, best_total_earned, best_total_clicks,
                      json.dumps(best_upgrades), telegram_id, username, device_id, 
                      request.remote_addr, record['user_id']))

        else:
            # СОЗДАЕМ НОВУЮ ЗАПИСЬ
            best_user_id = user_id or (f'tg_{telegram_id}' if telegram_id else f'user_{int(time.time())}')

            # Генерируем реферальный код
            referral_code = f"REF-{str(uuid.uuid4())[:8].upper()}"

            cursor.execute('''
                INSERT INTO players 
                (user_id, username, balance, total_earned, total_clicks, upgrades, 
                 telegram_id, telegram_username, last_device_id, referral_code, last_ip)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (best_user_id, username, balance, total_earned, total_clicks,
                  json.dumps(upgrades), telegram_id, username, device_id, referral_code, request.remote_addr))
            print(f"🆕 Создана новая запись: {best_user_id}")

        conn.commit()
        conn.close()

        debug_upgrades(best_upgrades, "Финальные улучшения")
        log_system_event('INFO', 'User sync completed', {
            'user_id': best_user_id,
            'username': username,
            'balance': best_balance,
            'multisession': multisession_detected
        })

        return jsonify({
            'success': True,
            'message': 'Sync successful',
            'userId': best_user_id,
            'bestBalance': best_balance,
            'multisessionDetected': multisession_detected,
            'upgradesCount': len(best_upgrades)
        })

    except Exception as e:
        print(f"❌ Sync error: {e}")
        log_system_event('ERROR', 'Sync failed', {'error': str(e)})
        return jsonify({'success': False, 'error': str(e)})

# ПОЛУЧЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ С УЛУЧШЕНИЯМИ
@flask_app.route('/api/sync/unified/<user_id>', methods=['GET'])
def get_unified_user(user_id):
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Database connection failed'})

        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM players 
            WHERE user_id = ? OR user_id LIKE ? OR user_id LIKE ?
            ORDER BY last_update DESC 
            LIMIT 1
        ''', (user_id, f'tg_%', f'%{user_id}%'))

        player = cursor.fetchone()
        conn.close()

        if player:
            # Парсим улучшения
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
                    'version': player['version'] or '2.0.0'
                }
            })
        else:
            return jsonify({'success': False, 'message': 'User not found'})

    except Exception as e:
        logger.error(f"Get user error: {e}")
        return jsonify({'success': False, 'error': str(e)})

# ПОЛУЧЕНИЕ ДАННЫХ ПО TELEGRAM ID
@flask_app.route('/api/sync/telegram/<telegram_id>', methods=['GET'])
def get_user_by_telegram_id(telegram_id):
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Database connection failed'})

        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM players 
            WHERE telegram_id = ? 
            ORDER BY last_update DESC 
            LIMIT 1
        ''', (telegram_id,))

        player = cursor.fetchone()
        conn.close()

        if player:
            # Парсим улучшения
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
                    'telegramId': player['telegram_id'],
                    'telegramUsername': player['telegram_username'],
                    'version': player['version'] or '2.0.0'
                }
            })
        else:
            return jsonify({'success': False, 'message': 'User not found'})

    except Exception as e:
        logger.error(f"Get user by telegram_id error: {e}")
        return jsonify({'success': False, 'error': str(e)})

# ЛОТЕРЕЙНЫЕ ENDPOINTS - УЛУЧШЕННЫЕ ВЕРСИИ

@flask_app.route('/api/lottery/bet', methods=['POST'])
def lottery_bet():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        team = data.get('team')
        amount = float(data.get('amount', 0))
        username = data.get('username')

        # ПРОВЕРКА ВСЕХ ОБЯЗАТЕЛЬНЫХ ПОЛЕЙ
        if not user_id or not team or not amount or not username:
            print(f"❌ Missing required fields: user_id={user_id}, team={team}, amount={amount}, username={username}")
            return jsonify({
                'success': False,
                'error': 'Missing required fields: userId, team, amount, username'
            })

        if team not in ['eagle', 'tails']:
            return jsonify({'success': False, 'error': 'Invalid team'})

        if amount <= 0:
            return jsonify({'success': False, 'error': 'Invalid amount'})

        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Database connection failed'})

        cursor = conn.cursor()

        # Проверяем баланс
        cursor.execute('SELECT balance FROM players WHERE user_id = ?', (user_id, ))
        player = cursor.fetchone()

        if not player or player['balance'] < amount:
            return jsonify({'success': False, 'error': 'Insufficient funds'})

        # Списываем средства
        cursor.execute(
            'UPDATE players SET balance = balance - ?, total_bet = total_bet + ? WHERE user_id = ?',
            (amount, amount, user_id))

        # Добавляем ставку с IP адресом
        cursor.execute(
            'INSERT INTO lottery_bets (user_id, username, team, amount, ip_address) VALUES (?, ?, ?, ?, ?)',
            (user_id, username, team, amount, request.remote_addr))

        conn.commit()
        conn.close()

        print(f"🎯 Новая ставка: {username} - {team} - {amount:.9f} S")
        log_system_event('INFO', 'Lottery bet placed', {
            'user_id': user_id,
            'username': username,
            'team': team,
            'amount': amount
        })

        return jsonify({
            'success': True,
            'message': 'Bet placed'
        })
    except Exception as e:
        print(f"❌ Lottery bet error: {e}")
        log_system_event('ERROR', 'Lottery bet failed', {'error': str(e)})
        return jsonify({
            'success': False,
            'error': 'Bet failed'
        })

@flask_app.route('/api/classic-lottery/bet', methods=['POST'])
def classic_lottery_bet():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        amount = float(data.get('amount', 0))
        username = data.get('username')

        # ПРОВЕРКА ВСЕХ ОБЯЗАТЕЛЬНЫХ ПОЛЕЙ
        if not user_id or not amount or not username:
            print(f"❌ Missing required fields: user_id={user_id}, amount={amount}, username={username}")
            return jsonify({
                'success': False,
                'error': 'Missing required fields: userId, amount, username'
            })

        if amount <= 0:
            return jsonify({'success': False, 'error': 'Invalid amount'})

        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Database connection failed'})

        cursor = conn.cursor()

        # Проверяем баланс
        cursor.execute('SELECT balance FROM players WHERE user_id = ?', (user_id, ))
        player = cursor.fetchone()

        if not player or player['balance'] < amount:
            return jsonify({'success': False, 'error': 'Insufficient funds'})

        # Списываем средства
        cursor.execute(
            'UPDATE players SET balance = balance - ?, total_bet = total_bet + ? WHERE user_id = ?',
            (amount, amount, user_id))

        # Добавляем ставку С ЮЗЕРНЕЙМОМ и IP
        cursor.execute(
            'INSERT INTO classic_lottery_bets (user_id, username, amount, ip_address) VALUES (?, ?, ?, ?)',
            (user_id, username, amount, request.remote_addr))

        conn.commit()
        conn.close()

        print(f"🎰 Новая ставка в классической лотерее: {username} - {amount:.9f} S")
        log_system_event('INFO', 'Classic lottery bet placed', {
            'user_id': user_id,
            'username': username,
            'amount': amount
        })

        return jsonify({
            'success': True,
            'message': 'Bet placed'
        })
    except Exception as e:
        print(f"❌ Classic lottery bet error: {e}")
        log_system_event('ERROR', 'Classic lottery bet failed', {'error': str(e)})
        return jsonify({
            'success': False,
            'error': 'Bet failed'
        })

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
                    'timer': 120,
                    'participants_count': 0,
                    'history': []
                }
            })

        cursor = conn.cursor()

        # Получаем текущие ставки С ЮЗЕРНЕЙМАМИ
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

        # Получаем историю
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

        # Получаем и обновляем таймер
        cursor.execute('SELECT timer, total_pot, last_winner, last_prize FROM classic_lottery_timer WHERE id = 1')
        timer_data = cursor.fetchone()

        current_timer = timer_data['timer'] if timer_data else 120
        new_timer = max(0, current_timer - 1)

        if new_timer <= 0:
            # РОЗЫГРЫШ КЛАССИЧЕСКОЙ ЛОТЕРЕИ
            if bets and total_pot > 0:
                winning_user = random.choice(bets)
                prize = total_pot * 0.9  # 90% банка

                # Начисляем выигрыш
                cursor.execute(
                    'UPDATE players SET balance = balance + ?, total_winnings = total_winnings + ? WHERE user_id = ?',
                    (prize, prize, winning_user['user_id'])
                )

                # Сохраняем историю С ЮЗЕРНЕЙМОМ и IP
                cursor.execute('''
                    INSERT INTO lottery_history (lottery_type, winner_user_id, winner_username, prize, participants, ip_address)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', ('classic', winning_user['user_id'], winning_user['username'], prize, len(bets), request.remote_addr))

                # Обновляем последнего победителя С ЮЗЕРНЕЙМОМ
                cursor.execute(
                    'UPDATE classic_lottery_timer SET last_winner = ?, last_prize = ? WHERE id = 1',
                    (winning_user['username'], prize)
                )

                print(f"🎉 Розыгрыш классической лотереи! Победитель: {winning_user['username']} - {prize:.9f} S")
                log_system_event('INFO', 'Classic lottery draw', {
                    'winner': winning_user['username'],
                    'prize': prize,
                    'participants': len(bets)
                })

            # Сбрасываем таймер и очищаем ставки
            new_timer = 120
            cursor.execute("DELETE FROM classic_lottery_bets WHERE timestamp < datetime('now', '-1 hour')")

        # Обновляем таймер и общий банк
        cursor.execute('UPDATE classic_lottery_timer SET timer = ?, total_pot = ? WHERE id = 1', (new_timer, total_pot))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'lottery': {
                'bets': bets,
                'total_pot': total_pot,
                'timer': new_timer,
                'participants_count': len(bets),
                'history': history
            }
        })
    except Exception as e:
        print(f"❌ Classic lottery error: {e}")
        log_system_event('ERROR', 'Classic lottery status failed', {'error': str(e)})
        return jsonify({
            'success': True,
            'lottery': {
                'bets': [],
                'total_pot': 0,
                'timer': 120,
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
                    'timer': 60,
                    'total_eagle': 0,
                    'total_tails': 0,
                    'participants_count': 0
                }
            })

        cursor = conn.cursor()

        # Получаем текущие ставки с юзернеймами
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

        # Получаем и обновляем таймер
        cursor.execute('SELECT timer, last_winner, last_prize FROM lottery_timer WHERE id = 1')
        timer_data = cursor.fetchone()

        current_timer = timer_data['timer'] if timer_data else 60
        new_timer = max(0, current_timer - 1)

        if new_timer <= 0:
            # РОЗЫГРЫШ ЛОТЕРЕИ
            winner = random.choice(['eagle', 'tails'])
            total_pot = total_eagle + total_tails

            if total_pot > 0 and (eagle_bets or tails_bets):
                winning_bets = eagle_bets if winner == 'eagle' else tails_bets
                if winning_bets:
                    winning_user = random.choice(winning_bets)
                    prize = total_pot * 0.9  # 90% банка

                    # Начисляем выигрыш
                    cursor.execute(
                        'UPDATE players SET balance = balance + ?, total_winnings = total_winnings + ? WHERE user_id = ?',
                        (prize, prize, winning_user['user_id'])
                    )

                    # Сохраняем историю С ЮЗЕРНЕЙМОМ и IP
                    cursor.execute('''
                        INSERT INTO lottery_history (lottery_type, winner_user_id, winner_username, prize, participants, ip_address)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', ('team', winning_user['user_id'], winning_user['username'], prize, len(eagle_bets) + len(tails_bets), request.remote_addr))

                    # Обновляем последнего победителя С ЮЗЕРНЕЙМОМ
                    cursor.execute(
                        'UPDATE lottery_timer SET last_winner = ?, last_prize = ? WHERE id = 1',
                        (winning_user['username'], prize)
                    )

                    print(f"🎉 Розыгрыш командной лотереи! Победитель: {winning_user['username']} - {prize:.9f} S")
                    log_system_event('INFO', 'Team lottery draw', {
                        'winner': winning_user['username'],
                        'team': winner,
                        'prize': prize,
                        'participants': len(eagle_bets) + len(tails_bets)
                    })

                # Сбрасываем таймер и очищаем старые ставки
                new_timer = 60
                cursor.execute("DELETE FROM lottery_bets WHERE timestamp < datetime('now', '-1 hour')")
            else:
                new_timer = 60

        # Обновляем таймер
        cursor.execute('UPDATE lottery_timer SET timer = ? WHERE id = 1', (new_timer,))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'lottery': {
                'eagle': eagle_bets,
                'tails': tails_bets,
                'last_winner': timer_data['last_winner'] if timer_data else None,
                'last_prize': timer_data['last_prize'] if timer_data else 0,
                'timer': new_timer,
                'total_eagle': total_eagle,
                'total_tails': total_tails,
                'participants_count': len(eagle_bets) + len(tails_bets)
            }
        })
    except Exception as e:
        print(f"❌ Lottery status error: {e}")
        log_system_event('ERROR', 'Lottery status failed', {'error': str(e)})
        return jsonify({
            'success': True,
            'lottery': {
                'eagle': [],
                'tails': [],
                'last_winner': None,
                'timer': 60,
                'total_eagle': 0,
                'total_tails': 0,
                'participants_count': 0
            }
        })

# ДРУГИЕ УЛУЧШЕННЫЕ ENDPOINTS

@flask_app.route('/api/all_players', methods=['GET'])
def all_players():
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': True, 'players': []})

        cursor = conn.cursor()

        cursor.execute('''
            SELECT user_id, username, balance, total_earned, total_clicks 
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
                'totalClicks': row['total_clicks']
            })

        conn.close()

        return jsonify({
            'success': True,
            'players': players
        })

    except Exception as e:
        logger.error(f"All players error: {e}")
        return jsonify({
            'success': True,
            'players': []
        })

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
            cursor.execute('''
                SELECT user_id, username, balance, total_earned, total_clicks
                FROM players 
                ORDER BY balance DESC 
                LIMIT ?
            ''', (limit, ))
        else:
            cursor.execute('''
                SELECT user_id, username, balance, total_earned, total_clicks
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
                'totalClicks': row['total_clicks']
            })
            rank += 1

        conn.close()

        return jsonify({
            'success': True,
            'leaderboard': leaders,
            'type': leaderboard_type
        })

    except Exception as e:
        logger.error(f"Leaderboard error: {e}")
        return jsonify({
            'success': True,
            'leaderboard': [],
            'type': leaderboard_type
        })

@flask_app.route('/api/referral/stats/<user_id>', methods=['GET'])
def referral_stats(user_id):
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({
                'success': True,
                'stats': {'referralsCount': 0, 'totalEarnings': 0},
                'referralCode': f'REF-{user_id[-8:].upper()}'
            })

        cursor = conn.cursor()

        cursor.execute('''
            SELECT referrals_count, referral_earnings, referral_code
            FROM players WHERE user_id = ?
        ''', (user_id, ))

        player = cursor.fetchone()
        conn.close()

        if player:
            return jsonify({
                'success': True,
                'stats': {
                    'referralsCount': player['referrals_count'] or 0,
                    'totalEarnings': player['referral_earnings'] or 0
                },
                'referralCode': player['referral_code'] or f'REF-{user_id[-8:].upper()}'
            })
        else:
            return jsonify({
                'success': True,
                'stats': {
                    'referralsCount': 0,
                    'totalEarnings': 0
                },
                'referralCode': f'REF-{user_id[-8:].upper()}'
            })
    except Exception as e:
        logger.error(f"Referral stats error: {e}")
        return jsonify({
            'success': True,
            'stats': {
                'referralsCount': 0,
                'totalEarnings': 0
            },
            'referralCode': f'REF-{user_id[-8:].upper()}'
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

        if not from_user_id or not to_user_id or not amount or not from_username:
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            })

        if amount <= 0:
            return jsonify({'success': False, 'error': 'Invalid amount'})

        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Database connection failed'})

        cursor = conn.cursor()

        # Проверяем баланс отправителя
        cursor.execute('SELECT balance, username FROM players WHERE user_id = ?', (from_user_id, ))
        sender = cursor.fetchone()

        if not sender or sender['balance'] < amount:
            return jsonify({'success': False, 'error': 'Insufficient funds'})

        # Проверяем получателя
        cursor.execute('SELECT user_id, username FROM players WHERE user_id = ?', (to_user_id, ))
        receiver = cursor.fetchone()

        if not receiver:
            return jsonify({'success': False, 'error': 'Recipient not found'})

        # Получаем имя получателя
        to_username = receiver['username']

        # Выполняем перевод
        cursor.execute('UPDATE players SET balance = balance - ? WHERE user_id = ?', (amount, from_user_id))
        cursor.execute('UPDATE players SET balance = balance + ? WHERE user_id = ?', (amount, to_user_id))
        cursor.execute('UPDATE players SET transfers_sent = transfers_sent + ? WHERE user_id = ?', (amount, from_user_id))
        cursor.execute('UPDATE players SET transfers_received = transfers_received + ? WHERE user_id = ?', (amount, to_user_id))

        # Записываем в историю переводов с именами
        cursor.execute('''
            INSERT INTO transfers (from_user_id, from_username, to_user_id, to_username, amount, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (from_user_id, from_username, to_user_id, to_username, amount, request.remote_addr))

        conn.commit()
        conn.close()

        print(f"💸 Перевод: {from_username} -> {to_username} - {amount:.9f} S")
        log_system_event('INFO', 'Transfer completed', {
            'from': from_username,
            'to': to_username,
            'amount': amount
        })

        return jsonify({
            'success': True,
            'message': 'Transfer complete'
        })
    except Exception as e:
        logger.error(f"Transfer error: {e}")
        log_system_event('ERROR', 'Transfer failed', {'error': str(e)})
        return jsonify({
            'success': False,
            'error': 'Transfer failed'
        })

@flask_app.route('/api/top/winners', methods=['GET'])
def top_winners():
    limit = request.args.get('limit', 50, type=int)

    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': True, 'winners': []})

        cursor = conn.cursor()

        cursor.execute('''
            SELECT username, total_winnings, total_losses, (total_winnings - total_losses) as net_winnings
            FROM players 
            WHERE total_winnings > 0 
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

        return jsonify({
            'success': True,
            'winners': winners
        })

    except Exception as e:
        logger.error(f"Top winners error: {e}")
        return jsonify({
            'success': True,
            'winners': []
        })

@flask_app.route('/api/admin/stats', methods=['GET'])
def admin_stats():
    """Расширенная статистика для администрирования"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'error': 'Database connection failed'})

        cursor = conn.cursor()

        # Базовая статистика
        cursor.execute('SELECT COUNT(*) as total_players FROM players')
        total_players = cursor.fetchone()['total_players']

        cursor.execute('SELECT SUM(balance) as total_balance FROM players')
        total_balance = cursor.fetchone()['total_balance'] or 0

        cursor.execute('SELECT SUM(total_earned) as total_earned FROM players')
        total_earned = cursor.fetchone()['total_earned'] or 0

        # Статистика по лотереям
        cursor.execute('SELECT COUNT(*) as active_bets FROM lottery_bets WHERE timestamp > datetime("now", "-5 minutes")')
        active_bets = cursor.fetchone()['active_bets']

        cursor.execute('SELECT COUNT(*) as classic_bets FROM classic_lottery_bets WHERE timestamp > datetime("now", "-10 minutes")')
        classic_bets = cursor.fetchone()['classic_bets']

        # Статистика по переводам
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

@flask_app.route('/api/session/stats', methods=['GET'])
def session_stats():
    return jsonify({
        'success': True,
        'sessions_count': len(ACTIVE_SESSIONS),
        'active_sessions': EnhancedSessionManager.get_session_stats()['active_sessions'],
        'sessions': ACTIVE_SESSIONS
    })

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
    print("   /api/admin/stats - Статистика администрирования")
    print("   /api/session/stats - Статистика сессий")

    flask_app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
