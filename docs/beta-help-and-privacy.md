# Beta Help and Privacy

## Purpose
This note aligns visible beta help, support, and privacy wording with the current CookMoxs product behavior.

## What the app does today
- Recipes can be used locally in the browser.
- If the user signs in, recipes and folders can sync through Firebase Auth and Firestore.
- Cloud sync is not the same as backup. Backup export and restore are separate user actions.
- AI is an optional enhancement. The app still has useful non-AI paths.
- Learning feedback is explicit, optional, and stored locally in the current browser only.
- Nutrition and barcode are modular beta work and should not be described as core always-on behavior.

## User-facing wording rules
### Sync and backup
- Say that cloud sync helps keep the latest data available when signed in.
- Do not say that cloud sync is a full backup or historical archive.
- Say that backup export creates a separate restore point.

### AI
- Say that AI can help improve or clean up content.
- Do not say that AI is required for the base product to work.
- If AI is unavailable, help text should still point to non-AI paths where relevant.

### Learning
- Say that learning feedback is voluntary and local to the current browser.
- Do not imply hidden profiling, automatic recommendations, or cross-user learning.
- Do not imply that learning data is stored in recipe objects, backup files, or Firestore.

### Support
- Say that copied support info contains simple app status only.
- Do not imply that copied support info includes recipe text, images, notes, or a full technical dump.

## Controlled beta phrasing
- Prefer "beta-feedback", "supportinfo", and "kort status" over more technical terms.
- Keep user-facing wording explanation-first and non-technical.
- Avoid legal or privacy promises beyond the actual product behavior above.
