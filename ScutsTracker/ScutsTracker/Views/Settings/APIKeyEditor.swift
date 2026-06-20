import SwiftUI

/// Reusable Claude API-key editor used in both onboarding and Settings.
struct APIKeyEditor: View {
    @EnvironmentObject private var settings: SettingsStore
    @State private var draft = ""
    @State private var test: TestState = .idle
    @FocusState private var focused: Bool

    enum TestState: Equatable {
        case idle, testing, ok, failed(String)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            statusRow

            SecureField("sk-ant-api03-…", text: $draft)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .focused($focused)
                .padding(12)
                .background(Color.elevatedBackground, in: RoundedRectangle(cornerRadius: Layout.controlRadius, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: Layout.controlRadius, style: .continuous)
                        .stroke(focused ? Brand.indigo.opacity(0.5) : .clear, lineWidth: 1.5)
                )

            HStack(spacing: 10) {
                Button {
                    save()
                } label: {
                    Text(settings.hasAPIKey ? "Update key" : "Save key")
                }
                .buttonStyle(.primaryGradient)
                .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                .opacity(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0.5 : 1)

                Button {
                    runTest()
                } label: {
                    if test == .testing {
                        ProgressView().tint(Brand.indigo)
                    } else {
                        Text("Test")
                    }
                }
                .buttonStyle(.secondarySoft)
                .frame(maxWidth: 110)
                .disabled(test == .testing || (!settings.hasAPIKey && draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty))
            }

            testResult

            Link(destination: URL(string: "https://console.anthropic.com/settings/keys")!) {
                Label("Get a key from console.anthropic.com", systemImage: "arrow.up.right.square")
                    .font(.footnote)
            }

            Text("Your key is stored only in this device's Keychain — never in the app's data file or in code.")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private var statusRow: some View {
        HStack(spacing: 10) {
            Image(systemName: settings.hasAPIKey ? "checkmark.seal.fill" : "key.horizontal.fill")
                .foregroundStyle(settings.hasAPIKey ? Color.positive : .secondary)
            Text(settings.hasAPIKey ? "A Claude API key is set." : "No API key yet.")
                .font(.subheadline.weight(.medium))
            Spacer()
            if settings.hasAPIKey {
                Button(role: .destructive) {
                    settings.removeAPIKey()
                    test = .idle
                } label: {
                    Text("Remove").font(.footnote.weight(.semibold))
                }
            }
        }
    }

    @ViewBuilder
    private var testResult: some View {
        switch test {
        case .ok:
            Label("Connected to Claude successfully.", systemImage: "checkmark.circle.fill")
                .font(.footnote).foregroundStyle(Color.positive)
        case .failed(let message):
            Label(message, systemImage: "exclamationmark.triangle.fill")
                .font(.footnote).foregroundStyle(Color.negative)
        default:
            EmptyView()
        }
    }

    private func save() {
        let key = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else { return }
        settings.saveAPIKey(key)
        draft = ""
        focused = false
        test = .idle
    }

    private func runTest() {
        let key = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        if !key.isEmpty {
            settings.saveAPIKey(key)
            draft = ""
        }
        guard settings.hasAPIKey else {
            test = .failed("Enter a key first.")
            return
        }
        focused = false
        test = .testing
        Task {
            do {
                _ = try await ClaudeClient.shared.complete(
                    model: .haiku,
                    system: "Reply with the single word: OK.",
                    messages: [.user("ping")],
                    maxTokens: 5
                )
                test = .ok
            } catch {
                test = .failed((error as? ClaudeError)?.errorDescription ?? error.localizedDescription)
            }
        }
    }
}
