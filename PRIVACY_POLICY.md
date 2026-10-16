# Privacy Policy for WP Detector

**Effective Date:** October 14, 2026  
**Last Updated:** October 14, 2026  

WP Detector ("we", "our", or "the extension") is a developer tool designed to inspect and display the WordPress technology stack running on public websites. We are committed to protecting your privacy and being transparent about our data practices.

---

### 1. Information We Do NOT Collect
WP Detector does **NOT** collect, store, sell, or transmit any personally identifiable information (PII). Specifically:
- We do not collect your name, email address, physical address, or phone number.
- We do not collect or monitor your browsing history.
- We do not track keystrokes, form submissions, passwords, or authentication credentials.
- We do not use tracking cookies, web beacons, or persistent local identifiers.
- We do not integrate any third-party advertising or analytics SDKs (such as Google Analytics or Facebook Pixel).

---

### 2. How the Extension Operates & Data Usage

All core analysis and inspection happen **locally within your browser**.

- **Active Tab Analysis (`activeTab`, `scripting`, `tabs`):**  
  When you explicitly click the extension icon, the extension temporarily reads the URL and inspects the public DOM elements and HTTP response headers of the active tab to identify WordPress generator tags, themes, and plugin asset paths. This inspection runs locally on your machine and is never transmitted to us or any external servers.

- **WordPress Core Release Verification (`api.wordpress.org`):**  
  To verify if the detected WordPress core version is up to date, the extension sends a read-only request to the official WordPress.org public API (`https://api.wordpress.org/core/version-check/1.7/`). No personal user data or site credentials are sent in this request.

- **DNS & Host IP Resolution (`dns.google`):**  
  To display the public IP address and nameservers of the website you are viewing, the extension queries Google's public DNS-over-HTTPS service (`https://dns.google/resolve`). Only the domain name of the current site is resolved. No user identity or tracking information is transmitted.

---

### 3. Data Storage
WP Detector does not operate any external databases or remote servers. No information about the websites you inspect or your interactions with the extension is saved outside your local browser session.

---

### 4. Data Sharing & Disclosure
Because we do not collect any personal data:
- We do not sell, rent, or trade user data to third parties.
- We do not use user data for targeted advertising, creditworthiness, or lending purposes.
- We do not transfer user data to data brokers.

---

### 5. Permissions
The permissions requested by WP Detector in `manifest.json` are strictly limited to the technical functions needed for website technology detection:
- `activeTab` & `scripting`: Required to inspect the DOM of the active tab when invoked.
- `tabs`: Required to check the current tab URL and prevent execution on internal browser pages (`chrome://`).
- `https://api.wordpress.org/*`: Required to check WordPress version updates.
- `https://dns.google/*`: Required for public DNS-over-HTTPS lookup.

---

### 6. Children's Privacy
WP Detector is a general-purpose web development tool and does not knowingly collect any data from children.

---

### 7. Changes to This Privacy Policy
We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated "Last Updated" date.

---

### 8. Contact Us
If you have any questions or concerns regarding this Privacy Policy, please contact:
- **Email:** support@example.com *(replace with your contact email)*
