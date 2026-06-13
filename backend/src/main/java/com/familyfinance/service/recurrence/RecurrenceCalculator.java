package com.familyfinance.service.recurrence;

import com.familyfinance.entity.RecurrenceType;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Lógica pura (sem Spring/DB) de cálculo de datas de recorrência.
 * Usada por assinaturas e despesas recorrentes para gerar ocorrências e a próxima data.
 */
public final class RecurrenceCalculator {

    private RecurrenceCalculator() {}

    /** Ocorrências dentro de [windowStart, windowEnd], respeitando startDate/endDate. */
    public static List<LocalDate> occurrences(LocalDate startDate, Integer dayOfMonth, RecurrenceType type,
                                              LocalDate endDate, LocalDate windowStart, LocalDate windowEnd,
                                              LocalDate today) {
        List<LocalDate> dates = new ArrayList<>();
        LocalDate d = firstOccurrence(startDate, dayOfMonth, type, today);
        if (d == null) return dates;
        int guard = 0;
        while (d.isBefore(windowStart) && guard++ < 2000) d = next(d, type);
        while (!d.isAfter(windowEnd) && guard++ < 2000) {
            if (endDate != null && d.isAfter(endDate)) break;
            if (startDate == null || !d.isBefore(startDate)) dates.add(d);
            d = next(d, type);
        }
        return dates;
    }

    /** Próxima ocorrência a partir de hoje (inclusive), ou null se passou do endDate. */
    public static LocalDate nextOccurrence(LocalDate startDate, Integer dayOfMonth, RecurrenceType type,
                                           LocalDate endDate, LocalDate today) {
        LocalDate d = firstOccurrence(startDate, dayOfMonth, type, today);
        if (d == null) return null;
        int guard = 0;
        while (d.isBefore(today) && guard++ < 2000) d = next(d, type);
        if (endDate != null && d.isAfter(endDate)) return null;
        return d;
    }

    static LocalDate firstOccurrence(LocalDate startDate, Integer dayOfMonth, RecurrenceType type, LocalDate today) {
        LocalDate base = startDate != null ? startDate : today;
        if (base == null) return null;
        if (dayOfMonth != null && (type == RecurrenceType.MONTHLY || type == RecurrenceType.YEARLY)) {
            return base.withDayOfMonth(Math.min(dayOfMonth, base.lengthOfMonth()));
        }
        return base;
    }

    static LocalDate next(LocalDate d, RecurrenceType type) {
        return switch (type) {
            case DAILY -> d.plusDays(1);
            case WEEKLY -> d.plusWeeks(1);
            case BIWEEKLY -> d.plusWeeks(2);
            case MONTHLY -> d.plusMonths(1);
            case YEARLY -> d.plusYears(1);
        };
    }
}
