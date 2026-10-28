// Generates a filled-in draft report (.docx) for the DAT158 assignment,
// following the official template's five ML-lifecycle sections.
// Run:  node report/build_report.js
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
} = require("docx");

const ACCENT = "1F4E79";
const MUTED = "767171";

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, color: ACCENT })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 180, after: 80 },
    children: [new TextRun({ text, bold: true })] });
}
function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 },
    children: [new TextRun({ text, ...opts })] });
}
// A yellow-highlighted placeholder the student must fill in.
function todo(text) {
  return new Paragraph({ spacing: { after: 120 },
    children: [new TextRun({ text: "[ " + text + " ]", italics: true, highlight: "yellow" })] });
}
function bullet(text) {
  return new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 },
    children: [new TextRun({ text })] });
}

function cell(text, { bold = false, header = false, width } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: header ? { type: ShadingType.CLEAR, fill: "D9E2F3" } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: bold || header })] })],
  });
}
function table(headers, rows, widths) {
  const total = widths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((hdr, i) => cell(hdr, { header: true, width: widths[i] })),
  });
  const bodyRows = rows.map(r => new TableRow({
    children: r.map((c, i) => cell(String(c), { width: widths[i], bold: i === 0 })),
  }));
  return new Table({ columnWidths: widths, width: { size: total, type: WidthType.DXA },
    rows: [headerRow, ...bodyRows] });
}

const children = [];

// ---- Title block --------------------------------------------------------
children.push(new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "Password Strength Checker — an ML Web App", bold: true })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
  children: [new TextRun({ text: "DAT158 — Assignment 2", color: MUTED })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
  children: [new TextRun({ text: "[ Name(s) ] · [ Date ]", italics: true, highlight: "yellow" })] }));
children.push(p("Draft report. Yellow-highlighted text marks places to fill in or replace with your own numbers before submission. Target length: max 3500 words.",
  { italics: true, color: MUTED }));

// ---- 1: DESCRIBE THE PROBLEM -------------------------------------------
children.push(h1("1: Describe the problem"));
children.push(h2("Scope"));
children.push(p("The goal of this project is a web application that estimates how strong a password is. A user types a password into the site and immediately receives a machine-learning-based rating — Weak, Medium, or Strong — together with a confidence score and concrete suggestions for making the password harder to guess."));
children.push(p("Password strength is a fuzzy judgment that depends on many interacting factors: length, the mix of character types, repetition, predictable sequences, and whether the password already appears in known breaches. Rather than hand-coding and endlessly tuning a set of rules, we treat this as a supervised learning problem and let a model learn, from labelled examples, which combinations of characteristics distinguish weak passwords from strong ones. This is why machine learning is a promising fit for the task."));
children.push(p("The system is intended to sit inside a sign-up or password-change flow of any application that has user accounts, nudging users toward safer choices at the moment they pick a password. Today the problem is solved either manually — a person eyeballing length and variety — or with rule-based strength meters and open-source estimators such as Dropbox's zxcvbn. Our product covers the same need but is trained from data and is easy to extend by adding features or retraining on newer breach data."));
children.push(p("Business objective: weak, reused, and breached passwords are a leading cause of account compromise, so helping users pick stronger passwords reduces the risk of takeovers and the support cost of dealing with them. The business impact can be framed as fewer compromised accounts and measured as the share of users who end up choosing a strong password after seeing the feedback."));
children.push(p("The model is one component of a small pipeline: raw password → feature extraction → trained classifier → user-facing feedback. A change in one stage (for example, adding a feature) requires retraining the classifier, so the stages are coupled. Resources required are modest: a standard laptop, the scikit-learn library, and a few seconds of training time; no GPU or special infrastructure is needed."));

children.push(h2("Metrics"));
children.push(p("Machine-learning metrics. Because this is a three-class classification task we measure overall accuracy, per-class precision, recall and F1-score, and inspect the confusion matrix to see which classes are confused. We also run 5-fold cross-validation to check that the result is stable and not an artefact of one particular train/test split."));
children.push(p("Software metric. Because the model runs interactively in a website, prediction latency matters: a rating must feel instant. Our features are cheap to compute and the model is small, so a single prediction is effectively immediate."));
children.push(p("Business metric for success. We consider the project a success if the tool reliably separates obviously weak passwords from strong ones (high accuracy and recall on the Weak class, so weak passwords are rarely mislabelled as safe) and if, in use, it measurably increases the proportion of users who choose a strong password compared with no feedback at all."));
children.push(todo("Optionally state a concrete target, e.g. 'at least 90% accuracy and recall > 0.95 on the Weak class'."));

// ---- 2: DATA ------------------------------------------------------------
children.push(h1("2: Data"));
children.push(p("The data consists of passwords, each labelled with a strength class: 0 = weak, 1 = medium, 2 = strong. For the final results we recommend the public Kaggle “Password Strength Classifier Dataset” (roughly 670,000 labelled passwords), whose labels were produced independently of our own features. The repository also ships a reproducible synthetic data generator (fixed random seed) so the whole project trains and runs end-to-end without any manual download."));
children.push(p("Ground-truth labels. With the Kaggle dataset the labels come from the dataset itself. For the synthetic fallback the labels are produced by a rule-based reference score (length, character variety, and whether the password is a known common one). We are transparent about a limitation here: because those synthetic labels are derived from rules close to our engineered features, a model can learn them almost perfectly, which is why the synthetic run reaches near-100% accuracy. The synthetic data is therefore a smoke test; the real evaluation in Section 3 should be run on the Kaggle data."));
children.push(p("Privacy and ethics. Passwords are sensitive personal data. The web application processes the entered password in memory only to compute features and a prediction — it is never stored, logged, or transmitted anywhere. A second consideration is that the “common password” feature relies on lists of previously breached passwords; using breach data is useful for detecting weak choices but should be acknowledged as an ethical trade-off."));
children.push(p("Data representation and feature engineering. Raw password strings cannot be fed to the model directly, so each password is transformed into a fixed vector of 15 numeric features. These are computed in src/features.py and shared by both training and the website, guaranteeing the model sees passwords identically in both settings. The features are:"));
children.push(bullet("Length, and counts of lowercase, uppercase, digit and special characters."));
children.push(bullet("Number of unique characters and the unique-to-length ratio."));
children.push(bullet("Number of character classes used (0–4)."));
children.push(bullet("Shannon entropy (bits per character) — a measure of unpredictability."));
children.push(bullet("Longest run of a repeated character, and whether an ascending sequence (abc, 123) is present."));
children.push(bullet("Digit / uppercase / special character ratios."));
children.push(bullet("Whether the password appears in a bundled list of common/breached passwords."));
children.push(p("Because we use a tree-based model, feature scaling is not required; tree splits are invariant to monotonic rescaling of individual features."));

// ---- 3: MODELING --------------------------------------------------------
children.push(h1("3: Modeling"));
children.push(p("Models explored. The final model is a Random Forest classifier (an ensemble of decision trees), chosen because it handles the mix of count- and ratio-valued features well, needs little tuning, and provides feature-importance scores that help explain its decisions."));
children.push(todo("If you tried others (e.g. logistic regression, a single decision tree), mention them here and why Random Forest was kept."));
children.push(p("Baseline. To know whether the model is actually learning something, we compare it against a trivial baseline — a DummyClassifier that always predicts the most frequent class — and, as a non-ML human-level reference, the well-known zxcvbn estimator. The model must clearly beat the majority-class baseline to be worthwhile."));
children.push(p("Results. The table below reports the metrics from a training run. These numbers are from the synthetic dataset and should be replaced with the values printed by src/train.py when trained on the Kaggle data."));
children.push(table(
  ["Metric", "Value (synthetic run)"],
  [
    ["Baseline accuracy (majority class)", "0.483"],
    ["Random Forest — test accuracy", "1.000"],
    ["5-fold cross-validation accuracy", "0.999 ± 0.001"],
    ["Precision / Recall / F1 (macro)", "1.00 / 1.00 / 1.00"],
  ],
  [4600, 4600],
));
children.push(p(""));
children.push(p("Confusion matrix (rows = true class, columns = predicted):"));
children.push(table(
  ["", "Pred Weak", "Pred Medium", "Pred Strong"],
  [
    ["True Weak", "571", "0", "0"],
    ["True Medium", "0", "2392", "0"],
    ["True Strong", "0", "0", "1987"],
  ],
  [2600, 2200, 2200, 2200],
));
children.push(p(""));
children.push(todo("Replace the two tables above with your Kaggle-trained numbers, and add a bar chart of the confusion matrix or class metrics if you like."));
children.push(p("Prediction mistakes and feature importance. The model reports which features it relies on most. In our run the most important features were length, the number of unique characters, uppercase ratio, and entropy — which matches intuition about what makes a password hard to guess. Inspecting where the model confuses adjacent classes (Weak vs Medium, Medium vs Strong) shows where extra features or more data would help most."));
children.push(table(
  ["Feature", "Importance"],
  [
    ["length", "0.244"],
    ["num_unique", "0.127"],
    ["upper_ratio", "0.121"],
    ["num_upper", "0.116"],
    ["entropy", "0.102"],
    ["digit_ratio", "0.097"],
  ],
  [5200, 4000],
));

// ---- 4: DEPLOYMENT ------------------------------------------------------
children.push(h1("4: Deployment"));
children.push(p("The trained model is saved to models/model.joblib and served through a Streamlit web application (app.py). The site presents a single password field; as the user types, the app extracts the same 15 features, runs the model, and displays the predicted strength class with a coloured meter, the model's confidence, an expandable feature breakdown, and a list of concrete suggestions (for example, “make it longer” or “add special characters”)."));
children.push(p("How predictions are used. The rating and suggestions guide the user toward a stronger password at the moment of choosing one. The password is never persisted."));
children.push(p("Monitoring and maintenance. Over time, password habits and breach corpora change, so the model should be retrained periodically on updated data; monitoring would track the distribution of inputs and ratings to detect drift. Future improvements include training on the full Kaggle dataset, adding character n-gram features, and benchmarking directly against zxcvbn."));
children.push(p("Deployment is free and reproducible via Streamlit Community Cloud: push the public repository to GitHub, connect it, and point it at app.py; it installs requirements.txt and serves the app at a public URL."));
children.push(todo("Paste your live Streamlit URL here, OR insert screenshots of the running app (e.g. the app rating a Medium and a Strong password)."));

// ---- 5: REFERENCES ------------------------------------------------------
children.push(h1("5: References"));
children.push(bullet("Kaggle — Password Strength Classifier Dataset (bhavikbb). https://www.kaggle.com/datasets/bhavikbb/password-strength-classifier-dataset"));
children.push(bullet("zxcvbn: Low-Budget Password Strength Estimation (Dropbox). https://github.com/dropbox/zxcvbn"));
children.push(bullet("scikit-learn: Machine Learning in Python. https://scikit-learn.org"));
children.push(bullet("Streamlit — open-source app framework. https://streamlit.io"));
children.push(todo("Cite any AI coding tools you used and any other sources, as required by the assignment."));

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22 } },
    },
  },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    children,
  }],
});

const out = path.join(__dirname, "DAT158_report_draft.docx");
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(out, buf); console.log("Wrote", out); });
