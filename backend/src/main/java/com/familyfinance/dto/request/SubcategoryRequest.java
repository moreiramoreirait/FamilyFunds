package com.familyfinance.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubcategoryRequest(
        @NotBlank @Size(max = 100) String name
) {}
