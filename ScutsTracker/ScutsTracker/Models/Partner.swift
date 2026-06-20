import Foundation

/// A salon owner the founders are working to bring onto Scuts.
struct Partner: Codable, Identifiable, Hashable {
    var id: UUID = UUID()
    var name: String
    var salonName: String
    var location: String
    var phone: String
    var email: String
    var stage: PipelineStage
    var interestScore: Int          // latest 0–100 read
    var momentum: Momentum
    var tags: [String]
    var notes: String
    var createdAt: Date
    var lastContactAt: Date?
    var nextFollowUpAt: Date?

    // Latest snapshots from the semantic layer (for quick display on the detail screen).
    var latestSentiment: SentimentAnalysis?
    var latestStrategy: Strategy?
    var latestFollowUp: FollowUpPlan?

    init(id: UUID = UUID(),
         name: String,
         salonName: String = "",
         location: String = "",
         phone: String = "",
         email: String = "",
         stage: PipelineStage = .prospect,
         interestScore: Int = 50,
         momentum: Momentum = .steady,
         tags: [String] = [],
         notes: String = "",
         createdAt: Date = Date(),
         lastContactAt: Date? = nil,
         nextFollowUpAt: Date? = nil,
         latestSentiment: SentimentAnalysis? = nil,
         latestStrategy: Strategy? = nil,
         latestFollowUp: FollowUpPlan? = nil) {
        self.id = id
        self.name = name
        self.salonName = salonName
        self.location = location
        self.phone = phone
        self.email = email
        self.stage = stage
        self.interestScore = interestScore
        self.momentum = momentum
        self.tags = tags
        self.notes = notes
        self.createdAt = createdAt
        self.lastContactAt = lastContactAt
        self.nextFollowUpAt = nextFollowUpAt
        self.latestSentiment = latestSentiment
        self.latestStrategy = latestStrategy
        self.latestFollowUp = latestFollowUp
    }

    var displayTitle: String { salonName.isEmpty ? name : salonName }

    var subtitle: String {
        var parts: [String] = []
        if !salonName.isEmpty { parts.append(name) }
        if !location.isEmpty { parts.append(location) }
        return parts.joined(separator: " · ")
    }

    var initials: String {
        let source = salonName.isEmpty ? name : salonName
        let words = source.split(separator: " ").prefix(2)
        let letters = words.compactMap { $0.first }.map(String.init)
        let joined = letters.joined().uppercased()
        return joined.isEmpty ? "S" : joined
    }

    var isOverdue: Bool {
        guard let next = nextFollowUpAt else { return false }
        return next < Date()
    }
}
