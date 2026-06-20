import SwiftUI

struct CompanyProfileView: View {
    @EnvironmentObject private var settings: SettingsStore

    @State private var valuePropsText = ""
    @State private var differentiatorsText = ""

    var body: some View {
        Form {
            Section("Basics") {
                TextField("Company name", text: $settings.companyProfile.name)
                TextField("Tagline", text: $settings.companyProfile.tagline, axis: .vertical)
                    .lineLimit(1...3)
            }

            Section("About") {
                TextField("What the company does…", text: $settings.companyProfile.about, axis: .vertical)
                    .lineLimit(3...8)
            }

            Section {
                TextField("One value per line", text: $valuePropsText, axis: .vertical)
                    .lineLimit(3...8)
                    .onChange(of: valuePropsText) { _, newValue in
                        settings.companyProfile.valueProps = lines(newValue)
                    }
            } header: {
                Text("Value to the salon")
            } footer: {
                Text("Why a salon owner benefits from partnering with you.")
            }

            Section("Differentiators") {
                TextField("One per line", text: $differentiatorsText, axis: .vertical)
                    .lineLimit(3...8)
                    .onChange(of: differentiatorsText) { _, newValue in
                        settings.companyProfile.differentiators = lines(newValue)
                    }
            }

            Section("Positioning") {
                TextField("Pricing stance", text: $settings.companyProfile.pricingNotes, axis: .vertical)
                    .lineLimit(2...5)
                TextField("Target salon owner", text: $settings.companyProfile.targetCustomer, axis: .vertical)
                    .lineLimit(2...5)
            }

            Section {
                ForEach($settings.companyProfile.founders) { $founder in
                    HStack(spacing: 8) {
                        TextField("Name", text: $founder.name)
                        Divider()
                        TextField("Role", text: $founder.role)
                            .foregroundStyle(.secondary)
                    }
                }
                .onDelete { settings.companyProfile.founders.remove(atOffsets: $0) }

                Button {
                    settings.companyProfile.founders.append(Founder(name: "", role: "Co-founder"))
                } label: {
                    Label("Add founder", systemImage: "plus")
                }
            } header: {
                Text("Founders")
            }
        }
        .navigationTitle("Company profile")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            EditButton()
        }
        .onAppear {
            valuePropsText = settings.companyProfile.valueProps.joined(separator: "\n")
            differentiatorsText = settings.companyProfile.differentiators.joined(separator: "\n")
        }
        .onDisappear {
            settings.companyProfile.updatedAt = Date()
        }
    }

    private func lines(_ text: String) -> [String] {
        text.split(separator: "\n").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
    }
}
