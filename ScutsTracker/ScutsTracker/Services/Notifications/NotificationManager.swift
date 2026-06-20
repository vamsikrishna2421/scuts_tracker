import Foundation
import UserNotifications

/// Schedules local notifications for reminders that have a due date.
@MainActor
final class NotificationManager {
    static let shared = NotificationManager()
    private let center = UNUserNotificationCenter.current()

    @discardableResult
    func requestAuthorization() async -> Bool {
        (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
    }

    /// Cancels all pending reminders and re-schedules from the current list.
    func reschedule(from reminders: [Reminder], enabled: Bool) {
        center.removeAllPendingNotificationRequests()
        guard enabled else { return }

        let upcoming = reminders
            .filter { !$0.isDone && ($0.dueDate ?? .distantPast) > Date() }
            .prefix(60)

        for reminder in upcoming {
            guard let due = reminder.dueDate else { continue }
            let content = UNMutableNotificationContent()
            content.title = reminder.partnerName.isEmpty ? reminder.type.label : reminder.partnerName
            content.body = reminder.title
            content.sound = .default

            let fireDate = Self.fireDate(for: due)
            let comps = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: fireDate)
            let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
            let request = UNNotificationRequest(identifier: reminder.id.uuidString, content: content, trigger: trigger)
            center.add(request)
        }
    }

    /// Date-only reminders fire at 9am; timed reminders fire at their time.
    private static func fireDate(for due: Date) -> Date {
        let cal = Calendar.current
        let comps = cal.dateComponents([.hour, .minute], from: due)
        if (comps.hour ?? 0) == 0 && (comps.minute ?? 0) == 0 {
            return cal.date(bySettingHour: 9, minute: 0, second: 0, of: due) ?? due
        }
        return due
    }
}
