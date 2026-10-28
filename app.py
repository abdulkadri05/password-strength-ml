from __future__ import annotations

import os

import joblib
import streamlit as st

from src.features import extract, extract_frame

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "model.joblib")

st.set_page_config(page_title="Password Strength Checker", page_icon="🔒")


@st.cache_resource
def load_model():
    if not os.path.exists(MODEL_PATH):
        return None
    return joblib.load(MODEL_PATH)


def feedback(pw: str, feats: dict) -> list[str]:
    tips = []
    if feats["length"] < 12:
        tips.append("Make it longer — aim for at least 12 characters.")
    if feats["num_upper"] == 0:
        tips.append("Add some UPPERCASE letters.")
    if feats["num_lower"] == 0:
        tips.append("Add some lowercase letters.")
    if feats["num_digits"] == 0:
        tips.append("Add a few digits (0-9).")
    if feats["num_special"] == 0:
        tips.append("Add special characters (e.g. ! ? @ # $).")
    if feats["is_common"]:
        tips.append("This is a very common / breached password — avoid it entirely.")
    if feats["has_sequence"]:
        tips.append("Avoid sequences like 'abc' or '123'.")
    if feats["max_repeat_run"] >= 3:
        tips.append("Avoid repeating the same character many times.")
    if not tips:
        tips.append("Great — this password uses length and variety well.")
    return tips


COLORS = {"Weak": "#e5484d", "Medium": "#f5a623", "Strong": "#30a46c"}

st.title("🔒 Password Strength Checker")
st.caption(
    "A machine-learning model rates your password. "
    "Your input is processed in memory only and is never stored or sent anywhere."
)

bundle = load_model()
if bundle is None:
    st.error("No trained model found. Run `python -m src.train` first.")
    st.stop()

model = bundle["model"]
labels = bundle["labels"]

pw = st.text_input("Enter a password to test", type="password")

if pw:
    feats = extract(pw)
    X = extract_frame([pw])
    pred = int(model.predict(X)[0])
    proba = model.predict_proba(X)[0]
    label = labels[pred]

    st.markdown(
        f"### Result: <span style='color:{COLORS[label]}'>{label}</span>",
        unsafe_allow_html=True,
    )
    st.progress((pred + 1) / 3)
    st.write(f"Model confidence: **{proba[pred] * 100:.0f}%**")

    with st.expander("Why? (feature breakdown)"):
        st.write(
            {
                "length": feats["length"],
                "uppercase": feats["num_upper"],
                "lowercase": feats["num_lower"],
                "digits": feats["num_digits"],
                "special": feats["num_special"],
                "unique characters": feats["num_unique"],
                "entropy (bits/char)": round(feats["entropy"], 2),
                "is a common password": bool(feats["is_common"]),
            }
        )

    st.subheader("Suggestions")
    for tip in feedback(pw, feats):
        st.write("•", tip)
else:
    st.info("Type a password above to see its strength.")
