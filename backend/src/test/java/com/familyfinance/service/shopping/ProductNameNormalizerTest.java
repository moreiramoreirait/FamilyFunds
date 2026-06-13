package com.familyfinance.service.shopping;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ProductNameNormalizerTest {

    @Test
    void lowercasesRemovesAccentsAndCollapsesSpaces() {
        assertThat(ProductNameNormalizer.normalize("  Leite  Integral 1L ")).isEqualTo("leite integral 1l");
        assertThat(ProductNameNormalizer.normalize("Pão Francês")).isEqualTo("pao frances");
        assertThat(ProductNameNormalizer.normalize("AÇÚCAR Refinado")).isEqualTo("acucar refinado");
    }

    @Test
    void stripsPunctuation() {
        assertThat(ProductNameNormalizer.normalize("Arroz (tipo 1) - 5kg")).isEqualTo("arroz tipo 1 5kg");
    }

    @Test
    void handlesNullAndEmpty() {
        assertThat(ProductNameNormalizer.normalize(null)).isEqualTo("");
        assertThat(ProductNameNormalizer.normalize("   ")).isEqualTo("");
    }

    @Test
    void sameProductDifferentCasingNormalizesEqual() {
        assertThat(ProductNameNormalizer.normalize("Café Pilão"))
                .isEqualTo(ProductNameNormalizer.normalize("CAFE  pilao"));
    }
}
