import os
import json
import logging
import sqlite3
from datetime import datetime
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
from dotenv import load_dotenv
from flask import Flask, jsonify, request
import threading

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
TOKEN = os.getenv('BOT_TOKEN')
API_PORT = int(os.getenv('API_PORT', 5000))

# Flask app для API
flask_app = Flask(__name__)

# CORS FIX
@flask_app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@flask_app.before_request
def before_request():
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'preflight'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response

@flask_app.route('/api/player/<user_id>', methods=['GET', 'POST', 'OPTIONS'])
def player_api(user_id):
    """API endpoint для получения и обновления данных игрока"""
    try:
        logger.info(f"=== PLAYER API CALL ===")
        logger.info(f"Method: {request.method}")
        logger.info(f"User ID: {user_id}")

        # ПРОВЕРКА НА UNDEFINED
        if user_id == 'undefined' or not user_id:
            logger.warning("⚠️ Invalid user_id received")
            return jsonify({
                'success': False, 
                'error': 'Invalid user ID'
            }), 400

        if request.method == 'GET':
            logger.info(f"Processing GET request for user: {user_id}")

            # Сначала пытаемся получить существующего игрока
            player_data = GameManager.get_player_data(user_id)

            if player_data:
                logger.info(f"Player found: {player_data['username']}")
                return jsonify({
                    'success': True,
                    'player': player_data
                })
            else:
                logger.info(f"Player not found, creating new one: {user_id}")

                # Создаем нового игрока с базовыми данными
                new_player_data = {
                    'userId': user_id,
                    'username': f'Player_{user_id[-8:]}',
                    'balance': 0.000000100,
                    'totalEarned': 0.000000100,
                    'totalClicks': 0,
                    'lotteryWins': 0,
                    'totalBet': 0,
                    'transfers': {'sent': 0, 'received': 0},
                    'upgrades': {}
                }

                # Создаем базовые улучшения
                initial_upgrades = {}
                for i in range(1, 9):
                    initial_upgrades[f"gpu{i}"] = {"level": 0}
                    initial_upgrades[f"cpu{i}"] = {"level": 0}
                    initial_upgrades[f"mouse{i}"] = {"level": 0}

                new_player_data['upgrades'] = initial_upgrades

                # Сохраняем игрока
                GameManager.update_player(new_player_data)

                # Получаем данные созданного игрока
                created_player = GameManager.get_player_data(user_id)

                if created_player:
                    logger.info(f"Successfully created player: {created_player['username']}")
                    return jsonify({
                        'success': True,
                        'player': created_player,
                        'message': 'New player created successfully'
                    })
                else:
                    logger.error(f"Failed to create player: {user_id}")
                    return jsonify({
                        'success': False,
                        'error': 'Failed to create player'
                    }), 500

        elif request.method == 'POST':
            logger.info(f"Processing POST request for user: {user_id}")
            data = request.get_json()

            if not data:
                logger.warning("No data provided in POST request")
                return jsonify({'success': False, 'error': 'No data provided'}), 400

            # ЛОГИРУЕМ ВХОДЯЩИЕ ДАННЫЕ ДЛЯ ОТЛАДКИ
            logger.info(f"📥 Received data keys: {list(data.keys())}")
            
            # Убедимся, что user_id совпадает
            data['userId'] = user_id
            logger.info(f"Updating player data: {data.get('username', 'Unknown')}")

            GameManager.update_player(data)
            return jsonify({'success': True, 'message': 'Player data updated successfully'})

        elif request.method == 'OPTIONS':
            return jsonify({'status': 'ok'})

    except Exception as e:
        logger.error(f"API Error in player_api: {str(e)}", exc_info=True)
        return jsonify({
            'success': False, 
            'error': f'Internal server error: {str(e)}'
        }), 500

@flask_app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard_api():
    """API endpoint для получения рейтинга с улучшенной обработкой ошибок"""
    try:
        limit = request.args.get('limit', 10, type=int)
        leaderboard_type = request.args.get('type', 'balance')
        current_user = request.args.get('current_user')

        logger.info(f"Leaderboard request: type={leaderboard_type}, limit={limit}, current_user={current_user}")

        leaderboard_data = GameManager.get_leaderboard(limit, leaderboard_type, current_user)

        formatted_leaderboard = []
        for i, player in enumerate(leaderboard_data, 1):
            try:
                # Безопасное извлечение данных с значениями по умолчанию
                user_id = player[0] if len(player) > 0 else f"unknown_{i}"
                username = player[1] if len(player) > 1 and player[1] else f"Player_{i}"
                balance = float(player[2]) if len(player) > 2 and player[2] is not None else 0.0
                total_earned = float(player[3]) if len(player) > 3 and player[3] is not None else 0.0
                total_clicks = player[4] if len(player) > 4 and player[4] is not None else 0
                click_speed = float(player[5]) if len(player) > 5 and player[5] is not None else 0.000000001
                mine_speed = float(player[6]) if len(player) > 6 and player[6] is not None else 0.000000000

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
            except Exception as e:
                logger.error(f"Error processing player {i}: {e}")
                continue

        logger.info(f"Successfully formatted {len(formatted_leaderboard)} players")

        return jsonify({
            'success': True,
            'leaderboard': formatted_leaderboard,
            'type': leaderboard_type,
            'totalPlayers': len(formatted_leaderboard)
        })

    except Exception as e:
        logger.error(f"❌ API Error in leaderboard: {str(e)}", exc_info=True)
        return jsonify({
            'success': False, 
            'error': f'Internal server error: {str(e)}',
            'leaderboard': []
        }), 500

@flask_app.route('/api/all_players', methods=['GET'])
def get_all_players_api():
    """API endpoint для получения всех игроков (для переводов)"""
    try:
        players = GameManager.get_all_players()
        players_data = []

        for user_id, username, balance in players:
            players_data.append({
                'userId': user_id,
                'username': username,
                'balance': float(balance)
            })

        return jsonify({
            'success': True,
            'players': players_data
        })

    except Exception as e:
        logger.error(f"API Error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@flask_app.route('/api/transfer', methods=['POST'])
def transfer_api():
    """API endpoint для перевода монет"""
    try:
        data = request.get_json()
        from_user_id = data.get('fromUserId')
        to_user_id = data.get('toUserId')
        amount = float(data.get('amount', 0))

        success, message = GameManager.transfer_coins(from_user_id, to_user_id, amount)

        return jsonify({
            'success': success,
            'message': message
        })

    except Exception as e:
        logger.error(f"API Error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@flask_app.route('/api/health', methods=['GET'])
def health_check():
    """Проверка здоровья API"""
    return jsonify({
        'status': 'healthy', 
        'timestamp': datetime.now().isoformat(),
        'service': 'Sparkcoin API'
    })

@flask_app.route('/api/debug', methods=['GET'])
def debug_info():
    """Отладочная информация"""
    return jsonify({
        'status': 'running',
        'timestamp': datetime.now().isoformat(),
        'endpoints': [
            '/api/health',
            '/api/player/<user_id>',
            '/api/leaderboard',
            '/api/all_players',
            '/api/transfer',
            '/api/debug'
        ]
    })

@flask_app.route('/api/test_player', methods=['GET'])
def test_player():
    """Тестовый endpoint для проверки создания игрока"""
    test_user_id = 'test_user_123'

    # Пытаемся создать тестового игрока
    test_data = {
        'userId': test_user_id,
        'username': 'TestPlayer',
        'balance': 0.000000100,
        'totalEarned': 0.000000100,
        'totalClicks': 0,
        'upgrades': {},
        'lotteryWins': 0,
        'totalBet': 0,
        'transfers': {'sent': 0, 'received': 0}
    }

    # Создаем базовые улучшения
    initial_upgrades = {}
    for i in range(1, 9):
        initial_upgrades[f"gpu{i}"] = {"level": 0}
        initial_upgrades[f"cpu{i}"] = {"level": 0}
        initial_upgrades[f"mouse{i}"] = {"level": 0}

    test_data['upgrades'] = initial_upgrades
    GameManager.update_player(test_data)

    # Проверяем, создался ли игрок
    player_data = GameManager.get_player_data(test_user_id)

    return jsonify({
        'success': True,
        'test_user_id': test_user_id,
        'player_created': player_data is not None,
        'player_data': player_data
    })

@flask_app.route('/')
def index():
    """Главная страница"""
    return jsonify({
        'message': 'Sparkcoin API Server', 
        'status': 'running',
        'endpoints': {
            'health': '/api/health',
            'player': '/api/player/<user_id>',
            'leaderboard': '/api/leaderboard',
            'all_players': '/api/all_players',
            'transfer': '/api/transfer',
            'debug': '/api/debug',
            'test': '/api/test_player'
        }
    })

def init_db():
    """Инициализация базы данных"""
    try:
        conn = sqlite3.connect('sparkcoin.db')
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
                mine_speed REAL DEFAULT 0.000000000
            )
        ''')

        conn.commit()
        conn.close()
        logger.info("✅ База данных инициализирована")

    except Exception as e:
        logger.error(f"❌ Ошибка инициализации базы данных: {e}")

class GameManager:

    @staticmethod
    def is_valid_telegram_username(username):
        """Проверяет валидность Telegram юзернейма"""
        if not username:
            return False
        return True

    @staticmethod
    def calculate_click_speed(upgrades):
        """Рассчитывает скорость клика на основе улучшений"""
        try:
            base_speed = 0.000000001
            if not upgrades:
                return base_speed
            
            # Расчет скорости клика на основе мышек
            for i in range(1, 9):
                mouse_key = f"mouse{i}"
                if mouse_key in upgrades:
                    level = upgrades[mouse_key].get('level', 0)
                    if i == 1:
                        base_speed += level * 0.000000004
                    elif i == 2:
                        base_speed += level * 0.000000008
                    elif i == 3:
                        base_speed += level * 0.000000064
                    elif i == 4:
                        base_speed += level * 0.000000512
                    elif i == 5:
                        base_speed += level * 0.000004096
                    elif i == 6:
                        base_speed += level * 0.000032768
                    elif i == 7:
                        base_speed += level * 0.000262144
                    elif i == 8:
                        base_speed += level * 0.002097152
            
            return base_speed
        except Exception as e:
            logger.error(f"Error calculating click speed: {e}")
            return 0.000000001

    @staticmethod
    def calculate_mine_speed(upgrades):
        """Рассчитывает скорость майнинга на основе улучшений"""
        try:
            base_speed = 0.000000000
            if not upgrades:
                return base_speed
            
            # Расчет скорости майнинга на основе видеокарт и процессоров
            for i in range(1, 9):
                gpu_key = f"gpu{i}"
                cpu_key = f"cpu{i}"
                
                if gpu_key in upgrades:
                    level = upgrades[gpu_key].get('level', 0)
                    if i == 1:
                        base_speed += level * 0.000000001
                    elif i == 2:
                        base_speed += level * 0.000000008
                    elif i == 3:
                        base_speed += level * 0.000000064
                    elif i == 4:
                        base_speed += level * 0.000000512
                    elif i == 5:
                        base_speed += level * 0.000004096
                    elif i == 6:
                        base_speed += level * 0.000032768
                    elif i == 7:
                        base_speed += level * 0.000262144
                    elif i == 8:
                        base_speed += level * 0.002097152
                
                if cpu_key in upgrades:
                    level = upgrades[cpu_key].get('level', 0)
                    if i == 1:
                        base_speed += level * 0.000000001
                    elif i == 2:
                        base_speed += level * 0.000000008
                    elif i == 3:
                        base_speed += level * 0.000000064
                    elif i == 4:
                        base_speed += level * 0.000000512
                    elif i == 5:
                        base_speed += level * 0.000004096
                    elif i == 6:
                        base_speed += level * 0.000032768
                    elif i == 7:
                        base_speed += level * 0.000262144
                    elif i == 8:
                        base_speed += level * 0.002097152
            
            return base_speed
        except Exception as e:
            logger.error(f"Error calculating mine speed: {e}")
            return 0.000000000

    @staticmethod
    def update_player(data):
        """Обновление данных игрока с авто-созданием"""
        try:
            # ИСПРАВЛЕННЫЕ КЛЮЧИ - используем camelCase как во фронтенде
            username = data.get('username', 'Player')
            user_id = data.get('userId')

            if not user_id:
                logger.error("No user_id provided")
                return

            conn = sqlite3.connect('sparkcoin.db')
            cursor = conn.cursor()

            # Рассчитываем скорости на основе улучшений
            click_speed = GameManager.calculate_click_speed(data.get('upgrades', {}))
            mine_speed = GameManager.calculate_mine_speed(data.get('upgrades', {}))

            cursor.execute('SELECT * FROM players WHERE user_id = ?', (user_id,))
            existing_player = cursor.fetchone()

            upgrades_json = json.dumps(data.get('upgrades', {}))

            # ИСПРАВЛЕННЫЕ КЛЮЧИ - используем camelCase
            balance = data.get('balance', 0.000000100)
            total_earned = data.get('totalEarned', 0.000000100)  # camelCase
            total_clicks = data.get('totalClicks', 0)  # camelCase
            lottery_wins = data.get('lotteryWins', 0)  # camelCase
            total_bet = data.get('totalBet', 0)  # camelCase
            
            # Обработка transfers
            transfers_data = data.get('transfers', {})
            transfers_sent = transfers_data.get('sent', 0)
            transfers_received = transfers_data.get('received', 0)

            if existing_player:
                # Обновляем существующего игрока
                cursor.execute('''
                    UPDATE players SET 
                    username = ?, balance = ?, total_earned = ?, total_clicks = ?, 
                    upgrades = ?, lottery_wins = ?, total_bet = ?,
                    transfers_sent = ?, transfers_received = ?, 
                    click_speed = ?, mine_speed = ?, last_update = ?
                    WHERE user_id = ?
                ''', (
                    username,
                    balance,
                    total_earned,
                    total_clicks,
                    upgrades_json,
                    lottery_wins,
                    total_bet,
                    transfers_sent,
                    transfers_received,
                    click_speed, mine_speed, datetime.now(), user_id
                ))
                logger.info(f"✅ Игрок обновлен: {username} (кликов: {total_clicks}, баланс: {balance})")
            else:
                # Создаем нового игрока
                cursor.execute('''
                    INSERT INTO players 
                    (user_id, username, balance, total_earned, total_clicks, upgrades, 
                     lottery_wins, total_bet, transfers_sent, transfers_received,
                     click_speed, mine_speed, last_update)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    user_id,
                    username,
                    balance,
                    total_earned,
                    total_clicks,
                    upgrades_json,
                    lottery_wins,
                    total_bet,
                    transfers_sent,
                    transfers_received,
                    click_speed, mine_speed, datetime.now()
                ))
                logger.info(f"✅ Новый игрок создан: {username} ({user_id})")

            conn.commit()
            conn.close()

        except Exception as e:
            logger.error(f"❌ Ошибка обновления игрока: {e}", exc_info=True)
            logger.error(f"❌ Данные которые пришли: {data}")
            if 'conn' in locals():
                conn.rollback()
                conn.close()

    @staticmethod
    def get_player_data(user_id):
        """Получение данных игрока"""
        try:
            conn = sqlite3.connect('sparkcoin.db')
            cursor = conn.cursor()

            cursor.execute('SELECT * FROM players WHERE user_id = ?', (user_id,))
            player = cursor.fetchone()

            conn.close()

            if player:
                upgrades_data = player[5] if player[5] else '{}'
                try:
                    upgrades_dict = json.loads(upgrades_data)
                except:
                    upgrades_dict = {}

                return {
                    'userId': player[0],
                    'username': player[1],
                    'balance': float(player[2]),
                    'totalEarned': float(player[3]),
                    'totalClicks': player[4],
                    'upgrades': upgrades_dict,
                    'lastUpdate': player[6],
                    'lotteryWins': player[7],
                    'totalBet': float(player[8]),
                    'transfers': {
                        'sent': float(player[9]),
                        'received': float(player[10])
                    },
                    'clickSpeed': float(player[11]),
                    'mineSpeed': float(player[12])
                }
            return None
        except Exception as e:
            logger.error(f"❌ Ошибка получения данных игрока: {e}")
            return None

    @staticmethod
    def get_leaderboard(limit=10, leaderboard_type='balance', current_user_id=None):
        """Получение рейтинга с улучшенной обработкой ошибок"""
        try:
            conn = sqlite3.connect('sparkcoin.db')
            cursor = conn.cursor()

            logger.info(f"Getting leaderboard: type={leaderboard_type}, limit={limit}")

            # Проверяем существование таблицы
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='players'")
            table_exists = cursor.fetchone()

            if not table_exists:
                logger.error("Table 'players' does not exist")
                conn.close()
                return []

            # Проверяем существование колонок
            cursor.execute("PRAGMA table_info(players)")
            columns = [column[1] for column in cursor.fetchall()]
            logger.info(f"Available columns: {columns}")

            # Убедимся, что все необходимые колонки существуют
            required_columns = ['user_id', 'username', 'balance', 'total_earned', 'total_clicks', 'click_speed', 'mine_speed']
            for col in required_columns:
                if col not in columns:
                    logger.error(f"Missing column: {col}")
                    conn.close()
                    return []

            # Базовый запрос с безопасным формированием
            base_query = '''
                SELECT user_id, username, balance, total_earned, total_clicks, 
                       COALESCE(click_speed, 0.000000001) as click_speed, 
                       COALESCE(mine_speed, 0.000000000) as mine_speed
                FROM players 
                WHERE username IS NOT NULL 
                AND username != '' 
                AND balance IS NOT NULL
            '''

            # Добавляем сортировку в зависимости от типа рейтинга
            if leaderboard_type == 'balance':
                query = base_query + ' ORDER BY balance DESC LIMIT ?'
            elif leaderboard_type == 'speed':
                query = base_query + ' ORDER BY (COALESCE(click_speed, 0) + COALESCE(mine_speed, 0)) DESC LIMIT ?'
            else:  # rich (total_earned)
                query = base_query + ' ORDER BY total_earned DESC LIMIT ?'

            logger.info(f"Executing query: {query}")
            cursor.execute(query, (limit,))

            leaderboard = cursor.fetchall()
            conn.close()

            logger.info(f"Found {len(leaderboard)} players in leaderboard")
            return leaderboard

        except Exception as e:
            logger.error(f"❌ Ошибка получения рейтинга: {str(e)}", exc_info=True)
            if 'conn' in locals():
                conn.close()
            return []

    @staticmethod
    def get_all_players():
        """Получение всех игроков для переводов"""
        try:
            conn = sqlite3.connect('sparkcoin.db')
            cursor = conn.cursor()
            
            cursor.execute('SELECT user_id, username, balance FROM players WHERE username IS NOT NULL ORDER BY username')
            players = cursor.fetchall()
            conn.close()
            
            return players
        except Exception as e:
            logger.error(f"Error getting all players: {e}")
            return []

    @staticmethod
    def transfer_coins(from_user_id, to_user_id, amount):
        """Перевод монет между игроками"""
        try:
            if amount <= 0:
                return False, "Неверная сумма перевода"
            
            conn = sqlite3.connect('sparkcoin.db')
            cursor = conn.cursor()
            
            # Проверяем баланс отправителя
            cursor.execute('SELECT balance FROM players WHERE user_id = ?', (from_user_id,))
            sender_balance = cursor.fetchone()
            
            if not sender_balance or sender_balance[0] < amount:
                conn.close()
                return False, "Недостаточно средств"
            
            # Проверяем существование получателя
            cursor.execute('SELECT user_id FROM players WHERE user_id = ?', (to_user_id,))
            receiver = cursor.fetchone()
            
            if not receiver:
                conn.close()
                return False, "Получатель не найден"
            
            # Выполняем перевод
            cursor.execute('UPDATE players SET balance = balance - ? WHERE user_id = ?', (amount, from_user_id))
            cursor.execute('UPDATE players SET balance = balance + ? WHERE user_id = ?', (amount, to_user_id))
            
            # Обновляем статистику переводов
            cursor.execute('UPDATE players SET transfers_sent = transfers_sent + ? WHERE user_id = ?', (amount, from_user_id))
            cursor.execute('UPDATE players SET transfers_received = transfers_received + ? WHERE user_id = ?', (amount, to_user_id))
            
            conn.commit()
            conn.close()
            
            logger.info(f"Transfer successful: {from_user_id} -> {to_user_id} ({amount} S)")
            return True, "Перевод выполнен успешно"
            
        except Exception as e:
            logger.error(f"Transfer error: {e}")
            if 'conn' in locals():
                conn.rollback()
                conn.close()
            return False, f"Ошибка перевода: {str(e)}"

# Базовые функции бота
async def start(update, context):
    await update.message.reply_text(
        "🎮 Добро пожаловать в Sparkcoin!\n\n"
        "Используйте команды:\n"
        "/game - запустить игру\n"
        "/stats - ваша статистика\n"
        "/leaderboard - рейтинг игроков\n"
        "/shop - магазин улучшений"
    )

async def stats_command(update, context):
    await update.message.reply_text("📊 Статистика доступна в веб-версии игры. Используйте /game для запуска!")

async def leaderboard_command(update, context):
    await update.message.reply_text("🏆 Рейтинг игроков доступен в веб-версии игры. Используйте /game для запуска!")

async def transfer_command(update, context):
    await update.message.reply_text("💸 Переводы между игроками доступны в веб-версии игры. Используйте /game для запуска!")

async def shop_command(update, context):
    await update.message.reply_text("🛠️ Магазин улучшений доступен в веб-версии игры. Используйте /game для запуска!")

async def lottery_command(update, context):
    await update.message.reply_text("🎮 Командная лотерея доступна в веб-версии игры. Используйте /game для запуска!")

async def handle_web_app_data(update, context):
    pass

async def button_handler(update, context):
    pass

async def error_handler(update, context):
    logger.error(f"❌ Ошибка бота: {context.error}", exc_info=context.error)

def run_flask_app():
    """Запускает Flask API"""
    try:
        logger.info(f"🚀 Запуск Flask API на порту {API_PORT}")
        flask_app.run(host='0.0.0.0', port=API_PORT, debug=False, use_reloader=False)
    except Exception as e:
        logger.error(f"❌ Ошибка запуска Flask: {e}")

def main():
    if not TOKEN:
        logger.error("❌ Укажите BOT_TOKEN в .env файле")
        return

    # Инициализируем базу данных
    init_db()

    # Запускаем Flask API в отдельном потоке
    flask_thread = threading.Thread(target=run_flask_app, daemon=True)
    flask_thread.start()
    logger.info(f"✅ Flask API запущен на порту {API_PORT}")

    # Создаем приложение бота
    application = Application.builder().token(TOKEN).build()

    # Обработчики команд
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("stats", stats_command))
    application.add_handler(CommandHandler("leaderboard", leaderboard_command))
    application.add_handler(CommandHandler("top", leaderboard_command))
    application.add_handler(CommandHandler("transfer", transfer_command))
    application.add_handler(CommandHandler("shop", shop_command))
    application.add_handler(CommandHandler("lottery", lottery_command))
    application.add_handler(CommandHandler("help", start))
    application.add_handler(CommandHandler("game", start))

    # Обработчики сообщений
    application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_web_app_data))

    # Обработчики кнопок
    application.add_handler(CallbackQueryHandler(button_handler))

    # Обработчик ошибок
    application.add_error_handler(error_handler)

    logger.info("✅ Бот Sparkcoin запущен с API!")
    application.run_polling()

if __name__ == "__main__":
    main()
