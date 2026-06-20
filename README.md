# Scuts Tracker

An intelligent, voice-first partnership tracker for the **Scuts** founders (Abhishek & Pavan Kalyan).
Log every conversation with a salon owner by voice or text; a **semantic layer of dedicated Claude
agents** turns each note into a clean summary, a sentiment read, a persuasion strategy, and a precise
follow-up plan — then assembles your daily **focus points and reminders**.

This repo is set up exactly like the **Lucy** app so it builds **iOS in the cloud (no Mac needed)**:

- **Expo SDK 56 + React Native 0.85 + TypeScript** (the buildable app — `App.tsx`, `src/`, `app.json`).
- **Cloud iOS builds via Codemagic** (`codemagic.yaml`) → TestFlight, and **EAS** (`eas.json`) for OTA.
- Powered by the **Claude API** — your key is entered in-app and stored in the device Keychain
  (`expo-secure-store`); never bundled.
- `ScutsTracker/` is an **alternative native SwiftUI** version (reference only; needs a Mac to build).

---

## The intelligence layer (the "MCPs")

Each note runs through specialized Claude agents, each with its own role prompt and selectable model
(`src/semanticLayer.ts`): **Summarizer → Sentiment → Strategist → Follow-up planner**, plus **Insight**
(daily brief) and the **Assistant** chat. Your company knowledge (Settings → Company / Knowledge base) is
injected into every agent.

---

## Run it locally (optional, needs a dev build)

```bash
npm install
npx expo install --fix          # aligns every package to Expo SDK 56
npx expo prebuild               # generates ios/ + android/
# iOS needs a Mac for a local run; on Windows use the cloud build below,
# or run Android: npx expo run:android   (or `npx expo start` with a dev client)
```

Speech-to-text and the Keychain require a **dev/native build** (not Expo Go).

---

## Cloud build → TestFlight (the Lucy workflow)

iOS is compiled on Codemagic's macOS machines, so you never need a Mac.

### 1. Push this repo to GitHub
See "Pushing to GitHub" below — the remote is `https://github.com/vamsikrishna2421/scuts_tracker`.

### 2. Connect Codemagic
1. In **Codemagic** → add application → connect the `scuts_tracker` GitHub repo.
2. Reuse (or recreate) the **`ios-creds`** variable group you made for Lucy — it holds the
   App Store Connect API key vars (`APP_STORE_CONNECT_PRIVATE_KEY`, `APP_STORE_CONNECT_KEY_IDENTIFIER`,
   `APP_STORE_CONNECT_ISSUER_ID`).
3. In **App Store Connect**, create a new app record for bundle id **`com.scuts.tracker`** (name
   "Scuts Tracker"). Codemagic's signing step auto-creates the bundle id & profile (`--create`), but the
   App Store app record must exist for the TestFlight upload.
4. Run the **"Scuts Tracker — iOS TestFlight"** workflow from the Codemagic dashboard. The build emails
   `vamsy.24@gmail.com` and uploads to TestFlight.

> The Apple **Team ID** in `ExportOptions.plist` is `CJ8SV692GN` (the same one Lucy uses). Change it if
> you build under a different Apple Developer account.

### 3. (Optional) EAS instead of / alongside Codemagic
```bash
npm i -g eas-cli
eas login
eas init                        # writes extra.eas.projectId into app.json
eas build --platform ios --profile testflight
eas submit --platform ios --profile testflight
# JS-only updates afterwards (no rebuild):
eas update --branch production
```

---

## Pushing to GitHub

`gh` isn't installed locally, so use plain git (your GitHub credentials in Windows Credential Manager):

```bash
git add -A
git commit -m "Scuts Tracker — Expo app + cloud build pipeline"
git branch -M main
git remote add origin https://github.com/vamsikrishna2421/scuts_tracker.git
git push -u origin main
```
If the push asks for credentials, sign in to GitHub once (browser or a Personal Access Token).

---

## What you need to provide (manual steps)

| Step | Who | Notes |
|------|-----|-------|
| Push repo to GitHub | you (one `git push`) | credentials prompt the first time |
| Connect Codemagic to the repo | you | one-time |
| `ios-creds` variable group + ASC API key | you | reuse Lucy's, or recreate |
| App Store Connect app record for `com.scuts.tracker` | you | name it "Scuts Tracker" |
| Trigger the Codemagic build | you | → TestFlight |
| Add your **Claude API key** | in the app | Settings → Claude API (Keychain) |
| (Optional) real app icon | you | replace `assets/icon.png` (1024²) |

Everything else — the app, agents, config, and pipeline — is already wired up.

## Project layout
```
App.tsx                 root: tab bar + overlay navigation
index.ts                Expo entry
app.json                Expo config (bundle id, permissions, plugins)
eas.json                EAS build profiles + OTA channel
codemagic.yaml          cloud iOS/Android build → TestFlight
src/
  theme.ts types.ts format.ts           design + domain models
  claude.ts json.ts knowledge.ts        Claude API client + helpers
  semanticLayer.ts                       the agents + orchestration
  store.tsx select.ts presets.ts         state, selectors, model presets
  storage.ts secure.ts voice.ts          AsyncStorage, Keychain, speech
  sampleData.ts                          seed pipeline
  components/  screens/                   UI
assets/                 generated icon / splash (replace anytime)
ScutsTracker/           alternative native SwiftUI app (reference)
```
