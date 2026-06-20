import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var data: DataStore
    @EnvironmentObject private var settings: SettingsStore
    @State private var showResetConfirm = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    NavigationLink {
                        APIKeyScreen()
                    } label: {
                        SettingRow(icon: "key.fill", tint: Brand.indigo, title: "Claude API key",
                                   value: settings.hasAPIKey ? "Connected" : "Not set",
                                   valueColor: settings.hasAPIKey ? .positive : .secondary)
                    }
                    NavigationLink {
                        ModelSettingsView()
                    } label: {
                        SettingRow(icon: "cpu.fill", tint: Brand.violet, title: "Intelligence & models",
                                   value: settings.matchedPreset?.label ?? "Custom")
                    }
                } header: {
                    Text("Claude")
                } footer: {
                    Text("Scuts Tracker uses your own Claude API key. Choose which model powers each agent.")
                }

                Section {
                    NavigationLink {
                        CompanyProfileView()
                    } label: {
                        SettingRow(icon: "building.2.fill", tint: Brand.teal, title: "Company profile",
                                   value: settings.companyProfile.name)
                    }
                    NavigationLink {
                        KnowledgeBaseView()
                    } label: {
                        SettingRow(icon: "books.vertical.fill", tint: Brand.amber, title: "Knowledge base",
                                   value: "\(settings.knowledgeDocuments.count) doc\(settings.knowledgeDocuments.count == 1 ? "" : "s")")
                    }
                } header: {
                    Text("What the agents learn from")
                } footer: {
                    Text("The more you tell the app about Scuts, the sharper its strategies and follow-ups.")
                }

                Section("Preferences") {
                    Toggle(isOn: $settings.autoRunAnalysis) {
                        Label("Auto-run analysis on new notes", systemImage: "wand.and.stars")
                    }
                    Toggle(isOn: $settings.notificationsEnabled) {
                        Label("Follow-up reminders", systemImage: "bell.fill")
                    }
                    Stepper(value: $settings.defaultCadenceDays, in: 1...30) {
                        Label("Default cadence: \(settings.defaultCadenceDays) day\(settings.defaultCadenceDays == 1 ? "" : "s")", systemImage: "repeat")
                    }
                }
                .tint(Brand.indigo)

                Section("Data") {
                    ShareLink(item: data.exportJSON()) {
                        Label("Export all data (JSON)", systemImage: "square.and.arrow.up")
                    }
                    Button(role: .destructive) {
                        showResetConfirm = true
                    } label: {
                        Label("Clear all partners & notes", systemImage: "trash")
                    }
                }

                Section {
                    aboutFooter
                }
            }
            .navigationTitle("Settings")
            .onChange(of: settings.notificationsEnabled) { _, enabled in
                Task {
                    if enabled { _ = await NotificationManager.shared.requestAuthorization() }
                    NotificationManager.shared.reschedule(from: data.reminders, enabled: enabled)
                }
            }
            .confirmationDialog("Clear all partners, notes and reminders? Your API key and company profile are kept.",
                                isPresented: $showResetConfirm, titleVisibility: .visible) {
                Button("Clear everything", role: .destructive) { data.resetAll() }
            }
        }
    }

    private var aboutFooter: some View {
        VStack(spacing: 8) {
            AppLogoMark(size: 52)
            Text("Scuts Tracker").font(.headline)
            Text("Version \(appVersion)").font(.caption).foregroundStyle(.secondary)
            Text("Built for \(foundersLine) — transparent, better-reviewed, fairly-priced salon experiences.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }

    private var foundersLine: String {
        let names = settings.companyProfile.founders.map(\.name)
        return names.isEmpty ? "Scuts" : names.joined(separator: " & ")
    }

    private var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
    }
}

struct SettingRow: View {
    let icon: String
    let tint: Color
    let title: String
    var value: String = ""
    var valueColor: Color = .secondary

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.subheadline)
                .foregroundStyle(.white)
                .frame(width: 30, height: 30)
                .background(tint, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            Text(title)
            Spacer()
            Text(value).foregroundStyle(valueColor).font(.subheadline)
        }
    }
}

// MARK: - API key screen

private struct APIKeyScreen: View {
    var body: some View {
        ScrollView {
            VStack(spacing: Layout.spacing) {
                APIKeyEditor().cardStyle()
                VStack(alignment: .leading, spacing: 8) {
                    Label("How it's used", systemImage: "info.circle")
                        .font(.subheadline.weight(.semibold))
                    Text("Each note you log makes a few small requests to Claude to summarize, read sentiment, and plan follow-ups. You only pay your own Claude usage. Adjust which model each agent uses under Intelligence & models to tune cost.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .cardStyle()
            }
            .padding(Layout.screenPadding)
        }
        .background(Color.appBackground)
        .navigationTitle("Claude API key")
        .navigationBarTitleDisplayMode(.inline)
    }
}
