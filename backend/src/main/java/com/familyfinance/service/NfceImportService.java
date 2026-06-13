package com.familyfinance.service;

import com.familyfinance.dto.response.ShoppingPurchaseResponse;
import com.familyfinance.entity.*;
import com.familyfinance.repository.ShoppingPurchaseRepository;
import com.familyfinance.service.shopping.NfceParser;
import com.familyfinance.service.shopping.ProductNameNormalizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Importa uma compra a partir da página de consulta da NFC-e (QR Code ou link colado).
 * O fetch e o parsing acontecem no BACKEND (Jsoup) para evitar bloqueios de CORS no navegador.
 * A compra é salva como RASCUNHO para revisão; nunca contorna CAPTCHA/bloqueio (→ FALHA + fallback manual).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NfceImportService {

    private static final int RAW_HTML_CAP = 200_000;
    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

    private final ShoppingPurchaseRepository purchaseRepository;
    private final ShoppingPurchaseService shoppingPurchaseService;

    @Transactional
    public ShoppingPurchaseResponse importReceipt(UUID groupId, String url, ShoppingSourceType sourceType, User user) {
        FamilyGroup group = new FamilyGroup(); group.setId(groupId);

        ShoppingPurchase.ShoppingPurchaseBuilder b = ShoppingPurchase.builder()
                .familyGroup(group)
                .createdBy(user)
                .sourceType(sourceType)
                .qrCodeUrl(url)
                .accessKey(NfceParser.accessKeyFromUrl(url))
                .purchaseDate(LocalDate.now()) // data da nota varia por estado; usuário revisa
                .status(PurchaseStatus.RASCUNHO);

        String html = null;
        NfceParser.ParsedReceipt parsed = null;
        try {
            html = Jsoup.connect(url)
                    .userAgent(USER_AGENT)
                    .timeout(15000)
                    .ignoreHttpErrors(true)
                    .get()
                    .outerHtml();
            parsed = NfceParser.parse(html, url);
        } catch (Exception e) {
            log.warn("Falha ao acessar NFC-e {}: {}", url, e.getMessage());
            b.extractionStatus(ExtractionStatus.FALHA_NA_IMPORTACAO)
             .extractionError("Não foi possível acessar a página da NFC-e: " + e.getMessage());
        }

        if (parsed != null) {
            b.storeName(parsed.storeName())
             .storeCnpj(parsed.cnpj())
             .accessKey(parsed.accessKey() != null ? parsed.accessKey() : NfceParser.accessKeyFromUrl(url))
             .totalAmount(parsed.total())
             .extractionStatus(parsed.status())
             .extractionError(parsed.error())
             .rawHtml(truncate(html));
        }

        ShoppingPurchase purchase = b.build();
        if (parsed != null) {
            for (NfceParser.ParsedItem it : parsed.items()) {
                purchase.getItems().add(ShoppingPurchaseItem.builder()
                        .purchase(purchase)
                        .productName(it.name())
                        .normalizedProductName(ProductNameNormalizer.normalize(it.name()))
                        .productCode(it.code())
                        .quantity(it.quantity())
                        .unit(it.unit())
                        .unitPrice(it.unitPrice())
                        .totalPrice(it.totalPrice())
                        .build());
            }
        }

        purchase = purchaseRepository.save(purchase);
        return shoppingPurchaseService.getById(groupId, purchase.getId());
    }

    private String truncate(String html) {
        if (html == null) return null;
        return html.length() > RAW_HTML_CAP ? html.substring(0, RAW_HTML_CAP) : html;
    }
}
