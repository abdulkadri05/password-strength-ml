"""Build the labelled password dataset used for training.

Two modes:

1. REAL DATA (preferred for your report): if ``data/passwords.csv`` exists, it is
   used directly. This is the format of the public Kaggle "Password Strength
   Classifier Dataset" (columns: ``password``, ``strength`` with 0=weak,
   1=medium, 2=strong). See the README for the download link.

2. SYNTHETIC FALLBACK: if no CSV is present, we generate a labelled dataset so
   the project trains and runs end-to-end with zero manual downloads. Passwords
   are drawn from three realistic generators (common/breached, "human" medium,
   and random strong) and labelled by a reference strength score that is
   independent of most of our engineered features, so the model still has to
   *learn* the mapping rather than copy a single rule.

Run:  python -m src.make_dataset
Out:  data/passwords.csv  (password,strength)
"""

from __future__ import annotations

import os
import random
import string

import pandas as pd

from .features import load_common_passwords

HERE = os.path.dirname(__file__)
DATA_DIR = os.path.join(HERE, "..", "data")
CSV_PATH = os.path.join(DATA_DIR, "passwords.csv")

RNG = random.Random(42)  # fixed seed -> reproducible dataset

WORDS = [
    "love", "summer", "winter", "dragon", "soccer", "coffee", "flower", "monkey",
    "orange", "purple", "guitar", "rocket", "pirate", "garden", "hunter", "silver",
    "forest", "castle", "winter", "oslo", "bergen", "norway", "viking", "school",
]


def _reference_score(pw: str) -> int:
    """A reference 0/1/2 strength label.

    This deliberately combines *crack-resistance* ideas (length, variety,
    whether the password is a known-common one) rather than mirroring a single
    engineered feature. It plays the role the Kaggle labels would play.
    """
    common = load_common_passwords()
    if pw.lower() in common or len(pw) < 6:
        return 0  # weak: breached or far too short

    classes = sum([
        any(c.islower() for c in pw),
        any(c.isupper() for c in pw),
        any(c.isdigit() for c in pw),
        any(c in string.punctuation for c in pw),
    ])

    # Rough log2 keyspace estimate: length * bits-per-char-class.
    pool = 0
    if any(c.islower() for c in pw):
        pool += 26
    if any(c.isupper() for c in pw):
        pool += 26
    if any(c.isdigit() for c in pw):
        pool += 10
    if any(c in string.punctuation for c in pw):
        pool += 32
    bits = len(pw) * (pool.bit_length())

    if len(pw) >= 12 and classes >= 3 and bits >= 72:
        return 2  # strong
    if len(pw) >= 8 and classes >= 2:
        return 1  # medium
    return 0


def _gen_weak() -> str:
    common = list(load_common_passwords())
    kind = RNG.random()
    if kind < 0.5 and common:
        return RNG.choice(common)
    if kind < 0.75:
        return RNG.choice(WORDS) + str(RNG.randint(0, 999))
    # short / single-class
    n = RNG.randint(3, 6)
    return "".join(RNG.choice(string.ascii_lowercase) for _ in range(n))


def _gen_medium() -> str:
    word = RNG.choice(WORDS).capitalize()
    return word + str(RNG.randint(10, 9999))


def _gen_strong() -> str:
    n = RNG.randint(12, 20)
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*-_?"
    return "".join(RNG.choice(alphabet) for _ in range(n))


def generate(n: int = 30000) -> pd.DataFrame:
    rows = []
    gens = [_gen_weak, _gen_medium, _gen_strong]
    for _ in range(n):
        gen = RNG.choice(gens)
        pw = gen()
        rows.append({"password": pw, "strength": _reference_score(pw)})
    df = pd.DataFrame(rows).drop_duplicates(subset="password").reset_index(drop=True)
    return df


def main() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(CSV_PATH):
        df = pd.read_csv(CSV_PATH)
        print(f"Found existing dataset: {CSV_PATH} ({len(df)} rows) — using as-is.")
    else:
        print("No data/passwords.csv found — generating synthetic dataset...")
        df = generate()
        df.to_csv(CSV_PATH, index=False)
        print(f"Wrote {len(df)} rows to {CSV_PATH}")
    print("Class balance:\n", df["strength"].value_counts().sort_index())


if __name__ == "__main__":
    main()
