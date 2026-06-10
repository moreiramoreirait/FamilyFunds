package com.familyfinance.dto.response;

import com.familyfinance.entity.CategoryType;

import java.util.List;
import java.util.UUID;

public record CategoryResponse(
        UUID id,
        String name,
        CategoryType type,
        String color,
        String icon,
        Boolean isActive,
        Boolean isSystem,
        List<SubcategoryResponse> subcategories
) {}
