import SwiftUI
import UIKit

// MARK: - Brand palette

enum Brand {
    static let indigo = Color(red: 0.36, green: 0.31, blue: 0.86)
    static let violet = Color(red: 0.55, green: 0.36, blue: 0.92)
    static let pink = Color(red: 0.93, green: 0.40, blue: 0.68)
    static let amber = Color(red: 0.98, green: 0.70, blue: 0.22)
    static let teal = Color(red: 0.13, green: 0.74, blue: 0.67)

    static var gradient: LinearGradient {
        LinearGradient(colors: [indigo, violet], startPoint: .topLeading, endPoint: .bottomTrailing)
    }
    static var warmGradient: LinearGradient {
        LinearGradient(colors: [pink, amber], startPoint: .topLeading, endPoint: .bottomTrailing)
    }
    static var coolGradient: LinearGradient {
        LinearGradient(colors: [teal, indigo], startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}

extension Color {
    static let appBackground = Color(.systemGroupedBackground)
    static let cardBackground = Color(.secondarySystemGroupedBackground)
    static let elevatedBackground = Color(.tertiarySystemGroupedBackground)
    static let subtleFill = Color(.tertiarySystemFill)

    /// Maps an interest score (0–100) to a warm→cool color ramp.
    static func forInterest(_ score: Int) -> Color {
        switch score {
        case ..<35: return .negative
        case 35..<55: return .caution
        case 55..<75: return Brand.teal
        default: return .positive
        }
    }
}

// Semantic colors declared as ShapeStyle members (mirroring how SwiftUI defines
// `.red`, `.blue`, …) so they resolve both as `.positive` in a ShapeStyle context
// and as `Color.positive` where a concrete Color is required.
extension ShapeStyle where Self == Color {
    static var positive: Color { Color(red: 0.18, green: 0.71, blue: 0.42) }
    static var caution: Color { Color(red: 0.96, green: 0.62, blue: 0.12) }
    static var negative: Color { Color(red: 0.90, green: 0.30, blue: 0.30) }
    static var neutralGray: Color { Color(.systemGray) }
}

// MARK: - Layout constants

enum Layout {
    static let screenPadding: CGFloat = 20
    static let cardRadius: CGFloat = 22
    static let controlRadius: CGFloat = 14
    static let pillRadius: CGFloat = 12
    static let spacing: CGFloat = 16
    static let tightSpacing: CGFloat = 8
}

// MARK: - Reusable styling

private struct CardBackground: ViewModifier {
    var padding: CGFloat
    var fill: Color
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(fill, in: RoundedRectangle(cornerRadius: Layout.cardRadius, style: .continuous))
    }
}

extension View {
    /// Standard rounded card surface used across the app.
    func cardStyle(padding: CGFloat = 18, fill: Color = .cardBackground) -> some View {
        modifier(CardBackground(padding: padding, fill: fill))
    }

    /// Subtle press feedback for tappable cards/rows.
    func pressable() -> some View {
        buttonStyle(.plain)
    }
}

// MARK: - Convenience formatters

enum Format {
    static func relative(_ date: Date) -> String {
        let f = RelativeDateTimeFormatter()
        f.unitsStyle = .abbreviated
        return f.localizedString(for: date, relativeTo: Date())
    }

    static func shortDate(_ date: Date) -> String {
        date.formatted(.dateTime.month(.abbreviated).day())
    }

    static func dayAndTime(_ date: Date) -> String {
        date.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day().hour().minute())
    }
}
