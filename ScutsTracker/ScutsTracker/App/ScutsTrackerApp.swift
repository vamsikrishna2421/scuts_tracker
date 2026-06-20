import SwiftUI

@main
struct ScutsTrackerApp: App {
    @StateObject private var data = DataStore()
    @StateObject private var settings = SettingsStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(data)
                .environmentObject(settings)
                .tint(Brand.indigo)
                .fontDesign(.rounded)
        }
    }
}
