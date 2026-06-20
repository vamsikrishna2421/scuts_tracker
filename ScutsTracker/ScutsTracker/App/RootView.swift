import SwiftUI

struct RootView: View {
    @EnvironmentObject private var settings: SettingsStore
    @EnvironmentObject private var data: DataStore

    var body: some View {
        Group {
            if settings.onboardingComplete {
                MainTabView()
                    .transition(.opacity)
            } else {
                OnboardingView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.35), value: settings.onboardingComplete)
        .onChange(of: data.reminders) { _, newValue in
            NotificationManager.shared.reschedule(from: newValue, enabled: settings.notificationsEnabled)
        }
        .task {
            settings.refreshAPIKeyStatus()
            if settings.notificationsEnabled {
                _ = await NotificationManager.shared.requestAuthorization()
                NotificationManager.shared.reschedule(from: data.reminders, enabled: true)
            }
        }
    }
}
