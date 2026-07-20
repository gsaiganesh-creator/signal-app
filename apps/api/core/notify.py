"""
WhatsApp ops alerting — ported from twitter-agent's sibling project
(MStock-Automation/Paper_trade.py's send_whatsapp helper) rather than
building a fresh notification path. Used for things a human needs to know
about immediately (Kite daily login failure, health check going red) —
not user-facing, this is founder-only ops signal.
"""
import logging
import os

logger = logging.getLogger(__name__)


def send_whatsapp(msg: str) -> bool:
    sid  = os.getenv("TWILIO_ACCOUNT_SID", "")
    token = os.getenv("TWILIO_AUTH_TOKEN", "")
    frm  = os.getenv("TWILIO_WHATSAPP_FROM", "")
    to   = os.getenv("TWILIO_WHATSAPP_TO", "")

    if not all([sid, token, frm, to]):
        logger.warning("notify: TWILIO_* env vars not set — skipping WhatsApp alert: %s", msg[:80])
        return False

    try:
        from twilio.rest import Client
        client = Client(sid, token)
        client.messages.create(body=msg, from_=frm, to=to)
        logger.info("notify: WhatsApp alert sent")
        return True
    except Exception as e:
        logger.error("notify: WhatsApp send failed — %s", e)
        return False
