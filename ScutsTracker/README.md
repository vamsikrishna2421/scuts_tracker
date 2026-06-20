# Scuts Tracker

An intelligent, voice-first task tracker for the **Scuts** founders (Abhishek & Pavan Kalyan) to
manage and grow salon partnerships. Log every conversation with a salon owner by voice or text, and
a semantic layer of dedicated **Claude** agents turns each note into a clean summary, a sentiment
read on the owner's interest, a persuasion strategy, and a precise follow-up plan — then assembles a
daily list of **focus points and reminders** so nothing slips.

Built natively in **SwiftUI** (iOS 17+). Inspired by the intelligence-layer UX of the Lucy app
(capture inbox → processing states → "Today" focus cards → private "Ask" chat → settings with model
selection and a remote key), reimagined for the Scuts partnership pipeline and powered by Claude.

---

## The intelligence layer (the "MCPs")

Each note you log runs through a pipeline of specialized agents. They are independent, each with its
own role prompt and its own selectable model, exactly like dedicated MCP services:

| Agent | Job | Default model |
|-------|-----|---------------|
| **Summarizer** | Raw voice/text → clean description, key points, commitments, objections | Haiku 4.5 |
| **Sentiment** | Reads the owner's interest (0–100), momentum, buying signals & concerns | Sonnet 4.6 |
| **Strategist** | Builds a persuasion strategy: approach, talking points, objection handlers | Opus 4.8 |
| **Follow-up** | Decides *when*, *how often*, and *on what points* to follow up | Sonnet 4.6 |
| **Insight** | Daily brief across the whole pipeline | Sonnet 4.6 |
| **Assistant** | The interactive one-on-one chat | Opus 4.8 |

Your **company knowledge** (Scuts profile + any documents you upload in Settings) is injected into
every agent, so the more you tell it about the business, the sharper its help becomes.

---

## Requirements

- A **Mac** with **Xcode 16 or newer** (iOS apps can only be compiled on macOS).
- An **iPhone or the iOS Simulator** running **iOS 17+**.
- A **Claude API key** from <https://console.anthropic.com> — you add this *inside the app* on first
  launch; it is stored in the device **Keychain** and never written to disk or source.

> You are developing on Windows, so this repository contains the complete, ready-to-build **source**.
> Copy this `ScutsTracker/` folder to a Mac to compile and run it.

## Open & run

**Option A — open the project directly (simplest):**
1. Copy this folder to your Mac.
2. Double-click `ScutsTracker.xcodeproj`.
3. Select the `ScutsTracker` target → **Signing & Capabilities** → choose your Team.
4. Pick an iPhone simulator (or your device) and press **Run** (⌘R).

**Option B — regenerate the project with XcodeGen** (if the `.xcodeproj` ever drifts):
```bash
brew install xcodegen      # once
cd ScutsTracker
xcodegen generate          # rebuilds ScutsTracker.xcodeproj from project.yml
open ScutsTracker.xcodeproj
```

## First launch
1. The onboarding flow asks for your **Claude API key** (paste it; optionally **Test connection**).
2. Add a few lines of **company info** (or skip and do it later in Settings).
3. Tap the center **Log** tab, pick or add a salon owner, **hold to record** (or type), then
   **Process** — watch the agents run and your dashboard fill with focus points.

## Project layout
```
ScutsTracker/                      <- project root (xcodeproj, project.yml, this README)
  ScutsTracker/                    <- app source (one synchronized Xcode group)
    App/         entry point, root routing
    Theme/       colors, type, layout, reusable styling
    Models/      Partner, Interaction, Sentiment, Strategy, FollowUp, Reminder, ...
    Store/       DataStore, SettingsStore, persistence, Keychain
    Services/
      Claude/        ClaudeClient (Messages API + SSE streaming), request/response types
      SemanticLayer/ the agents + orchestrator + knowledge context builder
      Voice/         on-device speech-to-text
      Notifications/ local reminder notifications
    Views/       Onboarding, Dashboard, Partners, LogInteraction, Chat, Settings
    Components/   buttons, cards, gauges, charts, badges, empty states
    Resources/   Assets.xcassets, sample data
```

## Privacy & cost
- All partner notes live **on this device** (JSON in the app's Application Support directory). You can
  export everything from **Settings → Data**.
- Only the text needed for a given agent is sent to Claude when you process a note or chat.
- Models are configurable per agent in **Settings → Intelligence** (Best quality / Balanced / Economy
  presets, or pick individually) so you can tune the cost/quality trade-off.

Made for Scuts — transparent, better-priced, better-reviewed salon experiences.
