package com.worshiproom.post.comment.dto;

import com.worshiproom.post.dto.PostListMeta;

import java.util.List;

public record CommentListResponse(List<CommentDto> data, PostListMeta meta) {}
