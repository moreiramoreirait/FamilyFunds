package com.familyfinance.service;

import com.familyfinance.dto.request.GenerateShoppingTransactionRequest;
import com.familyfinance.dto.request.ShoppingPurchaseItemRequest;
import com.familyfinance.dto.request.ShoppingPurchaseRequest;
import com.familyfinance.dto.response.*;
import com.familyfinance.entity.*;
import com.familyfinance.exception.BusinessException;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.repository.CategoryRepository;
import com.familyfinance.repository.ProductPriceHistoryRepository;
import com.familyfinance.repository.ShoppingPurchaseRepository;
import com.familyfinance.service.shopping.ProductNameNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShoppingPurchaseService {

    private final ShoppingPurchaseRepository purchaseRepository;
    private final ProductPriceHistoryRepository priceHistoryRepository;
    private final CategoryRepository categoryRepository;
    private final TransactionService transactionService;

    // ─── CRUD ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ShoppingPurchaseResponse> list(UUID groupId) {
        return purchaseRepository.findByFamilyGroupIdOrderByPurchaseDateDescCreatedAtDesc(groupId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ShoppingPurchaseResponse getById(UUID groupId, UUID id) {
        return toResponse(findAndValidate(groupId, id));
    }

    @Transactional
    public ShoppingPurchaseResponse createManual(UUID groupId, ShoppingPurchaseRequest req, User currentUser) {
        FamilyGroup group = new FamilyGroup(); group.setId(groupId);

        ShoppingPurchase purchase = ShoppingPurchase.builder()
                .familyGroup(group)
                .createdBy(currentUser)
                .storeName(req.storeName())
                .storeCnpj(req.storeCnpj())
                .purchaseDate(req.purchaseDate())
                .paymentMethod(req.paymentMethod())
                .sourceType(req.qrCodeUrl() != null && !req.qrCodeUrl().isBlank()
                        ? ShoppingSourceType.NFC_URL : ShoppingSourceType.MANUAL)
                .qrCodeUrl(req.qrCodeUrl())
                .status(PurchaseStatus.FINALIZADA)
                .notes(req.notes())
                .build();
        applyRefs(purchase, req.accountId(), req.creditCardId(), req.categoryId());
        addItems(purchase, req.items());
        purchase.setTotalAmount(resolveTotal(req.totalAmount(), purchase.getItems()));

        purchase = purchaseRepository.save(purchase);
        feedPriceHistory(purchase);
        return toResponse(purchase);
    }

    @Transactional
    public ShoppingPurchaseResponse update(UUID groupId, UUID id, ShoppingPurchaseRequest req) {
        ShoppingPurchase purchase = findAndValidate(groupId, id);
        if (purchase.getStatus() == PurchaseStatus.LANCADA_NO_FINANCEIRO) {
            throw new BusinessException("Compra já lançada no financeiro não pode ser editada");
        }
        purchase.setStoreName(req.storeName());
        purchase.setStoreCnpj(req.storeCnpj());
        purchase.setPurchaseDate(req.purchaseDate());
        purchase.setPaymentMethod(req.paymentMethod());
        purchase.setNotes(req.notes());
        applyRefs(purchase, req.accountId(), req.creditCardId(), req.categoryId());

        purchase.getItems().clear();
        addItems(purchase, req.items());
        purchase.setTotalAmount(resolveTotal(req.totalAmount(), purchase.getItems()));

        purchase = purchaseRepository.save(purchase);
        // rebuild histórico de preços desta compra
        priceHistoryRepository.deleteByPurchaseId(purchase.getId());
        feedPriceHistory(purchase);
        return toResponse(purchase);
    }

    @Transactional
    public void delete(UUID groupId, UUID id) {
        ShoppingPurchase purchase = findAndValidate(groupId, id);
        purchaseRepository.delete(purchase); // cascade itens + price_history (FK ON DELETE CASCADE)
    }

    @Transactional
    public ShoppingPurchaseResponse finalize(UUID groupId, UUID id) {
        ShoppingPurchase purchase = findAndValidate(groupId, id);
        if (purchase.getStatus() == PurchaseStatus.RASCUNHO) {
            purchase.setStatus(PurchaseStatus.FINALIZADA);
        }
        return toResponse(purchaseRepository.save(purchase));
    }

    // ─── Gerar despesa (lançamento único, valor total) ─────────────────────────

    @Transactional
    public ShoppingPurchaseResponse generateTransaction(UUID groupId, UUID id,
                                                        GenerateShoppingTransactionRequest req, User currentUser) {
        ShoppingPurchase purchase = findAndValidate(groupId, id);
        if (purchase.getFinancialTransactionId() != null) {
            throw new BusinessException("Despesa já gerada para esta compra");
        }
        if (purchase.getStatus() == PurchaseStatus.CANCELADA) {
            throw new BusinessException("Compra cancelada não pode gerar despesa");
        }
        if (purchase.getTotalAmount() == null || purchase.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Compra sem valor total para lançar");
        }

        UUID accountId = req.accountId() != null ? req.accountId()
                : (purchase.getAccount() != null ? purchase.getAccount().getId() : null);
        UUID creditCardId = req.creditCardId() != null ? req.creditCardId()
                : (purchase.getCreditCard() != null ? purchase.getCreditCard().getId() : null);
        UUID categoryId = resolveCategoryId(groupId, req.categoryId(), purchase);

        String desc = "Compra supermercado - " +
                (purchase.getStoreName() != null && !purchase.getStoreName().isBlank()
                        ? purchase.getStoreName() : "mercado");

        Transaction tx = transactionService.createForOrigin(
                groupId, OriginType.SHOPPING_PURCHASE, purchase.getId(),
                purchase.getPurchaseDate() != null ? purchase.getPurchaseDate() : LocalDate.now(),
                desc, purchase.getTotalAmount(), req.status(),
                accountId, creditCardId, categoryId, currentUser);

        purchase.setFinancialTransactionId(tx.getId());
        purchase.setStatus(PurchaseStatus.LANCADA_NO_FINANCEIRO);
        if (categoryId != null && purchase.getCategory() == null) {
            Category c = new Category(); c.setId(categoryId); purchase.setCategory(c);
        }
        return toResponse(purchaseRepository.save(purchase));
    }

    // ─── Summary + histórico de preços ─────────────────────────────────────────

    @Transactional(readOnly = true)
    public ShoppingSummaryResponse getSummary(UUID groupId) {
        YearMonth ym = YearMonth.now();
        LocalDate start = ym.atDay(1), end = ym.atEndOfMonth();
        BigDecimal monthTotal = purchaseRepository.sumTotalByPeriod(groupId, start, end);
        long monthCount = purchaseRepository.countByFamilyGroupIdAndPurchaseDateBetween(groupId, start, end);
        long tracked = priceHistoryRepository.countDistinctNormalizedProductNameByFamilyGroupId(groupId);

        ShoppingPurchase last = purchaseRepository
                .findByFamilyGroupIdOrderByPurchaseDateDescCreatedAtDesc(groupId)
                .stream().filter(p -> p.getStatus() != PurchaseStatus.CANCELADA).findFirst().orElse(null);

        return new ShoppingSummaryResponse(
                monthTotal != null ? monthTotal : BigDecimal.ZERO, monthCount,
                last != null ? last.getPurchaseDate() : null,
                last != null ? last.getStoreName() : null,
                last != null ? last.getTotalAmount() : null,
                tracked);
    }

    @Transactional(readOnly = true)
    public List<PriceHistoryResponse> priceHistory(UUID groupId) {
        List<PriceHistoryResponse> out = new ArrayList<>();
        for (Object[] row : priceHistoryRepository.summarizeByGroup(groupId)) {
            String norm = (String) row[0];
            String name = (String) row[1];
            BigDecimal min = (BigDecimal) row[2];
            BigDecimal max = (BigDecimal) row[3];
            LocalDate lastDate = (LocalDate) row[4];
            long count = ((Number) row[5]).longValue();
            // último preço/mercado: primeiro registro (mais recente)
            var latest = priceHistoryRepository
                    .findByFamilyGroupIdAndNormalizedProductNameOrderByPurchaseDateDescCreatedAtDesc(groupId, norm)
                    .stream().findFirst().orElse(null);
            out.add(new PriceHistoryResponse(norm, name,
                    latest != null ? latest.getUnitPrice() : null, min, max,
                    latest != null ? latest.getStoreName() : null, lastDate, count, List.of()));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public PriceHistoryResponse priceHistoryDetail(UUID groupId, String normalizedName) {
        var rows = priceHistoryRepository
                .findByFamilyGroupIdAndNormalizedProductNameOrderByPurchaseDateDescCreatedAtDesc(groupId, normalizedName);
        if (rows.isEmpty()) throw new ResourceNotFoundException("PriceHistory", "produto", normalizedName);
        BigDecimal min = rows.stream().map(ProductPriceHistory::getUnitPrice)
                .filter(java.util.Objects::nonNull).min(BigDecimal::compareTo).orElse(null);
        BigDecimal max = rows.stream().map(ProductPriceHistory::getUnitPrice)
                .filter(java.util.Objects::nonNull).max(BigDecimal::compareTo).orElse(null);
        var latest = rows.get(0);
        var entries = rows.stream().map(h -> new PriceHistoryResponse.Entry(
                h.getUnitPrice(), h.getQuantity(), h.getUnit(), h.getStoreName(), h.getPurchaseDate())).toList();
        return new PriceHistoryResponse(normalizedName, latest.getProductName(),
                latest.getUnitPrice(), min, max, latest.getStoreName(), latest.getPurchaseDate(),
                rows.size(), entries);
    }

    // ─── Internos ───────────────────────────────────────────────────────────────

    private void addItems(ShoppingPurchase purchase, List<ShoppingPurchaseItemRequest> items) {
        if (items == null) return;
        for (ShoppingPurchaseItemRequest it : items) {
            ShoppingPurchaseItem item = ShoppingPurchaseItem.builder()
                    .purchase(purchase)
                    .productName(it.productName())
                    .normalizedProductName(ProductNameNormalizer.normalize(it.productName()))
                    .productCode(it.productCode())
                    .brand(it.brand())
                    .category(it.category())
                    .quantity(it.quantity())
                    .unit(it.unit())
                    .unitPrice(it.unitPrice())
                    .totalPrice(it.totalPrice() != null ? it.totalPrice() : computeItemTotal(it))
                    .build();
            purchase.getItems().add(item);
        }
    }

    private BigDecimal computeItemTotal(ShoppingPurchaseItemRequest it) {
        if (it.unitPrice() != null && it.quantity() != null) {
            return it.unitPrice().multiply(it.quantity());
        }
        return null;
    }

    private BigDecimal resolveTotal(BigDecimal provided, List<ShoppingPurchaseItem> items) {
        if (provided != null) return provided;
        return items.stream().map(ShoppingPurchaseItem::getTotalPrice)
                .filter(java.util.Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void feedPriceHistory(ShoppingPurchase purchase) {
        for (ShoppingPurchaseItem item : purchase.getItems()) {
            if (item.getUnitPrice() == null) continue;
            priceHistoryRepository.save(ProductPriceHistory.builder()
                    .familyGroup(purchase.getFamilyGroup())
                    .createdBy(purchase.getCreatedBy())
                    .productName(item.getProductName())
                    .normalizedProductName(item.getNormalizedProductName())
                    .storeName(purchase.getStoreName())
                    .storeCnpj(purchase.getStoreCnpj())
                    .unitPrice(item.getUnitPrice())
                    .quantity(item.getQuantity())
                    .unit(item.getUnit())
                    .purchaseDate(purchase.getPurchaseDate())
                    .purchaseId(purchase.getId())
                    .purchaseItemId(item.getId())
                    .build());
        }
    }

    private UUID resolveCategoryId(UUID groupId, UUID requested, ShoppingPurchase purchase) {
        if (requested != null) return requested;
        if (purchase.getCategory() != null) return purchase.getCategory().getId();
        return categoryRepository.findFirstByFamilyGroupIdAndNameIgnoreCaseAndIsActiveTrue(groupId, "Alimentação")
                .map(Category::getId).orElse(null);
    }

    private void applyRefs(ShoppingPurchase p, UUID accountId, UUID creditCardId, UUID categoryId) {
        if (accountId != null) { Account a = new Account(); a.setId(accountId); p.setAccount(a); } else p.setAccount(null);
        if (creditCardId != null) { CreditCard c = new CreditCard(); c.setId(creditCardId); p.setCreditCard(c); } else p.setCreditCard(null);
        if (categoryId != null) { Category cat = new Category(); cat.setId(categoryId); p.setCategory(cat); } else p.setCategory(null);
    }

    private ShoppingPurchase findAndValidate(UUID groupId, UUID id) {
        ShoppingPurchase p = purchaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShoppingPurchase", "id", id));
        if (!p.getFamilyGroup().getId().equals(groupId)) {
            throw new BusinessException("Compra não pertence a este grupo");
        }
        return p;
    }

    private ShoppingPurchaseResponse toResponse(ShoppingPurchase p) {
        List<ShoppingPurchaseItemResponse> items = p.getItems().stream()
                .map(i -> new ShoppingPurchaseItemResponse(i.getId(), i.getProductName(), i.getCategory(),
                        i.getQuantity(), i.getUnit(), i.getUnitPrice(), i.getTotalPrice(), i.getBrand(), i.getProductCode()))
                .toList();
        return new ShoppingPurchaseResponse(
                p.getId(), p.getStoreName(), p.getStoreCnpj(), p.getPurchaseDate(), p.getTotalAmount(),
                p.getPaymentMethod(),
                p.getAccount() != null ? p.getAccount().getId() : null,
                p.getAccount() != null ? p.getAccount().getName() : null,
                p.getCreditCard() != null ? p.getCreditCard().getId() : null,
                p.getCreditCard() != null ? p.getCreditCard().getName() : null,
                p.getCategory() != null ? p.getCategory().getId() : null,
                p.getCategory() != null ? p.getCategory().getName() : null,
                p.getSourceType(), p.getQrCodeUrl(), p.getAccessKey(),
                p.getExtractionStatus(), p.getExtractionError(),
                p.getFinancialTransactionId(), p.getStatus(), p.getNotes(), items, p.getCreatedAt());
    }
}
