package com.worshiproom.post;

import com.worshiproom.post.dto.QotdQuestionResponse;
import com.worshiproom.proxy.common.ProxyResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/qotd")
public class QotdController {

    private static final Logger log = LoggerFactory.getLogger(QotdController.class);

    private final QotdService service;

    public QotdController(QotdService service) {
        this.service = service;
    }

    @GetMapping("/today")
    public ResponseEntity<ProxyResponse<QotdQuestionResponse>> getTodaysQuestion() {
        QotdQuestion q = service.findTodaysQuestion();
        log.info("QOTD served id={} theme={}", q.getId(), q.getTheme());
        QotdQuestionResponse dto = new QotdQuestionResponse(q.getId(), q.getText(), q.getTheme(), q.getHint());
        return ResponseEntity.ok(ProxyResponse.of(dto, MDC.get("requestId")));
    }
}
