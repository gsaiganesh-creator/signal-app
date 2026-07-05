import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import signals, sentiment, market
from core.scheduler import start_scheduler

app = FastAPI(
    title="SIGNAL API",
    description="ML swing signals, technical analysis, market sentiment",
    version="1.0.0",
)

_allowed = [
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", "https://signal-app.vercel.app"),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(signals.router, prefix="/api")
app.include_router(sentiment.router, prefix="/api")
app.include_router(market.router, prefix="/api")


@app.on_event("startup")
async def startup():
    start_scheduler()


@app.get("/")
def health():
    return {"status": "ok", "service": "SIGNAL API"}
