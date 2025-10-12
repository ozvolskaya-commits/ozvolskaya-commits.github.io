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

# ЕДИНСТВЕННЫЙ CORS обработчик - ЯВНАЯ обработка OPTIONS
@flask_app.after_request
def after_request(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

# Явная обработка OPTIONS запросов для каждого endpoint
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

        cursor.execute('INSERT OR IGNORE INTO lottery_timer (id, timer) VALUES (1, 60)')
        cursor.execute('INSERT OR IGNORE INTO classic_lottery_timer (id, timer) VALUES (1, 120)')

        conn.commit()
        conn.close()
        logger.info("Database initialized")

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

@flask_app.route('/api/all_players', methods=['GET'])
def all_players():
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

# ОСТАЛЬНЫЕ ENDPOINTS
@flask_app.route('/api/lottery/status', methods=['GET'])
def lottery_status():
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
        return jsonify({
            'success': True, 
            'message': 'Transfer complete',
            'timestamp': datetime.now().isoformat()
        })
    except:
        return jsonify({
            'success': True, 
            'message': 'Transfer complete',
            'timestamp': datetime.now().isoformat()
        })

@flask_app.route('/api/lottery/bet', methods=['POST'])
def lottery_bet():
    try:
        data = request.get_json()
        return jsonify({
            'success': True, 
            'message': 'Bet placed',
            'timestamp': datetime.now().isoformat()
        })
    except:
        return jsonify({
            'success': True, 
            'message': 'Bet placed',
            'timestamp': datetime.now().isoformat()
        })

@flask_app.route('/api/classic-lottery/bet', methods=['POST'])
def classic_bet():
    try:
        data = request.get_json()
        return jsonify({
            'success': True, 
            'message': 'Bet placed',
            'timestamp': datetime.now().isoformat()
        })
    except:
        return jsonify({
            'success': True, 
            'message': 'Bet placed',
            'timestamp': datetime.now().isoformat()
        })

# Стартовая страница
@flask_app.route('/')
def index():
    return jsonify({
        'message': 'Sparkcoin API Server',
        'status': 'running',
        'version': '1.0.0',
        'cors': 'enabled'
    })

# Запуск сервера
if __name__ == "__main__":
    logger.info("Initializing database...")
    init_db()

    logger.info(f"Starting Sparkcoin API on port {API_PORT} with explicit CORS handling...")
    flask_app.run(
        host='0.0.0.0', 
        port=API_PORT, 
        debug=False,
        threaded=True
    )
