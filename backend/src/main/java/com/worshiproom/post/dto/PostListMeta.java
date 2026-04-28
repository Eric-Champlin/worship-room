package com.worshiproom.post.dto;

public record PostListMeta(
        int page,
        int limit,
        long totalCount,
        int totalPages,
        boolean hasNextPage,
        boolean hasPrevPage,
        String requestId
) {}
