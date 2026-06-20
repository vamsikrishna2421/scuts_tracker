import SwiftUI
import Charts

// MARK: - Interest ring

struct InterestRing: View {
    let score: Int
    var size: CGFloat = 64
    var lineWidth: CGFloat = 7

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color.subtleFill, lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: CGFloat(min(100, max(0, score))) / 100)
                .stroke(Color.forInterest(score), style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeOut(duration: 0.6), value: score)
            VStack(spacing: -1) {
                Text("\(score)")
                    .font(.system(size: size * 0.32, weight: .bold, design: .rounded))
                Text("interest")
                    .font(.system(size: size * 0.13))
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Interest bar (compact)

struct InterestBar: View {
    let score: Int
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.subtleFill)
                Capsule()
                    .fill(Color.forInterest(score))
                    .frame(width: geo.size.width * CGFloat(min(100, max(0, score))) / 100)
            }
        }
        .frame(height: 6)
    }
}

// MARK: - Sentiment trend chart

private struct TrendPoint: Identifiable {
    let id = UUID()
    let date: Date
    let score: Int
}

struct SentimentTrendChart: View {
    /// Interactions for one partner (any order); only those with a sentiment read are plotted.
    let interactions: [Interaction]

    private var points: [TrendPoint] {
        interactions
            .compactMap { i in i.sentiment.map { TrendPoint(date: i.createdAt, score: $0.interestScore) } }
            .sorted { $0.date < $1.date }
    }

    var body: some View {
        if points.count < 2 {
            HStack(spacing: 8) {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .foregroundStyle(.secondary)
                Text("Log a couple of notes to see how interest is trending.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            Chart(points) { point in
                AreaMark(
                    x: .value("Date", point.date),
                    y: .value("Interest", point.score)
                )
                .interpolationMethod(.catmullRom)
                .foregroundStyle(
                    LinearGradient(colors: [Brand.indigo.opacity(0.35), Brand.indigo.opacity(0.02)],
                                   startPoint: .top, endPoint: .bottom)
                )

                LineMark(
                    x: .value("Date", point.date),
                    y: .value("Interest", point.score)
                )
                .interpolationMethod(.catmullRom)
                .foregroundStyle(Brand.indigo)
                .lineStyle(StrokeStyle(lineWidth: 2.5))

                PointMark(
                    x: .value("Date", point.date),
                    y: .value("Interest", point.score)
                )
                .foregroundStyle(Color.forInterest(point.score))
            }
            .chartYScale(domain: 0...100)
            .chartYAxis {
                AxisMarks(values: [0, 50, 100])
            }
            .frame(height: 150)
        }
    }
}

// MARK: - Pipeline strip

struct StageCount: Identifiable {
    let stage: PipelineStage
    let count: Int
    var id: String { stage.rawValue }
}

struct PipelineStrip: View {
    let counts: [StageCount]

    var body: some View {
        HStack(spacing: 8) {
            ForEach(counts) { entry in
                VStack(spacing: 4) {
                    Text("\(entry.count)")
                        .font(.headline.bold())
                        .foregroundStyle(entry.stage.color)
                    Text(entry.stage.label)
                        .font(.system(size: 10))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(entry.stage.color.opacity(0.10), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
        }
    }
}
