import Foundation

extension SettingsStore {
    /// Builds the Sendable config the agents run with, from the current settings.
    func agentConfig() -> AgentConfig {
        AgentConfig(
            models: agentModels,
            knowledgeContext: KnowledgeContext.build(profile: companyProfile, documents: knowledgeDocuments),
            defaultCadenceDays: defaultCadenceDays
        )
    }
}
