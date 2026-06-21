from fastapi import APIRouter
from core.sentiment import get_market_mood

router = APIRouter(prefix="/sentiment", tags=["sentiment"])


@router.get("")
def market_sentiment(refresh: bool = False):
    return get_market_mood(force_refresh=refresh)
