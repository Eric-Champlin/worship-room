package com.worshiproom.proxy.common;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ProxyResponse<T>(T data, Map<String, Object> meta) {

    public static <T> ProxyResponse<T> of(T data, String requestId) {
        return new ProxyResponse<>(data, Map.of("requestId", requestId));
    }

    public static <T> ProxyResponse<T> of(T data, String requestId, Map<String, Object> extraMeta) {
        var combined = new java.util.LinkedHashMap<String, Object>();
        combined.putAll(extraMeta);          // extras first, so requestId
        combined.put("requestId", requestId); // always wins the key collision
        return new ProxyResponse<>(data, combined);
    }
}
