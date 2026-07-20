import logging
from datetime import date

import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from core.paper_trading_scan import run_paper_trading_scan
from core.price_alerts import run_price_alerts_check
from core.scan_log_backfill import run_scan_log_backfill
from core.sentiment_scan import run_sentiment_backfill, run_sentiment_scan
from core.shadow_log import run_shadow_log
from core.ml_shadow_log_backfill import run_ml_shadow_log_backfill
from core.signal_cache_scan import run_signal_cache_prewarm
from core.scan_log_writer import run_scan_log_writer
from core.kite_auth import run_daily_login

logger = logging.getLogger(__name__)

IST = pytz.timezone("Asia/Kolkata")

# NSE holidays 2025 — add each year
_NSE_HOLIDAYS = {
    date(2025, 1, 26),  # Republic Day
    date(2025, 2, 26),  # Mahashivratri
    date(2025, 3, 14),  # Holi
    date(2025, 4, 14),  # Dr. Ambedkar Jayanti
    date(2025, 4, 18),  # Good Friday
    date(2025, 5, 1),   # Maharashtra Day
    date(2025, 8, 15),  # Independence Day
    date(2025, 8, 27),  # Ganesh Chaturthi
    date(2025, 10, 2),  # Gandhi Jayanti
    date(2025, 10, 24), # Dussehra
    date(2025, 11, 5),  # Diwali Laxmi Puja
    date(2025, 11, 14), # Gurunanak Jayanti
    date(2025, 12, 25), # Christmas
}


def _is_market_day() -> bool:
    return date.today() not in _NSE_HOLIDAYS


def _morning_scan_job():
    if not _is_market_day():
        logger.info("scheduler: skipping morning scan — market holiday")
        return
    logger.info("scheduler: starting morning scan")
    try:
        from core.swing_scan import run_morning_scan
        run_morning_scan()
    except Exception as e:
        logger.error("scheduler: morning scan failed: %s", e)


def _us_morning_scan_job():
    logger.info("scheduler: starting US morning scan")
    try:
        from core.us_scan import run_us_morning_scan
        run_us_morning_scan()
    except Exception as e:
        logger.error("scheduler: US morning scan failed: %s", e)


def _intraday_check_job():
    if not _is_market_day():
        return
    try:
        from core.price_checker import run_intraday_check
        from core.notifier import send_entry_alerts
        triggered = run_intraday_check()
        if triggered:
            send_entry_alerts(triggered)
    except Exception as e:
        logger.error("scheduler: intraday check failed: %s", e)


def _eod_cleanup_job():
    if not _is_market_day():
        return
    logger.info("scheduler: running EOD cleanup")
    try:
        from core.supabase_client import expire_watching_signals
        expire_watching_signals()
    except Exception as e:
        logger.error("scheduler: EOD cleanup failed: %s", e)


def _price_alerts_check_job():
    if not _is_market_day():
        return
    run_price_alerts_check()


def _paper_trading_scan_job():
    if not _is_market_day():
        return
    try:
        run_paper_trading_scan()
    except Exception as e:
        logger.error("scheduler: paper trading scan failed: %s", e)


def _signal_cache_prewarm_job():
    if not _is_market_day():
        return
    try:
        run_signal_cache_prewarm()
    except Exception as e:
        logger.error("scheduler: signal cache prewarm failed: %s", e)


def _scan_log_writer_job():
    if not _is_market_day():
        return
    try:
        run_scan_log_writer()
    except Exception as e:
        logger.error("scheduler: scan log writer failed: %s", e)


def _kite_daily_login_job():
    if not _is_market_day():
        return
    logger.info("scheduler: starting Kite daily login")
    try:
        run_daily_login()
    except Exception as e:
        logger.error("scheduler: Kite daily login raised: %s", e)


def _kite_health_check_job():
    """
    Periodic mid-day check, separate from the once-daily login — catches a
    token getting revoked or Kite having an outage after the morning login
    already succeeded. Only sends a WhatsApp alert on a state CHANGE
    (healthy -> unhealthy), not every failing check, so a Kite outage
    doesn't spam every 30 minutes for its whole duration.
    """
    if not _is_market_day():
        return
    try:
        from core.kite_auth import get_stored_access_token, get_last_health_ok, verify_connection, save_session
        from core.notify import send_whatsapp

        token = get_stored_access_token()
        healthy = bool(token) and verify_connection(token)
        was_healthy = get_last_health_ok()

        if was_healthy and not healthy:
            send_whatsapp("🔴 SignalGenie: Kite health check just went RED mid-day. India scans are falling back to yfinance.")
        elif not was_healthy and healthy:
            send_whatsapp("🟢 SignalGenie: Kite health check recovered.")

        save_session(token, health_ok=healthy)
    except Exception as e:
        logger.error("scheduler: Kite health check failed: %s", e)


def start_scheduler():
    scheduler = BackgroundScheduler(timezone=IST)

    # 9:15 AM IST — full morning scan, Mon–Fri
    scheduler.add_job(
        _morning_scan_job,
        CronTrigger(day_of_week="mon-fri", hour=9, minute=15, timezone=IST),
        id="morning_scan",
        name="Morning TA Scan",
        replace_existing=True,
    )

    # 8:15 PM IST — after US market open in both EDT (opens 7:00 PM IST)
    # and EST (opens 8:00 PM IST — IST has no DST, so the ET/IST offset
    # shifts by an hour across the year). No holiday gate for v1 — worst
    # case is a harmless re-scan on a US market holiday.
    scheduler.add_job(
        _us_morning_scan_job,
        CronTrigger(day_of_week="mon-fri", hour=20, minute=15, timezone=IST),
        id="us_morning_scan",
        name="US Morning TA Scan",
        replace_existing=True,
    )

    # Every 5 min, 9:20 AM–3:30 PM IST — live price check
    scheduler.add_job(
        _intraday_check_job,
        CronTrigger(day_of_week="mon-fri", hour="9-15", minute="*/5", timezone=IST),
        id="intraday_check",
        name="Intraday Price Check",
        replace_existing=True,
    )

    # 3:35 PM IST — expire remaining WATCHING signals
    scheduler.add_job(
        _eod_cleanup_job,
        CronTrigger(day_of_week="mon-fri", hour=15, minute=35, timezone=IST),
        id="eod_cleanup",
        name="EOD Cleanup",
        replace_existing=True,
    )

    # 7:30 AM IST — sentiment scan for holdings+watchlist symbols, Mon–Fri
    scheduler.add_job(
        run_sentiment_scan,
        CronTrigger(day_of_week="mon-fri", hour=7, minute=30, timezone=IST),
        id="sentiment_scan",
        name="Sentiment Scan",
        replace_existing=True,
    )

    # 9:30 AM IST — sentiment 7d/30d outcome backfill, daily
    scheduler.add_job(
        run_sentiment_backfill,
        CronTrigger(hour=9, minute=30, timezone=IST),
        id="sentiment_backfill",
        name="Sentiment Backfill",
        replace_existing=True,
    )

    # 5:30 PM IST — ML scan 30d/60d outcome backfill, daily
    scheduler.add_job(
        run_scan_log_backfill,
        CronTrigger(hour=17, minute=30, timezone=IST),
        id="scan_log_backfill",
        name="Scan Log Backfill",
        replace_existing=True,
    )

    # Every 15 min, 8:00 AM–3:45 PM IST (skips NSE holidays), Mon–Fri — price alert check
    scheduler.add_job(
        _price_alerts_check_job,
        CronTrigger(day_of_week="mon-fri", hour="8-15", minute="*/15", timezone=IST),
        id="price_alerts_check",
        name="Price Alerts Check",
        replace_existing=True,
    )

    # 9:30 AM IST (skips NSE holidays), Mon–Fri — paper trading auto-exit/auto-enter
    scheduler.add_job(
        _paper_trading_scan_job,
        CronTrigger(day_of_week="mon-fri", hour=9, minute=30, timezone=IST),
        id="paper_trading_scan",
        name="Paper Trading Scan",
        replace_existing=True,
    )

    # 9:35 AM IST (skips NSE holidays), Mon–Fri — trained classifier shadow-mode logging
    scheduler.add_job(
        run_shadow_log,
        CronTrigger(day_of_week="mon-fri", hour=9, minute=35, timezone=IST),
        id="ml_shadow_log",
        name="ML Shadow Log",
        replace_existing=True,
    )

    # 9:40 AM IST, daily — ml_shadow_log 30d outcome backfill
    scheduler.add_job(
        run_ml_shadow_log_backfill,
        CronTrigger(hour=9, minute=40, timezone=IST),
        id="ml_shadow_log_backfill",
        name="ML Shadow Log Backfill",
        replace_existing=True,
    )

    # 9:35 AM IST — signal_cache prewarm (post-open), so ml_class on the portfolio
    # page has real data even if no user has the page open during market hours
    scheduler.add_job(
        _signal_cache_prewarm_job,
        CronTrigger(day_of_week="mon-fri", hour=9, minute=35, timezone=IST),
        id="signal_cache_prewarm_open",
        name="Signal Cache Prewarm (post-open)",
        replace_existing=True,
    )

    # 3:40 PM IST — signal_cache prewarm (post-close), so off-hours/weekend
    # viewers see EOD data instead of the default 'Watch' fallback
    scheduler.add_job(
        _signal_cache_prewarm_job,
        CronTrigger(day_of_week="mon-fri", hour=15, minute=40, timezone=IST),
        id="signal_cache_prewarm_close",
        name="Signal Cache Prewarm (post-close)",
        replace_existing=True,
    )

    # 3:45 PM IST — scan_log writer (post-close), independent of anyone visiting
    # /dashboard/signals — keeps Track Record's zone accuracy / RL analysis /
    # methodology stats moving instead of frozen on stale data
    scheduler.add_job(
        _scan_log_writer_job,
        CronTrigger(day_of_week="mon-fri", hour=15, minute=45, timezone=IST),
        id="scan_log_writer",
        name="Scan Log Writer (post-close)",
        replace_existing=True,
    )

    # 8:45 AM IST, Mon–Fri — Kite daily TOTP login (tokens expire midnight IST).
    # Must run before 9:15's morning_scan so that job gets real Kite data
    # instead of falling back to yfinance for the whole day.
    scheduler.add_job(
        _kite_daily_login_job,
        CronTrigger(day_of_week="mon-fri", hour=8, minute=45, timezone=IST),
        id="kite_daily_login",
        name="Kite Daily Login",
        replace_existing=True,
    )

    # Every 30 min, 9:20 AM–3:30 PM IST, Mon–Fri — Kite health check, alerts
    # via WhatsApp only on a healthy<->unhealthy state change (see job docstring)
    scheduler.add_job(
        _kite_health_check_job,
        CronTrigger(day_of_week="mon-fri", hour="9-15", minute="*/30", timezone=IST),
        id="kite_health_check",
        name="Kite Health Check",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(
        "scheduler: started (morning_scan, us_morning_scan, intraday_check, eod_cleanup, "
        "sentiment_scan, sentiment_backfill, scan_log_backfill, price_alerts_check, "
        "paper_trading_scan, ml_shadow_log, ml_shadow_log_backfill, signal_cache_prewarm, "
        "scan_log_writer, kite_daily_login, kite_health_check)"
    )
    return scheduler
