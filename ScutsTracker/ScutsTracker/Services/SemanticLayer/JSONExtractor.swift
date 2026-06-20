import Foundation

/// Tolerantly pulls a JSON object out of a model response and decodes it,
/// handling code fences and surrounding prose.
enum JSONExtractor {
    static func decode<T: Decodable>(_ type: T.Type, from text: String) throws -> T {
        for candidate in candidates(from: text) {
            if let data = candidate.data(using: .utf8),
               let value = try? JSONDecoder().decode(T.self, from: data) {
                return value
            }
        }
        throw ClaudeError.invalidResponse
    }

    private static func candidates(from text: String) -> [String] {
        var result: [String] = []
        if let fenced = fencedBlock(text) { result.append(fenced) }
        if let start = text.firstIndex(of: "{"), let end = text.lastIndex(of: "}"), start < end {
            result.append(String(text[start...end]))
        }
        result.append(text.trimmingCharacters(in: .whitespacesAndNewlines))
        return result
    }

    private static func fencedBlock(_ text: String) -> String? {
        guard let open = text.range(of: "```") else { return nil }
        let afterOpen = text[open.upperBound...]
        guard let close = afterOpen.range(of: "```") else { return nil }
        var inner = String(afterOpen[..<close.lowerBound])
        if inner.lowercased().hasPrefix("json") {
            inner = String(inner.dropFirst(4))
        }
        return inner.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
