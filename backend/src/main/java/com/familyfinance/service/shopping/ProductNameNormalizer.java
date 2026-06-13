package com.familyfinance.service.shopping;

import java.text.Normalizer;

/**
 * Normaliza nomes de produto para agrupar no histórico de preços:
 * minúsculas, sem acentos, sem pontuação e com espaços colapsados.
 * Ex: "Leite Integral 1L  " -> "leite integral 1l".
 */
public final class ProductNameNormalizer {

    private ProductNameNormalizer() {}

    public static String normalize(String raw) {
        if (raw == null) return "";
        String s = raw.trim().toLowerCase();
        s = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", ""); // remove acentos
        s = s.replaceAll("[^a-z0-9 ]", " ");   // só letras/números/espaço
        s = s.replaceAll("\\s+", " ").trim();  // colapsa espaços
        return s;
    }
}
