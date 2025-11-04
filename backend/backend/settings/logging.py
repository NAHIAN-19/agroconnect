# backend/settings/logging.py
import os
from pathlib import Path
import logging
from logging.handlers import TimedRotatingFileHandler

# --------------------------
# Directories
# --------------------------
BASE_DIR = Path(__file__).resolve().parent.parent.parent
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

# --------------------------
# Custom Handler: Daily + Size Rotation
# --------------------------
class SizedTimedRotatingFileHandler(TimedRotatingFileHandler):
    """
    Combines TimedRotatingFileHandler with size-based rollover.
    - Daily rotation (YYYY-MM-DD)
    - Split by maxBytes if log grows too big
    """
    def __init__(self, filename, when='D', interval=1, backupCount=14, maxBytes=10*1024*1024, encoding=None):
        self.maxBytes = maxBytes
        super().__init__(filename, when=when, interval=interval, backupCount=backupCount, encoding=encoding)

    def shouldRollover(self, record):
        # Time-based rotation
        if super().shouldRollover(record):
            return 1
        # Size-based rotation
        if self.stream and self.maxBytes > 0:
            if self.stream.tell() + len(self.format(record).encode(self.encoding or "utf-8")) >= self.maxBytes:
                return 1
        return 0

    def doRollover(self):
        if self.stream:
            self.stream.close()
            self.stream = None

        # Base filename with date
        import time
        dfn = self.baseFilename.replace(".log", f"-{time.strftime('%Y-%m-%d')}.log")

        # Increment number if file exists
        count = 1
        new_dfn = dfn
        while os.path.exists(new_dfn):
            new_dfn = dfn.replace(".log", f".{count}.log")
            count += 1

        os.rename(self.baseFilename, new_dfn)

        # Remove old backups beyond backupCount
        log_dir = os.path.dirname(self.baseFilename)
        log_files = sorted(
            [f for f in os.listdir(log_dir) if f.startswith("django-")],
            reverse=True
        )
        if len(log_files) > self.backupCount:
            for old_file in log_files[self.backupCount:]:
                try:
                    os.remove(os.path.join(log_dir, old_file))
                except Exception:
                    pass

        # Reopen new log file
        self.mode = 'a'
        self.stream = self._open()

# --------------------------
# Logging Configuration
# --------------------------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "file": {
            "level": "INFO",
            "class": "backend.settings.logging.SizedTimedRotatingFileHandler",
            "filename": str(LOGS_DIR / "django.log"),
            "formatter": "verbose",
            "when": "D",
            "interval": 1,
            "backupCount": 14,
            "maxBytes": 10 * 1024 * 1024,  # 10 MB
            "encoding": "utf-8",
        },
        "console": {
            "level": "INFO",
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
    },
    "root": {
        "handlers": ["console", "file"],
        "level": "INFO"
    },
    "loggers": {
        "django": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False
        },
        "apps": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False
        },
        "spectacular": {
            "handlers": ["console"],
            "level": "INFO",
        },

    },
}