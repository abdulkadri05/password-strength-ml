from __future__ import annotations

import os
import random
import string

import pandas as pd

from .features import load_common_passwords

HERE = os.path.dirname(__file__)
DATA_DIR = os.path.join(HERE, "..", "data")
CSV_PATH = os.path.join(DATA_DIR, "passwords.csv")

RNG = random.Random(42)
LABEL_NOISE = 0.07

WORDS = [
    "love", "summer", "winter", "dragon", "soccer", "coffee", "flower", "monkey",
    "orange", "purple", "guitar", "rocket", "pirate", "garden", "hunter", "silver",
    "forest", "castle", "spring", "oslo", "bergen", "norway", "viking", "school",
]

LEET = {"a": "@", "e": "3", "i": "1", "o": "0", "s": "$"}


def _leetify(word: str) -> str:
    return "".join(LEET.get(c, c) if RNG.random() < 0.5 else c for c in word)


def _reference_score(pw: str, common: set[str]) -> int:
    if pw.lower() in common or len(pw) < 6:
        return 0

    classes = sum([
        any(c.islower() for c in pw),
        any(c.isupper() for c in pw),
        any(c.isdigit() for c in pw),
        any(c in string.punctuation for c in pw),
    ])

    pool = 0
    if any(c.islower() for c in pw):
        pool += 26
    if any(c.isupper() for c in pw):
        pool += 26
    if any(c.isdigit() for c in pw):
        pool += 10
    if any(c in string.punctuation for c in pw):
        pool += 32
    bits = len(pw) * pool.bit_length()

    if len(pw) >= 13 and classes >= 3 and bits >= 78:
        return 2
    if len(pw) >= 8 and classes >= 2:
        return 1
    return 0


def _gen_weak(common_list) -> str:
    kind = RNG.random()
    if kind < 0.5 and common_list:
        return RNG.choice(common_list)
    if kind < 0.8:
        return RNG.choice(WORDS) + str(RNG.randint(0, 999))
    n = RNG.randint(3, 7)
    return "".join(RNG.choice(string.ascii_lowercase) for _ in range(n))


def _gen_medium() -> str:
    word = RNG.choice(WORDS)
    style = RNG.random()
    if style < 0.4:
        return word.capitalize() + str(RNG.randint(10, 9999))
    if style < 0.7:
        return _leetify(word) + str(RNG.randint(1, 99))
    return word.capitalize() + RNG.choice(WORDS).capitalize() + str(RNG.randint(0, 9))


def _gen_strong() -> str:
    n = RNG.randint(10, 20)
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*-_?"
    return "".join(RNG.choice(alphabet) for _ in range(n))


def generate(n: int = 30000) -> pd.DataFrame:
    common = load_common_passwords()
    common_list = list(common)
    rows = []
    gens = [lambda: _gen_weak(common_list), _gen_medium, _gen_strong]
    for _ in range(n):
        pw = RNG.choice(gens)()
        label = _reference_score(pw, common)
        if RNG.random() < LABEL_NOISE:
            label = RNG.choice([c for c in (0, 1, 2) if c != label])
        rows.append({"password": pw, "strength": label})
    return pd.DataFrame(rows).drop_duplicates(subset="password").reset_index(drop=True)


def main() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(CSV_PATH):
        df = pd.read_csv(CSV_PATH)
        print(f"Using existing dataset: {CSV_PATH} ({len(df)} rows)")
    else:
        df = generate()
        df.to_csv(CSV_PATH, index=False)
        print(f"Wrote {len(df)} rows to {CSV_PATH}")
    print("Class balance:\n", df["strength"].value_counts().sort_index())


if __name__ == "__main__":
    main()
