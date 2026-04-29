package com.worshiproom.post;

import java.lang.reflect.Field;

/**
 * Test-only helper for building {@link QotdQuestion} instances. The entity has no
 * setters and no public constructor (read-only by design — Spec 3.5 R1), so tests
 * use reflection to populate fields. Lives in the test classpath only.
 */
final class TestQotdFactory {
    private TestQotdFactory() {}

    static QotdQuestion build(String id, String text, String theme, String hint) {
        try {
            var ctor = QotdQuestion.class.getDeclaredConstructor();
            ctor.setAccessible(true);
            QotdQuestion q = ctor.newInstance();
            setField(q, "id", id);
            setField(q, "text", text);
            setField(q, "theme", theme);
            setField(q, "hint", hint);
            setField(q, "displayOrder", 0);
            setField(q, "isActive", true);
            return q;
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

    private static void setField(Object o, String name, Object value) throws ReflectiveOperationException {
        Field f = QotdQuestion.class.getDeclaredField(name);
        f.setAccessible(true);
        f.set(o, value);
    }
}
