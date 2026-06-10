package com.familyfinance.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDateTime;
import java.util.List;

public record ApiError(
        int status,
        String message,
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
        LocalDateTime timestamp,
        List<FieldErrorDetail> errors
) {
    public record FieldErrorDetail(String field, String message) {}

    public static ApiError of(int status, String message) {
        return new ApiError(status, message, LocalDateTime.now(), null);
    }

    public static ApiError of(int status, String message, List<FieldErrorDetail> errors) {
        return new ApiError(status, message, LocalDateTime.now(), errors);
    }
}
