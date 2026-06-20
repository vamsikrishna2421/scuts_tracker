import SwiftUI
import PDFKit
import UniformTypeIdentifiers

struct KnowledgeBaseView: View {
    @EnvironmentObject private var settings: SettingsStore
    @State private var showPaste = false
    @State private var showImporter = false
    @State private var importError: String?

    var body: some View {
        List {
            Section {
                if settings.knowledgeDocuments.isEmpty {
                    Text("Upload anything that helps the agents understand Scuts — a pitch script, FAQ, pricing sheet, objection-handling notes, or success stories.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                } else {
                    ForEach(settings.knowledgeDocuments) { doc in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(doc.title).font(.subheadline.weight(.medium))
                            Text(doc.preview).font(.caption).foregroundStyle(.secondary).lineLimit(2)
                            Text("\(doc.wordCount) words · \(Format.shortDate(doc.createdAt))")
                                .font(.caption2).foregroundStyle(.tertiary)
                        }
                        .padding(.vertical, 2)
                    }
                    .onDelete { offsets in
                        settings.knowledgeDocuments.remove(atOffsets: offsets)
                    }
                }
            } footer: {
                if let importError {
                    Text(importError).foregroundStyle(Color.negative)
                }
            }
        }
        .navigationTitle("Knowledge base")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button { showPaste = true } label: { Label("Paste text", systemImage: "doc.text") }
                    Button { showImporter = true } label: { Label("Import file", systemImage: "folder") }
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .sheet(isPresented: $showPaste) {
            AddKnowledgeSheet { title, content in
                settings.addKnowledgeDocument(title: title, content: content)
            }
        }
        .fileImporter(isPresented: $showImporter,
                      allowedContentTypes: [.plainText, .pdf, UTType("net.daringfireball.markdown") ?? .plainText],
                      allowsMultipleSelection: false) { result in
            handleImport(result)
        }
    }

    private func handleImport(_ result: Result<[URL], Error>) {
        importError = nil
        do {
            guard let url = try result.get().first else { return }
            let needsScope = url.startAccessingSecurityScopedResource()
            defer { if needsScope { url.stopAccessingSecurityScopedResource() } }

            let title = url.deletingPathExtension().lastPathComponent
            let content: String
            if url.pathExtension.lowercased() == "pdf" {
                guard let pdf = PDFDocument(url: url), let text = pdf.string, !text.isEmpty else {
                    importError = "Couldn't read text from that PDF (it may be scanned images)."
                    return
                }
                content = text
            } else {
                content = try String(contentsOf: url, encoding: .utf8)
            }
            settings.addKnowledgeDocument(title: title, content: content)
        } catch {
            importError = "Import failed: \(error.localizedDescription)"
        }
    }
}

private struct AddKnowledgeSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var content = ""
    let onSave: (String, String) -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section("Title") {
                    TextField("e.g. Objection-handling playbook", text: $title)
                }
                Section("Content") {
                    TextField("Paste anything useful about the business…", text: $content, axis: .vertical)
                        .lineLimit(6...20)
                }
            }
            .navigationTitle("Add knowledge")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        onSave(title, content)
                        dismiss()
                    }
                    .fontWeight(.semibold)
                    .disabled(content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}
