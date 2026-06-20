import SwiftUI

// MARK: - Button styles

struct PrimaryButtonStyle: ButtonStyle {
    var gradient: LinearGradient = Brand.gradient
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 15)
            .background(gradient, in: RoundedRectangle(cornerRadius: Layout.controlRadius, style: .continuous))
            .opacity(configuration.isPressed ? 0.85 : 1)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    var tint: Color = Brand.indigo
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(tint)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(tint.opacity(0.12), in: RoundedRectangle(cornerRadius: Layout.controlRadius, style: .continuous))
            .opacity(configuration.isPressed ? 0.7 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var primaryGradient: PrimaryButtonStyle { PrimaryButtonStyle() }
}
extension ButtonStyle where Self == SecondaryButtonStyle {
    static var secondarySoft: SecondaryButtonStyle { SecondaryButtonStyle() }
}

// MARK: - Badges & chips

struct StageBadge: View {
    let stage: PipelineStage
    var body: some View {
        Label(stage.label, systemImage: stage.icon)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(stage.color)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(stage.color.opacity(0.15), in: Capsule())
    }
}

struct MomentumBadge: View {
    let momentum: Momentum
    var body: some View {
        Label(momentum.label, systemImage: momentum.icon)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(momentum.color)
            .padding(.horizontal, 9)
            .padding(.vertical, 5)
            .background(momentum.color.opacity(0.15), in: Capsule())
    }
}

struct Chip: View {
    let text: String
    var systemImage: String? = nil
    var tint: Color = Brand.indigo
    var body: some View {
        HStack(spacing: 4) {
            if let systemImage { Image(systemName: systemImage) }
            Text(text)
        }
        .font(.caption.weight(.medium))
        .foregroundStyle(tint)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(tint.opacity(0.12), in: Capsule())
    }
}

struct PriorityDot: View {
    let priority: Priority
    var body: some View {
        Circle()
            .fill(priority.color)
            .frame(width: 8, height: 8)
    }
}

// MARK: - Headers

struct SectionHeader: View {
    let title: String
    var subtitle: String? = nil
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.title3.bold())
            if let subtitle {
                Text(subtitle).font(.subheadline).foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Avatar

struct PartnerAvatar: View {
    let initials: String
    var size: CGFloat = 46
    var gradient: LinearGradient = Brand.gradient
    var body: some View {
        Text(initials)
            .font(.system(size: size * 0.38, weight: .bold, design: .rounded))
            .foregroundStyle(.white)
            .frame(width: size, height: size)
            .background(gradient, in: Circle())
    }
}

// MARK: - Stat tile

struct StatTile: View {
    let value: String
    let label: String
    var icon: String? = nil
    var tint: Color = Brand.indigo
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let icon {
                Image(systemName: icon)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(tint)
            }
            Text(value)
                .font(.title2.weight(.bold))
                .contentTransition(.numericText())
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle(padding: 14)
    }
}

// MARK: - Typing indicator

struct TypingIndicator: View {
    var tint: Color = Brand.indigo
    var body: some View {
        TimelineView(.animation) { timeline in
            let t = timeline.date.timeIntervalSinceReferenceDate
            HStack(spacing: 5) {
                ForEach(0..<3, id: \.self) { i in
                    Circle()
                        .frame(width: 7, height: 7)
                        .opacity(0.3 + 0.7 * (0.5 + 0.5 * sin(t * 4 + Double(i) * 0.7)))
                }
            }
            .foregroundStyle(tint)
        }
    }
}

// MARK: - Bulleted list block

struct BulletList: View {
    let items: [String]
    var symbol: String = "circle.fill"
    var tint: Color = Brand.indigo
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(items, id: \.self) { item in
                HStack(alignment: .top, spacing: 9) {
                    Image(systemName: symbol)
                        .font(.system(size: 6))
                        .foregroundStyle(tint)
                        .padding(.top, 6)
                    Text(item)
                        .font(.subheadline)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }
    }
}
