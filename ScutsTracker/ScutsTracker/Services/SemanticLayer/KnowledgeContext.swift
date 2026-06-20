import Foundation

/// Builds the compact "what you know about Scuts" block injected into every agent's
/// system prompt, so the more the founders tell it, the smarter it gets.
enum KnowledgeContext {
    private static let documentBudget = 4000   // characters across all uploaded docs

    static func build(profile: CompanyProfile, documents: [KnowledgeDocument]) -> String {
        var lines: [String] = []
        lines.append("COMPANY: \(profile.name)")
        if !profile.tagline.isEmpty { lines.append("Tagline: \(profile.tagline)") }
        if !profile.about.isEmpty { lines.append("About: \(profile.about)") }
        if !profile.valueProps.isEmpty {
            lines.append("Value to the salon: " + profile.valueProps.map { "• \($0)" }.joined(separator: " "))
        }
        if !profile.differentiators.isEmpty {
            lines.append("Differentiators: " + profile.differentiators.map { "• \($0)" }.joined(separator: " "))
        }
        if !profile.pricingNotes.isEmpty { lines.append("Pricing stance: \(profile.pricingNotes)") }
        if !profile.targetCustomer.isEmpty { lines.append("Target salon owner: \(profile.targetCustomer)") }
        if !profile.founders.isEmpty {
            let names = profile.founders.map { "\($0.name) (\($0.role))" }.joined(separator: ", ")
            lines.append("Founders: \(names)")
        }

        if !documents.isEmpty {
            lines.append("")
            lines.append("ADDITIONAL COMPANY KNOWLEDGE (uploaded by the founders):")
            var remaining = documentBudget
            for doc in documents where remaining > 0 {
                let header = "— \(doc.title) —"
                let slice = String(doc.content.prefix(remaining))
                lines.append(header)
                lines.append(slice)
                remaining -= slice.count
            }
        }

        return lines.joined(separator: "\n")
    }
}
