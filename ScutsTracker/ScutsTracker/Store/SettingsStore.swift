import Foundation
import Combine

/// App configuration: company knowledge, per-agent model choices, preferences,
/// and the API-key status (the key itself lives in the Keychain).
@MainActor
final class SettingsStore: ObservableObject {
    @Published var companyProfile: CompanyProfile { didSet { persist() } }
    @Published var knowledgeDocuments: [KnowledgeDocument] { didSet { persist() } }
    @Published var agentModels: [AgentRole: ClaudeModel] { didSet { persist() } }
    @Published var autoRunAnalysis: Bool { didSet { persist() } }
    @Published var notificationsEnabled: Bool { didSet { persist() } }
    @Published var defaultCadenceDays: Int { didSet { persist() } }
    @Published var onboardingComplete: Bool { didSet { persist() } }

    @Published private(set) var hasAPIKey: Bool

    private static let filename = "settings.json"

    init() {
        let data = Persistence.load(SettingsData.self, from: Self.filename)
        self.companyProfile = data?.companyProfile ?? .scutsDefault
        self.knowledgeDocuments = data?.knowledgeDocuments ?? []
        self.autoRunAnalysis = data?.autoRunAnalysis ?? true
        self.notificationsEnabled = data?.notificationsEnabled ?? true
        self.defaultCadenceDays = data?.defaultCadenceDays ?? 5
        self.onboardingComplete = data?.onboardingComplete ?? false

        var models: [AgentRole: ClaudeModel] = [:]
        for role in AgentRole.allCases {
            if let raw = data?.agentModels[role.rawValue], let model = ClaudeModel(rawValue: raw) {
                models[role] = model
            } else {
                models[role] = role.defaultModel
            }
        }
        self.agentModels = models
        self.hasAPIKey = KeychainStore.hasAPIKey
    }

    // MARK: API key

    func saveAPIKey(_ key: String) {
        KeychainStore.saveAPIKey(key)
        hasAPIKey = KeychainStore.hasAPIKey
    }

    func removeAPIKey() {
        KeychainStore.deleteAPIKey()
        hasAPIKey = false
    }

    func refreshAPIKeyStatus() {
        hasAPIKey = KeychainStore.hasAPIKey
    }

    // MARK: Models

    func model(for role: AgentRole) -> ClaudeModel {
        agentModels[role] ?? role.defaultModel
    }

    func setModel(_ model: ClaudeModel, for role: AgentRole) {
        agentModels[role] = model
    }

    func applyPreset(_ preset: ModelPreset) {
        var updated = agentModels
        for role in AgentRole.allCases {
            updated[role] = preset.model(for: role)
        }
        agentModels = updated
    }

    var matchedPreset: ModelPreset? {
        ModelPreset.allCases.first { preset in
            AgentRole.allCases.allSatisfy { agentModels[$0] == preset.model(for: $0) }
        }
    }

    // MARK: Knowledge

    func addKnowledgeDocument(title: String, content: String) {
        let doc = KnowledgeDocument(title: title.isEmpty ? "Untitled note" : title, content: content)
        knowledgeDocuments.insert(doc, at: 0)
    }

    func removeKnowledgeDocument(_ doc: KnowledgeDocument) {
        knowledgeDocuments.removeAll { $0.id == doc.id }
    }

    // MARK: Persistence

    private func persist() {
        let data = SettingsData(
            companyProfile: companyProfile,
            knowledgeDocuments: knowledgeDocuments,
            agentModels: agentModels.reduce(into: [:]) { $0[$1.key.rawValue] = $1.value.rawValue },
            autoRunAnalysis: autoRunAnalysis,
            notificationsEnabled: notificationsEnabled,
            defaultCadenceDays: defaultCadenceDays,
            onboardingComplete: onboardingComplete
        )
        Persistence.save(data, to: Self.filename)
    }

    private struct SettingsData: Codable {
        var companyProfile: CompanyProfile
        var knowledgeDocuments: [KnowledgeDocument]
        var agentModels: [String: String]
        var autoRunAnalysis: Bool
        var notificationsEnabled: Bool
        var defaultCadenceDays: Int
        var onboardingComplete: Bool
    }
}
