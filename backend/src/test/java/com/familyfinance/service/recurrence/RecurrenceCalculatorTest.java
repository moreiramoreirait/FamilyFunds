package com.familyfinance.service.recurrence;

import com.familyfinance.entity.RecurrenceType;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RecurrenceCalculatorTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 6, 13);
    private static final LocalDate WINDOW_START = LocalDate.of(2026, 6, 1);
    private static final LocalDate WINDOW_END = LocalDate.of(2026, 8, 31); // 3 meses

    @Test
    void monthly_generatesOneOccurrencePerMonthInWindow() {
        List<LocalDate> occ = RecurrenceCalculator.occurrences(
                LocalDate.of(2026, 1, 10), 10, RecurrenceType.MONTHLY, null,
                WINDOW_START, WINDOW_END, TODAY);

        assertThat(occ).containsExactly(
                LocalDate.of(2026, 6, 10),
                LocalDate.of(2026, 7, 10),
                LocalDate.of(2026, 8, 10));
    }

    @Test
    void monthly_clampsBillingDayToShortMonth() {
        // dia 31 em meses curtos deve ser ajustado para o último dia
        List<LocalDate> occ = RecurrenceCalculator.occurrences(
                LocalDate.of(2026, 1, 31), 31, RecurrenceType.MONTHLY, null,
                LocalDate.of(2026, 2, 1), LocalDate.of(2026, 2, 28), TODAY);

        assertThat(occ).containsExactly(LocalDate.of(2026, 2, 28));
    }

    @Test
    void respectsEndDate_noOccurrenceAfterEnd() {
        List<LocalDate> occ = RecurrenceCalculator.occurrences(
                LocalDate.of(2026, 1, 10), 10, RecurrenceType.MONTHLY,
                LocalDate.of(2026, 7, 1), // termina antes de jul/10
                WINDOW_START, WINDOW_END, TODAY);

        assertThat(occ).containsExactly(LocalDate.of(2026, 6, 10));
    }

    @Test
    void respectsStartDate_noOccurrenceBeforeStart() {
        List<LocalDate> occ = RecurrenceCalculator.occurrences(
                LocalDate.of(2026, 7, 10), 10, RecurrenceType.MONTHLY, null,
                WINDOW_START, WINDOW_END, TODAY);

        assertThat(occ).containsExactly(
                LocalDate.of(2026, 7, 10),
                LocalDate.of(2026, 8, 10));
    }

    @Test
    void weekly_generatesEverySevenDays() {
        List<LocalDate> occ = RecurrenceCalculator.occurrences(
                LocalDate.of(2026, 6, 1), null, RecurrenceType.WEEKLY, null,
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30), TODAY);

        assertThat(occ).containsExactly(
                LocalDate.of(2026, 6, 1),
                LocalDate.of(2026, 6, 8),
                LocalDate.of(2026, 6, 15),
                LocalDate.of(2026, 6, 22),
                LocalDate.of(2026, 6, 29));
    }

    @Test
    void biweekly_generatesEveryFourteenDays() {
        List<LocalDate> occ = RecurrenceCalculator.occurrences(
                LocalDate.of(2026, 6, 1), null, RecurrenceType.BIWEEKLY, null,
                LocalDate.of(2026, 6, 1), LocalDate.of(2026, 6, 30), TODAY);

        assertThat(occ).containsExactly(
                LocalDate.of(2026, 6, 1),
                LocalDate.of(2026, 6, 15),
                LocalDate.of(2026, 6, 29));
    }

    @Test
    void yearly_generatesAtMostOncePerYearInWindow() {
        List<LocalDate> occ = RecurrenceCalculator.occurrences(
                LocalDate.of(2024, 7, 5), 5, RecurrenceType.YEARLY, null,
                WINDOW_START, WINDOW_END, TODAY);

        assertThat(occ).containsExactly(LocalDate.of(2026, 7, 5));
    }

    @Test
    void nextOccurrence_skipsPastDatesAndReturnsFuture() {
        // billingDay 10, hoje 13/06 → próxima é 10/07
        LocalDate next = RecurrenceCalculator.nextOccurrence(
                LocalDate.of(2026, 1, 10), 10, RecurrenceType.MONTHLY, null, TODAY);

        assertThat(next).isEqualTo(LocalDate.of(2026, 7, 10));
    }

    @Test
    void nextOccurrence_returnsNullWhenAfterEndDate() {
        LocalDate next = RecurrenceCalculator.nextOccurrence(
                LocalDate.of(2026, 1, 10), 10, RecurrenceType.MONTHLY,
                LocalDate.of(2026, 5, 1), TODAY);

        assertThat(next).isNull();
    }
}
