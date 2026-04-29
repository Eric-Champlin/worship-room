package com.worshiproom.post;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QotdServiceTest {

    @Mock private QotdQuestionRepository repo;

    private QotdProperties propsWithMaxSize2() {
        QotdProperties p = new QotdProperties();
        p.getCache().setMaxSize(2);
        return p;
    }

    private static Clock fixedUtc(int year, int month, int day) {
        return Clock.fixed(LocalDate.of(year, month, day).atStartOfDay(ZoneOffset.UTC).toInstant(), ZoneOffset.UTC);
    }

    @Test
    void findTodaysQuestion_returnsRowMatchingDayOfYearModulo72() {
        // 2026-04-29 → dayOfYear=119 → 119 % 72 = 47.
        Clock clock = fixedUtc(2026, 4, 29);
        QotdQuestion stub = TestQotdFactory.build("qotd-48", "stub text", "encouraging", null);
        when(repo.findByDisplayOrderAndIsActiveTrue(47)).thenReturn(Optional.of(stub));

        QotdService service = new QotdService(repo, propsWithMaxSize2(), clock);

        QotdQuestion result = service.findTodaysQuestion();

        assertThat(result.getId()).isEqualTo("qotd-48");
        verify(repo, times(1)).findByDisplayOrderAndIsActiveTrue(47);
    }

    @Test
    void findTodaysQuestion_usesUtcNotSystemDefaultZone() {
        // Pin the clock to a known UTC instant. Verify the repo is queried with the UTC-derived
        // dayOfYear, NOT the system-default-zone-derived value (which would be a flaky hidden bug).
        Clock clock = fixedUtc(2026, 1, 1);  // dayOfYear=1, 1 % 72 = 1
        when(repo.findByDisplayOrderAndIsActiveTrue(1))
                .thenReturn(Optional.of(TestQotdFactory.build("qotd-2", "x", "faith_journey", null)));

        QotdService service = new QotdService(repo, propsWithMaxSize2(), clock);
        service.findTodaysQuestion();

        verify(repo).findByDisplayOrderAndIsActiveTrue(1);
    }

    @Test
    void findForDate_cacheHitOnSecondCallForSameDate() {
        Clock clock = fixedUtc(2026, 4, 29);
        when(repo.findByDisplayOrderAndIsActiveTrue(47))
                .thenReturn(Optional.of(TestQotdFactory.build("qotd-48", "x", "encouraging", null)));

        QotdService service = new QotdService(repo, propsWithMaxSize2(), clock);
        service.findForDate(LocalDate.of(2026, 4, 29));
        service.findForDate(LocalDate.of(2026, 4, 29));

        verify(repo, times(1)).findByDisplayOrderAndIsActiveTrue(47);
    }

    @Test
    void findForDate_cacheMissOnNewDate() {
        Clock clock = fixedUtc(2026, 4, 29);
        when(repo.findByDisplayOrderAndIsActiveTrue(47))
                .thenReturn(Optional.of(TestQotdFactory.build("qotd-48", "a", "encouraging", null)));
        when(repo.findByDisplayOrderAndIsActiveTrue(48))
                .thenReturn(Optional.of(TestQotdFactory.build("qotd-49", "b", "encouraging", null)));

        QotdService service = new QotdService(repo, propsWithMaxSize2(), clock);
        service.findForDate(LocalDate.of(2026, 4, 29));  // dayOfYear=119, %72=47
        service.findForDate(LocalDate.of(2026, 4, 30));  // dayOfYear=120, %72=48

        verify(repo, times(1)).findByDisplayOrderAndIsActiveTrue(47);
        verify(repo, times(1)).findByDisplayOrderAndIsActiveTrue(48);
    }

    @Test
    void findForDate_emptyPoolThrowsQotdUnavailableException() {
        Clock clock = fixedUtc(2026, 4, 29);
        when(repo.findByDisplayOrderAndIsActiveTrue(47)).thenReturn(Optional.empty());

        QotdService service = new QotdService(repo, propsWithMaxSize2(), clock);

        assertThatThrownBy(() -> service.findTodaysQuestion())
                .isInstanceOf(QotdUnavailableException.class)
                .hasMessageContaining("No question is available right now.");
    }

    @Test
    void cacheMaxSize_propertyWiresToCaffeineMaximumSize() {
        // Spec 3.9 AC: "Cache size cap respected (maximumSize(2), evicts oldest entry beyond that)".
        // Caffeine's TinyLFU admission filter makes per-entry eviction non-deterministic at low
        // cardinality (see findForDate_eachDateOnlyHitsRepoOnce), so we assert the wiring of the
        // configured cap rather than the runtime eviction behavior. If maxSize from properties
        // does not reach Caffeine.maximumSize(...), this test catches the regression.
        Clock clock = fixedUtc(2026, 4, 29);
        QotdProperties props = new QotdProperties();
        props.getCache().setMaxSize(7);

        QotdService service = new QotdService(repo, props, clock);

        assertThat(service.getCacheMaximumSize()).isEqualTo(7L);
    }

    @Test
    void cacheMaxSize_defaultIsTwoWhenPropertyAbsent() {
        // Default value documented in QotdProperties.Cache.maxSize (today + tomorrow buffer).
        // If somebody changes the default without updating the spec / docs, this test trips.
        Clock clock = fixedUtc(2026, 4, 29);
        QotdProperties propsAtDefault = new QotdProperties();

        QotdService service = new QotdService(repo, propsAtDefault, clock);

        assertThat(service.getCacheMaximumSize()).isEqualTo(2L);
    }

    @Test
    void findForDate_eachDateOnlyHitsRepoOnce() {
        // Behavioral invariant: regardless of cache eviction policy, calling findForDate
        // multiple times for THE SAME date never re-hits the repo within the cache's
        // capacity. (Strict-LRU eviction across distinct dates is a Caffeine TinyLFU
        // implementation detail and isn't asserted here — Spec 3.9 Plan-Time Divergence.)
        Clock clock = fixedUtc(2026, 4, 29);
        when(repo.findByDisplayOrderAndIsActiveTrue(0))
                .thenReturn(Optional.of(TestQotdFactory.build("a", "a", "encouraging", null)));
        when(repo.findByDisplayOrderAndIsActiveTrue(1))
                .thenReturn(Optional.of(TestQotdFactory.build("b", "b", "encouraging", null)));

        QotdService service = new QotdService(repo, propsWithMaxSize2(), clock);

        // dayOfYear=72 → slot 0; dayOfYear=73 → slot 1.
        LocalDate d1 = LocalDate.of(2026, 3, 13);
        LocalDate d2 = LocalDate.of(2026, 3, 14);

        // 4 calls across 2 dates (within cap=2). Repo hit once per distinct date.
        service.findForDate(d1);
        service.findForDate(d2);
        service.findForDate(d1);
        service.findForDate(d2);

        verify(repo, times(1)).findByDisplayOrderAndIsActiveTrue(0);
        verify(repo, times(1)).findByDisplayOrderAndIsActiveTrue(1);
    }
}
