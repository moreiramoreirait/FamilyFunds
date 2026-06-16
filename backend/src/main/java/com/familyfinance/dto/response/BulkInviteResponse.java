package com.familyfinance.dto.response;

import java.util.List;

/** Resultado do convite em massa, por e-mail. */
public record BulkInviteResponse(
        int sent,
        int skipped,
        int failed,
        List<Item> results
) {
    /** status: SENT | RESENT | ALREADY_MEMBER | ERROR */
    public record Item(String email, String status, String message) {}
}
