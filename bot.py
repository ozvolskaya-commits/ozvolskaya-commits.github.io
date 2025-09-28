import json
import logging
import os
import sqlite3
import threading
from datetime import datetime

from dotenv import load_dotenv
from flask import jsonify, request, Flask
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, MessageHandler, filters, CallbackQueryHandler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()
TOKEN = os.getenv('BOT_TOKEN')
API_PORT = int(os.getenv('API_PORT', 5000))

# Flask app для API
flask_app = Flask(__name__)


@flask_app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard_api():
    """API endpoint для получения рейтинга"""
    try:
        limit = request.args.get('limit', 10, type=int)
        leaderboard_type = request.args.get('type', 'balance')  # balance, speed, rich

        conn = sqlite3.connect('sparkcoin.db')
        cursor = conn.cursor()

        if leaderboard_type == 'balance':
            cursor.execute('''
                SELECT username, balance, total_earned, total_clicks 
                FROM players 
                ORDER BY balance DESC 
                LIMIT ?
            ''', (limit,))
        elif leaderboard_type == 'speed':
            # Здесь нужно добавить расчет скорости на основе улучшений
            cursor.execute('''
                SELECT username, balance, total_earned, total_clicks 
                FROM players 
                ORDER BY total_earned DESC 
                LIMIT ?
            ''', (limit,))
        else:  # rich (самые богатые)
            cursor.execute('''
                SELECT username, balance, total_earned, total_clicks 
                FROM players 
                ORDER BY total_earned DESC 
                LIMIT ?
            ''', (limit,))

        leaderboard_data = []
        for i, (username, balance, total_earned, total_clicks) in enumerate(cursor.fetchall(), 1):
            leaderboard_data.append({
                'rank': i,
                'username': username,
                'balance': float(balance),
                'totalEarned': float(total_earned),
                'totalClicks': total_clicks,
                'isCurrent': False  # Определяется на фронтенде
            })

        conn.close()

        return jsonify({
            'success': True,
            'leaderboard': leaderboard_data,
            'type': leaderboard_type,
            'totalPlayers': len(leaderboard_data)
        })

    except Exception as e:
        logger.error(f"API Error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@flask_app.route('/api/player/<user_id>', methods=['GET'])
def get_player_data_api(user_id):
    """API endpoint для получения данных игрока"""
    try:
        player_data = GameManager.get_player_data(user_id)
        if player_data:
            return jsonify({
                'success': True,
                'player': player_data
            })
        else:
            return jsonify({'success': False, 'error': 'Player not found'}), 404

    except Exception as e:
        logger.error(f"API Error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


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


def init_db():
    conn = sqlite3.connect('sparkcoin.db')
    cursor = conn.cursor()

    cursor.execute('DROP TABLE IF EXISTS players')
    cursor.execute('''
        CREATE TABLE players (
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

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS games (
            game_id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_type TEXT,
            user_id TEXT,
            bet_amount REAL,
            win_amount REAL,
            result TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transfers (
            transfer_id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user TEXT,
            from_username TEXT,
            to_user TEXT,
            to_username TEXT,
            amount REAL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS lottery (
            lottery_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            username TEXT,
            team TEXT,
            bet_amount REAL,
            round_id INTEGER,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()
    logger.info("База данных инициализирована")


class GameManager:
    @staticmethod
    def get_player_data(user_id):
        conn = sqlite3.connect('sparkcoin.db')
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM players WHERE user_id = ?', (user_id,))
        player = cursor.fetchone()

        conn.close()

        if player:
            return {
                'user_id': player[0],
                'username': player[1],
                'balance': player[2],
                'total_earned': player[3],
                'total_clicks': player[4],
                'upgrades': json.loads(player[5]) if player[5] else {},
                'last_update': player[6],
                'lottery_wins': player[7],
                'total_bet': player[8],
                'transfers_sent': player[9],
                'transfers_received': player[10],
                'click_speed': player[11],
                'mine_speed': player[12]
            }
        return None

    @staticmethod
    def update_player(data):
        conn = sqlite3.connect('sparkcoin.db')
        cursor = conn.cursor()

        try:
            # Рассчитываем скорости на основе улучшений
            click_speed = GameManager.calculate_click_speed(data.get('upgrades', {}))
            mine_speed = GameManager.calculate_mine_speed(data.get('upgrades', {}))

            cursor.execute('SELECT * FROM players WHERE user_id = ?', (data['userId'],))
            existing_player = cursor.fetchone()

            if existing_player:
                cursor.execute('''
                    UPDATE players SET 
                    username = ?, balance = ?, total_earned = ?, total_clicks = ?, 
                    upgrades = ?, lottery_wins = ?, total_bet = ?,
                    transfers_sent = ?, transfers_received = ?, 
                    click_speed = ?, mine_speed = ?, last_update = ?
                    WHERE user_id = ?
                ''', (
                    data['username'], data['balance'], data['totalEarned'],
                    data['totalClicks'], json.dumps(data.get('upgrades', {})),
                    data.get('lotteryWins', 0), data.get('totalBet', 0),
                    data.get('transfers', {}).get('sent', 0),
                    data.get('transfers', {}).get('received', 0),
                    click_speed, mine_speed, datetime.now(), data['userId']
                ))
            else:
                cursor.execute('''
                    INSERT INTO players 
                    (user_id, username, balance, total_earned, total_clicks, upgrades, 
                     lottery_wins, total_bet, transfers_sent, transfers_received,
                     click_speed, mine_speed, last_update)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    data['userId'], data['username'], data['balance'],
                    data['totalEarned'], data['totalClicks'], json.dumps(data.get('upgrades', {})),
                    data.get('lotteryWins', 0), data.get('totalBet', 0),
                    data.get('transfers', {}).get('sent', 0),
                    data.get('transfers', {}).get('received', 0),
                    click_speed, mine_speed, datetime.now()
                ))

            conn.commit()
            logger.info(f"Данные игрока {data['username']} обновлены")

        except Exception as e:
            logger.error(f"Ошибка обновления игрока: {e}")
            conn.rollback()
        finally:
            conn.close()

    @staticmethod
    def calculate_click_speed(upgrades):
        """Рассчитывает скорость клика на основе улучшений"""
        base_speed = 0.000000001
        if not upgrades:
            return base_speed

        # Расчет на основе мышек (как в HTML версии)
        mouse_bonus = 0
        for i in range(1, 9):
            mouse_key = f'mouse{i}'
            if mouse_key in upgrades:
                level = upgrades[mouse_key].get('level', 0)
                # Бонусы соответствуют HTML версии
                mouse_bonuses = [0.000000004, 0.000000008, 0.000000064, 0.000000512,
                                 0.000004096, 0.000032768, 0.000262144, 0.002097152]
                if i <= len(mouse_bonuses):
                    mouse_bonus += level * mouse_bonuses[i - 1]

        return base_speed + mouse_bonus

    @staticmethod
    def calculate_mine_speed(upgrades):
        """Рассчитывает скорость майнинга на основе улучшений"""
        base_speed = 0.000000000
        if not upgrades:
            return base_speed

        # Расчет на основе видеокарт и процессоров
        mining_bonus = 0

        # Видеокарты
        gpu_bonuses = [0.000000001, 0.000000008, 0.000000064, 0.000000512,
                       0.000004096, 0.000032768, 0.000262144, 0.002097152]
        for i in range(1, 9):
            gpu_key = f'gpu{i}'
            if gpu_key in upgrades:
                level = upgrades[gpu_key].get('level', 0)
                if i <= len(gpu_bonuses):
                    mining_bonus += level * gpu_bonuses[i - 1]

        # Процессоры
        cpu_bonuses = [0.000000001, 0.000000008, 0.000000064, 0.000000512,
                       0.000004096, 0.000032768, 0.000262144, 0.002097152]
        for i in range(1, 9):
            cpu_key = f'cpu{i}'
            if cpu_key in upgrades:
                level = upgrades[cpu_key].get('level', 0)
                if i <= len(cpu_bonuses):
                    mining_bonus += level * cpu_bonuses[i - 1]

        return base_speed + mining_bonus

    @staticmethod
    def get_leaderboard(limit=10, leaderboard_type='balance'):
        conn = sqlite3.connect('sparkcoin.db')
        cursor = conn.cursor()

        if leaderboard_type == 'balance':
            cursor.execute('''
                SELECT username, balance, total_earned, total_clicks, click_speed, mine_speed
                FROM players 
                ORDER BY balance DESC 
                LIMIT ?
            ''', (limit,))
        elif leaderboard_type == 'speed':
            cursor.execute('''
                SELECT username, balance, total_earned, total_clicks, click_speed, mine_speed
                FROM players 
                ORDER BY (click_speed + mine_speed) DESC 
                LIMIT ?
            ''', (limit,))
        else:  # rich
            cursor.execute('''
                SELECT username, balance, total_earned, total_clicks, click_speed, mine_speed
                FROM players 
                ORDER BY total_earned DESC 
                LIMIT ?
            ''', (limit,))

        leaderboard = cursor.fetchall()
        conn.close()
        return leaderboard

    # ... остальные методы остаются такими же ...
    @staticmethod
    def record_game_result(game_type, user_id, bet_amount, win_amount, result):
        conn = sqlite3.connect('sparkcoin.db')
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO games (game_type, user_id, bet_amount, win_amount, result)
            VALUES (?, ?, ?, ?, ?)
        ''', (game_type, user_id, bet_amount, win_amount, result))

        conn.commit()
        conn.close()

    @staticmethod
    def record_transfer(from_user, from_username, to_user, to_username, amount):
        conn = sqlite3.connect('sparkcoin.db')
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO transfers (from_user, from_username, to_user, to_username, amount)
            VALUES (?, ?, ?, ?, ?)
        ''', (from_user, from_username, to_user, to_username, amount))

        conn.commit()
        conn.close()

    @staticmethod
    def get_all_players():
        conn = sqlite3.connect('sparkcoin.db')
        cursor = conn.cursor()

        cursor.execute('SELECT user_id, username, balance FROM players ORDER BY balance DESC')
        players = cursor.fetchall()

        conn.close()
        return players

    @staticmethod
    def get_player_by_username(username):
        conn = sqlite3.connect('sparkcoin.db')
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM players WHERE username = ?', (username,))
        player = cursor.fetchone()

        conn.close()
        return player


def run_flask_app():
    """Запускает Flask API в отдельном потоке"""
    flask_app.run(host='0.0.0.0', port=API_PORT, debug=False)


async def start(update, context):
    user = update.effective_user
    username = f"@{user.username}" if user.username else user.first_name or "Игрок"

    # Web App URL - теперь с параметром API
    web_app_url = f"https://sparkcoin.ru/?user_id={user.id}&username={username}&api_url=http://localhost:{API_PORT}"

    keyboard = [
        [InlineKeyboardButton("🎮 Открыть Sparkcoin", web_app=WebAppInfo(url=web_app_url))],
        [InlineKeyboardButton("💰 Мой баланс", callback_data="balance"),
         InlineKeyboardButton("📊 Статистика", callback_data="stats")],
        [InlineKeyboardButton("🏆 Рейтинг", callback_data="leaderboard")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    player_data = GameManager.get_player_data(str(user.id))
    if not player_data:
        initial_upgrades = {
            "gpu1": {"level": 0}, "gpu2": {"level": 0}, "gpu3": {"level": 0},
            "gpu4": {"level": 0}, "gpu5": {"level": 0}, "gpu6": {"level": 0},
            "gpu7": {"level": 0}, "gpu8": {"level": 0},
            "cpu1": {"level": 0}, "cpu2": {"level": 0}, "cpu3": {"level": 0},
            "cpu4": {"level": 0}, "cpu5": {"level": 0}, "cpu6": {"level": 0},
            "cpu7": {"level": 0}, "cpu8": {"level": 0},
            "mouse1": {"level": 0}, "mouse2": {"level": 0}, "mouse3": {"level": 0},
            "mouse4": {"level": 0}, "mouse5": {"level": 0}, "mouse6": {"level": 0},
            "mouse7": {"level": 0}, "mouse8": {"level": 0}
        }

        new_player_data = {
            'userId': str(user.id),
            'username': username,
            'balance': 0.000000100,
            'totalEarned': 0.000000100,
            'totalClicks': 0,
            'upgrades': initial_upgrades,
            'lotteryWins': 0,
            'totalBet': 0,
            'transfers': {'sent': 0, 'received': 0}
        }
        GameManager.update_player(new_player_data)
        logger.info(f"Создан новый игрок: {username}")

    welcome_text = (
        f"🚀 Добро пожаловать в Sparkcoin, {username}!\n\n"
        "💎 Теперь с общим рейтингом!\n"
        "• 🏆 Рейтинг обновляется в реальном времени\n"
        "• 🔄 Данные синхронизируются между всеми игроками\n"
        "• 📊 Статистика из базы данных\n\n"
        "🎮 Откройте приложение и соревнуйтесь!"
    )

    await update.message.reply_text(welcome_text, reply_markup=reply_markup)


# ... остальные функции (handle_web_app_data, button_handler и т.д.) остаются такими же ...

def main(leaderboard_command=None, stats_command=None, shop_command=None, transfer_command=None, lottery_command=None,
         button_handler=None, handle_web_app_data=None):
    if not TOKEN:
        logger.error("Укажите BOT_TOKEN в .env файле")
        return

    # Добавляем в .env порт для API
    if not os.getenv('API_PORT'):
        logger.info("Использую порт по умолчанию: 5000")

    # Инициализируем базу данных
    init_db()

    # Запускаем Flask API в отдельном потоке
    flask_thread = threading.Thread(target=run_flask_app, daemon=True)
    flask_thread.start()
    logger.info(f"Flask API запущен на порту {API_PORT}")

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

    # Обработчики сообщений
    application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_web_app_data))

    # Обработчики кнопок
    application.add_handler(CallbackQueryHandler(button_handler))

    # Добавляем обработчик ошибок
    application.add_error_handler(lambda update, context: logger.error(f"Ошибка: {context.error}"))

    logger.info("Бот Sparkcoin запущен с API!")
    application.run_polling()


if __name__ == "__main__":
    main()
