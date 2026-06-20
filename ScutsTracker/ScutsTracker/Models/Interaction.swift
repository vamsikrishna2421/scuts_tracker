import Foundation

/// A single logged update about a salon owner — the raw note plus everything
/// the semantic layer derived from it.
struct Interaction: Codable, Identifiable, Hashable {
    var id: UUID = UUID()
    var partnerId: UUID
    var createdAt: Date
    var source: InteractionSource
    var rawText: String
    var summary: String
    var keyPoints: [String]
    var commitments: [String]
    var objections: [String]
    var sentiment: SentimentAnalysis?
    var processingState: ProcessingState
    var errorMessage: String?

    init(id: UUID = UUID(),
         partnerId: UUID,
         createdAt: Date = Date(),
         source: InteractionSource,
         rawText: String,
         summary: String = "",
         keyPoints: [String] = [],
         commitments: [String] = [],
         objections: [String] = [],
         sentiment: SentimentAnalysis? = nil,
         processingState: ProcessingState = .queued,
         errorMessage: String? = nil) {
        self.id = id
        self.partnerId = partnerId
        self.createdAt = createdAt
        self.source = source
        self.rawText = rawText
        self.summary = summary
        self.keyPoints = keyPoints
        self.commitments = commitments
        self.objections = objections
        self.sentiment = sentiment
        self.processingState = processingState
        self.errorMessage = errorMessage
    }

    var displaySummary: String {
        if !summary.isEmpty { return summary }
        return rawText
    }
}
