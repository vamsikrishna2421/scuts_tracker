import Foundation

struct Founder: Codable, Identifiable, Hashable {
    var id: UUID = UUID()
    var name: String
    var role: String
}

/// A document or pasted block of company information the founders upload so the
/// agents learn the business more deeply.
struct KnowledgeDocument: Codable, Identifiable, Hashable {
    var id: UUID = UUID()
    var title: String
    var content: String
    var createdAt: Date = Date()

    var preview: String {
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        return String(trimmed.prefix(120))
    }

    var wordCount: Int {
        content.split { $0 == " " || $0.isNewline }.count
    }
}

/// Everything the agents know about Scuts. Pre-filled with the real business so
/// the app is useful on first launch; fully editable in Settings.
struct CompanyProfile: Codable, Hashable {
    var name: String
    var tagline: String
    var about: String
    var valueProps: [String]
    var differentiators: [String]
    var pricingNotes: String
    var targetCustomer: String
    var founders: [Founder]
    var updatedAt: Date

    static var scutsDefault: CompanyProfile {
        CompanyProfile(
            name: "Scuts",
            tagline: "A better salon experience — transparent, reviewed, fairly priced.",
            about: """
            Scuts is a salon service provider that partners with local salons to give customers a \
            better experience: transparency, genuine reviews and ratings, and better pricing. We \
            bring salons more discoverability and footfall while raising the quality bar for \
            customers.
            """,
            valueProps: [
                "More customers and visibility for the salon",
                "Transparent pricing that builds customer trust",
                "Verified reviews & ratings that reward good work",
                "A simple way to manage bookings and reputation"
            ],
            differentiators: [
                "Transparency-first: no hidden charges",
                "Real, verified customer reviews",
                "Fairer, clearer pricing than walk-in norms",
                "Local-salon focused, not a faceless chain"
            ],
            pricingNotes: "Position Scuts as added revenue and reputation, not a cost. Emphasize incremental customers over commission.",
            targetCustomer: "Independent and local salon owners who want more customers, better reputation, and fair, transparent pricing.",
            founders: [
                Founder(name: "Abhishek", role: "Co-founder"),
                Founder(name: "Pavan Kalyan", role: "Co-founder")
            ],
            updatedAt: Date()
        )
    }
}
