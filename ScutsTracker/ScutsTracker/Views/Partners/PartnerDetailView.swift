import SwiftUI

struct PartnerDetailView: View {
    let partnerId: UUID
    @EnvironmentObject private var data: DataStore
    @EnvironmentObject private var settings: SettingsStore
    @Environment(\.dismiss) private var dismiss

    @State private var showEdit = false
    @State private var showLog = false
    @State private var regenLoading = false
    @State private var regenError: String?
    @State private var showDeleteConfirm = false
    @State private var newReminder = ""

    private var partner: Partner? { data.partner(partnerId) }

    var body: some View {
        Group {
            if let partner {
                content(partner)
            } else {
                ContentUnavailableView("Owner not found", systemImage: "person.slash")
            }
        }
        .background(Color.appBackground)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button { showEdit = true } label: { Label("Edit details", systemImage: "pencil") }
                    Button(role: .destructive) { showDeleteConfirm = true } label: { Label("Delete owner", systemImage: "trash") }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .sheet(isPresented: $showEdit) {
            if let partner { AddPartnerView(existing: partner) }
        }
        .sheet(isPresented: $showLog) {
            LogInteractionView(presetPartnerId: partnerId)
                .environmentObject(data)
                .environmentObject(settings)
        }
        .confirmationDialog("Delete this salon owner and all their notes?", isPresented: $showDeleteConfirm, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                if let partner { data.deletePartner(partner) }
                dismiss()
            }
        }
    }

    private func content(_ partner: Partner) -> some View {
        ScrollView {
            VStack(spacing: Layout.spacing) {
                header(partner)
                quickActions(partner)
                if let sentiment = partner.latestSentiment { sentimentCard(sentiment) }
                strategySection(partner)
                if let followUp = partner.latestFollowUp { followUpCard(followUp) }
                trendCard(partner)
                focusCard(partner)
                timelineCard(partner)
            }
            .padding(Layout.screenPadding)
        }
    }

    // MARK: Header

    private func header(_ partner: Partner) -> some View {
        VStack(spacing: 14) {
            HStack(spacing: 16) {
                PartnerAvatar(initials: partner.initials, size: 64)
                VStack(alignment: .leading, spacing: 4) {
                    Text(partner.displayTitle).font(.title2.bold())
                    if !partner.name.isEmpty && partner.salonName != partner.name {
                        Text(partner.name).font(.subheadline).foregroundStyle(.secondary)
                    }
                    if !partner.location.isEmpty {
                        Label(partner.location, systemImage: "mappin.and.ellipse")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                }
                Spacer()
                InterestRing(score: partner.interestScore, size: 66)
            }
            HStack {
                StageBadge(stage: partner.stage)
                MomentumBadge(momentum: partner.momentum)
                Spacer()
                if let next = partner.nextFollowUpAt {
                    Label(Format.shortDate(next), systemImage: "calendar")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(partner.isOverdue ? Color.negative : Brand.indigo)
                }
            }
            if !partner.tags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(partner.tags, id: \.self) { Chip(text: $0, tint: .neutralGray) }
                    }
                }
            }
        }
        .cardStyle()
    }

    // MARK: Quick actions

    private func quickActions(_ partner: Partner) -> some View {
        VStack(spacing: 12) {
            Button { showLog = true } label: {
                Label("Log an update", systemImage: "mic.fill")
            }
            .buttonStyle(.primaryGradient)

            HStack(spacing: 10) {
                if !partner.phone.isEmpty {
                    ContactButton(icon: "phone.fill", label: "Call", url: URL(string: "tel:\(digits(partner.phone))"))
                    ContactButton(icon: "message.fill", label: "WhatsApp", url: URL(string: "https://wa.me/\(digits(partner.phone))"))
                }
                if !partner.email.isEmpty {
                    ContactButton(icon: "envelope.fill", label: "Email", url: URL(string: "mailto:\(partner.email)"))
                }
            }
        }
    }

    // MARK: Sentiment

    private func sentimentCard(_ sentiment: SentimentAnalysis) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Where they stand", subtitle: "Read \(Format.relative(sentiment.createdAt))")
            Text(sentiment.headline).font(.subheadline)
            if !sentiment.buyingSignals.isEmpty {
                labeledList("Buying signals", items: sentiment.buyingSignals, icon: "checkmark.circle.fill", tint: .positive)
            }
            if !sentiment.concerns.isEmpty {
                labeledList("Concerns", items: sentiment.concerns, icon: "exclamationmark.triangle.fill", tint: .caution)
            }
        }
        .cardStyle()
    }

    // MARK: Strategy

    private func strategySection(_ partner: Partner) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                SectionHeader(title: "Strategy")
                Spacer()
                if partner.latestSentiment != nil {
                    Button {
                        regenerate(partner)
                    } label: {
                        if regenLoading { ProgressView().controlSize(.small) }
                        else { Label("Refresh", systemImage: "arrow.clockwise").font(.caption.weight(.semibold)) }
                    }
                    .disabled(regenLoading)
                }
            }

            if let strategy = partner.latestStrategy {
                Text(strategy.headline).font(.headline).foregroundStyle(Brand.indigo)
                Text(strategy.approach).font(.subheadline)

                if !strategy.talkingPoints.isEmpty {
                    labeledList("Talking points", items: strategy.talkingPoints, icon: "bubble.left.fill", tint: Brand.indigo)
                }
                if !strategy.objectionHandlers.isEmpty {
                    Text("If they push back").font(.subheadline.weight(.semibold)).padding(.top, 2)
                    ForEach(strategy.objectionHandlers) { handler in
                        VStack(alignment: .leading, spacing: 3) {
                            Label(handler.objection, systemImage: "quote.opening").font(.caption.weight(.semibold)).foregroundStyle(.caution)
                            Text(handler.response).font(.caption).foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10)
                        .background(Color.elevatedBackground, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    }
                }
                if !strategy.nextBestAction.isEmpty {
                    HStack(alignment: .top, spacing: 8) {
                        Image(systemName: "arrow.forward.circle.fill").foregroundStyle(Brand.violet)
                        Text(strategy.nextBestAction).font(.subheadline.weight(.medium))
                    }
                    .padding(.top, 2)
                }
            } else {
                Text("Log an update to generate a tailored strategy for \(partner.name).")
                    .font(.subheadline).foregroundStyle(.secondary)
            }

            if let regenError {
                Text(regenError).font(.caption).foregroundStyle(Color.negative)
            }
        }
        .cardStyle()
    }

    // MARK: Follow-up

    private func followUpCard(_ followUp: FollowUpPlan) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Follow-up plan")
            HStack(spacing: 12) {
                planTile(icon: followUp.channelIcon, value: followUp.channel, label: "Channel")
                planTile(icon: "calendar", value: Format.shortDate(followUp.nextFollowUpAt), label: "Next")
                planTile(icon: "repeat", value: "\(followUp.cadenceDays)d", label: "Cadence")
            }
            if !followUp.focusPoints.isEmpty {
                labeledList("Raise these points", items: followUp.focusPoints, icon: "target", tint: Brand.teal)
            }
            if !followUp.rationale.isEmpty {
                Text(followUp.rationale).font(.caption).foregroundStyle(.secondary)
            }
        }
        .cardStyle()
    }

    // MARK: Trend

    private func trendCard(_ partner: Partner) -> some View {
        let interactions = data.interactionsForPartner(partner.id)
        let withSentiment = interactions.filter { $0.sentiment != nil }
        return Group {
            if withSentiment.count >= 2 {
                VStack(alignment: .leading, spacing: 12) {
                    SectionHeader(title: "Interest trend")
                    SentimentTrendChart(interactions: interactions)
                }
                .cardStyle()
            } else {
                EmptyView()
            }
        }
    }

    // MARK: Focus points

    private func focusCard(_ partner: Partner) -> some View {
        let list = data.remindersForPartner(partner.id)
        return VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Focus points")
            if list.isEmpty {
                Text("No focus points yet — they appear automatically after you log an update.")
                    .font(.subheadline).foregroundStyle(.secondary)
            } else {
                ForEach(list) { reminder in
                    ReminderRow(reminder: reminder, showPartner: false) { data.toggleReminder($0) }
                    if reminder.id != list.last?.id { Divider() }
                }
            }
            HStack(spacing: 8) {
                TextField("Add your own focus point…", text: $newReminder)
                    .textFieldStyle(.roundedBorder)
                Button {
                    addManualReminder(partner)
                } label: {
                    Image(systemName: "plus.circle.fill").font(.title2).foregroundStyle(Brand.indigo)
                }
                .disabled(newReminder.trimmingCharacters(in: .whitespaces).isEmpty)
            }
            .padding(.top, 4)
        }
        .cardStyle()
    }

    // MARK: Timeline

    private func timelineCard(_ partner: Partner) -> some View {
        let interactions = data.interactionsForPartner(partner.id)
        return VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Timeline", subtitle: "\(interactions.count) update\(interactions.count == 1 ? "" : "s")")
            if interactions.isEmpty {
                Text("No updates logged yet.").font(.subheadline).foregroundStyle(.secondary)
            } else {
                ForEach(interactions) { interaction in
                    InteractionCard(interaction: interaction)
                    if interaction.id != interactions.last?.id { Divider() }
                }
            }
        }
        .cardStyle()
    }

    // MARK: Helpers

    private func planTile(icon: String, value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon).foregroundStyle(Brand.indigo)
            Text(value).font(.subheadline.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.7)
            Text(label).font(.caption2).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Color.elevatedBackground, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func labeledList(_ title: String, items: [String], icon: String, tint: Color) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.subheadline.weight(.semibold))
            BulletList(items: items, symbol: "circle.fill", tint: tint)
        }
    }

    private func digits(_ s: String) -> String {
        s.filter { $0.isNumber }
    }

    private func addManualReminder(_ partner: Partner) {
        let text = newReminder.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        data.addReminder(Reminder(
            partnerId: partner.id,
            partnerName: partner.displayTitle,
            title: text,
            priority: .medium,
            type: .nudge,
            isAutoGenerated: false
        ))
        newReminder = ""
    }

    private func regenerate(_ partner: Partner) {
        guard settings.hasAPIKey else { regenError = "Add a Claude API key in Settings."; return }
        guard let sentiment = partner.latestSentiment else { return }
        regenError = nil
        regenLoading = true
        let history = data.interactionsForPartner(partner.id)
        let config = settings.agentConfig()
        Task {
            do {
                let strategy = try await SemanticLayer.buildStrategy(partner: partner, sentiment: sentiment, history: history, config: config)
                let followUp = try await SemanticLayer.planFollowUp(partner: partner, sentiment: sentiment, strategy: strategy, config: config)
                var updated = partner
                updated.latestStrategy = strategy
                updated.latestFollowUp = followUp
                updated.nextFollowUpAt = followUp.nextFollowUpAt
                data.updatePartner(updated)
                data.replaceAutoReminders(for: partner.id,
                                          with: SemanticLayer.makeReminders(partner: updated, sentiment: sentiment, strategy: strategy, followUp: followUp))
            } catch {
                regenError = (error as? ClaudeError)?.errorDescription ?? error.localizedDescription
            }
            regenLoading = false
        }
    }
}

// MARK: - Contact button

private struct ContactButton: View {
    let icon: String
    let label: String
    let url: URL?
    var body: some View {
        if let url {
            Link(destination: url) {
                VStack(spacing: 5) {
                    Image(systemName: icon).font(.headline)
                    Text(label).font(.caption2)
                }
                .foregroundStyle(Brand.indigo)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Brand.indigo.opacity(0.12), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
        }
    }
}

// MARK: - Interaction card

private struct InteractionCard: View {
    let interaction: Interaction
    @State private var expanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Label(interaction.source.label, systemImage: interaction.source.icon)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(Brand.indigo)
                Spacer()
                if interaction.processingState == .failed {
                    Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.caution).font(.caption2)
                }
                Text(Format.dayAndTime(interaction.createdAt))
                    .font(.caption2).foregroundStyle(.secondary)
            }

            Text(interaction.displaySummary)
                .font(.subheadline)
                .frame(maxWidth: .infinity, alignment: .leading)

            if let sentiment = interaction.sentiment {
                HStack(spacing: 8) {
                    Text("Interest \(sentiment.interestScore)/100")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(Color.forInterest(sentiment.interestScore))
                    MomentumBadge(momentum: sentiment.momentum)
                }
            }

            if expanded {
                if !interaction.keyPoints.isEmpty {
                    detailGroup("Key points", interaction.keyPoints)
                }
                if !interaction.commitments.isEmpty {
                    detailGroup("Commitments", interaction.commitments)
                }
                if !interaction.objections.isEmpty {
                    detailGroup("Objections", interaction.objections)
                }
                if interaction.summary != interaction.rawText && !interaction.rawText.isEmpty {
                    Text("Original note").font(.caption2.weight(.semibold)).foregroundStyle(.secondary).padding(.top, 2)
                    Text(interaction.rawText).font(.caption).foregroundStyle(.secondary)
                }
            }

            if hasDetail {
                Button(expanded ? "Show less" : "Show more") {
                    withAnimation { expanded.toggle() }
                }
                .font(.caption.weight(.semibold))
            }
        }
        .padding(.vertical, 4)
    }

    private var hasDetail: Bool {
        !interaction.keyPoints.isEmpty || !interaction.commitments.isEmpty || !interaction.objections.isEmpty
            || (interaction.summary != interaction.rawText && !interaction.rawText.isEmpty)
    }

    private func detailGroup(_ title: String, _ items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.caption2.weight(.semibold)).foregroundStyle(.secondary)
            ForEach(items, id: \.self) { item in
                HStack(alignment: .top, spacing: 6) {
                    Text("•").font(.caption)
                    Text(item).font(.caption)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
