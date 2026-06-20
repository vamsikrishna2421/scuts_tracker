import SwiftUI

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var input = ""
    @Published var isStreaming = false
    @Published var errorMessage: String?

    private var streamTask: Task<Void, Never>?

    func send(text rawText: String? = nil, data: DataStore, settings: SettingsStore) {
        let text = (rawText ?? input).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isStreaming else { return }
        guard settings.hasAPIKey else {
            errorMessage = "Add a Claude API key in Settings to chat with your assistant."
            return
        }
        input = ""
        errorMessage = nil

        data.appendChat(ChatMessage(role: .user, text: text))
        let placeholder = ChatMessage(role: .assistant, text: "")
        data.appendChat(placeholder)
        isStreaming = true

        let history = data.chat.filter { $0.id != placeholder.id && !$0.text.isEmpty }
        let snapshot = SemanticLayer.pipelineSnapshot(partners: data.partners, focus: data.todayFocus)
        let config = settings.agentConfig()

        streamTask = Task {
            var accumulated = ""
            do {
                for try await delta in SemanticLayer.chatStream(history: history, snapshot: snapshot, config: config) {
                    accumulated += delta
                    data.updateChatMessage(id: placeholder.id, text: accumulated)
                }
            } catch {
                self.errorMessage = (error as? ClaudeError)?.errorDescription ?? error.localizedDescription
            }
            if accumulated.isEmpty {
                data.removeChatMessage(id: placeholder.id)
            } else {
                data.save()
            }
            self.isStreaming = false
        }
    }

    func stop() {
        streamTask?.cancel()
        streamTask = nil
        isStreaming = false
    }
}

struct ChatView: View {
    @EnvironmentObject private var data: DataStore
    @EnvironmentObject private var settings: SettingsStore
    @StateObject private var vm = ChatViewModel()
    @FocusState private var inputFocused: Bool

    private let suggestions = [
        "What should I focus on today?",
        "How do I win over a hesitant salon owner?",
        "Summarize my pipeline in 3 lines",
        "Draft a WhatsApp follow-up for my warmest lead"
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                messages
                if let error = vm.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(Color.negative)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, Layout.screenPadding)
                        .padding(.top, 6)
                }
                inputBar
            }
            .background(Color.appBackground)
            .navigationTitle("Assistant")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    if !data.chat.isEmpty {
                        Button { data.clearChat() } label: { Image(systemName: "trash") }
                            .disabled(vm.isStreaming)
                    }
                }
            }
        }
    }

    private var messages: some View {
        ScrollViewReader { proxy in
            ScrollView {
                if data.chat.isEmpty {
                    emptyState
                } else {
                    LazyVStack(spacing: 12) {
                        ForEach(data.chat) { message in
                            ChatBubble(message: message, isStreaming: vm.isStreaming && message.id == data.chat.last?.id)
                                .id(message.id)
                        }
                    }
                    .padding(Layout.screenPadding)
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: data.chat.last?.text) { _, _ in
                if let last = data.chat.last?.id {
                    withAnimation(.easeOut(duration: 0.2)) { proxy.scrollTo(last, anchor: .bottom) }
                }
            }
            .onChange(of: data.chat.count) { _, _ in
                if let last = data.chat.last?.id {
                    withAnimation(.easeOut(duration: 0.2)) { proxy.scrollTo(last, anchor: .bottom) }
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 18) {
            AppLogoMark(size: 64)
            VStack(spacing: 6) {
                Text("Talk it through")
                    .font(.title2.bold())
                Text("Your strategic partner for the whole Scuts pipeline. Ask about any salon owner, plan your day, or prep for a tough conversation.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            VStack(spacing: 10) {
                ForEach(suggestions, id: \.self) { prompt in
                    Button {
                        vm.send(text: prompt, data: data, settings: settings)
                    } label: {
                        HStack {
                            Image(systemName: "sparkles").foregroundStyle(Brand.violet)
                            Text(prompt).font(.subheadline).foregroundStyle(.primary)
                            Spacer()
                            Image(systemName: "arrow.up.right").font(.caption).foregroundStyle(.tertiary)
                        }
                        .padding(14)
                        .background(Color.cardBackground, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(Layout.screenPadding)
        .padding(.top, 40)
    }

    private var inputBar: some View {
        HStack(spacing: 10) {
            TextField("Ask your assistant…", text: $vm.input, axis: .vertical)
                .lineLimit(1...4)
                .focused($inputFocused)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color.cardBackground, in: RoundedRectangle(cornerRadius: 20, style: .continuous))

            if vm.isStreaming {
                Button { vm.stop() } label: {
                    Image(systemName: "stop.circle.fill")
                        .font(.system(size: 34))
                        .foregroundStyle(Color.negative)
                }
            } else {
                Button {
                    inputFocused = false
                    vm.send(data: data, settings: settings)
                } label: {
                    Image(systemName: "arrow.up.circle.fill")
                        .font(.system(size: 34))
                        .foregroundStyle(canSend ? Brand.indigo : Color.secondary)
                }
                .disabled(!canSend)
            }
        }
        .padding(.horizontal, Layout.screenPadding)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
    }

    private var canSend: Bool {
        !vm.input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}

private struct ChatBubble: View {
    let message: ChatMessage
    let isStreaming: Bool

    var body: some View {
        HStack {
            if message.role == .user { Spacer(minLength: 40) }
            Group {
                if message.role == .assistant && message.text.isEmpty && isStreaming {
                    TypingIndicator().padding(.vertical, 6)
                } else {
                    Text(message.text)
                        .font(.subheadline)
                        .foregroundStyle(message.role == .user ? .white : .primary)
                        .textSelection(.enabled)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(bubbleBackground)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            if message.role == .assistant { Spacer(minLength: 40) }
        }
    }

    @ViewBuilder private var bubbleBackground: some View {
        if message.role == .user {
            Brand.gradient
        } else {
            Color.cardBackground
        }
    }
}
