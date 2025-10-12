import os
import json
import logging
import sqlite3
import random
import time
import threading
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from functools import wraps
from collections import OrderedDict

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO)
logger = logging.getLogger(__name__)

# Инициализация Flask приложения
flask_app = Flask(__name__)

# CORS обработчик
@flask_app.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

# Конфигурация
API_PORT = 5000

# СИСТЕМА КЭШИРОВАНИЯ
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
            self._access_count[key] = self._access_count.get(key, 0) + 1
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
            while len(self._cache) > self._max_size:
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

adaptive_cache = AdaptiveCache(max_size=500, default_ttl=30)

def get_db_connection():
    try:
        conn = sqlite3.connect('sparkcoin.db', check_same_thread=False, timeout=30.0)
        conn.row_factory = sqlite3.Row
        conn.execute('PRAGMA journal_mode=WAL')
        conn.execute('PRAGMA synchronous=NORMAL')
        conn.execute('PRAGMA cache_size=-128000')
        conn.execute('PRAGMA foreign_keys=ON')
        return conn
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        return None

def init_db():
    try:
        conn = get_db_connection()
        if not conn:
            return

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
                total_losses REAL DEFAULT 0,
                telegram_id TEXT UNIQUE,
                telegram_username TEXT,
                is_synced BOOLEAN DEFAULT FALSE
            )
        ''')

        # Таблица лотерей
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

        # Таблица ставок лотереи
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS lottery_bets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                team TEXT,
                amount REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES players (user_id)
            )
        ''')

        # Таблица классической лотереи
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS classic_lottery_bets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                amount REAL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES players (user_id)
            )
        ''')

        # История лотерей
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS lottery_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lottery_type TEXT,
                winner_user_id TEXT,
                prize REAL,
                participants INTEGER,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Инициализация таймеров
        cursor.execute('INSERT OR IGNORE INTO lottery_timer (id, timer) VALUES (1, 60)')
        cursor.execute('INSERT OR IGNORE INTO classic_lottery_timer (id, timer) VALUES (1, 120)')

        conn.commit()
        conn.close()
        logger.info("Database initialized successfully")

    except Exception as e:
        logger.error(f"Database init error: {e}")

# OPTIONS обработчики для каждого endpoint
@flask_app.route('/api/health', methods=['OPTIONS'])
def health_options():
    return add_cors_headers(jsonify({'status': 'preflight'})), 200

@flask_app.route('/api/top/winners', methods=['OPTIONS'])
def top_winners_options():
    return add_cors_headers(jsonify({'status': 'preflight'})), 200

@flask_app.route('/api/player/<user_id>', methods=['OPTIONS'])
def player_options(user_id):
    return add_cors_headers(jsonify({'status': 'preflight'})), 200

@flask_app.route('/api/all_players', methods=['OPTIONS'])
def all_players_options():
    return add_cors_headers(jsonify({'status': 'preflight'})), 200

@flask_app.route('/api/leaderboard', methods=['OPTIONS'])
def leaderboard_options():
    return add_cors_headers(jsonify({'status': 'preflight'})), 200

@flask_app.route('/api/lottery/status', methods=['OPTIONS'])
def lottery_status_options():
    return add_cors_headers(jsonify({'status': 'preflight'})), 200

@flask_app.route('/api/classic-lottery/status', methods=['OPTIONS'])
def classic_lottery_options():
    return add_cors_headers(jsonify({'status': 'preflight'})), 200

@flask_app.route('/api/referral/stats/<user_id>', methods=['OPTIONS'])
def referral_stats_options(user_id):
    return add_cors_headers(jsonify({'status': 'preflight'})), 200

@flask_app.route('/api/transfer', methods=['OPTIONS'])
def transfer_options():
    return add_cors_headers(jsonify({'status': 'preflight'})), 200

@flask_app.route('/api/lottery/bet', methods=['OPTIONS'])
def lottery_bet_options():
    return add_cors_headers(jsonify({'status': 'preflight'})), 200

@flask_app.route('/api/classic-lottery/bet', methods=['OPTIONS'])
def classic_bet_options():
    return add_cors_headers(jsonify({'status': 'preflight'})), 200

@flask_app.route('/api/sync/user/<telegram_id>', methods=['OPTIONS'])
def sync_user_get_options(telegram_id):
    return add_cors_headers(jsonify({'status': 'preflight'})), 200

@flask_app.route('/api/sync/user', methods=['OPTIONS'])
def sync_user_post_options():
    return add_cors_headers(jsonify({'status': 'preflight'})), 200

# API ENDPOINTS
@flask_app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'Sparkcoin API',
        'version': '1.0.0'
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
        ''', (limit,))

        winners = []
        for row in cursor.fetchall():
            winners.append({
                'username': row['username'],
                'totalWinnings': row['total_winnings'],
                'totalLosses': row['total_losses'],
                'netWinnings': row['net_winnings']
            })

        conn.close()

        return jsonify({
            'success': True,
            'winners': winners,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Top winners error: {e}")
        # Fallback data
        winners = [
            {
                'username': 'Чемпион Sparkcoin',
                'totalWinnings': 0.000001500,
                'totalLosses': 0.000000300,
                'netWinnings': 0.000001200
            },
            {
                'username': 'Удачник',
                'totalWinnings': 0.000001000,
                'totalLosses': 0.000000200,
                'netWinnings': 0.000000800
            }
        ]
        return jsonify({
            'success': True,
            'winners': winners[:limit],
            'timestamp': datetime.now().isoformat()
        })

@flask_app.route('/api/player/<user_id>', methods=['GET', 'POST'])
def player_api(user_id):
    if request.method == 'GET':
        try:
            conn = get_db_connection()
            cursor = conn.cursor()

            cursor.execute('SELECT * FROM players WHERE user_id = ?', (user_id,))
            player = cursor.fetchone()
            conn.close()

            if player:
                return jsonify({
                    'success': True,
                    'player': {
                        'userId': player['user_id'],
                        'username': player['username'],
                        'balance': player['balance'],
                        'totalEarned': player['total_earned'],
                        'totalClicks': player['total_clicks'],
                        'lastUpdate': player['last_update'],
                        'upgrades': json.loads(player['upgrades']) if player['upgrades'] else {},
                        'lotteryWins': player['lottery_wins'],
                        'totalBet': player['total_bet'],
                        'transfers': {'sent': player['transfers_sent'], 'received': player['transfers_received']},
                        'referralEarnings': player['referral_earnings'],
                        'referralsCount': player['referrals_count'],
                        'totalWinnings': player['total_winnings'],
                        'totalLosses': player['total_losses'],
                        'telegramId': player['telegram_id']
                    }
                })
            else:
                # Создаем нового игрока
                return jsonify({
                    'success': True,
                    'player': {
                        'userId': user_id,
                        'username': f'Игрок {user_id[-8:]}',
                        'balance': 0.000000100,
                        'totalEarned': 0.000000100,
                        'totalClicks': 0,
                        'lastUpdate': datetime.now().isoformat(),
                        'upgrades': {},
                        'lotteryWins': 0,
                        'totalBet': 0,
                        'transfers': {'sent': 0, 'received': 0},
                        'referralEarnings': 0,
                        'referralsCount': 0,
                        'totalWinnings': 0,
                        'totalLosses': 0,
                        'telegramId': user_id if user_id.startswith('tg_') else None
                    }
                })

        except Exception as e:
            logger.error(f"Player get error: {e}")
            return jsonify({
                'success': True,
                'player': {
                    'userId': user_id,
                    'username': f'Игрок {user_id[-8:]}',
                    'balance': 0.000000100,
                    'totalEarned': 0.000000100,
                    'totalClicks': 0,
                    'lastUpdate': datetime.now().isoformat(),
                    'upgrades': {},
                    'lotteryWins': 0,
                    'totalBet': 0,
                    'transfers': {'sent': 0, 'received': 0},
                    'referralEarnings': 0,
                    'referralsCount': 0,
                    'totalWinnings': 0,
                    'totalLosses': 0
                }
            })

    elif request.method == 'POST':
        try:
            data = request.get_json()
            logger.info(f"Received player data for {user_id}: {data}")

            conn = get_db_connection()
            cursor = conn.cursor()

            # Проверяем существование игрока
            cursor.execute('SELECT * FROM players WHERE user_id = ?', (user_id,))
            existing = cursor.fetchone()

            if existing:
                # Обновляем существующего игрока
                cursor.execute('''
                    UPDATE players SET 
                    username = ?, balance = ?, total_earned = ?, total_clicks = ?,
                    upgrades = ?, last_update = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                ''', (
                    data.get('username', existing['username']),
                    data.get('balance', existing['balance']),
                    data.get('totalEarned', existing['total_earned']),
                    data.get('totalClicks', existing['total_clicks']),
                    json.dumps(data.get('upgrades', {})),
                    user_id
                ))
            else:
                # Создаем нового игрока
                cursor.execute('''
                    INSERT INTO players 
                    (user_id, username, balance, total_earned, total_clicks, upgrades)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    user_id,
                    data.get('username', f'Игрок {user_id[-8:]}'),
                    data.get('balance', 0.000000100),
                    data.get('totalEarned', 0.000000100),
                    data.get('totalClicks', 0),
                    json.dumps(data.get('upgrades', {}))
                ))

            conn.commit()
            conn.close()

            return jsonify({
                'success': True, 
                'message': 'Player data updated successfully',
                'timestamp': datetime.now().isoformat()
            })
        except Exception as e:
            logger.error(f"Error processing player data: {e}")
            return jsonify({
                'success': True,
                'message': 'Player data received',
                'timestamp': datetime.now().isoformat()
            })

# СИНХРОНИЗАЦИЯ ДАННЫХ - ИСПРАВЛЕННАЯ
@flask_app.route('/api/sync/user/<telegram_id>', methods=['GET'])
def get_synced_user(telegram_id):
    try:
        session_id = request.args.get('session')
        conn = get_db_connection()
        cursor = conn.cursor()

        # Ищем по telegram_id ИЛИ по user_id который начинается с tg_
        cursor.execute('''
            SELECT * FROM players 
            WHERE telegram_id = ? OR user_id = ? OR user_id LIKE ?
            ORDER BY last_update DESC 
            LIMIT 1
        ''', (telegram_id, f'tg_{telegram_id}', f'tg_{telegram_id}%'))

        player = cursor.fetchone()
        conn.close()

        if player:
            return jsonify({
                'success': True,
                'userData': {
                    'userId': player['user_id'],
                    'username': player['username'],
                    'balance': player['balance'],
                    'totalEarned': player['total_earned'],
                    'totalClicks': player['total_clicks'],
                    'upgrades': json.loads(player['upgrades']) if player['upgrades'] else {},
                    'lastUpdate': player['last_update'],
                    'lotteryWins': player['lottery_wins'],
                    'totalBet': player['total_bet'],
                    'referralEarnings': player['referral_earnings'],
                    'referralsCount': player['referrals_count'],
                    'totalWinnings': player['total_winnings'],
                    'totalLosses': player['total_losses'],
                    'telegramId': player['telegram_id']
                }
            })
        else:
            return jsonify({
                'success': False,
                'message': 'User not found'
            })

    except Exception as e:
        logger.error(f"Sync get error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@flask_app.route('/api/sync/user', methods=['POST'])
def sync_user():
    try:
        data = request.get_json()
        telegram_id = data.get('telegramId')
        username = data.get('username')

        if not telegram_id:
            return jsonify({'success': False, 'error': 'No telegram ID'})

        conn = get_db_connection()
        cursor = conn.cursor()

        # Ищем пользователя по telegram_id ИЛИ по user_id который начинается с tg_
        cursor.execute('''
            SELECT * FROM players 
            WHERE telegram_id = ? OR user_id = ? OR user_id LIKE ?
            ORDER BY last_update DESC 
            LIMIT 1
        ''', (telegram_id, f'tg_{telegram_id}', f'tg_{telegram_id}%'))

        existing = cursor.fetchone()

        if existing:
            # ОБЪЕДИНЯЕМ данные вместо перезаписи
            current_balance = existing['balance']
            new_balance = data.get('balance', current_balance)

            # Берем максимальный баланс из всех источников
            final_balance = max(current_balance, new_balance)

            current_total_earned = existing['total_earned']
            new_total_earned = data.get('totalEarned', current_total_earned)
            final_total_earned = max(current_total_earned, new_total_earned)

            current_clicks = existing['total_clicks']
            new_clicks = data.get('totalClicks', current_clicks)
            final_clicks = max(current_clicks, new_clicks)

            # Обновляем существующего пользователя с объединенными данными
            cursor.execute('''
                UPDATE players SET 
                username = ?, balance = ?, total_earned = ?, total_clicks = ?,
                upgrades = ?, last_update = CURRENT_TIMESTAMP, is_synced = TRUE,
                telegram_id = ?
                WHERE user_id = ?
            ''', (
                username, 
                final_balance,
                final_total_earned, 
                final_clicks,
                json.dumps(data.get('upgrades', {})), 
                telegram_id,
                existing['user_id']  # Обновляем именно эту запись
            ))

            user_id_to_use = existing['user_id']

        else:
            # Создаем нового пользователя
            user_id_to_use = f'tg_{telegram_id}'
            cursor.execute('''
                INSERT INTO players 
                (user_id, username, balance, total_earned, total_clicks, upgrades, telegram_id, is_synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
            ''', (
                user_id_to_use, 
                username, 
                data.get('balance', 0.000000100),
                data.get('totalEarned', 0.000000100), 
                data.get('totalClicks', 0),
                json.dumps(data.get('upgrades', {})), 
                telegram_id
            ))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Data synced successfully',
            'userId': user_id_to_use
        })

    except Exception as e:
        logger.error(f"Sync error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@flask_app.route('/api/all_players', methods=['GET'])
def all_players():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT user_id, username, balance, total_earned, total_clicks 
            FROM players 
            ORDER BY balance DESC 
            LIMIT 100
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
            'players': players,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"All players error: {e}")
        return jsonify({
            'success': True,
            'players': [
                {'userId': 'demo1', 'username': 'Демо Игрок 1', 'balance': 0.000000500},
                {'userId': 'demo2', 'username': 'Демо Игрок 2', 'balance': 0.000000300}
            ],
            'timestamp': datetime.now().isoformat()
        })

@flask_app.route('/api/leaderboard', methods=['GET'])
def leaderboard():
    leaderboard_type = request.args.get('type', 'balance')
    limit = int(request.args.get('limit', 20))
    current_user = request.args.get('current_user')

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        if leaderboard_type == 'balance':
            cursor.execute('''
                SELECT user_id, username, balance, total_earned, total_clicks,
                       click_speed, mine_speed, (click_speed + mine_speed) as total_speed
                FROM players 
                ORDER BY balance DESC 
                LIMIT ?
            ''', (limit,))
        elif leaderboard_type == 'speed':
            cursor.execute('''
                SELECT user_id, username, balance, total_earned, total_clicks,
                       click_speed, mine_speed, (click_speed + mine_speed) as total_speed
                FROM players 
                ORDER BY total_speed DESC 
                LIMIT ?
            ''', (limit,))
        else:
            cursor.execute('''
                SELECT user_id, username, balance, total_earned, total_clicks,
                       click_speed, mine_speed, (click_speed + mine_speed) as total_speed
                FROM players 
                ORDER BY total_earned DESC 
                LIMIT ?
            ''', (limit,))

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
                'clickSpeed': row['click_speed'],
                'mineSpeed': row['mine_speed'],
                'totalSpeed': row['total_speed']
            })
            rank += 1

        # Добавляем текущего пользователя если его нет в топе
        if current_user:
            cursor.execute('''
                SELECT user_id, username, balance, total_earned, total_clicks,
                       click_speed, mine_speed, (click_speed + mine_speed) as total_speed
                FROM players 
                WHERE user_id = ?
            ''', (current_user,))

            current_player = cursor.fetchone()
            if current_player and not any(p['userId'] == current_user for p in leaders):
                leaders.append({
                    'rank': 0,
                    'userId': current_player['user_id'],
                    'username': current_player['username'] + ' (Вы)',
                    'balance': current_player['balance'],
                    'totalEarned': current_player['total_earned'],
                    'totalClicks': current_player['total_clicks'],
                    'clickSpeed': current_player['click_speed'],
                    'mineSpeed': current_player['mine_speed'],
                    'totalSpeed': current_player['total_speed']
                })

        conn.close()

        return jsonify({
            'success': True,
            'leaderboard': leaders,
            'type': leaderboard_type,
            'timestamp': datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Leaderboard error: {e}")
        leaders = [
            {
                'rank': 1, 
                'username': '👑 Топ Игрок', 
                'balance': 0.000001000,
                'totalEarned': 0.000002000,
                'totalClicks': 150,
                'clickSpeed': 0.000000005,
                'mineSpeed': 0.000000010,
                'totalSpeed': 0.000000015
            }
        ]
        return jsonify({
            'success': True,
            'leaderboard': leaders[:limit],
            'type': leaderboard_type,
            'timestamp': datetime.now().isoformat()
        })

# ЛОТЕРЕЙНЫЕ ENDPOINTS
@flask_app.route('/api/lottery/status', methods=['GET'])
def lottery_status():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Получаем текущие ставки
        cursor.execute('''
            SELECT lb.user_id, p.username, lb.team, lb.amount, lb.timestamp
            FROM lottery_bets lb
            JOIN players p ON lb.user_id = p.user_id
            WHERE lb.timestamp > datetime('now', '-5 minutes')
            ORDER BY lb.timestamp DESC
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

        # Получаем таймер
        cursor.execute('SELECT timer, last_winner, last_prize FROM lottery_timer WHERE id = 1')
        timer_data = cursor.fetchone()

        conn.close()

        return jsonify({
            'success': True, 
            'lottery': {
                'eagle': eagle_bets,
                'tails': tails_bets,
                'last_winner': timer_data['last_winner'] if timer_data else None,
                'last_prize': timer_data['last_prize'] if timer_data else 0,
                'timer': timer_data['timer'] if timer_data else 60,
                'total_eagle': total_eagle,
                'total_tails': total_tails,
                'participants_count': len(eagle_bets) + len(tails_bets)
            },
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Lottery status error: {e}")
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
            },
            'timestamp': datetime.now().isoformat()
        })

@flask_app.route('/api/classic-lottery/status', methods=['GET'])
def classic_lottery():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Получаем текущие ставки
        cursor.execute('''
            SELECT clb.user_id, p.username, clb.amount, clb.timestamp
            FROM classic_lottery_bets clb
            JOIN players p ON clb.user_id = p.user_id
            WHERE clb.timestamp > datetime('now', '-10 minutes')
            ORDER BY clb.timestamp DESC
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
            SELECT lh.winner_user_id, p.username as winner_name, lh.prize, lh.participants, lh.timestamp
            FROM lottery_history lh
            LEFT JOIN players p ON lh.winner_user_id = p.user_id
            WHERE lh.lottery_type = 'classic'
            ORDER BY lh.timestamp DESC
            LIMIT 10
        ''')

        history = []
        for row in cursor.fetchall():
            history.append({
                'winner': row['winner_name'] or row['winner_user_id'],
                'prize': row['prize'],
                'participants': row['participants'],
                'timestamp': row['timestamp']
            })

        # Получаем таймер
        cursor.execute('SELECT timer, total_pot, last_winner, last_prize FROM classic_lottery_timer WHERE id = 1')
        timer_data = cursor.fetchone()

        conn.close()

        return jsonify({
            'success': True, 
            'lottery': {
                'bets': bets,
                'total_pot': total_pot,
                'timer': timer_data['timer'] if timer_data else 120,
                'participants_count': len(bets),
                'history': history
            },
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Classic lottery error: {e}")
        return jsonify({
            'success': True, 
            'lottery': {
                'bets': [],
                'total_pot': 0,
                'timer': 120,
                'participants_count': 0,
                'history': []
            },
            'timestamp': datetime.now().isoformat()
        })

@flask_app.route('/api/referral/stats/<user_id>', methods=['GET'])
def referral_stats(user_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT referrals_count, referral_earnings, referral_code
            FROM players WHERE user_id = ?
        ''', (user_id,))

        player = cursor.fetchone()
        conn.close()

        if player:
            return jsonify({
                'success': True, 
                'stats': {
                    'referralsCount': player['referrals_count'], 
                    'totalEarnings': player['referral_earnings']
                },
                'referralCode': player['referral_code'] or f'REF-{user_id[-8:].upper()}',
                'timestamp': datetime.now().isoformat()
            })
        else:
            return jsonify({
                'success': True, 
                'stats': {
                    'referralsCount': 0, 
                    'totalEarnings': 0
                },
                'referralCode': f'REF-{user_id[-8:].upper()}',
                'timestamp': datetime.now().isoformat()
            })
    except Exception as e:
        logger.error(f"Referral stats error: {e}")
        return jsonify({
            'success': True, 
            'stats': {
                'referralsCount': 0, 
                'totalEarnings': 0
            },
            'referralCode': f'REF-{user_id[-8:].upper()}',
            'timestamp': datetime.now().isoformat()
        })

@flask_app.route('/api/transfer', methods=['POST'])
def transfer():
    try:
        data = request.get_json()
        from_user_id = data.get('fromUserId')
        to_user_id = data.get('toUserId')
        amount = data.get('amount')

        if not from_user_id or not to_user_id or not amount:
            return jsonify({'success': False, 'error': 'Missing required fields'})

        if amount <= 0:
            return jsonify({'success': False, 'error': 'Invalid amount'})

        conn = get_db_connection()
        cursor = conn.cursor()

        # Проверяем баланс отправителя
        cursor.execute('SELECT balance FROM players WHERE user_id = ?', (from_user_id,))
        sender = cursor.fetchone()

        if not sender or sender['balance'] < amount:
            return jsonify({'success': False, 'error': 'Insufficient funds'})

        # Проверяем получателя
        cursor.execute('SELECT user_id FROM players WHERE user_id = ?', (to_user_id,))
        receiver = cursor.fetchone()

        if not receiver:
            return jsonify({'success': False, 'error': 'Recipient not found'})

        # Выполняем перевод
        cursor.execute('UPDATE players SET balance = balance - ? WHERE user_id = ?', (amount, from_user_id))
        cursor.execute('UPDATE players SET balance = balance + ? WHERE user_id = ?', (amount, to_user_id))
        cursor.execute('UPDATE players SET transfers_sent = transfers_sent + ? WHERE user_id = ?', (amount, from_user_id))
        cursor.execute('UPDATE players SET transfers_received = transfers_received + ? WHERE user_id = ?', (amount, to_user_id))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True, 
            'message': 'Transfer complete',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Transfer error: {e}")
        return jsonify({
            'success': False, 
            'error': 'Transfer failed',
            'timestamp': datetime.now().isoformat()
        })

@flask_app.route('/api/lottery/bet', methods=['POST'])
def lottery_bet():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        team = data.get('team')
        amount = data.get('amount')

        if not user_id or not team or not amount:
            return jsonify({'success': False, 'error': 'Missing required fields'})

        if team not in ['eagle', 'tails']:
            return jsonify({'success': False, 'error': 'Invalid team'})

        if amount <= 0:
            return jsonify({'success': False, 'error': 'Invalid amount'})

        conn = get_db_connection()
        cursor = conn.cursor()

        # Проверяем баланс
        cursor.execute('SELECT balance FROM players WHERE user_id = ?', (user_id,))
        player = cursor.fetchone()

        if not player or player['balance'] < amount:
            return jsonify({'success': False, 'error': 'Insufficient funds'})

        # Списываем средства
        cursor.execute('UPDATE players SET balance = balance - ?, total_bet = total_bet + ? WHERE user_id = ?', 
                      (amount, amount, user_id))

        # Добавляем ставку
        cursor.execute('INSERT INTO lottery_bets (user_id, team, amount) VALUES (?, ?, ?)', 
                      (user_id, team, amount))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True, 
            'message': 'Bet placed',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Lottery bet error: {e}")
        return jsonify({
            'success': False, 
            'error': 'Bet failed',
            'timestamp': datetime.now().isoformat()
        })

@flask_app.route('/api/classic-lottery/bet', methods=['POST'])
def classic_bet():
    try:
        data = request.get_json()
        user_id = data.get('userId')
        amount = data.get('amount')

        if not user_id or not amount:
            return jsonify({'success': False, 'error': 'Missing required fields'})

        if amount <= 0:
            return jsonify({'success': False, 'error': 'Invalid amount'})

        conn = get_db_connection()
        cursor = conn.cursor()

        # Проверяем баланс
        cursor.execute('SELECT balance FROM players WHERE user_id = ?', (user_id,))
        player = cursor.fetchone()

        if not player or player['balance'] < amount:
            return jsonify({'success': False, 'error': 'Insufficient funds'})

        # Списываем средства
        cursor.execute('UPDATE players SET balance = balance - ?, total_bet = total_bet + ? WHERE user_id = ?', 
                      (amount, amount, user_id))

        # Добавляем ставку
        cursor.execute('INSERT INTO classic_lottery_bets (user_id, amount) VALUES (?, ?)', 
                      (user_id, amount))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True, 
            'message': 'Bet placed',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Classic lottery bet error: {e}")
        return jsonify({
            'success': False, 
            'error': 'Bet failed',
            'timestamp': datetime.now().isoformat()
        })

# Стартовая страница
@flask_app.route('/')
def index():
    return jsonify({
        'message': 'Sparkcoin API Server',
        'status': 'running',
        'version': '1.0.0',
        'cors': 'enabled',
        'sync': 'available'
    })

# Запуск сервера
if __name__ == "__main__":
    logger.info("Initializing database...")
    init_db()

    logger.info(f"Starting Sparkcoin API on port {API_PORT} with sync support...")
    flask_app.run(
        host='0.0.0.0', 
        port=API_PORT, 
        debug=False,
        threaded=True
    )
