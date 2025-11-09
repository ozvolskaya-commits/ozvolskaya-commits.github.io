# bot.py - полностью исправленная серверная часть с синхронизацией улучшений
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

# УПРОЩЕННАЯ СИСТЕМА МУЛЬТИСЕССИИ
ACTIVE_SESSIONS = {}
SESSION_TIMEOUT = 10  # 10 секунд

class SimpleSessionManager:
    @staticmethod
    def update_session(telegram_id, device_id, username):
        """Обновляет сессию - ПОСЛЕДНЕЕ устройство становится активным"""
        if not telegram_id:
            return

        # Удаляем старые сессии этого пользователя
        sessions_to_remove = []
        for tid, session in ACTIVE_SESSIONS.items():
            if tid == telegram_id or session.get('username') == username:
                sessions_to_remove.append(tid)

        for tid in sessions_to_remove:
            if tid in ACTIVE_SESSIONS:
                del ACTIVE_SESSIONS[tid]

        # Создаем новую сессию
        ACTIVE_SESSIONS[telegram_id] = {
            'device_id': device_id,
            'username': username,
            'last_activity': time.time(),
            'timestamp': time.time()
        }
        print(f"✅ Сессия обновлена: {username} на {device_id}")

    @staticmethod
    def check_multi_session(telegram_id, current_device_id):
        """Проверяет мультисессию - возвращает True если есть активная сессия на другом устройстве"""
        if not telegram_id:
            return False

        current_time = time.time()

        # Проверяем активные сессии этого пользователя
        for tid, session in ACTIVE_SESSIONS.items():
            if tid == telegram_id:
                # Если сессия активна и устройство другое - МУЛЬТИСЕССИЯ
                if (current_time - session['last_activity'] < SESSION_TIMEOUT and 
                    session['device_id'] != current_device_id):
                    print(f"🚫 Мультисессия ОБНАРУЖЕНА: {session['username']} на {session['device_id']}")
                    return True

        return False

    @staticmethod
    def cleanup_sessions():
        """Очищает старые сессии"""
        current_time = time.time()
        expired = []

        for tid, session in ACTIVE_SESSIONS.items():
            if current_time - session['last_activity'] > SESSION_TIMEOUT * 2:
                expired.append(tid)

        for tid in expired:
            if tid in ACTIVE_SESSIONS:
                del ACTIVE_SESSIONS[tid]

# Запуск очистки сессий
def start_session_cleanup():
    def cleanup_loop():
        while True:
            SimpleSessionManager.cleanup_sessions()
            time.sleep(30)
    threading.Thread(target=cleanup_loop, daemon=True).start()

def get_db_connection():
    try:
        conn = sqlite3.connect('sparkcoin.db', check_same_thread=False, timeout=30.0)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        return None

def init_db():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
            'referred_by TEXT'
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
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS classic_lottery_bets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                username TEXT,
                amount REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Таблица переводов
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transfers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_user_id TEXT,
                to_user_id TEXT,
                amount REAL,
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

# CORS
@flask_app.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

# OPTIONS handlers для всех endpoint-ов
@flask_app.route('/api/<path:path>', methods=['OPTIONS'])
def options_handler(path):
    return jsonify({'status': 'preflight'}), 200

# API ENDPOINTS

@flask_app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'Sparkcoin API - COMPLETE',
        'sessions_count': len(ACTIVE_SESSIONS),
        'version': '2.0.0'
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
        if SimpleSessionManager.check_multi_session(telegram_id, device_id):
            print(f"🚫 МУЛЬТИСЕССИЯ ОБНАРУЖЕНА: {username}")
            return jsonify({
                'success': False,
                'allowed': False,
                'error': 'multisession_blocked',
                'message': 'Обнаружена активная сессия на другом устройстве'
            })

        # РАЗРЕШАЕМ ДОСТУП И ОБНОВЛЯЕМ СЕССИЮ
        SimpleSessionManager.update_session(telegram_id, device_id, username)

        return jsonify({
            'success': True,
            'allowed': True,
            'message': 'Session access granted'
        })

    except Exception as e:
        print(f"❌ Session check error: {e}")
        return jsonify({'success': False, 'allowed': False, 'error': str(e)})

# ГЛАВНЫЙ ИСПРАВЛЕННЫЙ ENDPOINT ДЛЯ СИНХРОНИЗАЦИИ
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

        print(f"🔄 Синхронизация: {username}, баланс: {balance}")

        # ПРОВЕРКА МУЛЬТИСЕССИИ
        multisession_detected = False
        if telegram_id:
            if SimpleSessionManager.check_multi_session(telegram_id, device_id):
                multisession_detected = True
                print(f"🚨 МУЛЬТИСЕССИЯ ОБНАРУЖЕНА: {username}")

            # ОБНОВЛЯЕМ СЕССИЮ (даже при мультисессии)
            SimpleSessionManager.update_session(telegram_id, device_id, username)

        conn = get_db_connection()
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
        best_upgrades = upgrades
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

                # ОБЪЕДИНЯЕМ УЛУЧШЕНИЯ - ИСПРАВЛЕННАЯ ЧАСТЬ
                if max_balance_record['upgrades']:
                    try:
                        existing_upgrades = json.loads(max_balance_record['upgrades'])
                        if isinstance(existing_upgrades, dict):
                            for key, level in existing_upgrades.items():
                                if isinstance(level, (int, float)):
                                    current_level = upgrades.get(key, 0)
                                    if isinstance(current_level, (int, float)):
                                        # Берем максимальный уровень улучшений
                                        best_upgrades[key] = max(current_level, level)
                                    else:
                                        best_upgrades[key] = level
                                elif isinstance(level, dict) and 'level' in level:
                                    # Если улучшения хранятся как объекты
                                    server_level = level['level']
                                    current_level = upgrades.get(key, {}).get('level', 0) if isinstance(upgrades.get(key), dict) else upgrades.get(key, 0)
                                    best_upgrades[key] = max(current_level, server_level)
                    except Exception as e:
                        print(f"⚠️ Ошибка улучшений: {e}")
                        # В случае ошибки используем текущие улучшения
                        best_upgrades = upgrades

            print(f"🔄 Объединено {len(existing_records)} записей. Баланс: {best_balance}")

            # ОБНОВЛЯЕМ ВСЕ ЗАПИСИ ЭТОГО ПОЛЬЗОВАТЕЛЯ
            for record in existing_records:
                cursor.execute('''
                    UPDATE players SET 
                    username=?, balance=?, total_earned=?, total_clicks=?,
                    upgrades=?, last_update=CURRENT_TIMESTAMP,
                    telegram_id=?, telegram_username=?, last_device_id=?
                    WHERE user_id=?
                ''', (username, best_balance, best_total_earned, best_total_clicks,
                      json.dumps(best_upgrades), telegram_id, username, device_id, record['user_id']))

        else:
            # СОЗДАЕМ НОВУЮ ЗАПИСЬ
            best_user_id = user_id or (f'tg_{telegram_id}' if telegram_id else f'user_{int(time.time())}')

            # Генерируем реферальный код
            referral_code = f"REF-{str(uuid.uuid4())[:8].upper()}"

            cursor.execute('''
                INSERT INTO players 
                (user_id, username, balance, total_earned, total_clicks, upgrades, 
                 telegram_id, telegram_username, last_device_id, referral_code)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (best_user_id, username, balance, total_earned, total_clicks,
                  json.dumps(upgrades), telegram_id, username, device_id, referral_code))
            print(f"🆕 Создана новая запись: {best_user_id}")

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Sync successful',
            'userId': best_user_id,
            'bestBalance': best_balance,
            'multisessionDetected': multisession_detected
        })

    except Exception as e:
        print(f"❌ Sync error: {e}")
        return jsonify({'success': False, 'error': str(e)})

# ПОЛУЧЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ С УЛУЧШЕНИЯМИ
@flask_app.route('/api/sync/unified/<user_id>', methods=['GET'])
def get_unified_user(user_id):
    try:
        conn = get_db_connection()
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
                    'telegramUsername': player['telegram_username']
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
                    'telegramUsername': player['telegram_username']
                }
            })
        else:
            return jsonify({'success': False, 'message': 'User not found'})

    except Exception as e:
        logger.error(f"Get user by telegram_id error: {e}")
        return jsonify({'success': False, 'error': str(e)})

# ЛОТЕРЕЙНЫЕ ENDPOINTS - РАБОЧИЕ С ИСПРАВЛЕНИЯМИ

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

        # Добавляем ставку
        cursor.execute(
            'INSERT INTO lottery_bets (user_id, username, team, amount) VALUES (?, ?, ?, ?)',
            (user_id, username, team, amount))

        conn.commit()
        conn.close()

        print(f"🎯 Новая ставка: {username} - {team} - {amount} S")

        return jsonify({
            'success': True,
            'message': 'Bet placed'
        })
    except Exception as e:
        print(f"❌ Lottery bet error: {e}")
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

        # Добавляем ставку С ЮЗЕРНЕЙМОМ
        cursor.execute(
            'INSERT INTO classic_lottery_bets (user_id, username, amount) VALUES (?, ?, ?)',
            (user_id, username, amount))

        conn.commit()
        conn.close()

        print(f"🎰 Новая ставка в классической лотерее: {username} - {amount} S")

        return jsonify({
            'success': True,
            'message': 'Bet placed'
        })
    except Exception as e:
        print(f"❌ Classic lottery bet error: {e}")
        return jsonify({
            'success': False,
            'error': 'Bet failed'
        })

@flask_app.route('/api/classic-lottery/status', methods=['GET'])
def classic_lottery_status():
    try:
        conn = get_db_connection()
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
                'username': row['username'],  # ОТОБРАЖАЕМ ЮЗЕРНЕЙМ
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

                # Сохраняем историю С ЮЗЕРНЕЙМОМ
                cursor.execute('''
                    INSERT INTO lottery_history (lottery_type, winner_user_id, winner_username, prize, participants)
                    VALUES (?, ?, ?, ?, ?)
                ''', ('classic', winning_user['user_id'], winning_user['username'], prize, len(bets)))

                # Обновляем последнего победителя С ЮЗЕРНЕЙМОМ
                cursor.execute(
                    'UPDATE classic_lottery_timer SET last_winner = ?, last_prize = ? WHERE id = 1',
                    (winning_user['username'], prize)
                )

                print(f"🎉 Розыгрыш классической лотереи! Победитель: {winning_user['username']} - {prize:.9f} S")

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
                'username': row['username'],  # Теперь отображаем юзернейм
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

                    # Сохраняем историю С ЮЗЕРНЕЙМОМ
                    cursor.execute('''
                        INSERT INTO lottery_history (lottery_type, winner_user_id, winner_username, prize, participants)
                        VALUES (?, ?, ?, ?, ?)
                    ''', ('team', winning_user['user_id'], winning_user['username'], prize, len(eagle_bets) + len(tails_bets)))

                    # Обновляем последнего победителя С ЮЗЕРНЕЙМОМ
                    cursor.execute(
                        'UPDATE lottery_timer SET last_winner = ?, last_prize = ? WHERE id = 1',
                        (winning_user['username'], prize)
                    )

                    print(f"🎉 Розыгрыш командной лотереи! Победитель: {winning_user['username']} - {prize:.9f} S")

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

# ДРУГИЕ ENDPOINTS

@flask_app.route('/api/all_players', methods=['GET'])
def all_players():
    try:
        conn = get_db_connection()
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

        if not from_user_id or not to_user_id or not amount:
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            })

        if amount <= 0:
            return jsonify({'success': False, 'error': 'Invalid amount'})

        conn = get_db_connection()
        cursor = conn.cursor()

        # Проверяем баланс отправителя
        cursor.execute('SELECT balance FROM players WHERE user_id = ?', (from_user_id, ))
        sender = cursor.fetchone()

        if not sender or sender['balance'] < amount:
            return jsonify({'success': False, 'error': 'Insufficient funds'})

        # Проверяем получателя
        cursor.execute('SELECT user_id FROM players WHERE user_id = ?', (to_user_id, ))
        receiver = cursor.fetchone()

        if not receiver:
            return jsonify({'success': False, 'error': 'Recipient not found'})

        # Выполняем перевод
        cursor.execute('UPDATE players SET balance = balance - ? WHERE user_id = ?', (amount, from_user_id))
        cursor.execute('UPDATE players SET balance = balance + ? WHERE user_id = ?', (amount, to_user_id))
        cursor.execute('UPDATE players SET transfers_sent = transfers_sent + ? WHERE user_id = ?', (amount, from_user_id))
        cursor.execute('UPDATE players SET transfers_received = transfers_received + ? WHERE user_id = ?', (amount, to_user_id))

        # Записываем в историю переводов
        cursor.execute('''
            INSERT INTO transfers (from_user_id, to_user_id, amount)
            VALUES (?, ?, ?)
        ''', (from_user_id, to_user_id, amount))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Transfer complete'
        })
    except Exception as e:
        logger.error(f"Transfer error: {e}")
        return jsonify({
            'success': False,
            'error': 'Transfer failed'
        })

@flask_app.route('/api/top/winners', methods=['GET'])
def top_winners():
    limit = request.args.get('limit', 50, type=int)

    try:
        conn = get_db_connection()
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

@flask_app.route('/api/session/stats', methods=['GET'])
def session_stats():
    return jsonify({
        'success': True,
        'sessions_count': len(ACTIVE_SESSIONS),
        'sessions': ACTIVE_SESSIONS
    })

@flask_app.route('/')
def index():
    return jsonify({
        'message': 'Sparkcoin API - COMPLETE FIXED VERSION',
        'status': 'running', 
        'version': '2.0.0',
        'sessions': len(ACTIVE_SESSIONS),
        'timestamp': datetime.now().isoformat()
    })

# ЗАПУСК СЕРВЕРА
if __name__ == "__main__":
    print("🚀 Инициализация базы данных...")
    init_db()

    print("🔧 Запуск очистки сессий...")
    start_session_cleanup()

    print("🎯 Запуск исправленного Sparkcoin API на порту 5000...")
    flask_app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
