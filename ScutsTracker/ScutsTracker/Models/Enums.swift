import SwiftUI

// MARK: - Pipeline stage

enum PipelineStage: String, Codable, CaseIterable, Identifiable, Hashable {
    case prospect
    case contacted
    case interested
    case negotiating
    case partner
    case onHold
    case lost

    var id: String { rawValue }

    var label: String {
        switch self {
        case .prospect: return "Prospect"
        case .contacted: return "Contacted"
        case .interested: return "Interested"
        case .negotiating: return "Negotiating"
        case .partner: return "Partner"
        case .onHold: return "On hold"
        case .lost: return "Lost"
        }
    }

    var color: Color {
        switch self {
        case .prospect: return .neutralGray
        case .contacted: return Brand.indigo
        case .interested: return Brand.teal
        case .negotiating: return Brand.amber
        case .partner: return .positive
        case .onHold: return .caution
        case .lost: return .negative
        }
    }

    var icon: String {
        switch self {
        case .prospect: return "magnifyingglass"
        case .contacted: return "hand.wave"
        case .interested: return "heart"
        case .negotiating: return "arrow.left.arrow.right"
        case .partner: return "checkmark.seal.fill"
        case .onHold: return "pause.circle"
        case .lost: return "xmark.circle"
        }
    }

    /// Order used when sorting the pipeline left→right.
    var sortOrder: Int {
        switch self {
        case .prospect: return 0
        case .contacted: return 1
        case .interested: return 2
        case .negotiating: return 3
        case .partner: return 4
        case .onHold: return 5
        case .lost: return 6
        }
    }

    /// Stages shown as the "active" pipeline on the dashboard.
    static var activeFunnel: [PipelineStage] {
        [.prospect, .contacted, .interested, .negotiating, .partner]
    }
}

// MARK: - Interaction source

enum InteractionSource: String, Codable, Hashable {
    case voice
    case text

    var icon: String { self == .voice ? "waveform" : "text.alignleft" }
    var label: String { self == .voice ? "Voice note" : "Typed note" }
}

// MARK: - Momentum

enum Momentum: String, Codable, CaseIterable, Hashable {
    case rising
    case steady
    case cooling
    case stalled

    var label: String {
        switch self {
        case .rising: return "Warming up"
        case .steady: return "Steady"
        case .cooling: return "Cooling"
        case .stalled: return "Stalled"
        }
    }

    var icon: String {
        switch self {
        case .rising: return "arrow.up.right"
        case .steady: return "arrow.right"
        case .cooling: return "arrow.down.right"
        case .stalled: return "minus"
        }
    }

    var color: Color {
        switch self {
        case .rising: return .positive
        case .steady: return Brand.indigo
        case .cooling: return .caution
        case .stalled: return .negative
        }
    }
}

// MARK: - Priority

enum Priority: Int, Codable, CaseIterable, Comparable, Hashable {
    case low = 0
    case medium = 1
    case high = 2
    case urgent = 3

    static func < (lhs: Priority, rhs: Priority) -> Bool { lhs.rawValue < rhs.rawValue }

    var label: String {
        switch self {
        case .low: return "Low"
        case .medium: return "Medium"
        case .high: return "High"
        case .urgent: return "Urgent"
        }
    }

    var color: Color {
        switch self {
        case .low: return .neutralGray
        case .medium: return Brand.indigo
        case .high: return .caution
        case .urgent: return .negative
        }
    }
}

// MARK: - Reminder / focus-point type

enum ReminderType: String, Codable, CaseIterable, Hashable {
    case followUp
    case prepare
    case objection
    case milestone
    case nudge

    var label: String {
        switch self {
        case .followUp: return "Follow up"
        case .prepare: return "Prepare"
        case .objection: return "Handle objection"
        case .milestone: return "Milestone"
        case .nudge: return "Nudge"
        }
    }

    var icon: String {
        switch self {
        case .followUp: return "phone.arrow.up.right"
        case .prepare: return "list.bullet.clipboard"
        case .objection: return "shield.lefthalf.filled"
        case .milestone: return "flag.checkered"
        case .nudge: return "bell"
        }
    }

    var tint: Color {
        switch self {
        case .followUp: return Brand.indigo
        case .prepare: return Brand.teal
        case .objection: return .caution
        case .milestone: return .positive
        case .nudge: return Brand.violet
        }
    }
}

// MARK: - Processing state (Lucy-style durable capture states)

enum ProcessingState: String, Codable, Hashable {
    case queued
    case transcribing
    case summarizing
    case analyzing
    case strategizing
    case planning
    case completed
    case failed

    var label: String {
        switch self {
        case .queued: return "Queued"
        case .transcribing: return "Transcribing"
        case .summarizing: return "Summarizing the note"
        case .analyzing: return "Reading sentiment"
        case .strategizing: return "Building strategy"
        case .planning: return "Planning follow-up"
        case .completed: return "Completed"
        case .failed: return "Failed"
        }
    }

    var isTerminal: Bool { self == .completed || self == .failed }
}

// MARK: - Agent roles & models

enum AgentRole: String, Codable, CaseIterable, Identifiable, Hashable {
    case summarizer
    case sentiment
    case strategist
    case followUp
    case insight
    case chat

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .summarizer: return "Summarizer"
        case .sentiment: return "Sentiment reader"
        case .strategist: return "Strategist"
        case .followUp: return "Follow-up planner"
        case .insight: return "Daily insight"
        case .chat: return "Assistant"
        }
    }

    var blurb: String {
        switch self {
        case .summarizer: return "Turns a raw voice/text note into a clean description and key points."
        case .sentiment: return "Reads how interested the owner is and where momentum is heading."
        case .strategist: return "Designs how to convince the owner and handle objections."
        case .followUp: return "Decides when, how often, and on what points to follow up."
        case .insight: return "Writes your daily brief across the whole pipeline."
        case .chat: return "Your interactive partner for questions and planning."
        }
    }

    var icon: String {
        switch self {
        case .summarizer: return "doc.text.magnifyingglass"
        case .sentiment: return "heart.text.square"
        case .strategist: return "lightbulb.max"
        case .followUp: return "calendar.badge.clock"
        case .insight: return "sun.max"
        case .chat: return "bubble.left.and.bubble.right.fill"
        }
    }

    var defaultModel: ClaudeModel {
        switch self {
        case .summarizer: return .haiku
        case .sentiment: return .sonnet
        case .strategist: return .opus
        case .followUp: return .sonnet
        case .insight: return .sonnet
        case .chat: return .opus
        }
    }
}

enum ClaudeModel: String, Codable, CaseIterable, Identifiable, Hashable {
    case opus = "claude-opus-4-8"
    case sonnet = "claude-sonnet-4-6"
    case haiku = "claude-haiku-4-5"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .opus: return "Opus 4.8"
        case .sonnet: return "Sonnet 4.6"
        case .haiku: return "Haiku 4.5"
        }
    }

    var blurb: String {
        switch self {
        case .opus: return "Deepest reasoning — best for strategy & chat"
        case .sonnet: return "Balanced speed and intelligence"
        case .haiku: return "Fastest and most economical"
        }
    }
}

/// One-tap presets that set every agent's model at once.
enum ModelPreset: String, CaseIterable, Identifiable {
    case bestQuality
    case balanced
    case economy

    var id: String { rawValue }

    var label: String {
        switch self {
        case .bestQuality: return "Best quality"
        case .balanced: return "Balanced"
        case .economy: return "Economy"
        }
    }

    var detail: String {
        switch self {
        case .bestQuality: return "Opus everywhere — sharpest output, highest cost."
        case .balanced: return "Opus for strategy & chat, Sonnet/Haiku elsewhere."
        case .economy: return "Haiku & Sonnet only — fastest and cheapest."
        }
    }

    func model(for role: AgentRole) -> ClaudeModel {
        switch self {
        case .bestQuality:
            return .opus
        case .balanced:
            return role.defaultModel
        case .economy:
            switch role {
            case .summarizer: return .haiku
            case .strategist, .chat: return .sonnet
            default: return .haiku
            }
        }
    }
}
