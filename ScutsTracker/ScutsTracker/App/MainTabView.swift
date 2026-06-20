import SwiftUI

struct MainTabView: View {
    @State private var selection = 0

    var body: some View {
        TabView(selection: $selection) {
            DashboardView()
                .tabItem { Label("Today", systemImage: "sun.max.fill") }
                .tag(0)

            PartnersView()
                .tabItem { Label("Partners", systemImage: "person.2.fill") }
                .tag(1)

            LogInteractionView()
                .tabItem { Label("Log", systemImage: "mic.circle.fill") }
                .tag(2)

            ChatView()
                .tabItem { Label("Assistant", systemImage: "sparkles") }
                .tag(3)

            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
                .tag(4)
        }
    }
}
