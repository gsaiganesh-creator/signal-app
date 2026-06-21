"""
Market mood / sentiment — VADER on news queue.
Extracted from twitter-agent/market_mood.py.
When news queue is absent (API deployment without twitter-agent),
returns neutral scores gracefully.
"""
import json
import time
from pathlib import Path

try:
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    _analyzer = SentimentIntensityAnalyzer()
    _VADER_OK = True
except ImportError:
    _VADER_OK = False

# In production the twitter-agent won't be co-located.
# Clients can POST /sentiment/ingest to push a news queue,
# or the API returns neutral when no data is available.
_NEWS_PATH = Path(
    __file__
).parent.parent.parent.parent.parent / "twitter-agent" / "data" / "global_news_queue.json"

_CATEGORY_SECTOR: dict[str, list[str]] = {
    "crude_oil": ["Energy"], "oil_gas": ["Energy"],
    "us_tech": ["IT"], "it_sector": ["IT"],
    "banking": ["Banking", "Finance"], "rbi_policy": ["Banking", "Finance"],
    "pharma": ["Pharma"], "metals": ["Metals"], "auto": ["Auto"],
    "fmcg": ["FMCG"], "telecom": ["Telecom"],
    "inflation": ["Banking", "FMCG", "Energy"],
    "rupee": ["IT", "Pharma"],
    "war_geopolitics": ["Energy", "Metals", "IT", "Banking"],
    "earnings": ["*"], "market": ["*"], "nifty": ["*"], "sensex": ["*"],
}
_ALL_SECTORS = ["Energy", "IT", "Banking", "Pharma", "Metals", "Auto", "FMCG", "Telecom", "Finance"]

_cache: dict | None = None
_cache_time: float = 0.0
_CACHE_TTL = 3600


def get_market_mood(force_refresh: bool = False) -> dict:
    global _cache, _cache_time
    neutral = {"overall": 0.0, "label": "Neutral", "sectors": {}, "news_count": 0, "top_stories": []}

    if not force_refresh and _cache and (time.time() - _cache_time) < _CACHE_TTL:
        return _cache

    if not _VADER_OK or not _NEWS_PATH.exists():
        return neutral

    try:
        queue = json.loads(_NEWS_PATH.read_text())
    except Exception:
        return neutral

    all_items = queue.get("IST", []) + queue.get("ET", []) + queue.get("IMMEDIATE", [])
    if not all_items:
        return neutral

    sector_scores: dict[str, list[float]] = {}
    scored_items = []

    for item in all_items:
        text = f"{item.get('title', '')}. {item.get('summary', '')}"
        compound = _analyzer.polarity_scores(text)["compound"]
        heat = item.get("heat", 50) / 100.0
        score = compound * heat
        category = item.get("category", "")
        sectors = _CATEGORY_SECTOR.get(category, [])
        if sectors == ["*"]:
            sectors = _ALL_SECTORS
        for sec in sectors:
            sector_scores.setdefault(sec, []).append(score)
        scored_items.append({"title": item.get("title", "")[:90], "score": round(score, 3), "category": category})

    sector_mood = {sec: round(sum(v) / len(v), 3) for sec, v in sector_scores.items()}
    all_scores = [i["score"] for i in scored_items]
    overall = round(sum(all_scores) / len(all_scores), 3) if all_scores else 0.0
    label = "Bullish" if overall >= 0.05 else ("Bearish" if overall <= -0.05 else "Neutral")
    top_stories = sorted(scored_items, key=lambda x: abs(x["score"]), reverse=True)[:3]

    _cache = {"overall": overall, "label": label, "sectors": sector_mood,
              "news_count": len(all_items), "top_stories": top_stories}
    _cache_time = time.time()
    return _cache
