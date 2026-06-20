import Foundation

/// Thin client over the Anthropic Messages API. Reads the API key from the
/// Keychain at call time, so the key is never held in memory longer than a request.
struct ClaudeClient {
    static let shared = ClaudeClient()

    private let endpoint = URL(string: "https://api.anthropic.com/v1/messages")!
    private let anthropicVersion = "2023-06-01"

    // MARK: Non-streaming (structured agents)

    func complete(model: ClaudeModel,
                  system: String?,
                  messages: [APIMessage],
                  maxTokens: Int = 1500) async throws -> String {
        let key = try apiKey()
        let body = try encodeBody(model: model, system: system, messages: messages, maxTokens: maxTokens, stream: false)
        let request = makeRequest(apiKey: key, body: body)

        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else { throw ClaudeError.invalidResponse }
            guard (200..<300).contains(http.statusCode) else {
                throw ClaudeError.http(status: http.statusCode, message: Self.message(from: data))
            }
            let decoded = try JSONDecoder().decode(MessagesResponse.self, from: data)
            let text = decoded.text.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty else { throw ClaudeError.empty }
            return text
        } catch let error as ClaudeError {
            throw error
        } catch is DecodingError {
            throw ClaudeError.invalidResponse
        } catch {
            if (error as? URLError)?.code == .cancelled { throw ClaudeError.cancelled }
            throw ClaudeError.network(error.localizedDescription)
        }
    }

    // MARK: Streaming (chat assistant)

    func stream(model: ClaudeModel,
                system: String?,
                messages: [APIMessage],
                maxTokens: Int = 2000) -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    let key = try apiKey()
                    let body = try encodeBody(model: model, system: system, messages: messages, maxTokens: maxTokens, stream: true)
                    let request = makeRequest(apiKey: key, body: body)

                    let (bytes, response) = try await URLSession.shared.bytes(for: request)
                    guard let http = response as? HTTPURLResponse else { throw ClaudeError.invalidResponse }
                    guard (200..<300).contains(http.statusCode) else {
                        var data = Data()
                        for try await byte in bytes {
                            data.append(byte)
                            if data.count > 8192 { break }
                        }
                        throw ClaudeError.http(status: http.statusCode, message: Self.message(from: data))
                    }

                    for try await line in bytes.lines {
                        try Task.checkCancellation()
                        guard line.hasPrefix("data:") else { continue }
                        let payload = line.dropFirst(5).trimmingCharacters(in: .whitespaces)
                        if payload.isEmpty || payload == "[DONE]" { continue }
                        guard let data = payload.data(using: .utf8),
                              let event = try? JSONDecoder().decode(StreamEvent.self, from: data) else { continue }
                        if event.type == "content_block_delta", let text = event.delta?.text {
                            continuation.yield(text)
                        }
                        if event.type == "message_stop" { break }
                    }
                    continuation.finish()
                } catch is CancellationError {
                    continuation.finish(throwing: ClaudeError.cancelled)
                } catch let error as ClaudeError {
                    continuation.finish(throwing: error)
                } catch {
                    continuation.finish(throwing: ClaudeError.network(error.localizedDescription))
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    // MARK: Helpers

    private func apiKey() throws -> String {
        guard let key = KeychainStore.loadAPIKey(),
              !key.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw ClaudeError.missingKey
        }
        return key
    }

    private func encodeBody(model: ClaudeModel, system: String?, messages: [APIMessage], maxTokens: Int, stream: Bool) throws -> Data {
        let request = MessagesRequest(model: model.rawValue,
                                      max_tokens: maxTokens,
                                      system: system,
                                      messages: messages,
                                      stream: stream)
        return try JSONEncoder().encode(request)
    }

    private func makeRequest(apiKey: String, body: Data) -> URLRequest {
        var req = URLRequest(url: endpoint)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "content-type")
        req.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        req.setValue(anthropicVersion, forHTTPHeaderField: "anthropic-version")
        req.httpBody = body
        req.timeoutInterval = 120
        return req
    }

    private static func message(from data: Data) -> String {
        if let body = try? JSONDecoder().decode(APIErrorBody.self, from: data), let message = body.error?.message {
            return message
        }
        return String(data: data, encoding: .utf8) ?? "Unknown error"
    }
}
