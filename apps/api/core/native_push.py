"""FCM push notifications for the native iOS/Android app shell — parallels
the existing pywebpush-based web push in price_alerts.py, sent to
native_push_tokens instead of push_subscriptions. Requires a Firebase
service account JSON, path given by FIREBASE_CREDENTIALS_PATH env var."""
import logging
import os

logger = logging.getLogger(__name__)

_app = None


def _get_app():
    global _app
    if _app is not None:
        return _app
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "")
    if not cred_path or not os.path.exists(cred_path):
        logger.warning("native_push: FIREBASE_CREDENTIALS_PATH not set or file missing, skipping")
        return None
    import firebase_admin
    from firebase_admin import credentials
    cred = credentials.Certificate(cred_path)
    _app = firebase_admin.initialize_app(cred)
    return _app


def send_native_push(tokens: list[str], title: str, body: str, data: dict | None = None) -> dict:
    """Sends the same alert to a batch of FCM tokens. Returns {"sent": n, "failed": n}."""
    app = _get_app()
    if app is None or not tokens:
        return {"sent": 0, "failed": len(tokens)}

    from firebase_admin import messaging

    sent = failed = 0
    for token in tokens:
        try:
            msg = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data=data or {},
                token=token,
            )
            messaging.send(msg)
            sent += 1
        except Exception as e:
            logger.warning("native_push: failed for token %s...: %s", token[:12], e)
            failed += 1
    return {"sent": sent, "failed": failed}
