import logging
from datetime import date

import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

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

    scheduler.start()
    logger.info("scheduler: started (morning_scan, intraday_check, eod_cleanup)")
    return scheduler
