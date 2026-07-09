import os
import secrets
import shutil
import signal
import socket
import sqlite3
import subprocess  # nosec B404
import threading
import time
from datetime import datetime, timezone

from flask import Flask, g, jsonify, render_template, request, send_from_directory
from flask_wtf.csrf import CSRFProtect

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.getenv("SECRET_KEY") or secrets.token_urlsafe(32),
    SEND_FILE_MAX_AGE_DEFAULT=0,
    MAX_CONTENT_LENGTH=1024 * 1024,
)

csrf = CSRFProtect(app)
ROOT_DIR = os.path.dirname(__file__)
PID_FILE = os.path.join(ROOT_DIR, ".gaming-server.pid")
PORT_FILE = os.path.join(ROOT_DIR, ".gaming-server.port")
DATABASE_FILE = os.path.join(ROOT_DIR, "alankon_gaming.db")
PLAYER_COOKIE = "alankon_gaming_player"
CACHELESS_ROUTES = {"/aprender-teclas"}
LOCAL_HOSTS = {"127.0.0.1", "localhost", "::1"}

GAMES = [
    {
        "slug": "git-grid-2048",
        "title": "Git Grid 2048",
        "tagline": "Puzzle",
        "category": "Git Games",
        "description": "Seu 2048 autoral com identidade Git, animacoes, merges e conquistas.",
        "route": "/2048",
        "status": "live",
        "accent": "#22c55e",
    },
    {
        "slug": "learn-keys",
        "title": "Aprender Teclas",
        "tagline": "Educativo",
        "category": "Infantil",
        "description": "Letras, numeros, imagens animadas e sons fofinhos em uma experiencia touch-first.",
        "route": "/aprender-teclas",
        "status": "live",
        "accent": "#f59e0b",
    },
    {
        "slug": "snake-lab",
        "title": "Snake Lab",
        "tagline": "Arcade",
        "category": "Arcade",
        "description": "Prototipo planejado para sessoes curtas, ranking rapido e desafios diarios.",
        "route": "",
        "status": "planned",
        "accent": "#38bdf8",
    },
    {
        "slug": "memory-garden",
        "title": "Memory Garden",
        "tagline": "Infantil",
        "category": "Infantil",
        "description": "Jogo de memoria com cartas, bichinhos e trilha leve para criancas.",
        "route": "",
        "status": "planned",
        "accent": "#ec4899",
    },
    {
        "slug": "daily-quiz",
        "title": "Daily Quiz",
        "tagline": "AI Games",
        "category": "AI Games",
        "description": "Quiz diario gerado com IA, com tema novo, perguntas novas e replay rapido.",
        "route": "",
        "status": "planned",
        "accent": "#8b5cf6",
    },
    {
        "slug": "commit-runner",
        "title": "Commit Runner",
        "tagline": "Estrategia",
        "category": "Estrategia",
        "description": "Loop curto de estrategia e risco para expandir a linha Git do portal.",
        "route": "",
        "status": "planned",
        "accent": "#14b8a6",
    },
    {
        "slug": "color-friends",
        "title": "Color Friends",
        "tagline": "Educativo",
        "category": "Educativo",
        "description": "Jogo infantil para ensinar cores com ajuda de IA, sprites e musica.",
        "route": "",
        "status": "planned",
        "accent": "#ef4444",
    },
]

CATEGORY_ROADMAP = [
    {
        "slug": "infantil",
        "title": "Infantil",
        "description": "Jogos leves, visuais e acolhedores para criancas e primeiros contatos.",
    },
    {
        "slug": "arcade",
        "title": "Arcade",
        "description": "Loop curto, reflexo rapido e partidas de poucos minutos.",
    },
    {
        "slug": "puzzle",
        "title": "Puzzle",
        "description": "Lógica, combinacao, memoria e desafios diarios.",
    },
    {
        "slug": "estrategia",
        "title": "Estrategia",
        "description": "Jogos para planejar, otimizar e voltar no dia seguinte.",
    },
    {
        "slug": "educativo",
        "title": "Educativo",
        "description": "Letras, numeros, cores, leitura e aprendizado jogando.",
    },
    {
        "slug": "git-games",
        "title": "Git Games",
        "description": "Linha autoral inspirada em Git, versionamento e cultura maker.",
    },
    {
        "slug": "ai-games",
        "title": "AI Games",
        "description": "Jogos com desafios, fases ou conteudo gerados automaticamente.",
    },
]

ACHIEVEMENT_SEEDS = [
    {
        "code": "primeira-visita",
        "title": "Primeira visita",
        "description": "Entrou no portal alankon Gaming pela primeira vez.",
        "icon": "portal",
        "game_slug": "",
        "points": 10,
    },
    {
        "code": "primeira-partida",
        "title": "Primeira partida",
        "description": "Jogou pela primeira vez em qualquer jogo do portal.",
        "icon": "play",
        "game_slug": "",
        "points": 15,
    },
    {
        "code": "dupla-alankon",
        "title": "Dupla alankon",
        "description": "Experimentou os dois jogos live da plataforma.",
        "icon": "duo",
        "game_slug": "",
        "points": 25,
    },
    {
        "code": "dez-partidas",
        "title": "Voltando sempre",
        "description": "Acumulou 10 partidas no portal.",
        "icon": "10x",
        "game_slug": "",
        "points": 30,
    },
    {
        "code": "cento-teclas",
        "title": "Teclado ninja",
        "description": "Alcancou 100 teclas em uma sessao de Aprender Teclas.",
        "icon": "keys",
        "game_slug": "learn-keys",
        "points": 40,
    },
    {
        "code": "git-128",
        "title": "Merge 128",
        "description": "Chegou a 128 pontos no Git Grid 2048.",
        "icon": "git",
        "game_slug": "git-grid-2048",
        "points": 35,
    },
]

UPDATE_LOG = [
    {
        "title": "Portal alankon Gaming",
        "date": "2026-07-09",
        "summary": "O repositorio comecou a virar plataforma, com secoes, perfil e ranking.",
    },
    {
        "title": "Cobertura total de sons",
        "date": "2026-07-05",
        "summary": "Aprender Teclas ficou com todos os sons usados apontando para arquivos publicos/baixados.",
    },
    {
        "title": "Sound map v16",
        "date": "2026-07-01",
        "summary": "Entraram novos sons para foca, jacare, robo, boing e balao, com uma unica voz ativa por tecla.",
    },
    {
        "title": "Acesso LAN no WSL",
        "date": "2026-06-29",
        "summary": "Scripts de start/stop, LAN URL e fluxo mais confiavel para servidor local no WSL e Windows.",
    },
]


def _now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _is_static_export():
    return app.config.get("STATIC_EXPORT", False)


def _public_player_id(player_id):
    if not player_id:
        return "Player-DEMO"
    return f"Player-{player_id[:6].upper()}"


def _format_when(raw_value):
    if not raw_value:
        return "-"
    return raw_value.replace("T", " ").replace("Z", " UTC")


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE_FILE)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_error):
    database = g.pop("db", None)
    if database is not None:
        database.close()


def init_db():
    database = sqlite3.connect(DATABASE_FILE)
    database.executescript(
        """
        CREATE TABLE IF NOT EXISTS players (
            id TEXT PRIMARY KEY,
            display_name TEXT,
            created_at TEXT NOT NULL,
            last_seen_at TEXT NOT NULL,
            favorite_game TEXT,
            total_game_plays INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS games (
            slug TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            tagline TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            route TEXT NOT NULL,
            status TEXT NOT NULL,
            accent TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS game_stats (
            player_id TEXT NOT NULL,
            game_slug TEXT NOT NULL,
            plays INTEGER NOT NULL DEFAULT 0,
            best_score INTEGER NOT NULL DEFAULT 0,
            last_score INTEGER NOT NULL DEFAULT 0,
            best_key_presses INTEGER NOT NULL DEFAULT 0,
            last_key_presses INTEGER NOT NULL DEFAULT 0,
            last_played_at TEXT,
            PRIMARY KEY (player_id, game_slug)
        );

        CREATE TABLE IF NOT EXISTS achievements (
            code TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            icon TEXT NOT NULL,
            game_slug TEXT NOT NULL DEFAULT '',
            points INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS player_achievements (
            player_id TEXT NOT NULL,
            achievement_code TEXT NOT NULL,
            unlocked_at TEXT NOT NULL,
            PRIMARY KEY (player_id, achievement_code)
        );

        CREATE TABLE IF NOT EXISTS activity_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id TEXT NOT NULL,
            game_slug TEXT NOT NULL DEFAULT '',
            event_type TEXT NOT NULL,
            value_int INTEGER NOT NULL DEFAULT 0,
            value_text TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        );
        """
    )
    database.executemany(
        """
        INSERT INTO games (slug, title, tagline, category, description, route, status, accent)
        VALUES (:slug, :title, :tagline, :category, :description, :route, :status, :accent)
        ON CONFLICT(slug) DO UPDATE SET
            title=excluded.title,
            tagline=excluded.tagline,
            category=excluded.category,
            description=excluded.description,
            route=excluded.route,
            status=excluded.status,
            accent=excluded.accent
        """,
        GAMES,
    )
    database.executemany(
        """
        INSERT INTO achievements (code, title, description, icon, game_slug, points)
        VALUES (:code, :title, :description, :icon, :game_slug, :points)
        ON CONFLICT(code) DO UPDATE SET
            title=excluded.title,
            description=excluded.description,
            icon=excluded.icon,
            game_slug=excluded.game_slug,
            points=excluded.points
        """,
        ACHIEVEMENT_SEEDS,
    )
    database.commit()
    database.close()


def _log_event(player_id, event_type, game_slug="", value_int=0, value_text=""):
    if _is_static_export():
        return
    database = get_db()
    database.execute(
        """
        INSERT INTO activity_log (player_id, game_slug, event_type, value_int, value_text, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (player_id, game_slug, event_type, value_int, value_text, _now_iso()),
    )


def _unlock_achievement(player_id, code):
    database = get_db()
    cursor = database.execute(
        """
        INSERT OR IGNORE INTO player_achievements (player_id, achievement_code, unlocked_at)
        VALUES (?, ?, ?)
        """,
        (player_id, code, _now_iso()),
    )
    return cursor.rowcount > 0


def _refresh_achievements(player_id):
    if _is_static_export():
        return
    database = get_db()
    totals = database.execute(
        """
        SELECT
            COALESCE(SUM(plays), 0) AS total_plays,
            COALESCE(MAX(CASE WHEN game_slug = 'learn-keys' THEN best_key_presses END), 0) AS best_key_presses,
            COALESCE(MAX(CASE WHEN game_slug = 'git-grid-2048' THEN best_score END), 0) AS best_score_2048,
            COUNT(CASE WHEN plays > 0 THEN 1 END) AS games_touched
        FROM game_stats
        WHERE player_id = ?
        """,
        (player_id,),
    ).fetchone()
    if totals["total_plays"] >= 1:
        _unlock_achievement(player_id, "primeira-partida")
    if totals["games_touched"] >= 2:
        _unlock_achievement(player_id, "dupla-alankon")
    if totals["total_plays"] >= 10:
        _unlock_achievement(player_id, "dez-partidas")
    if totals["best_key_presses"] >= 100:
        _unlock_achievement(player_id, "cento-teclas")
    if totals["best_score_2048"] >= 128:
        _unlock_achievement(player_id, "git-128")


def _touch_player(player_id):
    if _is_static_export():
        return
    database = get_db()
    now = _now_iso()
    existing = database.execute("SELECT id FROM players WHERE id = ?", (player_id,)).fetchone()
    if existing is None:
        database.execute(
            """
            INSERT INTO players (id, display_name, created_at, last_seen_at, favorite_game, total_game_plays)
            VALUES (?, ?, ?, ?, ?, 0)
            """,
            (player_id, _public_player_id(player_id), now, now, ""),
        )
        _unlock_achievement(player_id, "primeira-visita")
    else:
        database.execute("UPDATE players SET last_seen_at = ? WHERE id = ?", (now, player_id))


def _record_page_view():
    if _is_static_export():
        return
    path = request.path
    if path.startswith("/static/") or path.startswith("/api/"):
        return
    _log_event(g.player_id, "page_view", value_text=path)


def _library_groups():
    live_games = [game for game in GAMES if game["status"] == "live"]
    groups = []
    for category in CATEGORY_ROADMAP:
        games = [game for game in GAMES if game["category"].lower().replace(" ", "-") == category["slug"]]
        groups.append(
            {
                **category,
                "games": games,
                "live_count": sum(1 for game in games if game["status"] == "live"),
                "planned_count": sum(1 for game in games if game["status"] != "live"),
            }
        )
    return live_games, groups


def _platform_metrics():
    if _is_static_export():
        return {
            "player_count": 1,
            "total_plays": 12,
            "live_games": len([game for game in GAMES if game["status"] == "live"]),
            "achievement_unlocks": 6,
        }
    database = get_db()
    row = database.execute(
        """
        SELECT
            (SELECT COUNT(*) FROM players) AS player_count,
            (SELECT COALESCE(SUM(total_game_plays), 0) FROM players) AS total_plays,
            (SELECT COUNT(*) FROM games WHERE status = 'live') AS live_games,
            (SELECT COUNT(*) FROM player_achievements) AS achievement_unlocks
        """
    ).fetchone()
    return dict(row)


def _player_summary(player_id):
    if _is_static_export():
        return {
            "id": "static-export",
            "badge": "Player-DEMO",
            "created_at": "static export",
            "last_seen_at": "static export",
            "favorite_game": "",
            "favorite_game_title": "Nenhum ainda",
            "total_game_plays": 0,
            "achievement_count": 0,
            "games_played_count": 0,
            "best_score_2048": 0,
            "best_key_presses": 0,
            "game_rows": [],
        }
    database = get_db()
    player = database.execute("SELECT * FROM players WHERE id = ?", (player_id,)).fetchone()
    game_rows = database.execute(
        """
        SELECT
            g.slug,
            g.title,
            g.category,
            g.route,
            COALESCE(gs.plays, 0) AS plays,
            COALESCE(gs.best_score, 0) AS best_score,
            COALESCE(gs.best_key_presses, 0) AS best_key_presses,
            COALESCE(gs.last_played_at, '') AS last_played_at
        FROM games g
        LEFT JOIN game_stats gs
          ON gs.game_slug = g.slug
         AND gs.player_id = ?
        ORDER BY g.status DESC, g.title ASC
        """,
        (player_id,),
    ).fetchall()
    achievement_count = database.execute(
        "SELECT COUNT(*) AS count FROM player_achievements WHERE player_id = ?",
        (player_id,),
    ).fetchone()["count"]
    best_score_2048 = 0
    best_key_presses = 0
    games_played_count = 0
    for row in game_rows:
        if row["plays"] > 0:
            games_played_count += 1
        if row["slug"] == "git-grid-2048":
            best_score_2048 = row["best_score"]
        if row["slug"] == "learn-keys":
            best_key_presses = row["best_key_presses"]
    favorite_title = "Nenhum ainda"
    if player["favorite_game"]:
        for game in GAMES:
            if game["slug"] == player["favorite_game"]:
                favorite_title = game["title"]
                break
    return {
        "id": player["id"],
        "badge": _public_player_id(player["id"]),
        "created_at": _format_when(player["created_at"]),
        "last_seen_at": _format_when(player["last_seen_at"]),
        "favorite_game": player["favorite_game"],
        "favorite_game_title": favorite_title,
        "total_game_plays": player["total_game_plays"],
        "achievement_count": achievement_count,
        "games_played_count": games_played_count,
        "best_score_2048": best_score_2048,
        "best_key_presses": best_key_presses,
        "game_rows": [dict(row) for row in game_rows],
    }


def _leaderboards():
    if _is_static_export():
        return {
            "git_grid": [],
            "learn_keys": [],
            "overall": [],
        }
    database = get_db()
    queries = {
        "git_grid": """
            SELECT p.display_name AS player_name, gs.best_score AS value
            FROM game_stats gs
            JOIN players p ON p.id = gs.player_id
            WHERE gs.game_slug = 'git-grid-2048' AND gs.best_score > 0
            ORDER BY gs.best_score DESC, gs.last_played_at DESC
            LIMIT 10
        """,
        "learn_keys": """
            SELECT p.display_name AS player_name, gs.best_key_presses AS value
            FROM game_stats gs
            JOIN players p ON p.id = gs.player_id
            WHERE gs.game_slug = 'learn-keys' AND gs.best_key_presses > 0
            ORDER BY gs.best_key_presses DESC, gs.last_played_at DESC
            LIMIT 10
        """,
        "overall": """
            SELECT p.display_name AS player_name, p.total_game_plays AS value
            FROM players p
            WHERE p.total_game_plays > 0
            ORDER BY p.total_game_plays DESC, p.last_seen_at DESC
            LIMIT 10
        """,
    }
    return {key: [dict(row) for row in database.execute(query).fetchall()] for key, query in queries.items()}


def _achievement_board(player_id):
    if _is_static_export():
        return [dict(seed, unlocked=False, unlocked_at="") for seed in ACHIEVEMENT_SEEDS]
    database = get_db()
    rows = database.execute(
        """
        SELECT
            a.code,
            a.title,
            a.description,
            a.icon,
            a.game_slug,
            a.points,
            COALESCE(pa.unlocked_at, '') AS unlocked_at
        FROM achievements a
        LEFT JOIN player_achievements pa
          ON pa.achievement_code = a.code
         AND pa.player_id = ?
        ORDER BY a.points ASC, a.title ASC
        """,
        (player_id,),
    ).fetchall()
    board = []
    for row in rows:
        entry = dict(row)
        entry["unlocked"] = bool(entry["unlocked_at"])
        board.append(entry)
    return board


def _platform_context(active_page):
    live_games, categories = _library_groups()
    return {
        "active_page": active_page,
        "nav_links": [
            {"label": "Home", "endpoint": "pagina_inicial"},
            {"label": "Jogos", "endpoint": "pagina_jogos"},
            {"label": "Categorias", "endpoint": "pagina_categorias"},
            {"label": "Perfil", "endpoint": "pagina_perfil"},
            {"label": "Ranking", "endpoint": "pagina_ranking"},
            {"label": "Conquistas", "endpoint": "pagina_conquistas"},
            {"label": "Sobre", "endpoint": "pagina_sobre"},
            {"label": "Atualizacoes", "endpoint": "pagina_atualizacoes"},
        ],
        "featured_games": live_games,
        "category_groups": categories,
        "player_summary": _player_summary(g.player_id),
        "platform_metrics": _platform_metrics(),
        "update_log": UPDATE_LOG,
    }


def _record_game_start(player_id, game_slug):
    if _is_static_export():
        return
    database = get_db()
    now = _now_iso()
    database.execute(
        """
        INSERT INTO game_stats (player_id, game_slug, plays, best_score, last_score, best_key_presses, last_key_presses, last_played_at)
        VALUES (?, ?, 1, 0, 0, 0, 0, ?)
        ON CONFLICT(player_id, game_slug) DO UPDATE SET
            plays = plays + 1,
            last_played_at = excluded.last_played_at
        """,
        (player_id, game_slug, now),
    )
    database.execute(
        "UPDATE players SET total_game_plays = total_game_plays + 1, last_seen_at = ? WHERE id = ?",
        (now, player_id),
    )
    _log_event(player_id, "play_start", game_slug=game_slug)
    _refresh_achievements(player_id)
    database.commit()


def _record_game_progress(player_id, game_slug, score=None, key_presses=None, state_value=""):
    if _is_static_export():
        return
    database = get_db()
    now = _now_iso()
    database.execute(
        """
        INSERT INTO game_stats (player_id, game_slug, plays, best_score, last_score, best_key_presses, last_key_presses, last_played_at)
        VALUES (?, ?, 0, ?, ?, ?, ?, ?)
        ON CONFLICT(player_id, game_slug) DO UPDATE SET
            best_score = MAX(best_score, excluded.best_score),
            last_score = MAX(last_score, excluded.last_score),
            best_key_presses = MAX(best_key_presses, excluded.best_key_presses),
            last_key_presses = MAX(last_key_presses, excluded.last_key_presses),
            last_played_at = excluded.last_played_at
        """,
        (
            player_id,
            game_slug,
            max(0, score or 0),
            max(0, score or 0),
            max(0, key_presses or 0),
            max(0, key_presses or 0),
            now,
        ),
    )
    _log_event(
        player_id,
        "progress",
        game_slug=game_slug,
        value_int=max(score or 0, key_presses or 0, 0),
        value_text=state_value,
    )
    _refresh_achievements(player_id)
    database.commit()


@app.before_request
def bootstrap_player():
    if _is_static_export():
        g.player_id = "static-export"
        g.set_player_cookie = False
        return
    incoming = request.cookies.get(PLAYER_COOKIE, "")
    incoming = incoming.strip()
    valid = incoming and incoming.isalnum() and 8 <= len(incoming) <= 32
    g.player_id = incoming if valid else secrets.token_hex(8)
    g.set_player_cookie = not valid
    _touch_player(g.player_id)
    _record_page_view()
    get_db().commit()


@app.after_request
def add_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    response.headers.setdefault(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    )
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self'; "
        "img-src 'self' data:; "
        "media-src 'self'; "
        "connect-src 'self'; "
        "manifest-src 'self'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none'; "
        "object-src 'none'",
    )
    if request.path.startswith("/static/") or request.path in CACHELESS_ROUTES:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    if getattr(g, "set_player_cookie", False) and not _is_static_export():
        response.set_cookie(
            PLAYER_COOKIE,
            g.player_id,
            max_age=60 * 60 * 24 * 365 * 2,
            httponly=True,
            samesite="Lax",
        )
    return response


def _is_local_request():
    return request.remote_addr in {"127.0.0.1", "::1", "::ffff:127.0.0.1"}


def _local_only_json():
    if _is_local_request():
        return None
    return jsonify(status="forbidden"), 403


def _shutdown_server():
    def _shutdown():
        try:
            os.kill(os.getpid(), signal.SIGTERM)
        except OSError:
            os._exit(0)

    threading.Timer(0.15, _shutdown).start()


def _process_is_running(pid):
    if not pid or pid == os.getpid():
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def _kill_process(pid):
    if not pid or pid == os.getpid():
        return
    try:
        if os.name == "nt":
            taskkill = shutil.which("taskkill") or "taskkill"
            subprocess.run(  # nosec B603
                [taskkill, "/PID", str(pid), "/T", "/F"],
                check=False,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        else:
            os.kill(pid, signal.SIGTERM)
            time.sleep(0.2)
            if _process_is_running(pid):
                os.kill(pid, signal.SIGKILL)
    except OSError:
        pass


def _read_tracked_pid():
    try:
        with open(PID_FILE, "r", encoding="ascii") as pid_file:
            raw = pid_file.read().strip()
    except OSError:
        return None
    return int(raw) if raw.isdigit() else None


def _stop_tracked_server():
    pid = _read_tracked_pid()
    if pid and _process_is_running(pid):
        _kill_process(pid)


def _is_port_available(port, host="127.0.0.1"):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))  # nosec B104
        except OSError:
            return False
    return True


def _find_free_port(start_port=5000, host="127.0.0.1"):
    for port in range(max(5000, start_port), 6000):
        if _is_port_available(port, host):
            return port
    raise RuntimeError("No free port found in range 5000-5999")


def _requested_port(default=5000):
    raw_port = os.getenv("PORT", str(default))
    try:
        port = int(raw_port)
    except ValueError:
        return default
    return port if 1 <= port <= 65535 else default


def _requested_host():
    host = os.getenv("HOST", "0.0.0.0").strip() or "0.0.0.0"  # nosec B104
    if host in LOCAL_HOSTS:
        return host
    if host == "0.0.0.0" and os.getenv("ALLOW_LAN", "1") == "1":  # nosec B104
        return host
    return "127.0.0.1"


def _write_runtime_files(port):
    try:
        with open(PID_FILE, "w", encoding="ascii") as pid_file:
            pid_file.write(str(os.getpid()))
        with open(PORT_FILE, "w", encoding="ascii") as port_file:
            port_file.write(str(port))
    except OSError:
        pass


@app.route("/index.html")
@app.route("/")
def pagina_inicial():
    context = _platform_context("pagina_inicial")
    return render_template("index.html", **context)


@app.route("/jogos.html")
@app.route("/jogos")
def pagina_jogos():
    context = _platform_context("pagina_jogos")
    return render_template("library.html", **context)


@app.route("/categorias.html")
@app.route("/categorias")
def pagina_categorias():
    context = _platform_context("pagina_categorias")
    return render_template("categories.html", **context)


@app.route("/perfil.html")
@app.route("/perfil")
def pagina_perfil():
    context = _platform_context("pagina_perfil")
    return render_template("profile.html", **context)


@app.route("/ranking.html")
@app.route("/ranking")
def pagina_ranking():
    context = _platform_context("pagina_ranking")
    context["leaderboards"] = _leaderboards()
    return render_template("ranking.html", **context)


@app.route("/conquistas.html")
@app.route("/conquistas")
def pagina_conquistas():
    context = _platform_context("pagina_conquistas")
    context["achievement_board"] = _achievement_board(g.player_id)
    return render_template("achievements.html", **context)


@app.route("/sobre.html")
@app.route("/sobre")
def pagina_sobre():
    context = _platform_context("pagina_sobre")
    return render_template("about.html", **context)


@app.route("/atualizacoes.html")
@app.route("/atualizacoes")
def pagina_atualizacoes():
    context = _platform_context("pagina_atualizacoes")
    return render_template("updates.html", **context)


@app.route("/2048.html")
@app.route("/2048")
def jogo_2048():
    context = _platform_context("pagina_jogos")
    return render_template("game_2048.html", **context)


@app.route("/aprender-teclas.html")
@app.route("/aprender-teclas")
def jogo_aprender_teclas():
    context = _platform_context("pagina_jogos")
    return render_template("learn_keys.html", **context)


@app.route("/manifest.webmanifest")
def manifest_file():
    return send_from_directory(
        ROOT_DIR,
        "manifest.webmanifest",
        mimetype="application/manifest+json",
    )


@app.route("/service-worker.js")
def service_worker_file():
    response = send_from_directory(
        ROOT_DIR,
        "service-worker.js",
        mimetype="application/javascript",
    )
    response.headers["Service-Worker-Allowed"] = "/"
    return response


@app.route("/health")
def health():
    return "ok", 200


@app.route("/status")
def status():
    forbidden = _local_only_json()
    if forbidden:
        return forbidden
    port = _requested_port()
    return jsonify(status="running", pid=os.getpid(), port=port), 200


@app.route("/api/player")
def api_player():
    summary = _player_summary(g.player_id)
    return jsonify(summary), 200


@app.route("/api/track/start", methods=["POST"])
@csrf.exempt
def api_track_start():
    payload = request.get_json(silent=True) or {}
    game_slug = str(payload.get("game_slug", "")).strip()
    known = {game["slug"] for game in GAMES}
    if game_slug not in known:
        return jsonify(status="invalid_game"), 400
    _record_game_start(g.player_id, game_slug)
    return jsonify(status="ok"), 200


@app.route("/api/track/progress", methods=["POST"])
@csrf.exempt
def api_track_progress():
    payload = request.get_json(silent=True) or {}
    game_slug = str(payload.get("game_slug", "")).strip()
    known = {game["slug"] for game in GAMES}
    if game_slug not in known:
        return jsonify(status="invalid_game"), 400
    score = payload.get("score")
    key_presses = payload.get("key_presses")
    try:
        score = max(0, int(score)) if score is not None else None
    except (TypeError, ValueError):
        score = None
    try:
        key_presses = max(0, int(key_presses)) if key_presses is not None else None
    except (TypeError, ValueError):
        key_presses = None
    state_value = str(payload.get("state", "")).strip()[:80]
    _record_game_progress(g.player_id, game_slug, score=score, key_presses=key_presses, state_value=state_value)
    return jsonify(status="ok"), 200


@app.route("/api/player/favorite", methods=["POST"])
@csrf.exempt
def api_player_favorite():
    payload = request.get_json(silent=True) or {}
    game_slug = str(payload.get("game_slug", "")).strip()
    known = {game["slug"] for game in GAMES if game["status"] == "live"}
    if game_slug not in known:
        return jsonify(status="invalid_game"), 400
    database = get_db()
    database.execute("UPDATE players SET favorite_game = ? WHERE id = ?", (game_slug, g.player_id))
    database.commit()
    return jsonify(status="ok"), 200


@app.route("/quit", methods=["POST"])
@app.route("/exit", methods=["POST"])
@app.route("/kill", methods=["POST"])
@csrf.exempt
def quit_server():
    forbidden = _local_only_json()
    if forbidden:
        return forbidden
    _shutdown_server()
    return jsonify(status="shutting_down", pid=os.getpid()), 200


init_db()


if __name__ == "__main__":
    requested_port = _requested_port()
    host = _requested_host()
    _stop_tracked_server()
    port = requested_port if _is_port_available(requested_port, host) else _find_free_port(requested_port + 1, host)
    os.environ["PORT"] = str(port)
    _write_runtime_files(port)
    app.run(host, port=port, debug=False)
