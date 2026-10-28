const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, ImageRun,
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
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text, ...opts })] });
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
  const headerRow = new TableRow({ tableHeader: true,
    children: headers.map((hdr, i) => cell(hdr, { header: true, width: widths[i] })) });
  const bodyRows = rows.map(r => new TableRow({
    children: r.map((c, i) => cell(String(c), { width: widths[i], bold: i === 0 })) }));
  return new Table({ columnWidths: widths, width: { size: total, type: WidthType.DXA },
    rows: [headerRow, ...bodyRows] });
}

const children = [];

children.push(new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "Password Strength Checker — an ML Web App", bold: true })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
  children: [new TextRun({ text: "DAT158 — Assignment 2", color: MUTED })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
  children: [new TextRun({ text: "Abdulrahman (187457) · 28 October 2026" })] }));

children.push(h1("1: Describe the problem"));
children.push(h2("Scope"));
children.push(p("The goal of this project is a web application that estimates how strong a password is. A user types a password into the site and immediately receives a machine-learning-based rating — Weak, Medium, or Strong — together with a confidence score and concrete suggestions for making the password harder to guess."));
children.push(p("Password strength is a fuzzy judgment that depends on many interacting factors: length, the mix of character types, repetition, predictable sequences, and whether the password already appears in known breaches. Rather than hand-coding and endlessly tuning a set of rules, the task is treated as a supervised learning problem: a model learns, from labelled examples, which combinations of characteristics distinguish weak passwords from strong ones. This is why machine learning is a good fit for the task."));
children.push(p("The system is intended to sit inside a sign-up or password-change flow of any application that has user accounts, nudging users toward safer choices at the moment they pick a password. Today the problem is solved either manually — a person eyeballing length and variety — or with rule-based strength meters and open-source estimators such as Dropbox's zxcvbn. This product covers the same need but is learned from data and is easy to extend by adding features or retraining on newer data."));
children.push(p("Business objective: weak, reused, and breached passwords are a leading cause of account compromise, so helping users pick stronger passwords reduces the risk of account takeovers and the support cost of dealing with them. The business impact can be framed as fewer compromised accounts and measured as the share of users who end up choosing a strong password after seeing the feedback."));
children.push(p("The model is one component of a small pipeline: raw password → feature extraction → trained classifier → user-facing feedback. A change in one stage (for example adding a feature) requires retraining the classifier, so the stages are coupled. Resources required are modest: a standard laptop, the scikit-learn library, and a few seconds of training time; no GPU or special infrastructure is needed."));

children.push(h2("Metrics"));
children.push(p("Machine-learning metrics. Because this is a three-class classification task, performance is measured with overall accuracy, per-class precision, recall and F1-score, and the confusion matrix, which shows which classes get confused. 5-fold cross-validation is used to check that the result is stable and not an artefact of a single train/test split."));
children.push(p("Software metric. Because the model runs interactively in a website, prediction latency matters: a rating must feel instant. The features are cheap to compute and the model is small, so a single prediction is effectively immediate."));
children.push(p("Business metric for success. The project is considered a success if the tool clearly separates weak passwords from strong ones — in particular a high recall on the Weak class, so that weak passwords are rarely mislabelled as safe — and if, in use, it increases the proportion of users who choose a strong password compared with no feedback at all. As a concrete target, the model should reach at least 85% overall accuracy and clearly beat the majority-class baseline."));

children.push(h1("2: Data"));
children.push(p("The data consists of passwords, each labelled with a strength class: 0 = Weak, 1 = Medium, 2 = Strong. The dataset used for this project is built programmatically by the data pipeline (src/make_dataset.py) and contains about 24,000 unique passwords. It is constructed from three sources so that it resembles the range of passwords people actually choose:"));
children.push(bullet("Weak passwords: entries drawn from a bundled list of common and previously breached passwords (e.g. '123456', 'password', 'qwerty'), simple dictionary-word-plus-number combinations, and very short strings."));
children.push(bullet("Medium passwords: dictionary words with capitalisation, numbers, or light 'leet-speak' substitutions (e.g. 'Summer2020', 'fl0wer42')."));
children.push(bullet("Strong passwords: long random strings mixing upper- and lower-case letters, digits, and special characters."));
children.push(p("Ground-truth labels. Each generated password is assigned a label by a reference strength score based on crack-resistance ideas — length, how many character classes it uses, an estimate of its keyspace in bits, and whether it is a known common password. To keep the task realistic rather than trivially separable, roughly 7% of labels are randomly perturbed, reflecting the genuine ambiguity in judging passwords near a class boundary. The resulting class balance is 3,365 Weak, 11,355 Medium, and 9,139 Strong, which the training step preserves with a stratified split."));
children.push(p("Privacy and ethics. Passwords are sensitive personal data. The web application processes the entered password in memory only to compute features and a prediction — it is never stored, logged, or transmitted anywhere. A second consideration is that the 'common password' feature relies on lists of previously breached passwords; using breach data is useful for detecting weak choices but is acknowledged here as an ethical trade-off."));
children.push(p("Data representation and feature engineering. Raw password strings cannot be fed to the model directly, so each password is transformed into a fixed vector of 15 numeric features, computed in src/features.py and shared by both training and the website so the model sees passwords identically in both settings. The features are:"));
children.push(bullet("Length, and counts of lowercase, uppercase, digit and special characters."));
children.push(bullet("Number of unique characters and the unique-to-length ratio."));
children.push(bullet("Number of character classes used (0–4)."));
children.push(bullet("Shannon entropy (bits per character), a measure of unpredictability."));
children.push(bullet("Longest run of a repeated character, and whether an ascending sequence (abc, 123) is present."));
children.push(bullet("Digit, uppercase and special-character ratios."));
children.push(bullet("Whether the password appears in the bundled list of common passwords."));
children.push(p("Because the final model is tree-based, feature scaling is not required; tree splits are invariant to monotonic rescaling of individual features."));

children.push(h1("3: Modeling"));
children.push(p("Model. The final model is a Random Forest classifier, an ensemble of 200 decision trees. Simpler options such as logistic regression and a single decision tree were considered as lighter alternatives, but the Random Forest was selected because it handles the mix of count- and ratio-valued features well, needs little tuning, and provides feature-importance scores that help explain its decisions."));
children.push(p("Baseline. To confirm that the model is genuinely learning, it is compared against a trivial baseline — a classifier that always predicts the most frequent class — and, as a non-ML human-level reference, the well-known zxcvbn estimator. The baseline reaches only 47.6% accuracy, so any useful model must clearly exceed this."));
children.push(p("Results. On a held-out 20% test set the Random Forest reaches 91.8% accuracy, and 5-fold cross-validation gives 92.2% (±0.3%), confirming the result is stable."));
children.push(table(
  ["Metric", "Value"],
  [
    ["Baseline accuracy (majority class)", "0.476"],
    ["Random Forest — test accuracy", "0.918"],
    ["5-fold cross-validation accuracy", "0.922 ± 0.003"],
    ["Precision / Recall / F1 (macro avg)", "0.91 / 0.88 / 0.89"],
  ],
  [5200, 4000],
));
children.push(p(""));
children.push(p("Per-class performance:"));
children.push(table(
  ["Class", "Precision", "Recall", "F1", "Support"],
  [
    ["Weak", "0.91", "0.74", "0.81", "673"],
    ["Medium", "0.92", "0.96", "0.94", "2271"],
    ["Strong", "0.91", "0.93", "0.92", "1828"],
  ],
  [2400, 1650, 1650, 1650, 1850],
));
children.push(p(""));
children.push(p("Confusion matrix (rows = true class, columns = predicted):"));
children.push(table(
  ["", "Pred Weak", "Pred Medium", "Pred Strong"],
  [
    ["True Weak", "497", "83", "93"],
    ["True Medium", "24", "2176", "71"],
    ["True Strong", "27", "94", "1707"],
  ],
  [2600, 2200, 2200, 2200],
));
children.push(p(""));
children.push(p("The matrix shows the model is strongest on the Medium and Strong classes. Most errors are on the Weak class (recall 0.74), where some weak passwords are predicted as Medium or Strong; these are mainly borderline cases near the length and character-variety boundaries, and are partly a consequence of the intentional label noise in the data."));
children.push(p("Feature importance. The model reports which features it relies on most. The most important were length, Shannon entropy, and the number of unique characters, which matches intuition about what makes a password hard to guess. This suggests that encouraging users to increase length and character variety is the most effective advice the tool can give."));
children.push(table(
  ["Feature", "Importance"],
  [
    ["length", "0.338"],
    ["entropy", "0.135"],
    ["num_unique", "0.126"],
    ["digit_ratio", "0.070"],
    ["upper_ratio", "0.068"],
    ["num_upper", "0.066"],
  ],
  [5200, 4000],
));

children.push(h1("4: Deployment"));
children.push(p("The trained model is saved to models/model.joblib and served through a Streamlit web application (app.py). The site presents a single password field; when the user enters a password, the app extracts the same 15 features, runs the model, and displays the predicted strength class with a coloured meter, the model's confidence, an expandable feature breakdown, and a list of concrete suggestions (for example 'make it longer' or 'add special characters')."));
children.push(p("How predictions are used. The rating and suggestions guide the user toward a stronger password at the moment of choosing one. The password is processed in memory only and is never persisted."));
children.push(p("Monitoring and maintenance. Over time, password habits and breach data change, so the model should be retrained periodically on updated data; monitoring would track the distribution of inputs and ratings to detect drift. Possible future improvements include adding character n-gram features and benchmarking directly against zxcvbn."));
children.push(p("The application runs locally with 'streamlit run app.py' and can be deployed for free on Streamlit Community Cloud by connecting the public GitHub repository and pointing it at app.py. A screenshot of the running application is shown below."));

const imgPath = path.join(__dirname, "app_screenshot.jpg");
if (fs.existsSync(imgPath)) {
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 60 },
    children: [new ImageRun({ type: "jpg", data: fs.readFileSync(imgPath),
      transformation: { width: 460, height: 345 } })] }));
  children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
    children: [new TextRun({ text: "The web application rating a strong password.", italics: true, color: MUTED })] }));
}

children.push(h1("5: References"));
children.push(bullet("zxcvbn: Low-Budget Password Strength Estimation (Dropbox). https://github.com/dropbox/zxcvbn"));
children.push(bullet("scikit-learn: Machine Learning in Python. https://scikit-learn.org"));
children.push(bullet("Streamlit — open-source app framework for data apps. https://streamlit.io"));
children.push(bullet("Common-password / breached-password lists (e.g. the SecLists collection) informed the common-password feature. https://github.com/danielmiessler/SecLists"));
children.push(bullet("Parts of the code and report were developed with the assistance of the AI coding assistant Claude."));

const doc = new Document({
  styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    children,
  }],
});

const out = path.join(__dirname, "DAT158_report.docx");
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(out, buf); console.log("Wrote", out); });
