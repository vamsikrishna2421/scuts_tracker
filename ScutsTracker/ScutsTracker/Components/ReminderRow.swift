import SwiftUI

struct ReminderRow: View {
    let reminder: Reminder
    var showPartner: Bool = true
    var onToggle: ((Reminder) -> Void)?

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            leading
            VStack(alignment: .leading, spacing: 3) {
                Text(reminder.title)
                    .font(.subheadline.weight(.medium))
                    .strikethrough(reminder.isDone, color: .secondary)
                    .foregroundStyle(reminder.isDone ? .secondary : .primary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                if !reminder.detail.isEmpty {
                    Text(reminder.detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                HStack(spacing: 10) {
                    Label(reminder.type.label, systemImage: reminder.type.icon)
                        .foregroundStyle(reminder.type.tint)
                    if showPartner && !reminder.partnerName.isEmpty {
                        Label(reminder.partnerName, systemImage: "person.fill")
                    }
                    if let due = reminder.dueDate {
                        Label(dueText(due), systemImage: "calendar")
                            .foregroundStyle(reminder.isOverdue && !reminder.isDone ? Color.negative : .secondary)
                    }
                }
                .font(.caption2)
                .foregroundStyle(.secondary)
                .padding(.top, 1)
            }
            Spacer(minLength: 0)
            PriorityDot(priority: reminder.priority).padding(.top, 6)
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }

    @ViewBuilder private var leading: some View {
        if let onToggle {
            Button { onToggle(reminder) } label: {
                Image(systemName: reminder.isDone ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(reminder.isDone ? Color.positive : Color.secondary)
            }
            .buttonStyle(.plain)
        } else {
            Image(systemName: reminder.type.icon)
                .font(.subheadline)
                .foregroundStyle(reminder.type.tint)
                .frame(width: 24, height: 24)
                .background(reminder.type.tint.opacity(0.14), in: Circle())
        }
    }

    private func dueText(_ due: Date) -> String {
        if reminder.isOverdue && !reminder.isDone { return "Overdue · \(Format.shortDate(due))" }
        if Calendar.current.isDateInToday(due) { return "Today" }
        if Calendar.current.isDateInTomorrow(due) { return "Tomorrow" }
        return Format.shortDate(due)
    }
}
