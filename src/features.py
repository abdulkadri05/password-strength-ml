from __future__ import annotations

import math
import os
import string

import pandas as pd

FEATURE_NAMES = [
    "length",
    "num_lower",
    "num_upper",
    "num_digits",
    "num_special",
    "num_unique",
    "unique_ratio",
    "num_char_classes",
    "entropy",
    "max_repeat_run",
    "has_sequence",
    "digit_ratio",
    "upper_ratio",
    "special_ratio",
    "is_common",
]

SPECIALS = set(string.punctuation + " ")

_COMMON_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "common_passwords.txt")


def load_common_passwords() -> set[str]:
    if not os.path.exists(_COMMON_FILE):
        return set()
    with open(_COMMON_FILE, "r", encoding="utf-8", errors="ignore") as fh:
        return {line.strip().lower() for line in fh if line.strip()}


_COMMON = load_common_passwords()


def shannon_entropy(pw: str) -> float:
    if not pw:
        return 0.0
    counts = {}
    for ch in pw:
        counts[ch] = counts.get(ch, 0) + 1
    n = len(pw)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


def max_repeat_run(pw: str) -> int:
    if not pw:
        return 0
    best = run = 1
    for i in range(1, len(pw)):
        if pw[i] == pw[i - 1]:
            run += 1
            best = max(best, run)
        else:
            run = 1
    return best


def has_sequence(pw: str) -> int:
    low = pw.lower()
    for i in range(len(low) - 2):
        a, b, c = low[i], low[i + 1], low[i + 2]
        if a.isalnum() and b.isalnum() and c.isalnum():
            if ord(b) - ord(a) == 1 and ord(c) - ord(b) == 1:
                return 1
    return 0


def extract(pw: str) -> dict[str, float]:
    pw = "" if pw is None else str(pw)
    length = len(pw)
    num_lower = sum(ch.islower() for ch in pw)
    num_upper = sum(ch.isupper() for ch in pw)
    num_digits = sum(ch.isdigit() for ch in pw)
    num_special = sum(ch in SPECIALS for ch in pw)
    num_unique = len(set(pw))
    classes = sum([num_lower > 0, num_upper > 0, num_digits > 0, num_special > 0])
    denom = length if length else 1

    return {
        "length": length,
        "num_lower": num_lower,
        "num_upper": num_upper,
        "num_digits": num_digits,
        "num_special": num_special,
        "num_unique": num_unique,
        "unique_ratio": num_unique / denom,
        "num_char_classes": classes,
        "entropy": shannon_entropy(pw),
        "max_repeat_run": max_repeat_run(pw),
        "has_sequence": has_sequence(pw),
        "digit_ratio": num_digits / denom,
        "upper_ratio": num_upper / denom,
        "special_ratio": num_special / denom,
        "is_common": int(pw.lower() in _COMMON),
    }


def extract_frame(passwords) -> pd.DataFrame:
    rows = [extract(p) for p in passwords]
    return pd.DataFrame(rows, columns=FEATURE_NAMES)
