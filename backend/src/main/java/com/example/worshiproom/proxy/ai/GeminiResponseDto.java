package com.example.worshiproom.proxy.ai;

/**
 * Response payload for {@code POST /api/v1/proxy/ai/explain} and
 * {@code /reflect}. Wrapped in {@code ProxyResponse<GeminiResponseDto>} by
 * the controller before being serialized to JSON.
 *
 * On the wire:
 *   {
 *     "data": { "content": "...", "model": "gemini-2.5-flash-lite" },
 *     "meta": { "requestId": "AbCdEfGhIjKlMnOpQrStUv" }
 *   }
 *
 * The frontend's {@code ExplainResult} and {@code ReflectResult} types
 * match this shape byte-for-byte — {@code {content, model}}.
 */
public record GeminiResponseDto(String content, String model) {}
