import Foundation

// MARK: - Sentiment

/// The Sentiment agent's read on a salon owner after a given interaction.
struct SentimentAnalysis: Codable, Hashable {
    var interestScore: Int          // 0–100
    var momentum: Momentum
    var suggestedStage: PipelineStage?
    var headline: String            // one-line read on where the owner stands
    var buyingSignals: [String]
    var concerns: [String]
    var createdAt: Date

    init(interestScore: Int = 50,
         momentum: Momentum = .steady,
         suggestedStage: PipelineStage? = nil,
         headline: String = "",
         buyingSignals: [String] = [],
         concerns: [String] = [],
         createdAt: Date = Date()) {
        self.interestScore = min(100, max(0, interestScore))
        self.momentum = momentum
        self.suggestedStage = suggestedStage
        self.headline = headline
        self.buyingSignals = buyingSignals
        self.concerns = concerns
        self.createdAt = createdAt
    }
}

// MARK: - Strategy

struct ObjectionHandler: Codable, Hashable, Identifiable {
    var id: UUID = UUID()
    var objection: String
    var response: String
}

/// The Strategist agent's plan for winning the partnership.
struct Strategy: Codable, Hashable, Identifiable {
    var id: UUID = UUID()
    var headline: String
    var approach: String
    var talkingPoints: [String]
    var valueProps: [String]
    var objectionHandlers: [ObjectionHandler]
    var nextBestAction: String
    var createdAt: Date = Date()
}

// MARK: - Follow-up plan

/// The Follow-up agent's decision on when / how often / on what points to follow up.
struct FollowUpPlan: Codable, Hashable, Identifiable {
    var id: UUID = UUID()
    var nextFollowUpAt: Date
    var cadenceDays: Int
    var channel: String             // "Call", "WhatsApp", "Visit", "Email"
    var focusPoints: [String]
    var rationale: String
    var createdAt: Date = Date()

    var channelIcon: String {
        switch channel.lowercased() {
        case let c where c.contains("call") || c.contains("phone"): return "phone.fill"
        case let c where c.contains("whatsapp") || c.contains("message") || c.contains("text"): return "message.fill"
        case let c where c.contains("visit") || c.contains("meet"): return "figure.walk"
        case let c where c.contains("email") || c.contains("mail"): return "envelope.fill"
        default: return "bubble.left.fill"
        }
    }
}
