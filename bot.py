import os
import json
import logging
import sqlite3
from datetime import datetime
from telegram import Update, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler
from dotenv import load_dotenv
from flask import Flask, jsonify, request
import threading

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Загрузка переменных окружения
load_dotenv()
TOKEN = os.getenv('BOT_TOKEN')
API_PORT = int(os.getenv('API_PORT', 5000))

# Инициализация Flask приложения
flask_app = Flask(__name__)

# CORS middleware
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

# API endpoints
@flask_app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy', 
        'timestamp': datetime.now().isoformat(),
        'service': 'Sparkcoin API'
    })

@flask_app.route('/api/player/<user_id>', methods=['GET', 'POST', 'OPTIONS'])
def player_api(user_id):
    if request.method == 'OPTIONS':
        return jsonify({'status': 'ok'})
    
    if user_id == 'undefined' or not user_id:
        return jsonify({'success': False, 'error': 'Invalid user ID'}), 400

    try:
        if request.method == 'GET':
            logger.info(f"GET request for user: {user_id}")
            player_data = get_player_data(user_id)
            
            if player_data:
                return jsonify({'success': True, 'player': player_data})
            else:
                # Создаем нового игрока
                new_player = {
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
                
                # Базовые улучшения
                for i in range(1, 9):
                    new_player['upgrades'][f"gpu{i}"] = {"level": 0}
                    new_player['upgrades'][f"cpu{i}"] = {"level": 0}
                    new_player['upgrades'][f"mouse{i}"] = {"level": 0}

                update_player(new_player)
                created_player = get_player_data(user_id)
                
                if created_player:
                    return jsonify({
                        'success': True,
                        'player': created_player,
                        'message': 'New player created'
                    })
                else:
                    return jsonify({'success': False, 'error': 'Failed to create player'}), 500

        elif request.method == 'POST':
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': 'No data provided'}), 400

            logger.info(f"POST request for user: {user_id}")
            data['userId'] = user_id
            update_player(data)
            return jsonify({'success': True, 'message': 'Player data updated'})

    except Exception as e:
        logger.error(f"API Error in player_api: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@flask_app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard_api():
    try:
        limit = request.args.get('limit', 10, type=int)
        leaderboard_type = request.args.get('type', 'balance')
        current_user = request.args.get('current_user')

        leaderboard_data = get_leaderboard(limit, leaderboard_type)
        
        formatted_leaderboard = []
        for i, player in enumerate(leaderboard_data, 1):
            if not player:
                continue
                
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

        return jsonify({
            'success': True,
            'leaderboard': formatted_leaderboard,
            'type': leaderboard_type
        })

    except Exception as e:
        logger.error(f"Leaderboard API error: {str(e)}")
        return jsonify({'success': False, 'error': str(e), 'leaderboard': []}), 500

@flask_app.route('/api/all_players', methods=['GET'])
def get_all_players_api():
    try:
        players = get_all_players()
        players_data = [{
            'userId': user_id,
            'username': username,
            'balance': float(balance)
        } for user_id, username, balance in players]

        return jsonify({'success': True, 'players': players_data})

    except Exception as e:
        logger.error(f"All players API error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@flask_app.route('/api/transfer', methods=['POST'])
def transfer_api():
    try:
        data = request.get_json()
        from_user_id = data.get('fromUserId')
        to_user_id = data.get('toUserId')
        amount = float(data.get('amount', 0))

        success, message = transfer_coins(from_user_id, to_user_id, amount)
        return jsonify({'success': success, 'message': message})

    except Exception as e:
        logger.error(f"Transfer API error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@flask_app.route('/')
def index():
    return jsonify({
        'message': 'Sparkcoin API Server', 
        'status': 'running',
        'endpoints': ['/api/health', '/api/player/<user_id>', '/api/leaderboard', '/api/all_players', '/api/transfer']
    })

# Функции работы с базой данных
def init_db():
    try:
        conn = sqlite3.connect('sparkcoin.db', check_same_thread=False)
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
        logger.info("Database initialized")

    except Exception as e:
        logger.error(f"Database init error: {e}")

def calculate_click_speed(upgrades):
    try:
        speed = 0.000000001
        if not upgrades:
            return speed
            
        bonuses = {
            1: 0.000000004, 2: 0.000000008, 3: 0.000000064,
            4: 0.000000512, 5: 0.000004096, 6: 0.000032768,
            7: 0.000262144, 8: 0.002097152
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
            1: 0.000000001, 2: 0.000000008, 3: 0.000000064,
            4: 0.000000512, 5: 0.000004096, 6: 0.000032768,
            7: 0.000262144, 8: 0.002097152
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

def update_player(data):
    try:
        user_id = data.get('userId')
        if not user_id:
            return

        conn = sqlite3.connect('sparkcoin.db', check_same_thread=False)
        cursor = conn.cursor()

        click_speed = calculate_click_speed(data.get('upgrades', {}))
        mine_speed = calculate_mine_speed(data.get('upgrades', {}))

        cursor.execute('SELECT * FROM players WHERE user_id = ?', (user_id,))
        existing_player = cursor.fetchone()

        upgrades_json = json.dumps(data.get('upgrades', {}))

        # Используем camelCase ключи
        username = data.get('username', 'Player')
        balance = data.get('balance', 0.000000100)
        total_earned = data.get('totalEarned', 0.000000100)
        total_clicks = data.get('totalClicks', 0)
        lottery_wins = data.get('lotteryWins', 0)
        total_bet = data.get('totalBet', 0)
        
        transfers_data = data.get('transfers', {})
        transfers_sent = transfers_data.get('sent', 0)
        transfers_received = transfers_data.get('received', 0)

        if existing_player:
            cursor.execute('''
                UPDATE players SET 
                username=?, balance=?, total_earned=?, total_clicks=?, 
                upgrades=?, lottery_wins=?, total_bet=?,
                transfers_sent=?, transfers_received=?, 
                click_speed=?, mine_speed=?, last_update=?
                WHERE user_id=?
            ''', (
                username, balance, total_earned, total_clicks,
                upgrades_json, lottery_wins, total_bet,
                transfers_sent, transfers_received,
                click_speed, mine_speed, datetime.now(), user_id
            ))
            logger.info(f"Player updated: {username}")
        else:
            cursor.execute('''
                INSERT INTO players 
                (user_id, username, balance, total_earned, total_clicks, upgrades, 
                 lottery_wins, total_bet, transfers_sent, transfers_received,
                 click_speed, mine_speed, last_update)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_id, username, balance, total_earned, total_clicks,
                upgrades_json, lottery_wins, total_bet,
                transfers_sent, transfers_received,
                click_speed, mine_speed, datetime.now()
            ))
            logger.info(f"New player created: {username}")

        conn.commit()
        conn.close()

    except Exception as e:
        logger.error(f"Update player error: {e}")

def get_player_data(user_id):
    try:
        conn = sqlite3.connect('sparkcoin.db', check_same_thread=False)
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
        logger.error(f"Get player data error: {e}")
        return None

def get_leaderboard(limit=10, leaderboard_type='balance'):
    try:
        conn = sqlite3.connect('sparkcoin.db', check_same_thread=False)
        cursor = conn.cursor()

        if leaderboard_type == 'balance':
            query = 'SELECT user_id, username, balance, total_earned, total_clicks, click_speed, mine_speed FROM players ORDER BY balance DESC LIMIT ?'
        elif leaderboard_type == 'speed':
            query = 'SELECT user_id, username, balance, total_earned, total_clicks, click_speed, mine_speed FROM players ORDER BY (click_speed + mine_speed) DESC LIMIT ?'
        else:
            query = 'SELECT user_id, username, balance, total_earned, total_clicks, click_speed, mine_speed FROM players ORDER BY total_earned DESC LIMIT ?'

        cursor.execute(query, (limit,))
        leaderboard = cursor.fetchall()
        conn.close()
        return leaderboard

    except Exception as e:
        logger.error(f"Get leaderboard error: {e}")
        return []

def get_all_players():
    try:
        conn = sqlite3.connect('sparkcoin.db', check_same_thread=False)
        cursor = conn.cursor()
        cursor.execute('SELECT user_id, username, balance FROM players ORDER BY username')
        players = cursor.fetchall()
        conn.close()
        return players
    except Exception as e:
        logger.error(f"Get all players error: {e}")
        return []

def transfer_coins(from_user_id, to_user_id, amount):
    try:
        if amount <= 0:
            return False, "Invalid amount"

        conn = sqlite3.connect('sparkcoin.db', check_same_thread=False)
        cursor = conn.cursor()

        # Проверка баланса отправителя
        cursor.execute('SELECT balance FROM players WHERE user_id = ?', (from_user_id,))
        sender = cursor.fetchone()
        if not sender or sender[0] < amount:
            conn.close()
            return False, "Insufficient funds"

        # Проверка получателя
        cursor.execute('SELECT user_id FROM players WHERE user_id = ?', (to_user_id,))
        receiver = cursor.fetchone()
        if not receiver:
            conn.close()
            return False, "Recipient not found"

        # Выполнение перевода
        cursor.execute('UPDATE players SET balance = balance - ? WHERE user_id = ?', (amount, from_user_id))
        cursor.execute('UPDATE players SET balance = balance + ? WHERE user_id = ?', (amount, to_user_id))
        cursor.execute('UPDATE players SET transfers_sent = transfers_sent + ? WHERE user_id = ?', (amount, from_user_id))
        cursor.execute('UPDATE players SET transfers_received = transfers_received + ? WHERE user_id = ?', (amount, to_user_id))

        conn.commit()
        conn.close()
        return True, "Transfer successful"

    except Exception as e:
        logger.error(f"Transfer error: {e}")
        return False, f"Transfer error: {str(e)}"

# Обработчики бота
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🎮 Welcome to Sparkcoin!\n\n"
        "Available commands:\n"
        "/game - Start game\n"
        "/stats - Your statistics\n"
        "/leaderboard - Player ratings\n"
        "/shop - Upgrade store"
    )

async def stats_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("📊 Statistics available in web version. Use /game to start!")

async def leaderboard_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("🏆 Leaderboard available in web version. Use /game to start!")

async def transfer_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("💸 Transfers available in web version. Use /game to start!")

async def shop_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("🛠️ Upgrade store available in web version. Use /game to start!")

async def lottery_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("🎮 Team lottery available in web version. Use /game to start!")

async def handle_web_app_data(update: Update, context: ContextTypes.DEFAULT_TYPE):
    pass

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    pass

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.error(f"Bot error: {context.error}")

# Запуск Flask
def run_flask_app():
    try:
        logger.info(f"Starting Flask API on port {API_PORT}")
        flask_app.run(host='0.0.0.0', port=API_PORT, debug=False, use_reloader=False, threaded=True)
    except Exception as e:
        logger.error(f"Flask startup error: {e}")

# Основная функция
def main():
    if not TOKEN:
        logger.error("BOT_TOKEN not found in .env")
        return

    # Инициализация БД
    init_db()

    # Запуск Flask в отдельном потоке
    flask_thread = threading.Thread(target=run_flask_app, daemon=True)
    flask_thread.start()
    logger.info(f"Flask API started on port {API_PORT}")

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

    logger.info("Sparkcoin bot started with API!")
    application.run_polling()

if __name__ == "__main__":
    main()
