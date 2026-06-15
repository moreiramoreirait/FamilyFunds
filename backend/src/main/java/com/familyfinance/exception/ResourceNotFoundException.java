package com.familyfinance.exception;

public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String resource, String field, Object value) {
        super(resource + " não encontrado(a) com " + field + " = " + value);
    }
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
