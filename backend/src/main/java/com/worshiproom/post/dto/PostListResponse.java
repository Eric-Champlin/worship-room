package com.worshiproom.post.dto;

import java.util.List;

public record PostListResponse(List<PostDto> data, PostListMeta meta) {}
