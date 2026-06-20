import SwiftUI

struct PartnersView: View {
    @EnvironmentObject private var data: DataStore

    @State private var search = ""
    @State private var stageFilter: PipelineStage?
    @State private var sort: SortOption = .followUp
    @State private var showAdd = false

    enum SortOption: String, CaseIterable, Identifiable {
        case followUp = "Follow-up due"
        case interest = "Interest"
        case recent = "Recently added"
        case name = "Name"
        var id: String { rawValue }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    filterChips
                    if visiblePartners.isEmpty {
                        emptyState
                    } else {
                        LazyVStack(spacing: 12) {
                            ForEach(visiblePartners) { partner in
                                NavigationLink(value: partner.id) {
                                    PartnerRow(partner: partner).cardStyle()
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(Layout.screenPadding)
            }
            .background(Color.appBackground)
            .navigationTitle("Partners")
            .searchable(text: $search, prompt: "Search owners or salons")
            .navigationDestination(for: UUID.self) { id in
                PartnerDetailView(partnerId: id)
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Picker("Sort", selection: $sort) {
                            ForEach(SortOption.allCases) { Text($0.rawValue).tag($0) }
                        }
                    } label: {
                        Image(systemName: "arrow.up.arrow.down")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showAdd = true } label: { Image(systemName: "plus") }
                }
            }
            .sheet(isPresented: $showAdd) {
                AddPartnerView()
            }
        }
    }

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterChip(title: "All", isOn: stageFilter == nil) { stageFilter = nil }
                ForEach(PipelineStage.allCases) { stage in
                    FilterChip(title: stage.label, tint: stage.color, isOn: stageFilter == stage) {
                        stageFilter = (stageFilter == stage) ? nil : stage
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        ContentUnavailableView {
            Label("No salon owners", systemImage: "person.2")
        } description: {
            Text(search.isEmpty ? "Add your first salon owner to start building the pipeline." : "No matches for \"\(search)\".")
        } actions: {
            if search.isEmpty {
                Button("Add salon owner") { showAdd = true }
                    .buttonStyle(.borderedProminent)
            }
        }
        .padding(.top, 60)
    }

    private var visiblePartners: [Partner] {
        var list = data.partners
        if let stageFilter { list = list.filter { $0.stage == stageFilter } }
        if !search.isEmpty {
            list = list.filter {
                $0.name.localizedCaseInsensitiveContains(search) ||
                $0.salonName.localizedCaseInsensitiveContains(search) ||
                $0.location.localizedCaseInsensitiveContains(search)
            }
        }
        switch sort {
        case .followUp:
            return list.sorted { lhs, rhs in
                (lhs.nextFollowUpAt ?? .distantFuture) < (rhs.nextFollowUpAt ?? .distantFuture)
            }
        case .interest:
            return list.sorted { $0.interestScore > $1.interestScore }
        case .recent:
            return list.sorted { $0.createdAt > $1.createdAt }
        case .name:
            return list.sorted { $0.displayTitle.localizedCaseInsensitiveCompare($1.displayTitle) == .orderedAscending }
        }
    }
}

struct PartnerRow: View {
    let partner: Partner
    var body: some View {
        HStack(spacing: 12) {
            PartnerAvatar(initials: partner.initials, size: 48)
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(partner.displayTitle).font(.headline).lineLimit(1)
                    Spacer()
                    StageBadge(stage: partner.stage)
                }
                if !partner.subtitle.isEmpty {
                    Text(partner.subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                }
                InterestBar(score: partner.interestScore)
                HStack {
                    MomentumBadge(momentum: partner.momentum)
                    Spacer()
                    if let next = partner.nextFollowUpAt {
                        Label(Format.shortDate(next), systemImage: "calendar")
                            .font(.caption2)
                            .foregroundStyle(partner.isOverdue ? Color.negative : .secondary)
                    }
                }
            }
        }
    }
}

private struct FilterChip: View {
    let title: String
    var tint: Color = Brand.indigo
    let isOn: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption.weight(.semibold))
                .foregroundStyle(isOn ? .white : tint)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isOn ? AnyShapeStyle(tint) : AnyShapeStyle(tint.opacity(0.12)), in: Capsule())
        }
        .buttonStyle(.plain)
    }
}
