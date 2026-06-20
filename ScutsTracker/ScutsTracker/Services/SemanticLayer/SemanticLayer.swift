import Foundation

/// A Sendable snapshot of settings the agents need, so they can run off the main
/// actor without touching the stores.
struct AgentConfig: Sendable {
    var models: [AgentRole: ClaudeModel]
    var knowledgeContext: String
    var defaultCadenceDays: Int

    func model(_ role: AgentRole) -> ClaudeModel { models[role] ?? role.defaultModel }
}

struct SummaryResult: Sendable {
    var summary: String
    var keyPoints: [String]
    var commitments: [String]
    var objections: [String]
}

/// The "semantic layer": a set of dedicated Claude agents, each with its own role
/// prompt and model, plus the orchestration helpers that turn a raw note into a
/// summary, a sentiment read, a strategy, a follow-up plan and focus points.
enum SemanticLayer {

    // MARK: Summarizer

    static func summarize(rawText: String, partner: Partner, config: AgentConfig) async throws -> SummaryResult {
        let system = """
        You are the note summarizer in Scuts' partnership tracker. A founder just logged a raw, \
        possibly messy voice or text note about a conversation with a salon owner. Turn it into a \
        clean, faithful summary and structured points. Never invent facts that aren't in the note.

        \(config.knowledgeContext)

        Respond with ONLY a JSON object, no prose, in this exact shape:
        {"summary": string, "key_points": [string], "commitments": [string], "objections": [string]}
        - summary: 1–3 tight sentences in plain English.
        - commitments: things the founder or owner agreed to do.
        - objections: concerns or hesitations the owner raised.
        """
        let user = """
        Salon owner: \(partner.name)\(partner.salonName.isEmpty ? "" : " — \(partner.salonName)")
        Raw note:
        \(rawText)
        """
        let text = try await ClaudeClient.shared.complete(model: config.model(.summarizer), system: system, messages: [.user(user)], maxTokens: 800)
        let dto = try JSONExtractor.decode(SummaryDTO.self, from: text)
        return SummaryResult(summary: dto.summary,
                             keyPoints: dto.key_points ?? [],
                             commitments: dto.commitments ?? [],
                             objections: dto.objections ?? [])
    }

    // MARK: Sentiment

    static func analyzeSentiment(rawText: String, summary: String, partner: Partner, config: AgentConfig) async throws -> SentimentAnalysis {
        let system = """
        You are the sentiment analyst in Scuts' partnership tracker. Read how interested this salon \
        owner is in partnering with Scuts, and where the relationship is heading. Be realistic and \
        evidence-based, not optimistic by default.

        \(config.knowledgeContext)

        Respond with ONLY a JSON object in this exact shape:
        {"interest_score": int 0-100, "momentum": "rising"|"steady"|"cooling"|"stalled", \
        "stage": "prospect"|"contacted"|"interested"|"negotiating"|"partner"|"onHold"|"lost", \
        "headline": string (<=140 chars, the one-line read), "buying_signals": [string], "concerns": [string]}
        """
        let user = """
        Salon owner: \(partner.name)\(partner.salonName.isEmpty ? "" : " — \(partner.salonName)")
        Current stage: \(partner.stage.label). Previous interest score: \(partner.interestScore)/100.
        Latest note summary: \(summary.isEmpty ? rawText : summary)
        Raw note: \(rawText)
        """
        let text = try await ClaudeClient.shared.complete(model: config.model(.sentiment), system: system, messages: [.user(user)], maxTokens: 700)
        let dto = try JSONExtractor.decode(SentimentDTO.self, from: text)
        return SentimentAnalysis(
            interestScore: dto.interest_score,
            momentum: Momentum(api: dto.momentum),
            suggestedStage: PipelineStage(api: dto.stage),
            headline: dto.headline,
            buyingSignals: dto.buying_signals ?? [],
            concerns: dto.concerns ?? [],
            createdAt: Date()
        )
    }

    // MARK: Strategist

    static func buildStrategy(partner: Partner, sentiment: SentimentAnalysis, history: [Interaction], config: AgentConfig) async throws -> Strategy {
        let system = """
        You are the partnership strategist in Scuts' tracker. Design a practical, respectful, \
        India-local strategy to convince this salon owner to partner with Scuts. Ground everything \
        in the company's real value props and differentiators below. Be specific and actionable — \
        no generic sales fluff.

        \(config.knowledgeContext)

        Respond with ONLY a JSON object in this exact shape:
        {"headline": string, "approach": string (2-4 sentences), "talking_points": [string], \
        "value_props": [string], "objection_handlers": [{"objection": string, "response": string}], \
        "next_best_action": string}
        """
        let recent = history.prefix(4).map { "• \($0.displaySummary)" }.joined(separator: "\n")
        let concerns = (sentiment.concerns + history.flatMap { $0.objections }).uniqued().prefix(5).joined(separator: "; ")
        let user = """
        Salon owner: \(partner.name)\(partner.salonName.isEmpty ? "" : " — \(partner.salonName)") in \(partner.location.isEmpty ? "unknown location" : partner.location)
        Stage: \(partner.stage.label). Interest: \(sentiment.interestScore)/100. Momentum: \(sentiment.momentum.label).
        Where they stand: \(sentiment.headline)
        Known concerns/objections: \(concerns.isEmpty ? "none noted yet" : concerns)
        Recent notes:
        \(recent.isEmpty ? "none yet" : recent)
        """
        let text = try await ClaudeClient.shared.complete(model: config.model(.strategist), system: system, messages: [.user(user)], maxTokens: 1400)
        let dto = try JSONExtractor.decode(StrategyDTO.self, from: text)
        return Strategy(
            headline: dto.headline,
            approach: dto.approach,
            talkingPoints: dto.talking_points ?? [],
            valueProps: dto.value_props ?? [],
            objectionHandlers: (dto.objection_handlers ?? []).map { ObjectionHandler(objection: $0.objection, response: $0.response) },
            nextBestAction: dto.next_best_action,
            createdAt: Date()
        )
    }

    // MARK: Follow-up planner

    static func planFollowUp(partner: Partner, sentiment: SentimentAnalysis, strategy: Strategy, config: AgentConfig) async throws -> FollowUpPlan {
        let system = """
        You are the follow-up planner in Scuts' tracker. Decide exactly when, how often, through which \
        channel, and on what points to follow up with this salon owner. Calibrate cadence to interest \
        and momentum: hot and rising deals get a tight cadence (2-4 days); cooling deals get a gentle, \
        value-adding touch (7-14 days); stalled deals get a low-pressure re-open. Pick concrete focus \
        points the founder should raise next time.

        \(config.knowledgeContext)

        Respond with ONLY a JSON object in this exact shape:
        {"cadence_days": int, "channel": "Call"|"WhatsApp"|"Visit"|"Email", "focus_points": [string], "rationale": string}
        """
        let user = """
        Salon owner: \(partner.name). Stage: \(partner.stage.label).
        Interest: \(sentiment.interestScore)/100. Momentum: \(sentiment.momentum.label).
        Where they stand: \(sentiment.headline)
        Recommended next action: \(strategy.nextBestAction)
        Open concerns: \(sentiment.concerns.joined(separator: "; "))
        """
        let text = try await ClaudeClient.shared.complete(model: config.model(.followUp), system: system, messages: [.user(user)], maxTokens: 700)
        let dto = try JSONExtractor.decode(FollowUpDTO.self, from: text)
        let cadence = max(1, min(60, dto.cadence_days))
        let next = Calendar.current.date(byAdding: .day, value: cadence, to: Date()) ?? Date()
        return FollowUpPlan(
            nextFollowUpAt: next,
            cadenceDays: cadence,
            channel: dto.channel,
            focusPoints: dto.focus_points ?? [],
            rationale: dto.rationale,
            createdAt: Date()
        )
    }

    // MARK: Daily insight / brief

    static func dailyBrief(snapshot: String, config: AgentConfig) async throws -> String {
        let system = """
        You are the morning briefer for Scuts' founders, Abhishek and Pavan Kalyan. Given a snapshot of \
        their whole salon-partnership pipeline, write a short, specific, motivating brief for today. \
        4–7 sentences. Name who to prioritize and exactly why, call out anyone cooling or overdue, and \
        end with one clear focus for the day. Warm but crisp. Plain text — no markdown, no headers, no JSON.

        \(config.knowledgeContext)
        """
        return try await ClaudeClient.shared.complete(model: config.model(.insight), system: system, messages: [.user(snapshot)], maxTokens: 600)
    }

    // MARK: Chat assistant (streaming)

    static func chatStream(history: [ChatMessage], snapshot: String, config: AgentConfig) -> AsyncThrowingStream<String, Error> {
        let system = """
        You are Scuts' in-app assistant for the founders, Abhishek and Pavan Kalyan. You help them grow \
        salon partnerships: strategize, prep for specific conversations, handle objections, and decide \
        what to prioritize. Be practical, specific and concise — give them something they can act on. \
        Use the company knowledge and live pipeline snapshot below. If they ask about a specific salon \
        owner, use what the snapshot says about that person.

        \(config.knowledgeContext)

        CURRENT PIPELINE SNAPSHOT:
        \(snapshot)
        """
        let messages = history.map { APIMessage(role: $0.role == .user ? "user" : "assistant", content: $0.text) }
        return ClaudeClient.shared.stream(model: config.model(.chat), system: system, messages: messages, maxTokens: 1500)
    }

    // MARK: Snapshot builder

    static func pipelineSnapshot(partners: [Partner], focus: [Reminder]) -> String {
        var lines: [String] = []
        let active = partners.filter { $0.stage != .lost }.sorted { $0.interestScore > $1.interestScore }
        lines.append("Partners (\(partners.count) total, \(partners.filter { $0.stage == .partner }.count) signed):")
        for p in active.prefix(20) {
            var row = "• \(p.displayTitle) — \(p.stage.label), interest \(p.interestScore)/100, \(p.momentum.label)"
            if let next = p.nextFollowUpAt {
                row += ", next follow-up \(Format.shortDate(next))\(next < Date() ? " (OVERDUE)" : "")"
            }
            if let s = p.latestSentiment, !s.headline.isEmpty { row += ". \(s.headline)" }
            lines.append(row)
        }
        if !focus.isEmpty {
            lines.append("")
            lines.append("Today's focus points:")
            for r in focus.prefix(12) {
                lines.append("• \(r.title)\(r.partnerName.isEmpty ? "" : " (\(r.partnerName))")\(r.isOverdue ? " [overdue]" : "")")
            }
        }
        return lines.joined(separator: "\n")
    }

    // MARK: Reminder generation

    static func makeReminders(partner: Partner, sentiment: SentimentAnalysis, strategy: Strategy, followUp: FollowUpPlan) -> [Reminder] {
        var reminders: [Reminder] = []
        let priority: Priority = {
            if sentiment.momentum == .cooling && sentiment.interestScore >= 50 { return .high }
            switch sentiment.interestScore {
            case 65...: return .high
            case 40..<65: return .medium
            default: return .low
            }
        }()

        let focusDetail = followUp.focusPoints.isEmpty
            ? strategy.nextBestAction
            : followUp.focusPoints.map { "• \($0)" }.joined(separator: "\n")

        reminders.append(Reminder(
            partnerId: partner.id,
            partnerName: partner.displayTitle,
            title: "\(followUp.channel) \(partner.name): \(strategy.headline)",
            detail: focusDetail,
            dueDate: followUp.nextFollowUpAt,
            priority: priority,
            type: .followUp
        ))

        if let firstObjection = strategy.objectionHandlers.first {
            reminders.append(Reminder(
                partnerId: partner.id,
                partnerName: partner.displayTitle,
                title: "Be ready for: \(firstObjection.objection)",
                detail: firstObjection.response,
                dueDate: Calendar.current.date(byAdding: .day, value: -1, to: followUp.nextFollowUpAt) ?? followUp.nextFollowUpAt,
                priority: .medium,
                type: .objection
            ))
        }

        return reminders
    }
}

// MARK: - DTOs

private struct SummaryDTO: Decodable {
    let summary: String
    let key_points: [String]?
    let commitments: [String]?
    let objections: [String]?
}

private struct SentimentDTO: Decodable {
    let interest_score: Int
    let momentum: String?
    let stage: String?
    let headline: String
    let buying_signals: [String]?
    let concerns: [String]?
}

private struct StrategyDTO: Decodable {
    struct Objection: Decodable { let objection: String; let response: String }
    let headline: String
    let approach: String
    let talking_points: [String]?
    let value_props: [String]?
    let objection_handlers: [Objection]?
    let next_best_action: String
}

private struct FollowUpDTO: Decodable {
    let cadence_days: Int
    let channel: String
    let focus_points: [String]?
    let rationale: String
}

// MARK: - API string → enum mapping

extension Momentum {
    init(api: String?) {
        switch api?.lowercased() {
        case "rising", "warming", "up", "improving": self = .rising
        case "cooling", "down", "declining": self = .cooling
        case "stalled", "stuck", "flat", "dead": self = .stalled
        default: self = .steady
        }
    }
}

extension PipelineStage {
    init?(api: String?) {
        guard let raw = api?.lowercased() else { return nil }
        switch raw {
        case "prospect": self = .prospect
        case "contacted": self = .contacted
        case "interested": self = .interested
        case "negotiating", "negotiation": self = .negotiating
        case "partner", "signed", "won", "closed", "active": self = .partner
        case "onhold", "on hold", "on_hold", "hold", "paused": self = .onHold
        case "lost", "dead", "no": self = .lost
        default: return nil
        }
    }
}

extension Array where Element: Hashable {
    func uniqued() -> [Element] {
        var seen = Set<Element>()
        return filter { seen.insert($0).inserted }
    }
}
