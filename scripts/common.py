"""Utilidades compartilhadas pelos scripts de download e processamento."""
from __future__ import annotations

import logging
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_RAW = ROOT_DIR / "data" / "raw"
DATA_PROCESSED = ROOT_DIR / "data" / "processed"
OUTPUT_DIR = ROOT_DIR / "output"
DASHBOARD_DIR = ROOT_DIR / "dashboard"

# Marco da transição de governo: Bolsonaro até 31/12/2022, Lula a partir de 01/01/2023.
PERIODO_CORTE = "2023-01-01"


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("[%(name)s] %(message)s"))
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


def ensure_dirs(*dirs: Path) -> None:
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)


def periodo_do_governo(data) -> str:
    """Classifica uma data (Timestamp ou string) em 'Bolsonaro' ou 'Lula'."""
    import pandas as pd

    ts = pd.Timestamp(data)
    return "Bolsonaro" if ts < pd.Timestamp(PERIODO_CORTE) else "Lula"
