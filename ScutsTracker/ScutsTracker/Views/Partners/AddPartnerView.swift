import SwiftUI

struct AddPartnerView: View {
    @EnvironmentObject private var data: DataStore
    @Environment(\.dismiss) private var dismiss

    let existing: Partner?
    var onSave: ((Partner) -> Void)?

    @State private var name: String
    @State private var salon: String
    @State private var location: String
    @State private var phone: String
    @State private var email: String
    @State private var stage: PipelineStage
    @State private var tagsText: String
    @State private var notes: String

    init(existing: Partner? = nil, onSave: ((Partner) -> Void)? = nil) {
        self.existing = existing
        self.onSave = onSave
        _name = State(initialValue: existing?.name ?? "")
        _salon = State(initialValue: existing?.salonName ?? "")
        _location = State(initialValue: existing?.location ?? "")
        _phone = State(initialValue: existing?.phone ?? "")
        _email = State(initialValue: existing?.email ?? "")
        _stage = State(initialValue: existing?.stage ?? .prospect)
        _tagsText = State(initialValue: (existing?.tags ?? []).joined(separator: ", "))
        _notes = State(initialValue: existing?.notes ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Salon owner") {
                    TextField("Owner name", text: $name)
                        .textContentType(.name)
                    TextField("Salon name", text: $salon)
                    TextField("Location (area, city)", text: $location)
                }

                Section("Contact") {
                    TextField("Phone", text: $phone)
                        .keyboardType(.phonePad)
                    TextField("Email", text: $email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }

                Section("Pipeline") {
                    Picker("Stage", selection: $stage) {
                        ForEach(PipelineStage.allCases) { stage in
                            Text(stage.label).tag(stage)
                        }
                    }
                    TextField("Tags (comma separated)", text: $tagsText)
                }

                Section("Notes") {
                    TextField("Anything worth remembering…", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
            }
            .navigationTitle(existing == nil ? "New salon owner" : "Edit owner")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") { save() }
                        .fontWeight(.semibold)
                        .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }

    private func save() {
        let tags = tagsText
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        if var partner = existing {
            partner.name = name
            partner.salonName = salon
            partner.location = location
            partner.phone = phone
            partner.email = email
            partner.stage = stage
            partner.tags = tags
            partner.notes = notes
            data.updatePartner(partner)
            onSave?(partner)
        } else {
            let partner = Partner(
                name: name,
                salonName: salon,
                location: location,
                phone: phone,
                email: email,
                stage: stage,
                tags: tags,
                notes: notes
            )
            data.addPartner(partner)
            onSave?(partner)
        }
        dismiss()
    }
}
