package com.worshiproom.config;

import org.owasp.html.PolicyFactory;
import org.owasp.html.Sanitizers;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OWASP HTML Sanitizer policy used to strip HTML from user-generated text content
 * (prayer wall posts, comments, etc.). One shared bean prevents drift between
 * services and centralizes the policy decision (FORMATTING + LINKS — strips all
 * scripts/styles/event handlers but allows safe inline formatting if it ever ships).
 *
 * <p>For Worship Room MVP, plain-text-only is enforced upstream (no HTML/Markdown
 * rendering on the frontend), so the policy effectively removes everything. The
 * bean is structured to permit a future controlled allowlist without touching every
 * call site.
 *
 * <p>Consumed by {@code com.worshiproom.post.PostService} and (Spec 3.6 onward)
 * {@code com.worshiproom.post.comment.PostCommentService}.
 */
@Configuration
public class HtmlSanitizerConfig {

    @Bean
    public PolicyFactory htmlSanitizerPolicy() {
        return Sanitizers.FORMATTING.and(Sanitizers.LINKS);
    }
}
