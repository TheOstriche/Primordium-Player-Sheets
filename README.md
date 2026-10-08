# Primordium Character Sheet

A phone app for Primordium 2.0 characters. It runs in the browser, installs to the home screen on iPhone and Android, works offline, and saves characters on the device.

## Publish it with GitHub Pages

1. Create a new repository on GitHub (for example `primordium-sheet`).
2. Upload every file in this folder to the repository, keeping the `icons` folder.
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose `main` and `/ (root)`, and save.
4. After a minute the app is live at `https://<your-username>.github.io/primordium-sheet/`.

## Install it on a phone

- **iPhone (Safari):** open the link, tap **Share**, then **Add to Home Screen**.
- **Android (Chrome):** open the link, tap the **⋮** menu, then **Install app** or **Add to Home screen**.

## Saving and backups

Characters are stored on each phone. Use **⋯ → Export all characters** to save a backup file, and **Import a backup** to load it on another device.

## Publishing changes

When you change any file, also raise `VERSION` in `sw.js` (for example `primordium-v2`). That tells installed phones to download the new version instead of using the cached one.

## Files

- `index.html`: the app shell
- `app.js`: screens, rules, and saving
- `data.js`: game data (races, skills and paths, stacks, rarities)
- `style.css`: the look
- `sw.js`: offline support
- `manifest.webmanifest` and `icons/`: home screen install
