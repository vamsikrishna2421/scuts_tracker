import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject private var settings: SettingsStore
    @State private var step = 0

    var body: some View {
        ZStack {
            LinearGradient(colors: [Brand.indigo.opacity(0.18), Color.appBackground],
                           startPoint: .top, endPoint: .center)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                switch step {
                case 0: welcome
                case 1: apiKey
                default: ready
                }
            }
            .padding(Layout.screenPadding)
            .animation(.easeInOut, value: step)
        }
    }

    // MARK: Step 0 — welcome

    private var welcome: some View {
        VStack(spacing: 0) {
            Spacer()
            AppLogoMark(size: 92)
            Text("Scuts Tracker")
                .font(.largeTitle.bold())
                .padding(.top, 18)
            Text("Your intelligent partner for growing salon partnerships.")
                .font(.title3)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.top, 6)

            VStack(spacing: 14) {
                FeatureRow(icon: "waveform", tint: Brand.indigo,
                           title: "Log by voice or text",
                           detail: "Capture every salon-owner conversation in seconds.")
                FeatureRow(icon: "brain.head.profile", tint: Brand.violet,
                           title: "AI reads the room",
                           detail: "Sentiment, strategy and objection handling — automatically.")
                FeatureRow(icon: "checklist", tint: Brand.teal,
                           title: "Daily focus points",
                           detail: "Exactly who to follow up with, when, and on what.")
            }
            .padding(.top, 32)

            Spacer()

            Button("Get started") { step = 1 }
                .buttonStyle(.primaryGradient)
        }
    }

    // MARK: Step 1 — API key

    private var apiKey: some View {
        VStack(alignment: .leading, spacing: 0) {
            stepHeader(index: 1,
                       title: "Connect Claude",
                       subtitle: "Scuts Tracker uses your own Claude API key to power its intelligence. Paste it below — you can change it any time in Settings.")

            ScrollView {
                APIKeyEditor()
                    .cardStyle()
                    .padding(.top, 8)
            }
            .scrollIndicators(.hidden)

            VStack(spacing: 10) {
                Button(settings.hasAPIKey ? "Continue" : "Continue without a key") { step = 2 }
                    .buttonStyle(.primaryGradient)
                Button("Back") { step = 0 }
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding(.top, 8)
        }
    }

    // MARK: Step 2 — ready

    private var ready: some View {
        VStack(spacing: 0) {
            Spacer()
            ZStack {
                Circle().fill(Brand.gradient).frame(width: 96, height: 96)
                Image(systemName: "checkmark")
                    .font(.system(size: 44, weight: .bold))
                    .foregroundStyle(.white)
            }
            Text("You're all set")
                .font(.largeTitle.bold())
                .padding(.top, 20)

            Text(welcomeLine)
                .font(.title3)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.top, 6)

            VStack(alignment: .leading, spacing: 12) {
                TipRow(text: "Tap the **Log** tab, pick a salon owner, and hold to record an update.")
                TipRow(text: "Watch the agents summarize, read sentiment, and plan your follow-up.")
                TipRow(text: "Your **Today** screen fills with strategic focus points.")
            }
            .padding(.top, 30)

            Spacer()

            Button("Start tracking") {
                settings.onboardingComplete = true
            }
            .buttonStyle(.primaryGradient)

            Button("Add a key first") { step = 1 }
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .padding(.top, 6)
                .opacity(settings.hasAPIKey ? 0 : 1)
        }
    }

    private var welcomeLine: String {
        let names = settings.companyProfile.founders.map(\.name)
        switch names.count {
        case 0: return "Let's grow the Scuts pipeline."
        case 1: return "Welcome, \(names[0]). Let's grow Scuts."
        default: return "Welcome, \(names[0]) & \(names[1]). Let's grow Scuts."
        }
    }

    private func stepHeader(index: Int, title: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Step \(index) of 2")
                .font(.caption.weight(.bold))
                .foregroundStyle(Brand.indigo)
            Text(title).font(.largeTitle.bold())
            Text(subtitle).font(.subheadline).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Small building blocks

struct AppLogoMark: View {
    var size: CGFloat = 80
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.26, style: .continuous)
                .fill(Brand.gradient)
            Image(systemName: "scissors")
                .font(.system(size: size * 0.46, weight: .bold))
                .foregroundStyle(.white)
                .rotationEffect(.degrees(-20))
        }
        .frame(width: size, height: size)
        .shadow(color: Brand.indigo.opacity(0.35), radius: 16, y: 8)
    }
}

private struct FeatureRow: View {
    let icon: String
    let tint: Color
    let title: String
    let detail: String
    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(tint)
                .frame(width: 46, height: 46)
                .background(tint.opacity(0.14), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.headline)
                Text(detail).font(.subheadline).foregroundStyle(.secondary)
            }
            Spacer()
        }
    }
}

private struct TipRow: View {
    let text: LocalizedStringKey
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "sparkles")
                .foregroundStyle(Brand.violet)
            Text(text).font(.subheadline)
            Spacer(minLength: 0)
        }
    }
}
