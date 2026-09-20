import time
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional, Any
from app.config import settings

logger = logging.getLogger("docmind.rate_limiter")
logging.basicConfig(level=logging.INFO)

class RateLimiter:
    def __init__(
        self,
        global_rpm: int = 18,
        global_rpd: int = 180,
        session_rpm: int = 5,
        session_rpd: int = 30
    ):
        self.global_rpm = global_rpm
        self.global_rpd = global_rpd
        self.session_rpm = session_rpm
        self.session_rpd = session_rpd
        self.persistence_file = settings.data_directory / "rate_limits.json"
        
        self.global_minute_timestamps: List[float] = []
        self.session_minute_timestamps: Dict[str, List[float]] = {}
        
        self.current_utc_date: str = self._get_current_utc_date()
        self.global_daily_count: int = 0
        self.session_daily_counts: Dict[str, int] = {}
        
        self._load_persistence()

    def _get_current_utc_date(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    def _load_persistence(self) -> None:
        if self.persistence_file.exists():
            try:
                with open(self.persistence_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                stored_date = data.get("utc_date")
                if stored_date == self.current_utc_date:
                    self.global_daily_count = data.get("global_daily_count", 0)
                    self.session_daily_counts = data.get("session_daily_counts", {})
                    logger.info(
                        f"[RATE_LIMITER] Restored daily quota counters from disk ({self.current_utc_date}): "
                        f"Global: {self.global_daily_count}/{self.global_rpd}, "
                        f"Active Sessions: {len(self.session_daily_counts)}"
                    )
                    return
            except Exception as e:
                logger.error(f"[RATE_LIMITER] Error reading persistence file: {e}")
        
        self.global_daily_count = 0
        self.session_daily_counts = {}
        self._save_persistence()

    def _save_persistence(self) -> None:
        try:
            data = {
                "utc_date": self.current_utc_date,
                "global_daily_count": self.global_daily_count,
                "session_daily_counts": self.session_daily_counts,
                "last_updated": time.time()
            }
            with open(self.persistence_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            logger.error(f"[RATE_LIMITER] Error saving persistence file: {e}")

    def _check_and_reset_daily(self) -> None:
        today_utc = self._get_current_utc_date()
        if today_utc != self.current_utc_date:
            logger.info(
                f"[RATE_LIMITER] UTC midnight reached. Resetting daily quota counters from {self.current_utc_date} to {today_utc}."
            )
            self.current_utc_date = today_utc
            self.global_daily_count = 0
            self.session_daily_counts.clear()
            self._save_persistence()

    def _clean_minute_windows(self, now: float) -> None:
        cutoff = now - 60.0
        self.global_minute_timestamps = [t for t in self.global_minute_timestamps if t > cutoff]
        for sid in list(self.session_minute_timestamps.keys()):
            self.session_minute_timestamps[sid] = [t for t in self.session_minute_timestamps[sid] if t > cutoff]
            if not self.session_minute_timestamps[sid]:
                del self.session_minute_timestamps[sid]

    def check_rate_limit(self, session_id: str) -> Tuple[bool, Optional[str]]:
        now = time.time()
        self._check_and_reset_daily()
        self._clean_minute_windows(now)

        if self.global_daily_count >= self.global_rpd:
            reason = f"Global daily AI quota reached ({self.global_daily_count}/{self.global_rpd} requests today). Running in grounded fallback mode until UTC midnight reset."
            logger.warning(f"[RATE_LIMITER] BLOCKED (Global Daily): {reason}")
            return False, reason

        if len(self.global_minute_timestamps) >= self.global_rpm:
            reason = f"Global rate limit reached ({len(self.global_minute_timestamps)}/{self.global_rpm} req/min). Running in grounded fallback mode."
            logger.warning(f"[RATE_LIMITER] BLOCKED (Global Minute): {reason}")
            return False, reason

        sess_daily = self.session_daily_counts.get(session_id, 0)
        if sess_daily >= self.session_rpd:
            reason = f"Personal daily AI quota reached ({sess_daily}/{self.session_rpd} requests today). Running in grounded fallback mode until UTC midnight reset."
            logger.warning(f"[RATE_LIMITER] BLOCKED (Session Daily for {session_id[:8]}): {reason}")
            return False, reason

        sess_minute_list = self.session_minute_timestamps.get(session_id, [])
        if len(sess_minute_list) >= self.session_rpm:
            reason = f"Personal rate limit reached ({len(sess_minute_list)}/{self.session_rpm} req/min). Running in grounded fallback mode."
            logger.warning(f"[RATE_LIMITER] BLOCKED (Session Minute for {session_id[:8]}): {reason}")
            return False, reason

        return True, None

    def record_request(self, session_id: str) -> None:
        now = time.time()
        self._check_and_reset_daily()
        self._clean_minute_windows(now)

        self.global_daily_count += 1
        self.global_minute_timestamps.append(now)
        
        self.session_daily_counts[session_id] = self.session_daily_counts.get(session_id, 0) + 1
        if session_id not in self.session_minute_timestamps:
            self.session_minute_timestamps[session_id] = []
        self.session_minute_timestamps[session_id].append(now)

        self._save_persistence()

        logger.info(
            f"[RATE_LIMITER] Request recorded for session {session_id[:8]} | "
            f"Global Daily: {self.global_daily_count}/{self.global_rpd} | "
            f"Global Min: {len(self.global_minute_timestamps)}/{self.global_rpm} | "
            f"Session Daily: {self.session_daily_counts[session_id]}/{self.session_rpd} | "
            f"Session Min: {len(self.session_minute_timestamps[session_id])}/{self.session_rpm}"
        )

    def get_status(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        now = time.time()
        self._check_and_reset_daily()
        self._clean_minute_windows(now)

        session_used = self.session_daily_counts.get(session_id, 0) if session_id else 0
        session_min_used = len(self.session_minute_timestamps.get(session_id, [])) if session_id else 0

        now_dt = datetime.now(timezone.utc)
        seconds_to_reset = 86400 - (now_dt.hour * 3600 + now_dt.minute * 60 + now_dt.second)

        is_limited_mode = (self.global_daily_count / self.global_rpd >= 0.80) or (session_used / self.session_rpd >= 0.80)

        return {
            "global_daily_used": self.global_daily_count,
            "global_daily_limit": self.global_rpd,
            "global_minute_used": len(self.global_minute_timestamps),
            "global_minute_limit": self.global_rpm,
            "session_daily_used": session_used,
            "session_daily_limit": self.session_rpd,
            "session_minute_used": session_min_used,
            "session_minute_limit": self.session_rpm,
            "current_utc_date": self.current_utc_date,
            "seconds_until_utc_reset": seconds_to_reset,
            "is_limited_mode": is_limited_mode
        }

rate_limiter = RateLimiter(
    global_rpm=18,
    global_rpd=180,
    session_rpm=5,
    session_rpd=30
)
