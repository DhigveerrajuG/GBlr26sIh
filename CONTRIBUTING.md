# Contributing to SIH Support Desk

Thank you for your interest in contributing to **SIH Support Desk**! We welcome all contributions from bug fixes to new feature implementations and documentation improvements.

Please review this guide to understand our contribution workflow and code quality guidelines.

---

## 📜 Code of Conduct

All contributors and participants are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to [@DhigveerrajuG](https://github.com/DhigveerrajuG).

---

## 🚀 Getting Started

### 1. Fork and Clone the Repository
```bash
git clone https://github.com/<your-username>/GBlr26sIh.git
cd GBlr26sIh
```

### 2. Run Locally
The project is pure vanilla frontend (HTML5/CSS3/JavaScript) and Google Apps Script backend. You can spin up a local development server with Python:

```bash
# Using Python 3:
python -m http.server 8080
```

Open your browser to:
- **Participant Portal:** `http://localhost:8080/index.html`
- **Organizer Dashboard:** `http://localhost:8080/admin.html`

---

## 🛠️ Project Structure & Architecture

```text
├── index.html              # Participant issue submission portal
├── admin.html              # Organizer/admin ticket management dashboard
├── apps-script-backend.gs  # Google Apps Script Web App API backend
├── images/                 # Branding and logos (e.g. sih_logo_transparent.png)
├── CONTRIBUTORS.md         # Contributors acknowledgements & roles
├── .all-contributorsrc     # Specification of contributors
├── CODE_OF_CONDUCT.md      # Community Code of Conduct
├── CONTRIBUTING.md         # Contribution guidelines (this file)
├── SECURITY.md             # Security policy and disclosure guidelines
├── LICENSE                 # MIT License
└── README.md               # Main project documentation
```

---

## 💡 How to Contribute

### Reporting Bugs
- Check the [existing Issues](https://github.com/DhigveerrajuG/GBlr26sIh/issues) before opening a new one to avoid duplicates.
- Use our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md).
- Include clear steps to reproduce, browser version, expected vs. actual behavior, and relevant console logs or screenshots.

### Suggesting Enhancements
- Open an issue using the [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md).
- Describe the motivation, problem it solves, and potential implementation approach.

### Submitting Pull Requests

1. **Create a Feature Branch:**
   ```bash
   git checkout -b feat/your-feature-name
   # or for bug fixes:
   git checkout -b fix/issue-description
   ```

2. **Code Style & Guidelines:**
   - **Vanilla Standard:** Maintain vanilla JavaScript, HTML5, and CSS without unnecessary external runtime framework dependencies.
   - **Responsive UI:** Ensure all designs work seamlessly on both mobile viewports and desktop monitors.
   - **Semantic & Accessible:** Use semantic HTML tags, accessible form labels, and appropriate ARIA attributes where needed.
   - **Performance:** Preserve fast loading times and zero-dependency efficiency (e.g., SWR caching patterns in `admin.html`).

3. **Security Rules:**
   - ⚠️ **NEVER commit live `SCRIPT_URL` endpoints containing personal Google Sheets IDs or active production credentials.**
   - Keep placeholders like `YOUR_SHARED_SECRET_HERE` in templates.
   - Sanitize all user inputs before rendering to prevent Cross-Site Scripting (XSS).

4. **Commit Conventions:**
   Use clear, conventional commit messages:
   - `feat: add ticket export to CSV feature`
   - `fix: resolve mobile dropdown overflow in admin table`
   - `docs: update deployment instructions for Google Sheets`
   - `style: refine button hover micro-interactions`

5. **Submit the Pull Request:**
   - Push your branch:
     ```bash
     git push origin feat/your-feature-name
     ```
   - Open a Pull Request against the `main` branch.
   - Fill in the [Pull Request Template](.github/pull_request_template.md).

---

## 👥 Contributors & Recognition

We celebrate all contributors! Once your PR is merged, your contribution will be recorded in:
- [CONTRIBUTORS.md](CONTRIBUTORS.md)
- [.all-contributorsrc](.all-contributorsrc)

Thank you for helping make SIH Support Desk better!
