import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var data: DataStore
    @EnvironmentObject private var settings: SettingsStore

    @State private var briefText = ""
    @State private var briefLoading = false
    @State private var briefError: String?
    @State private var showCompleted = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Layout.spacing) {
                    briefCard
                    statsRow
                    pipelineCard
                    focusCard
                    momentumCard
                    recentCard
                }
                .padding(Layout.screenPadding)
            }
            .background(Color.appBackground)
            .navigationTitle("Today")
            .navigationDestination(for: UUID.self) { id in
                PartnerDetailView(partnerId: id)
            }
        }
    }

    // MARK: Daily brief

    private var briefCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Daily brief", systemImage: "sun.max.fill")
                    .font(.headline)
                    .foregroundStyle(.white)
                Spacer()
                if !briefText.isEmpty {
                    Button { generateBrief() } label: {
                        Image(systemName: "arrow.clockwise").foregroundStyle(.white.opacity(0.9))
                    }
                }
            }

            if briefLoading {
                HStack(spacing: 10) {
                    ProgressView().tint(.white)
                    Text("Reading your whole pipeline…").foregroundStyle(.white.opacity(0.9))
                }
                .font(.subheadline)
                .padding(.vertical, 6)
            } else if !briefText.isEmpty {
                Text(briefText)
                    .font(.subheadline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                Text(greeting)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.95))
                    .frame(maxWidth: .infinity, alignment: .leading)
                Button {
                    generateBrief()
                } label: {
                    Label("Generate today's brief", systemImage: "sparkles")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Brand.indigo)
                        .padding(.vertical, 10)
                        .frame(maxWidth: .infinity)
                        .background(.white, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .padding(.top, 2)
            }

            if let briefError {
                Text(briefError).font(.caption).foregroundStyle(.white)
            }
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Brand.gradient, in: RoundedRectangle(cornerRadius: Layout.cardRadius, style: .continuous))
        .shadow(color: Brand.indigo.opacity(0.25), radius: 14, y: 8)
    }

    // MARK: Stats

    private var statsRow: some View {
        HStack(spacing: 12) {
            StatTile(value: "\(data.activePartners.count)", label: "Active deals", icon: "person.2.fill", tint: Brand.indigo)
            StatTile(value: "\(data.averageInterest)", label: "Avg interest", icon: "heart.fill", tint: Color.forInterest(data.averageInterest))
            StatTile(value: "\(overdueCount)", label: "Overdue", icon: "exclamationmark.circle.fill", tint: overdueCount > 0 ? .negative : .positive)
        }
    }

    // MARK: Pipeline

    private var pipelineCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Pipeline", subtitle: "\(data.signedPartnersCount) signed · \(data.activePartners.count) in play")
            PipelineStrip(counts: PipelineStage.activeFunnel.map { StageCount(stage: $0, count: data.count(for: $0)) })
        }
        .cardStyle()
    }

    // MARK: Focus points

    private var focusCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Today's focus", subtitle: focusSubtitle)

            if data.todayFocus.isEmpty {
                HStack(spacing: 10) {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(.positive)
                    Text("Nothing due. Log an update to generate new focus points.")
                        .font(.subheadline).foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 4)
            } else {
                ForEach(data.todayFocus.prefix(6)) { reminder in
                    rowLink(for: reminder)
                    if reminder.id != data.todayFocus.prefix(6).last?.id { Divider() }
                }
            }
        }
        .cardStyle()
    }

    @ViewBuilder
    private func rowLink(for reminder: Reminder) -> some View {
        if let partnerId = reminder.partnerId {
            NavigationLink(value: partnerId) {
                ReminderRow(reminder: reminder) { data.toggleReminder($0) }
            }
            .buttonStyle(.plain)
        } else {
            ReminderRow(reminder: reminder) { data.toggleReminder($0) }
        }
    }

    // MARK: Momentum

    private var momentumCard: some View {
        Group {
            if data.risingPartners.isEmpty && data.coolingPartners.isEmpty {
                EmptyView()
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    SectionHeader(title: "Momentum")
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(data.risingPartners.prefix(4)) { MomentumChip(partner: $0) }
                            ForEach(data.coolingPartners.prefix(4)) { MomentumChip(partner: $0) }
                        }
                    }
                }
                .cardStyle()
            }
        }
    }

    // MARK: Recent activity

    private var recentCard: some View {
        Group {
            if data.recentInteractions.isEmpty {
                EmptyView()
            } else {
                VStack(alignment: .leading, spacing: 12) {
                    SectionHeader(title: "Recent activity")
                    ForEach(data.recentInteractions.prefix(5)) { interaction in
                        NavigationLink(value: interaction.partnerId) {
                            ActivityRow(interaction: interaction, partnerName: data.partner(interaction.partnerId)?.displayTitle ?? "")
                        }
                        .buttonStyle(.plain)
                        if interaction.id != data.recentInteractions.prefix(5).last?.id { Divider() }
                    }
                }
                .cardStyle()
            }
        }
    }

    // MARK: Helpers

    private var overdueCount: Int { data.openReminders.filter { $0.isOverdue }.count }

    private var focusSubtitle: String {
        let count = data.todayFocus.count
        return count == 0 ? "All clear" : "\(count) point\(count == 1 ? "" : "s") need\(count == 1 ? "s" : "") you"
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        let part: String
        switch hour {
        case ..<12: part = "Good morning"
        case 12..<17: part = "Good afternoon"
        default: part = "Good evening"
        }
        let names = settings.companyProfile.founders.map(\.name)
        let who = names.isEmpty ? "" : ", " + names.prefix(2).joined(separator: " & ")
        return "\(part)\(who). Tap below for your strategic brief across every salon owner."
    }

    private func generateBrief() {
        guard settings.hasAPIKey else {
            briefError = "Add a Claude API key in Settings to generate your brief."
            return
        }
        briefError = nil
        briefLoading = true
        let snapshot = SemanticLayer.pipelineSnapshot(partners: data.partners, focus: data.todayFocus)
        let config = settings.agentConfig()
        Task {
            do {
                briefText = try await SemanticLayer.dailyBrief(snapshot: snapshot, config: config)
            } catch {
                briefError = (error as? ClaudeError)?.errorDescription ?? error.localizedDescription
            }
            briefLoading = false
        }
    }
}

// MARK: - Small dashboard pieces

private struct MomentumChip: View {
    let partner: Partner
    var body: some View {
        NavigationLink(value: partner.id) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    PartnerAvatar(initials: partner.initials, size: 34)
                    MomentumBadge(momentum: partner.momentum)
                }
                Text(partner.displayTitle)
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                InterestBar(score: partner.interestScore)
                Text("\(partner.interestScore)/100 · \(partner.stage.label)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .padding(12)
            .frame(width: 170, alignment: .leading)
            .background(Color.elevatedBackground, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

private struct ActivityRow: View {
    let interaction: Interaction
    let partnerName: String
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: interaction.source.icon)
                .font(.caption)
                .foregroundStyle(Brand.indigo)
                .frame(width: 24, height: 24)
                .background(Brand.indigo.opacity(0.12), in: Circle())
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(partnerName).font(.subheadline.weight(.medium))
                    Spacer()
                    Text(Format.relative(interaction.createdAt)).font(.caption2).foregroundStyle(.secondary)
                }
                Text(interaction.displaySummary)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(.vertical, 2)
        .contentShape(Rectangle())
    }
}
