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


@flask_app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard_api():
    """API endpoint для получения рейтинга"""
    try:
        limit = request.args.get('limit', 10, type=int)
        leaderboard_type = request.args.get('type', 'balance')

        leaderboard_data = GameManager.get_leaderboard(limit, leaderboard_type)

        formatted_leaderboard = []
        for i, (username, balance, total_earned, total_clicks, click_speed, mine_speed) in enumerate(leaderboard_data,
                                                                                                     1):
            formatted_leaderboard.append({
                'rank': i,
                'username': username,
                'balance': float(balance),
                'totalEarned': float(total_earned),
                'totalClicks': total_clicks,
                'click_speed': float(click_speed),
                'mine_speed': float(mine_speed),
                'totalSpeed': float(click_speed) + float(mine_speed),
                'isCurrent': False
            })

        return jsonify({
            'success': True,
            'leaderboard': formatted_leaderboard,
            'type': leaderboard_type,
            'totalPlayers': len(formatted_leaderboard)
        })

    except Exception as e:
        logger.error(f"API Error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@flask_app.route('/api/player/<user_id>', methods=['GET', 'POST'])
def player_api(user_id):
    """API endpoint для получения и обновления данных игрока"""
    try:
        if request.method == 'GET':
            player_data = GameManager.get_player_data(user_id)
            if player_data:
                return jsonify({
                    'success': True,
                    'player': player_data
                })
            else:
                return jsonify({'success': False, 'error': 'Player not found'}), 404

        elif request.method == 'POST':
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': 'No data provided'}), 400

            GameManager.update_player(data)
            return jsonify({'success': True, 'message': 'Player data updated'})

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


@flask_app.route('/api/health', methods=['GET'])
def health_check():
    """Проверка здоровья API"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})


@flask_app.route('/')
def index():
    """Главная страница"""
    return jsonify({'message': 'Sparkcoin API Server', 'status': 'running'})


def init_db():
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
                    'click_speed': float(player[11]),
                    'mine_speed': float(player[12])
                }
            return None
        except Exception as e:
            logger.error(f"Error getting player data: {e}")
            return None

    @staticmethod
    def update_player(data):
        """Обновление данных игрока"""
        conn = sqlite3.connect('sparkcoin.db')
        cursor = conn.cursor()

        try:
            # Рассчитываем скорости на основе улучшений
            click_speed = GameManager.calculate_click_speed(data.get('upgrades', {}))
            mine_speed = GameManager.calculate_mine_speed(data.get('upgrades', {}))

            cursor.execute('SELECT * FROM players WHERE user_id = ?', (data['userId'],))
            existing_player = cursor.fetchone()

            upgrades_json = json.dumps(data.get('upgrades', {}))

            if existing_player:
                cursor.execute('''
                    UPDATE players SET 
                    username = ?, balance = ?, total_earned = ?, total_clicks = ?, 
                    upgrades = ?, lottery_wins = ?, total_bet = ?,
                    transfers_sent = ?, transfers_received = ?, 
                    click_speed = ?, mine_speed = ?, last_update = ?
                    WHERE user_id = ?
                ''', (
                    data.get('username', 'Player'),
                    data.get('balance', 0.000000100),
                    data.get('totalEarned', 0.000000100),
                    data.get('totalClicks', 0),
                    upgrades_json,
                    data.get('lotteryWins', 0),
                    data.get('totalBet', 0),
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
                    data['userId'],
                    data.get('username', 'Player'),
                    data.get('balance', 0.000000100),
                    data.get('totalEarned', 0.000000100),
                    data.get('totalClicks', 0),
                    upgrades_json,
                    data.get('lotteryWins', 0),
                    data.get('totalBet', 0),
                    data.get('transfers', {}).get('sent', 0),
                    data.get('transfers', {}).get('received', 0),
                    click_speed, mine_speed, datetime.now()
                ))

            conn.commit()
            logger.info(f"Данные игрока {data.get('username', 'Unknown')} обновлены")

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

        mouse_bonus = 0
        mouse_bonuses = [0.000000004, 0.000000008, 0.000000064, 0.000000512,
                         0.000004096, 0.000032768, 0.000262144, 0.002097152]

        for i in range(1, 9):
            mouse_key = f'mouse{i}'
            if mouse_key in upgrades:
                # Обрабатываем разные форматы хранения улучшений
                upgrade_data = upgrades[mouse_key]
                if isinstance(upgrade_data, dict):
                    level = upgrade_data.get('level', 0)
                else:
                    level = upgrade_data  # если хранится просто число

                if i <= len(mouse_bonuses):
                    mouse_bonus += level * mouse_bonuses[i - 1]

        return base_speed + mouse_bonus

    @staticmethod
    def calculate_mine_speed(upgrades):
        """Рассчитывает скорость майнинга на основе улучшений"""
        base_speed = 0.000000000
        if not upgrades:
            return base_speed

        mining_bonus = 0

        # Видеокарты
        gpu_bonuses = [0.000000001, 0.000000008, 0.000000064, 0.000000512,
                       0.000004096, 0.000032768, 0.000262144, 0.002097152]
        for i in range(1, 9):
            gpu_key = f'gpu{i}'
            if gpu_key in upgrades:
                upgrade_data = upgrades[gpu_key]
                if isinstance(upgrade_data, dict):
                    level = upgrade_data.get('level', 0)
                else:
                    level = upgrade_data

                if i <= len(gpu_bonuses):
                    mining_bonus += level * gpu_bonuses[i - 1]

        # Процессоры
        cpu_bonuses = [0.000000001, 0.000000008, 0.000000064, 0.000000512,
                       0.000004096, 0.000032768, 0.000262144, 0.002097152]
        for i in range(1, 9):
            cpu_key = f'cpu{i}'
            if cpu_key in upgrades:
                upgrade_data = upgrades[cpu_key]
                if isinstance(upgrade_data, dict):
                    level = upgrade_data.get('level', 0)
                else:
                    level = upgrade_data

                if i <= len(cpu_bonuses):
                    mining_bonus += level * cpu_bonuses[i - 1]

        return base_speed + mining_bonus

    @staticmethod
    def get_leaderboard(limit=10, leaderboard_type='balance'):
        """Получение рейтинга"""
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

    @staticmethod
    def get_all_players():
        """Получение всех игроков"""
        conn = sqlite3.connect('sparkcoin.db')
        cursor = conn.cursor()

        cursor.execute('SELECT user_id, username, balance FROM players ORDER BY username')
        players = cursor.fetchall()

        conn.close()
        return players

    @staticmethod
    def record_game_result(game_type, user_id, bet_amount, win_amount, result):
        """Запись результата игры"""
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
        """Запись перевода"""
        conn = sqlite3.connect('sparkcoin.db')
        cursor = conn.cursor()

        cursor.execute('''
            INSERT INTO transfers (from_user, from_username, to_user, to_username, amount)
            VALUES (?, ?, ?, ?, ?)
        ''', (from_user, from_username, to_user, to_username, amount))

        conn.commit()
        conn.close()

    @staticmethod
    def get_player_by_username(username):
        """Поиск игрока по username"""
        conn = sqlite3.connect('sparkcoin.db')
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM players WHERE username = ?', (username,))
        player = cursor.fetchone()

        conn.close()
        return player


# Обработчики команд Telegram бота
async def start(update, context):
    """Обработчик команды /start"""
    user = update.effective_user
    username = f"@{user.username}" if user.username else user.first_name or "Игрок"

    # Web App URL с вашим доменом
    web_app_url = f"https://sparkcoin.ru/index.html?user_id={user.id}&username={username}&api_url=https://sparkcoin.ru/api"

    keyboard = [
        [InlineKeyboardButton("🎮 Открыть Sparkcoin", web_app=WebAppInfo(url=web_app_url))],
        [InlineKeyboardButton("💰 Мой баланс", callback_data="balance"),
         InlineKeyboardButton("📊 Статистика", callback_data="stats")],
        [InlineKeyboardButton("🏆 Рейтинг", callback_data="leaderboard")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    # Создаем или обновляем игрока
    player_data = GameManager.get_player_data(str(user.id))
    if not player_data:
        initial_upgrades = {}
        for i in range(1, 9):
            initial_upgrades[f"gpu{i}"] = {"level": 0}
            initial_upgrades[f"cpu{i}"] = {"level": 0}
            initial_upgrades[f"mouse{i}"] = {"level": 0}

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


async def handle_web_app_data(update, context):
    """Обработка данных из Web App"""
    try:
        data = json.loads(update.message.web_app_data.data)
        logger.info(f"Received Web App data: {data}")

        # Сохраняем данные в базу
        if data.get('type') == 'player_update':
            GameManager.update_player(data)

        await update.message.reply_text("✅ Данные сохранены!")

    except Exception as e:
        logger.error(f"Error handling Web App data: {e}")
        await update.message.reply_text("❌ Ошибка сохранения данных")


async def button_handler(update, context):
    """Обработчик нажатий на кнопки"""
    query = update.callback_query
    await query.answer()

    user_id = str(query.from_user.id)

    if query.data == "balance":
        player_data = GameManager.get_player_data(user_id)
        if player_data:
            balance = player_data['balance']
            await query.message.reply_text(f"💰 Ваш баланс: {balance:.9f} S")
        else:
            await query.message.reply_text("❌ Данные не найдены")

    elif query.data == "stats":
        player_data = GameManager.get_player_data(user_id)
        if player_data:
            stats_text = (
                f"📊 Статистика {player_data['username']}:\n"
                f"💰 Баланс: {player_data['balance']:.9f} S\n"
                f"💵 Всего заработано: {player_data['totalEarned']:.9f} S\n"
                f"🖱️ Кликов: {player_data['totalClicks']}\n"
                f"🎰 Побед в лотерее: {player_data['lotteryWins']}\n"
                f"⚡ Скорость клика: {player_data['click_speed']:.9f} S/сек\n"
                f"⛏️ Скорость майнинга: {player_data['mine_speed']:.9f} S/сек"
            )
            await query.message.reply_text(stats_text)

    elif query.data == "leaderboard":
        leaderboard = GameManager.get_leaderboard(10, 'balance')
        leaderboard_text = "🏆 Топ-10 игроков:\n\n"

        for i, (username, balance, total_earned, total_clicks, click_speed, mine_speed) in enumerate(leaderboard, 1):
            leaderboard_text += f"{i}. {username}: {balance:.9f} S\n"

        await query.message.reply_text(leaderboard_text)


# Простые обработчики команд
async def stats_command(update, context):
    """Обработчик команды /stats"""
    user = update.effective_user
    player_data = GameManager.get_player_data(str(user.id))

    if player_data:
        stats_text = (
            f"📊 Статистика {player_data['username']}:\n"
            f"💰 Баланс: {player_data['balance']:.9f} S\n"
            f"💵 Всего заработано: {player_data['totalEarned']:.9f} S\n"
            f"🖱️ Кликов: {player_data['totalClicks']}\n"
            f"🎰 Побед в лотерее: {player_data['lotteryWins']}"
        )
        await update.message.reply_text(stats_text)
    else:
        await update.message.reply_text("❌ Данные не найдены. Используйте /start")


async def leaderboard_command(update, context):
    """Обработчик команды /leaderboard"""
    leaderboard = GameManager.get_leaderboard(10, 'balance')
    leaderboard_text = "🏆 Топ-10 игроков по балансу:\n\n"

    for i, (username, balance, total_earned, total_clicks, click_speed, mine_speed) in enumerate(leaderboard, 1):
        leaderboard_text += f"{i}. {username}: {balance:.9f} S\n"

    await update.message.reply_text(leaderboard_text)


async def transfer_command(update, context):
    """Обработчик команды /transfer"""
    await update.message.reply_text("💸 Переводы доступны в Web App игре!")


async def shop_command(update, context):
    """Обработчик команды /shop"""
    await update.message.reply_text("🛠️ Магазин улучшений доступен в Web App игре!")


async def lottery_command(update, context):
    """Обработчик команды /lottery"""
    await update.message.reply_text("🎮 Командная лотерея доступна в Web App игре!")


def run_flask_app():
    """Запускает Flask API"""
    # Для хостинга HandyHost используем стандартный порт 5000
    flask_app.run(host='0.0.0.0', port=API_PORT, debug=False, use_reloader=False)


def main():
    if not TOKEN:
        logger.error("Укажите BOT_TOKEN в .env файле")
        return

    # Инициализируем базу данных
    init_db()

    # Запускаем Flask API в отдельном потоке
    flask_thread = threading.Thread(target=run_flask_app, daemon=True)
    flask_thread.start()
    logger.info(f"Flask API запущен на порту {API_PORT}")

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

    # Обработчики сообщений
    application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_web_app_data))

    # Обработчики кнопок
    application.add_handler(CallbackQueryHandler(button_handler))

    # Обработчик ошибок
    application.add_error_handler(error_handler)

    logger.info("Бот Sparkcoin запущен с API!")
    application.run_polling()


async def error_handler(update, context):
    """Обработчик ошибок"""
    logger.error(f"Ошибка: {context.error}", exc_info=context.error)


if __name__ == "__main__":
    main()
