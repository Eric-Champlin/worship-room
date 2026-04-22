package com.example.worshiproom.proxy.ai;

import java.util.List;

public record AskResponseDto(
    String id,
    String topic,
    String answer,
    List<AskVerseDto> verses,
    String encouragement,
    String prayer,
    List<String> followUpQuestions
) {}
