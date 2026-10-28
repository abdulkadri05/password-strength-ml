# 🔒 Password Strength Checker — ML Web App

A machine-learning web application that rates how **weak / medium / strong** a
password is. You type a password into the website and a model trained from
scratch returns a strength class, a confidence score, and concrete suggestions
for improving it.

Built for DAT158 Assignment 2. The whole ML lifecycle is implemented from the
ground up: data → feature engineering → training → evaluation → deployment.

---

## What it does

- **Input:** a password typed into the web UI.
- **Output:** a predicted strength (`Weak` / `Medium` / `Strong`), the model's
  confidence, a feature breakdown, and actionable tips.
- **Privacy:** the password is processed **in memory only**. It is never stored,
  logged, or transmitted.

## How it works (ML pipeline)

| Step | File | What happens |
|------|------|--------------|
| Data | `src/make_dataset.py` | Loads a labelled dataset, or generates a synthetic one if none is present |
| Features | `src/features.py` | Turns each password into 15 engineered numeric features (length, char-class counts, entropy, repeats, sequences, is-common, …) |
| Train + evaluate | `src/train.py` | Stratified train/test split, trains a `RandomForestClassifier`, compares to a majority-class baseline, reports accuracy / precision / recall / confusion matrix / 5-fold CV, saves the model |
| Deploy | `app.py` | Streamlit website that loads the saved model and serves predictions |

## Quick start

```bash
# 1. Create a virtual environment and install dependencies
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 2. Build the dataset (creates data/passwords.csv)
python -m src.make_dataset

# 3. Train and evaluate the model (creates models/model.joblib)
python -m src.train

# 4. Launch the website
streamlit run app.py
```

Then open the local URL Streamlit prints (usually http://localhost:8501).

## Dataset

The dataset (~24,000 passwords) is built by `src/make_dataset.py` and saved to
`data/passwords.csv`. It is generated from a bundled list of common/breached
passwords plus programmatically created Weak, Medium, and Strong passwords.
Each password is labelled by a reference strength score (length, character
variety, estimated keyspace, and whether it is a common password), with a small
amount of label noise so the task reflects real ambiguity near class
boundaries. A fixed random seed makes the dataset reproducible.

The model trained on this data reaches about 92% accuracy (see the report).

To rebuild the dataset and model from scratch:

```bash
python -m src.make_dataset
python -m src.train
```

## Deployment (Streamlit Community Cloud — free)

1. Push this repo to GitHub (public).
2. Go to https://share.streamlit.io, connect the repo, set the main file to
   `app.py`.
3. It installs `requirements.txt` and serves the app at a public URL.

Commit `models/model.joblib` and `data/passwords.csv` so the deployed app has a
model to load without retraining.

## Project structure

```
password-strength-ml/
├── app.py                     # Streamlit website (deployment)
├── requirements.txt
├── data/
│   ├── common_passwords.txt   # small bundled breached-password list
│   └── passwords.csv          # generated dataset
├── models/
│   └── model.joblib           # trained model + feature list + labels
└── src/
    ├── features.py            # feature engineering (shared by train + app)
    ├── make_dataset.py        # dataset builder
    └── train.py               # training + evaluation
```

## Ethics & privacy notes (for the report)

- The app never persists user input; strength checking happens locally in the
  request.
- A password checker can give false confidence — note that strength ≠
  guaranteed security (reuse, phishing, and breaches still matter).
- The "common password" feature relies on breached-password lists; discuss the
  trade-off of using such data.

## Credits / sources

- Feature ideas inspired by the `zxcvbn` password-strength estimator (Dropbox).
- Common-password list informed by the SecLists collection.
- Built with scikit-learn, pandas, and Streamlit.
