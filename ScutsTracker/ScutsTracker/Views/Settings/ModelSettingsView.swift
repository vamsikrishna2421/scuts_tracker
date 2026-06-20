import SwiftUI

struct ModelSettingsView: View {
    @EnvironmentObject private var settings: SettingsStore

    var body: some View {
        Form {
            Section {
                ForEach(ModelPreset.allCases) { preset in
                    Button {
                        withAnimation { settings.applyPreset(preset) }
                    } label: {
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: settings.matchedPreset == preset ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(settings.matchedPreset == preset ? Brand.indigo : .secondary)
                                .padding(.top, 1)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(preset.label).font(.body.weight(.medium)).foregroundStyle(.primary)
                                Text(preset.detail).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                        }
                    }
                }
            } header: {
                Text("Quick presets")
            } footer: {
                Text("A preset sets every agent at once. You can still fine-tune each one below.")
            }

            Section {
                ForEach(AgentRole.allCases) { role in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack(spacing: 10) {
                            Image(systemName: role.icon)
                                .foregroundStyle(Brand.indigo)
                                .frame(width: 26)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(role.displayName).font(.subheadline.weight(.medium))
                                Text(role.blurb).font(.caption2).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Picker("", selection: binding(for: role)) {
                                ForEach(ClaudeModel.allCases) { model in
                                    Text(model.displayName).tag(model)
                                }
                            }
                            .labelsHidden()
                            .pickerStyle(.menu)
                            .tint(Brand.indigo)
                        }
                    }
                    .padding(.vertical, 2)
                }
            } header: {
                Text("Per-agent model")
            } footer: {
                Text("Opus reasons deepest (great for strategy & chat); Haiku is fastest and cheapest; Sonnet sits in between.")
            }
        }
        .navigationTitle("Intelligence")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func binding(for role: AgentRole) -> Binding<ClaudeModel> {
        Binding(
            get: { settings.model(for: role) },
            set: { settings.setModel($0, for: role) }
        )
    }
}
