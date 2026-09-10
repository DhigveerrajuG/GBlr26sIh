# Support Guide

Thank you for using **SIH Support Desk**! We are committed to providing helpful resources and support to participants, hackathon organizers, and open-source contributors.

---

## 🔎 How to Get Help

Before opening an issue, please explore the existing documentation and search open resources:

1. **[README.md](README.md)**: Overview of architecture, local setup instructions, deployment guides for Google Apps Script, and sheet tab configurations.
2. **[CONTRIBUTING.md](CONTRIBUTING.md)**: Development instructions, testing workflows, and PR submission guidelines.
3. **[GitHub Issues](https://github.com/DhigveerrajuG/GBlr26sIh/issues)**: Check whether someone has already reported or solved your problem.
4. **[GitHub Discussions](https://github.com/DhigveerrajuG/GBlr26sIh/discussions)**: Ask general questions, propose ideas, or share your deployment setup.

---

## 🛠️ Common Troubleshooting Scenarios

### 1. "Script URL is not responding" or CORS errors
- Make sure your Google Apps Script Web App is deployed with **Who has access: Anyone**.
- Ensure you copied the `/exec` URL and not the `/dev` URL or script editor URL.
- Check that `SHARED_SECRET` matches exactly in both `apps-script-backend.gs` and `index.html`.

### 2. "Lock timed out" or write conflicts
- The backend utilizes `LockService.getScriptLock()` with a 30-second timeout to guarantee concurrency-safe sequential writes.
- Ensure the underlying spreadsheet is not locked by external bulk edits during peak event usage.

### 3. "Submission cooldown active"
- To prevent spam, the portal limits submissions per device via a local fingerprint timer (`COOLDOWN_SECONDS`, default 10 minutes).
- For local testing, you can reset the cooldown in browser DevTools: `localStorage.clear()`.

---

## 💬 Community Channels

- **Discussions & Questions:** [GitHub Discussions](https://github.com/DhigveerrajuG/GBlr26sIh/discussions)
- **Bug Reports:** [Open a Bug Report](https://github.com/DhigveerrajuG/GBlr26sIh/issues/new?template=bug_report.md)
- **Feature Proposals:** [Submit a Feature Request](https://github.com/DhigveerrajuG/GBlr26sIh/issues/new?template=feature_request.md)
- **Security Inquiries:** Follow our [Security Policy](SECURITY.md).
