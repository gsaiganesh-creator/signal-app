"""Sentiment scan — daily AI sentiment take per holdings/watchlist symbol via
Grok (xAI), plus a backfill job that fills in 7d/30d outcome prices for
accuracy tracking. Ported from the Next.js routes that implemented this
before the move to this Python scheduler."""
import json
import logging
import os
import time
from datetime import date, datetime, timedelta, timezone

import httpx

from core.price_utils import fetch_price
from core.supabase_rest import rest_get, rest_patch, rest_post

logger = logging.getLogger(__name__)

_XAI_KEY = os.getenv("XAI_API_KEY", "")
_MAX_SYMBOLS = 200


def _grok_sentiment(symbol: str, exchange: str) -> dict | None:
    prompt = (
        f"You're a stock market sentiment analyst. In one short sentence (max 120 chars), "
        f"give current retail/market sentiment for {symbol} ({exchange} listed stock). "
        f'Reply as JSON: {{"label":"bullish"|"bearish"|"neutral","blurb":"..."}}'
    )
    try:
        with httpx.Client(timeout=10.0) as client:
            r = client.post(
                "https://api.x.ai/v1/chat/completions",
                headers={"Authorization": f"Bearer {_XAI_KEY}", "Content-Type": "application/json"},
                json={
                    "model": "grok-4.3",
                    "max_tokens": 80,
                    "messages": [
                        {"role": "system", "content": "You are a stock sentiment engine. Return only valid JSON, no markdown."},
                        {"role": "user", "content": prompt},
                    ],
                },
            )
            r.raise_for_status()
            raw = r.json()["choices"][0]["message"]["content"]
            clean = raw.strip().replace("```json", "").replace("```", "").strip()
            parsed = json.loads(clean)
            if parsed.get("label") not in ("bullish", "bearish", "neutral"):
                return None
            return {"label": parsed["label"], "blurb": str(parsed.get("blurb", ""))[:160]}
    except Exception as e:
        logger.error("sentiment_scan: grok call failed for %s: %s", symbol, e)
        return None


def run_sentiment_scan() -> dict:
    holdings = rest_get("holdings", {"select": "symbol,exchange"})
    watchlist = rest_get("watchlist", {"select": "symbol,exchange"})

    counts: dict[str, dict] = {}
    for row in holdings + watchlist:
        sym = row["symbol"]
        if sym in counts:
            counts[sym]["count"] += 1
        else:
            counts[sym] = {"symbol": sym, "exchange": row["exchange"], "count": 1}

    ranked = sorted(counts.values(), key=lambda r: -r["count"])[:_MAX_SYMBOLS]

    today = date.today().isoformat()
    done_rows = rest_get("sentiment_scan_log", {"scanned_at": f"eq.{today}", "select": "symbol"})
    done_today = {r["symbol"] for r in done_rows}

    pending = [r for r in ranked if r["symbol"] not in done_today]

    scanned = failed = logged = 0
    for row in pending:
        symbol, exchange = row["symbol"], row["exchange"]
        result = _grok_sentiment(symbol, exchange)
        if result:
            try:
                rest_post(
                    "sentiment_scores",
                    {
                        "symbol": symbol, "exchange": exchange,
                        "label": result["label"], "blurb": result["blurb"],
                        "scanned_at": datetime.now(timezone.utc).isoformat(),
                    },
                    prefer="resolution=merge-duplicates,return=minimal",
                )
                scanned += 1
            except Exception as e:
                logger.error("sentiment_scan: upsert failed for %s: %s", symbol, e)
                failed += 1

            price = fetch_price(symbol, exchange)
            if price is not None:
                try:
                    rest_post(
                        "sentiment_scan_log",
                        {
                            "scanned_at": today, "symbol": symbol, "exchange": exchange,
                            "label": result["label"], "price_at": price,
                        },
                        prefer="resolution=merge-duplicates,return=minimal",
                    )
                    logged += 1
                except Exception as e:
                    logger.error("sentiment_scan: log insert failed for %s: %s", symbol, e)
        else:
            failed += 1
        time.sleep(0.2)

    summary = {"candidates": len(ranked), "processed": len(pending), "scanned": scanned, "failed": failed, "logged": logged}
    logger.info("sentiment_scan: %s", summary)
    return summary


def run_sentiment_backfill() -> dict:
    today = date.today()
    d7ago = (today - timedelta(days=7)).isoformat()
    d30ago = (today - timedelta(days=30)).isoformat()

    need7 = rest_get("sentiment_scan_log", [
        ("scanned_at", f"lte.{d7ago}"),
        ("price_7d", "is.null"),
        ("select", "id,symbol,exchange,price_at"),
        ("limit", "200"),
    ])
    need30 = rest_get("sentiment_scan_log", [
        ("scanned_at", f"lte.{d30ago}"),
        ("price_30d", "is.null"),
        ("select", "id,symbol,exchange,price_at"),
        ("limit", "200"),
    ])

    price_cache: dict[str, float | None] = {}
    for row in need7 + need30:
        key = f"{row['symbol']}:{row['exchange']}"
        if key not in price_cache:
            price_cache[key] = fetch_price(row["symbol"], row["exchange"])
            time.sleep(0.2)

    updated7 = updated30 = 0
    for row in need7:
        price = price_cache.get(f"{row['symbol']}:{row['exchange']}")
        if price is None:
            continue
        ret = round((price - row["price_at"]) / row["price_at"] * 100, 2)
        try:
            rest_patch("sentiment_scan_log", {"id": f"eq.{row['id']}"}, {"price_7d": price, "return_7d": ret})
            updated7 += 1
        except Exception as e:
            logger.error("sentiment_backfill: 7d patch failed for %s: %s", row["symbol"], e)

    for row in need30:
        price = price_cache.get(f"{row['symbol']}:{row['exchange']}")
        if price is None:
            continue
        ret = round((price - row["price_at"]) / row["price_at"] * 100, 2)
        try:
            rest_patch("sentiment_scan_log", {"id": f"eq.{row['id']}"}, {"price_30d": price, "return_30d": ret})
            updated30 += 1
        except Exception as e:
            logger.error("sentiment_backfill: 30d patch failed for %s: %s", row["symbol"], e)

    summary = {"updated_7d": updated7, "updated_30d": updated30}
    logger.info("sentiment_backfill: %s", summary)
    return summary
