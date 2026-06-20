import Foundation

/// One turn in the interactive assistant conversation.
struct ChatMessage: Codable, Identifiable, Hashable {
    enum Role: String, Codable, Hashable {
        case user
        case assistant
    }

    var id: UUID = UUID()
    var role: Role
    var text: String
    var createdAt: Date = Date()

    init(id: UUID = UUID(), role: Role, text: String, createdAt: Date = Date()) {
        self.id = id
        self.role = role
        self.text = text
        self.createdAt = createdAt
    }
}
