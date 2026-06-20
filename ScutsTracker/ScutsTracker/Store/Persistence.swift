import Foundation

/// Lightweight Codable persistence to the app's Application Support directory.
enum Persistence {
    static let directory: URL = {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        let dir = base.appendingPathComponent("ScutsTracker", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }()

    static func url(_ filename: String) -> URL {
        directory.appendingPathComponent(filename)
    }

    static func load<T: Decodable>(_ type: T.Type, from filename: String) -> T? {
        guard let data = try? Data(contentsOf: url(filename)) else { return nil }
        return try? decoder.decode(T.self, from: data)
    }

    static func save<T: Encodable>(_ value: T, to filename: String) {
        do {
            let data = try encoder.encode(value)
            try data.write(to: url(filename), options: [.atomic])
        } catch {
            print("Persistence save error for \(filename): \(error)")
        }
    }

    static func encodedString<T: Encodable>(_ value: T) -> String {
        (try? encoder.encode(value)).flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
    }

    static func delete(_ filename: String) {
        try? FileManager.default.removeItem(at: url(filename))
    }

    static let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        e.outputFormatting = [.prettyPrinted, .sortedKeys]
        return e
    }()

    static let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()
}
