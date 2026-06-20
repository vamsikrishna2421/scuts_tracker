import Foundation

/// One message in an Anthropic Messages API request.
struct APIMessage: Codable, Hashable {
    let role: String        // "user" | "assistant"
    let content: String

    static func user(_ text: String) -> APIMessage { APIMessage(role: "user", content: text) }
    static func assistant(_ text: String) -> APIMessage { APIMessage(role: "assistant", content: text) }
}

/// Request body for POST /v1/messages. Optional fields are omitted when nil.
struct MessagesRequest: Encodable {
    let model: String
    let max_tokens: Int
    let system: String?
    let messages: [APIMessage]
    let stream: Bool?
}

/// Non-streaming response.
struct MessagesResponse: Decodable {
    struct ContentBlock: Decodable {
        let type: String
        let text: String?
    }
    let content: [ContentBlock]
    let stop_reason: String?

    var text: String {
        content.compactMap { $0.type == "text" ? $0.text : nil }.joined()
    }
}

/// A single Server-Sent Event from a streaming response.
struct StreamEvent: Decodable {
    struct Delta: Decodable {
        let type: String?
        let text: String?
    }
    let type: String
    let delta: Delta?
}

/// Error envelope returned by the API on non-2xx responses.
struct APIErrorBody: Decodable {
    struct APIErrorDetail: Decodable {
        let type: String?
        let message: String?
    }
    let error: APIErrorDetail?
}

enum ClaudeError: LocalizedError {
    case missingKey
    case http(status: Int, message: String)
    case invalidResponse
    case network(String)
    case empty
    case cancelled

    var errorDescription: String? {
        switch self {
        case .missingKey:
            return "No Claude API key set. Add it in Settings → Claude API."
        case .http(let status, let message):
            switch status {
            case 401: return "Your Claude API key was rejected (401). Double-check it in Settings."
            case 403: return "This key isn't permitted to use Claude (403)."
            case 429: return "Claude is rate-limiting requests (429). Wait a moment and try again."
            case 400: return "Claude rejected the request (400): \(message)"
            case 500, 529: return "Claude is temporarily unavailable (\(status)). Try again shortly."
            default: return "Claude returned an error (\(status)): \(message)"
            }
        case .invalidResponse:
            return "Couldn't read Claude's response."
        case .network(let m):
            return "Network problem: \(m)"
        case .empty:
            return "Claude returned an empty response."
        case .cancelled:
            return "Request cancelled."
        }
    }
}
