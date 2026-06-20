import SwiftUI

// MARK: - View model (orchestrates the semantic-layer pipeline)

@MainActor
final class ProcessingViewModel: ObservableObject {
    @Published var state: ProcessingState?      // nil = idle, not started
    @Published var errorMessage: String?
    @Published var result: Outcome?

    struct Outcome {
        var partner: Partner
        var interaction: Interaction
        var reminders: [Reminder]
    }

    var isRunning: Bool {
        guard let state else { return false }
        return !state.isTerminal
    }

    func reset() {
        state = nil
        errorMessage = nil
        result = nil
    }

    func process(rawText: String,
                 source: InteractionSource,
                 partner: Partner,
                 runAnalysis: Bool,
                 config: AgentConfig,
                 data: DataStore) async {
        errorMessage = nil
        result = nil
        state = .queued

        var interaction = Interaction(partnerId: partner.id, source: source, rawText: rawText)
        var updated = partner
        updated.lastContactAt = Date()

        let keyPresent = KeychainStore.hasAPIKey
        guard runAnalysis && keyPresent else {
            interaction.processingState = .completed
            data.addInteraction(interaction)
            data.updatePartner(updated)
            if !keyPresent {
                errorMessage = "Saved your note. Add a Claude API key in Settings to unlock the agents."
            }
            result = Outcome(partner: updated, interaction: interaction, reminders: [])
            state = .completed
            return
        }

        do {
            state = .summarizing
            let summary = try await SemanticLayer.summarize(rawText: rawText, partner: partner, config: config)
            interaction.summary = summary.summary
            interaction.keyPoints = summary.keyPoints
            interaction.commitments = summary.commitments
            interaction.objections = summary.objections

            state = .analyzing
            let sentiment = try await SemanticLayer.analyzeSentiment(rawText: rawText, summary: summary.summary, partner: partner, config: config)
            interaction.sentiment = sentiment
            updated.interestScore = sentiment.interestScore
            updated.momentum = sentiment.momentum
            updated.latestSentiment = sentiment
            if let stage = sentiment.suggestedStage, Self.advanceAllowed(from: partner.stage, to: stage) {
                updated.stage = stage
            }

            state = .strategizing
            let history = data.interactionsForPartner(partner.id)
            let strategy = try await SemanticLayer.buildStrategy(partner: updated, sentiment: sentiment, history: history, config: config)
            updated.latestStrategy = strategy

            state = .planning
            let followUp = try await SemanticLayer.planFollowUp(partner: updated, sentiment: sentiment, strategy: strategy, config: config)
            updated.latestFollowUp = followUp
            updated.nextFollowUpAt = followUp.nextFollowUpAt

            interaction.processingState = .completed
            let reminders = SemanticLayer.makeReminders(partner: updated, sentiment: sentiment, strategy: strategy, followUp: followUp)

            data.addInteraction(interaction)
            data.updatePartner(updated)
            data.replaceAutoReminders(for: partner.id, with: reminders)

            result = Outcome(partner: updated, interaction: interaction, reminders: reminders)
            state = .completed
        } catch {
            interaction.processingState = .failed
            interaction.errorMessage = (error as? ClaudeError)?.errorDescription ?? error.localizedDescription
            data.addInteraction(interaction)
            data.updatePartner(updated)
            errorMessage = interaction.errorMessage
            result = Outcome(partner: updated, interaction: interaction, reminders: [])
            state = .failed
        }
    }

    private static func advanceAllowed(from current: PipelineStage, to suggested: PipelineStage) -> Bool {
        if current == .partner { return suggested == .partner }
        if current == .lost { return false }
        return true
    }
}

// MARK: - Log screen

struct LogInteractionView: View {
    @EnvironmentObject private var data: DataStore
    @EnvironmentObject private var settings: SettingsStore
    @StateObject private var speech = SpeechRecognizer()
    @StateObject private var vm = ProcessingViewModel()

    @State private var selectedPartnerId: UUID?
    @State private var noteText = ""
    @State private var voiceBaseline = ""
    @State private var runAnalysis = true
    @State private var showPartnerPicker = false
    @State private var navigatePartner: Partner?

    /// Lets other screens deep-link "Log update for this partner".
    var presetPartnerId: UUID?

    init(presetPartnerId: UUID? = nil) {
        self.presetPartnerId = presetPartnerId
        _selectedPartnerId = State(initialValue: presetPartnerId)
    }

    private var selectedPartner: Partner? { data.partner(selectedPartnerId) }

    var body: some View {
        NavigationStack {
            ZStack {
                Color.appBackground.ignoresSafeArea()
                if vm.state != nil {
                    ProcessingPanel(vm: vm,
                                    partnerName: selectedPartner?.displayTitle ?? "",
                                    onLogAnother: resetForNext,
                                    onViewPartner: { navigatePartner = vm.result?.partner })
                        .transition(.opacity)
                } else {
                    captureForm
                        .transition(.opacity)
                }
            }
            .navigationTitle("Log an update")
            .animation(.easeInOut, value: vm.state)
            .sheet(isPresented: $showPartnerPicker) {
                PartnerPickerSheet(selectedId: $selectedPartnerId)
            }
            .navigationDestination(item: $navigatePartner) { partner in
                PartnerDetailView(partnerId: partner.id)
            }
            .onAppear { runAnalysis = settings.autoRunAnalysis }
            .onChange(of: speech.transcript) { _, transcript in
                let separator = voiceBaseline.isEmpty ? "" : " "
                noteText = voiceBaseline + separator + transcript
            }
        }
    }

    // MARK: Capture form

    private var captureForm: some View {
        ScrollView {
            VStack(spacing: Layout.spacing) {
                partnerCard
                noteCard
                optionsCard
                processButton
            }
            .padding(Layout.screenPadding)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private var partnerCard: some View {
        Button { showPartnerPicker = true } label: {
            HStack(spacing: 14) {
                if let partner = selectedPartner {
                    PartnerAvatar(initials: partner.initials, size: 48)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(partner.displayTitle).font(.headline)
                        Text(partner.name).font(.subheadline).foregroundStyle(.secondary)
                    }
                } else {
                    Image(systemName: "person.crop.circle.badge.plus")
                        .font(.title)
                        .foregroundStyle(Brand.indigo)
                        .frame(width: 48, height: 48)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Choose salon owner").font(.headline)
                        Text("Who is this update about?").font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(.tertiary)
            }
            .cardStyle()
        }
        .buttonStyle(.plain)
    }

    private var noteCard: some View {
        VStack(spacing: 16) {
            ZStack(alignment: .topLeading) {
                if noteText.isEmpty {
                    Text("Speak or type what happened with the salon owner…")
                        .foregroundStyle(.tertiary)
                        .padding(.top, 8)
                        .padding(.horizontal, 4)
                }
                TextEditor(text: $noteText)
                    .frame(minHeight: 130)
                    .scrollContentBackground(.hidden)
            }

            VStack(spacing: 8) {
                ZStack {
                    if speech.isRecording { RecordingPulse().frame(width: 90, height: 90) }
                    Button { toggleMic() } label: {
                        ZStack {
                            Circle()
                                .fill(speech.isRecording ? Color.negative : Brand.indigo)
                                .frame(width: 76, height: 76)
                            Image(systemName: speech.isRecording ? "stop.fill" : "mic.fill")
                                .font(.system(size: 30, weight: .bold))
                                .foregroundStyle(.white)
                        }
                    }
                    .buttonStyle(.plain)
                }
                Text(speech.isRecording ? "Listening… tap to stop" : "Tap to dictate")
                    .font(.footnote)
                    .foregroundStyle(speech.isRecording ? Color.negative : .secondary)
                if let error = speech.errorMessage {
                    Text(error).font(.caption).foregroundStyle(Color.negative).multilineTextAlignment(.center)
                }
            }
        }
        .cardStyle()
    }

    private var optionsCard: some View {
        VStack(spacing: 12) {
            Toggle(isOn: $runAnalysis) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Run AI analysis now").font(.subheadline.weight(.medium))
                    Text("Summarize, read sentiment, build strategy & follow-up.")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            .tint(Brand.indigo)

            if runAnalysis && !settings.hasAPIKey {
                Label("No API key set — the note will be saved without analysis.", systemImage: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundStyle(Color.caution)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .cardStyle()
    }

    private var processButton: some View {
        Button {
            startProcessing()
        } label: {
            Label(runAnalysis ? "Process update" : "Save note", systemImage: "sparkles")
        }
        .buttonStyle(.primaryGradient)
        .disabled(!canProcess)
        .opacity(canProcess ? 1 : 0.5)
    }

    private var canProcess: Bool {
        selectedPartner != nil && !noteText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    // MARK: Actions

    private func toggleMic() {
        if speech.isRecording {
            speech.stop()
        } else {
            speech.transcript = ""
            voiceBaseline = noteText
            speech.start()
        }
    }

    private func startProcessing() {
        guard let partner = selectedPartner else { return }
        speech.stop()
        let text = noteText.trimmingCharacters(in: .whitespacesAndNewlines)
        let source: InteractionSource = speech.transcript.isEmpty ? .text : .voice
        let config = settings.agentConfig()
        Task {
            await vm.process(rawText: text, source: source, partner: partner, runAnalysis: runAnalysis, config: config, data: data)
        }
    }

    private func resetForNext() {
        vm.reset()
        noteText = ""
        voiceBaseline = ""
        speech.reset()
    }
}

// MARK: - Processing / result panel

private struct ProcessingPanel: View {
    @ObservedObject var vm: ProcessingViewModel
    let partnerName: String
    let onLogAnother: () -> Void
    let onViewPartner: () -> Void

    private let steps: [ProcessingState] = [.summarizing, .analyzing, .strategizing, .planning]

    var body: some View {
        ScrollView {
            VStack(spacing: Layout.spacing) {
                if vm.state == .completed, let outcome = vm.result, outcome.interaction.processingState == .completed, vm.errorMessage == nil {
                    resultCard(outcome)
                } else if vm.state == .failed || vm.errorMessage != nil {
                    noticeCard
                } else {
                    progressCard
                }
            }
            .padding(Layout.screenPadding)
        }
    }

    private var progressCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(spacing: 10) {
                ProgressView().tint(Brand.indigo)
                Text("Working through your note\(partnerName.isEmpty ? "" : " on \(partnerName)")…")
                    .font(.headline)
            }
            VStack(spacing: 0) {
                ForEach(steps.indices, id: \.self) { index in
                    StepRow(step: steps[index], status: status(for: index), isLast: index == steps.count - 1)
                }
            }
        }
        .cardStyle()
    }

    private func status(for index: Int) -> StepRow.Status {
        guard let current = vm.state else { return .pending }
        let currentIndex = steps.firstIndex(of: current)
        if current == .completed { return .done }
        if let ci = currentIndex {
            if index < ci { return .done }
            if index == ci { return .active }
        }
        return .pending
    }

    private func resultCard(_ outcome: ProcessingViewModel.Outcome) -> some View {
        VStack(spacing: Layout.spacing) {
            VStack(spacing: 14) {
                Label("Analysis complete", systemImage: "checkmark.seal.fill")
                    .font(.headline)
                    .foregroundStyle(Color.positive)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if let sentiment = outcome.partner.latestSentiment {
                    HStack(spacing: 16) {
                        InterestRing(score: sentiment.interestScore, size: 72)
                        VStack(alignment: .leading, spacing: 6) {
                            MomentumBadge(momentum: sentiment.momentum)
                            Text(sentiment.headline)
                                .font(.subheadline)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                }

                if let followUp = outcome.partner.latestFollowUp {
                    Divider()
                    HStack(spacing: 10) {
                        Image(systemName: followUp.channelIcon).foregroundStyle(Brand.indigo)
                        VStack(alignment: .leading, spacing: 1) {
                            Text("Next: \(followUp.channel) \(Format.shortDate(followUp.nextFollowUpAt))")
                                .font(.subheadline.weight(.medium))
                            Text("Every \(followUp.cadenceDays) day\(followUp.cadenceDays == 1 ? "" : "s")")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                }
            }
            .cardStyle()

            if !outcome.reminders.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    SectionHeader(title: "New focus points", subtitle: "Added to your Today list")
                    ForEach(outcome.reminders) { reminder in
                        ReminderRow(reminder: reminder, showPartner: false, onToggle: nil)
                    }
                }
                .cardStyle()
            }

            actionButtons
        }
    }

    private var noticeCard: some View {
        VStack(spacing: Layout.spacing) {
            VStack(spacing: 12) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.largeTitle)
                    .foregroundStyle(Color.caution)
                Text("Note saved")
                    .font(.headline)
                Text(vm.errorMessage ?? "Something went wrong during analysis, but your note is safe.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .cardStyle()
            actionButtons
        }
    }

    private var actionButtons: some View {
        VStack(spacing: 10) {
            Button("View partner", action: onViewPartner)
                .buttonStyle(.primaryGradient)
            Button("Log another update", action: onLogAnother)
                .buttonStyle(.secondarySoft)
        }
    }
}

private struct StepRow: View {
    enum Status { case pending, active, done }
    let step: ProcessingState
    let status: Status
    let isLast: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            VStack(spacing: 0) {
                icon
                if !isLast {
                    Rectangle()
                        .fill(status == .done ? Brand.indigo : Color.subtleFill)
                        .frame(width: 2, height: 22)
                }
            }
            Text(step.label)
                .font(.subheadline.weight(status == .active ? .semibold : .regular))
                .foregroundStyle(status == .pending ? .secondary : .primary)
                .padding(.top, 1)
            Spacer()
        }
    }

    @ViewBuilder private var icon: some View {
        switch status {
        case .done:
            Image(systemName: "checkmark.circle.fill").foregroundStyle(Brand.indigo)
        case .active:
            ProgressView().controlSize(.small).frame(width: 22, height: 22)
        case .pending:
            Image(systemName: "circle").foregroundStyle(.tertiary)
        }
    }
}

struct RecordingPulse: View {
    var body: some View {
        TimelineView(.animation) { timeline in
            let t = timeline.date.timeIntervalSinceReferenceDate
            let phase = t.truncatingRemainder(dividingBy: 1.2) / 1.2
            Circle()
                .stroke(Color.negative, lineWidth: 5)
                .scaleEffect(1 + 0.35 * phase)
                .opacity(1 - phase)
        }
    }
}

// MARK: - Partner picker

private struct PartnerPickerSheet: View {
    @EnvironmentObject private var data: DataStore
    @Binding var selectedId: UUID?
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""
    @State private var showAdd = false

    private var filtered: [Partner] {
        let base = data.partners.sorted { $0.displayTitle.localizedCaseInsensitiveCompare($1.displayTitle) == .orderedAscending }
        guard !search.isEmpty else { return base }
        return base.filter {
            $0.name.localizedCaseInsensitiveContains(search) || $0.salonName.localizedCaseInsensitiveContains(search)
        }
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(filtered) { partner in
                    Button {
                        selectedId = partner.id
                        dismiss()
                    } label: {
                        HStack(spacing: 12) {
                            PartnerAvatar(initials: partner.initials, size: 38)
                            VStack(alignment: .leading, spacing: 1) {
                                Text(partner.displayTitle).font(.body.weight(.medium))
                                Text(partner.name).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if partner.id == selectedId {
                                Image(systemName: "checkmark").foregroundStyle(Brand.indigo)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .overlay {
                if data.partners.isEmpty {
                    ContentUnavailableView("No salon owners yet", systemImage: "person.2",
                                           description: Text("Add your first owner to start tracking."))
                }
            }
            .searchable(text: $search, prompt: "Search owners")
            .navigationTitle("Choose owner")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showAdd = true } label: { Image(systemName: "plus") }
                }
            }
            .sheet(isPresented: $showAdd) {
                AddPartnerView { created in
                    selectedId = created.id
                    dismiss()
                }
            }
        }
    }
}
