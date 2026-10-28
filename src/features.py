"""Feature engineering for password strength classification.

This module turns a raw password string into a fixed-size numeric feature
vector. These engineered features are what the ML model actually learns from,
so this file is the heart of the "data preparation" step of the ML lifecycle.

Keeping feature extraction in one place means the exact same transformation is
used at training time (src/train.py) and at prediction time (app.py). That is
important for reproducibility: the website must see passwords the same way the
model was trained to see them.
"""

from __future__ import annotations

import math
import os
import string

import pandas as pd

# Ordered list of feature names. The order MUST stay fixed so that the columns
# the model was trained on line up with the columns produced at predict time.
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

# A small list of very common / breached passwords used for the `is_common`
# feature and for generating weak training samples. In a production system you
# would load a large breach corpus (e.g. the RockYou list). We bundle a compact
# list so the project is self-contained and reproducible out of the box.
_COMMON_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "common_passwords.txt")


def load_common_passwords() -> set[str]:
    """Load the bundled common-password list (lowercased) as a set."""
    if not os.path.exists(_COMMON_FILE):
        return set()
    with open(_COMMON_FILE, "r", encoding="utf-8", errors="ignore") as fh:
        return {line.strip().lower() for line in fh if line.strip()}


_COMMON = load_common_passwords()


def shannon_entropy(pw: str) -> float:
    """Shannon entropy (bits per character) of the password string.

    Higher entropy means the characters are more varied/less predictable.
    """
    if not pw:
        return 0.0
    counts = {}
    for ch in pw:
        counts[ch] = counts.get(ch, 0) + 1
    n = len(pw)
    return -sum((c / n) * math.log2(c / n) for c in counts.values())


def max_repeat_run(pw: str) -> int:
    """Length of the longest run of a single repeated character (e.g. 'aaaa')."""
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
    """1 if the password contains an ascending run of >=3 (abc, 123, xyz)."""
    low = pw.lower()
    for i in range(len(low) - 2):
        a, b, c = low[i], low[i + 1], low[i + 2]
        if a.isalnum() and b.isalnum() and c.isalnum():
            if ord(b) - ord(a) == 1 and ord(c) - ord(b) == 1:
                return 1
    return 0


def extract(pw: str) -> dict[str, float]:
    """Extract the full engineered feature dictionary for one password."""
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
    """Vectorise an iterable of passwords into a feature DataFrame."""
    rows = [extract(p) for p in passwords]
    return pd.DataFrame(rows, columns=FEATURE_NAMES)
