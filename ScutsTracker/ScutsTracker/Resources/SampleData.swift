import Foundation

/// Seed data so the founders see a populated, believable pipeline on first launch.
/// Replaced entirely once they start logging their own notes.
enum SampleData {

    static func makeSeed() -> (partners: [Partner], interactions: [Interaction], reminders: [Reminder]) {
        var partners: [Partner] = []
        var interactions: [Interaction] = []
        var reminders: [Reminder] = []

        // 1 — Warm, negotiating
        var rohit = Partner(
            name: "Rohit Verma",
            salonName: "Verma's Gents Salon",
            location: "Madhapur, Hyderabad",
            phone: "+91 98480 11223",
            email: "rohit.verma@example.com",
            stage: .negotiating,
            interestScore: 78,
            momentum: .rising,
            tags: ["High footfall", "Owner-operated"],
            notes: "Cares about repeat customers and his Google rating.",
            createdAt: days(-21),
            lastContactAt: days(-2),
            nextFollowUpAt: days(2)
        )
        rohit.latestSentiment = SentimentAnalysis(
            interestScore: 78, momentum: .rising, suggestedStage: .negotiating,
            headline: "Keen on more footfall, weighing the commission split.",
            buyingSignals: ["Asked how soon he'd see new customers", "Liked the verified-reviews idea"],
            concerns: ["Worried about commission eating into margins"],
            createdAt: days(-2)
        )
        rohit.latestStrategy = Strategy(
            headline: "Anchor on incremental revenue, not commission",
            approach: "Frame Scuts as net-new customers he wouldn't otherwise get. Reframe the commission as a marketing cost with guaranteed reach.",
            talkingPoints: ["Show a 3-month footfall projection", "Highlight verified reviews lifting his rating", "Offer a low-risk trial month"],
            valueProps: ["More repeat customers", "Higher Google rating via verified reviews"],
            objectionHandlers: [
                ObjectionHandler(objection: "Commission cuts my margin", response: "These are customers you wouldn't have had — the commission only applies to incremental bookings, so it's upside, not a cut.")
            ],
            nextBestAction: "Send the footfall projection and propose a trial month on the next call.",
            createdAt: days(-2)
        )
        rohit.latestFollowUp = FollowUpPlan(
            nextFollowUpAt: days(2), cadenceDays: 3, channel: "Call",
            focusPoints: ["Walk through the footfall projection", "Pin down trial-month terms"],
            rationale: "He's warm and close — keep a tight 3-day cadence so momentum doesn't cool.",
            createdAt: days(-2)
        )
        partners.append(rohit)
        interactions.append(Interaction(
            partnerId: rohit.id, createdAt: days(-2), source: .voice,
            rawText: "Met Rohit at his salon. He's interested, asked how quickly he'd get new customers and was happy about the reviews thing, but he's nervous about the commission.",
            summary: "Met Rohit in person. Genuinely interested — focused on speed of new customers and liked verified reviews. Main hesitation is commission impact on margins.",
            keyPoints: ["Interested in new customer volume", "Liked verified reviews", "Nervous about commission"],
            commitments: ["Send footfall projection"],
            objections: ["Commission impact on margins"],
            sentiment: rohit.latestSentiment,
            processingState: .completed
        ))
        reminders.append(Reminder(partnerId: rohit.id, partnerName: rohit.displayTitle,
                                  title: "Call Rohit with the footfall projection",
                                  detail: "Anchor on incremental revenue and propose a trial month.",
                                  dueDate: days(2), priority: .high, type: .followUp))
        reminders.append(Reminder(partnerId: rohit.id, partnerName: rohit.displayTitle,
                                  title: "Prepare 3-month footfall projection",
                                  detail: "He needs to see the upside in numbers before committing.",
                                  dueDate: days(1), priority: .high, type: .prepare))

        // 2 — Interested but cooling, needs nurturing
        var sahana = Partner(
            name: "Sahana Reddy",
            salonName: "Glow Studio",
            location: "Indiranagar, Bangalore",
            phone: "+91 90080 44556",
            email: "sahana@glowstudio.example",
            stage: .interested,
            interestScore: 54,
            momentum: .cooling,
            tags: ["Premium", "Instagram-driven"],
            notes: "Runs a premium studio; protective of her brand image.",
            createdAt: days(-30),
            lastContactAt: days(-9),
            nextFollowUpAt: days(-1)
        )
        sahana.latestSentiment = SentimentAnalysis(
            interestScore: 54, momentum: .cooling, suggestedStage: .interested,
            headline: "Likes the idea but went quiet — worried Scuts dilutes her premium brand.",
            buyingSignals: ["Initially liked the reviews angle"],
            concerns: ["Brand dilution", "Discount-seeking customers"],
            createdAt: days(-9)
        )
        sahana.latestStrategy = Strategy(
            headline: "Protect and elevate her premium positioning",
            approach: "Reassure her that Scuts curates and showcases quality. Position reviews as proof of premium, and emphasize control over how she's listed.",
            talkingPoints: ["Show premium salons already on Scuts", "Explain listing controls", "Frame reviews as premium proof"],
            valueProps: ["Premium discovery, not discount-hunting", "Reputation reinforcement"],
            objectionHandlers: [
                ObjectionHandler(objection: "It'll bring discount-seekers", response: "Scuts surfaces you to customers who filter for quality and reviews — your rating becomes the filter, attracting the right clientele.")
            ],
            nextBestAction: "Share 2–3 premium salon examples and re-open the conversation gently.",
            createdAt: days(-9)
        )
        sahana.latestFollowUp = FollowUpPlan(
            nextFollowUpAt: days(-1), cadenceDays: 7, channel: "WhatsApp",
            focusPoints: ["Send premium salon examples", "Reassure on brand control"],
            rationale: "She's cooling — a low-pressure WhatsApp with proof points re-warms without pushing.",
            createdAt: days(-9)
        )
        partners.append(sahana)
        interactions.append(Interaction(
            partnerId: sahana.id, createdAt: days(-9), source: .text,
            rawText: "Sahana hasn't replied to my last two messages. Last time she said she's worried Scuts will bring discount customers and hurt her premium image.",
            summary: "Sahana has gone quiet after raising concerns that Scuts would attract discount-seeking customers and dilute her premium brand.",
            keyPoints: ["Unresponsive recently", "Premium brand protection is key"],
            commitments: [],
            objections: ["Brand dilution", "Discount-seeking customers"],
            sentiment: sahana.latestSentiment,
            processingState: .completed
        ))
        reminders.append(Reminder(partnerId: sahana.id, partnerName: sahana.displayTitle,
                                  title: "Re-warm Sahana on WhatsApp",
                                  detail: "Send 2–3 premium salon examples and reassure on brand control.",
                                  dueDate: days(-1), priority: .high, type: .objection))

        // 3 — Brand-new prospect
        var imran = Partner(
            name: "Imran Khan",
            salonName: "Sharp Cuts",
            location: "Banjara Hills, Hyderabad",
            phone: "+91 99490 77889",
            stage: .contacted,
            interestScore: 45,
            momentum: .steady,
            tags: ["New lead"],
            notes: "Introduced by Rohit. Haven't pitched fully yet.",
            createdAt: days(-4),
            lastContactAt: days(-4),
            nextFollowUpAt: days(3)
        )
        imran.latestSentiment = SentimentAnalysis(
            interestScore: 45, momentum: .steady, suggestedStage: .contacted,
            headline: "Curious but uncommitted — needs a proper first pitch.",
            buyingSignals: ["Agreed to a follow-up meeting"],
            concerns: ["Doesn't fully understand the model yet"],
            createdAt: days(-4)
        )
        partners.append(imran)
        interactions.append(Interaction(
            partnerId: imran.id, createdAt: days(-4), source: .voice,
            rawText: "Quick intro call with Imran, referred by Rohit. He was friendly, agreed to meet next week but doesn't really get what Scuts does yet.",
            summary: "Friendly intro call with Imran (referred by Rohit). Agreed to a meeting next week but doesn't yet understand the Scuts model.",
            keyPoints: ["Referred by Rohit", "Agreed to a follow-up meeting", "Needs the core pitch"],
            commitments: ["Meet next week"],
            objections: [],
            sentiment: imran.latestSentiment,
            processingState: .completed
        ))
        reminders.append(Reminder(partnerId: imran.id, partnerName: imran.displayTitle,
                                  title: "Pitch Scuts properly to Imran",
                                  detail: "Lead with the customer-discovery and reviews story; he's a warm referral.",
                                  dueDate: days(3), priority: .medium, type: .prepare))

        // 4 — Signed partner (a win to show on the board)
        var meena = Partner(
            name: "Meena Joshi",
            salonName: "Style Hub",
            location: "Kothrud, Pune",
            phone: "+91 70123 99887",
            stage: .partner,
            interestScore: 92,
            momentum: .steady,
            tags: ["Signed", "Advocate"],
            notes: "Live on Scuts. Happy — could give a testimonial.",
            createdAt: days(-60),
            lastContactAt: days(-12),
            nextFollowUpAt: days(6)
        )
        meena.latestSentiment = SentimentAnalysis(
            interestScore: 92, momentum: .steady, suggestedStage: .partner,
            headline: "Active, happy partner — strong candidate for a referral and testimonial.",
            buyingSignals: ["Already seeing repeat customers", "Offered to refer other owners"],
            concerns: [],
            createdAt: days(-12)
        )
        partners.append(meena)
        reminders.append(Reminder(partnerId: meena.id, partnerName: meena.displayTitle,
                                  title: "Ask Meena for a testimonial + referrals",
                                  detail: "She's happy and offered to introduce other owners — capitalize on it.",
                                  dueDate: days(6), priority: .medium, type: .milestone))

        // A standalone manual focus point
        reminders.append(Reminder(partnerId: nil, partnerName: "",
                                  title: "Draft a one-page Scuts value sheet",
                                  detail: "A leave-behind that explains transparency, reviews and pricing in 60 seconds.",
                                  dueDate: days(0), priority: .medium, type: .nudge, isAutoGenerated: false))

        return (partners, interactions, reminders)
    }

    private static func days(_ offset: Int) -> Date {
        Calendar.current.date(byAdding: .day, value: offset, to: Date()) ?? Date()
    }
}
