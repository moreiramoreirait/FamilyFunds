package com.familyfinance.dto.response;

import java.util.UUID;

public record SubcategoryResponse(UUID id, UUID categoryId, String name, String color, String icon, Boolean isActive) {}
