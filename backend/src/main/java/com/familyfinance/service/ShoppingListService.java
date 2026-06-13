package com.familyfinance.service;

import com.familyfinance.dto.request.ConvertListRequest;
import com.familyfinance.dto.request.ShoppingListItemRequest;
import com.familyfinance.dto.request.ShoppingListRequest;
import com.familyfinance.dto.response.ShoppingListItemResponse;
import com.familyfinance.dto.response.ShoppingListResponse;
import com.familyfinance.dto.response.ShoppingPurchaseResponse;
import com.familyfinance.entity.*;
import com.familyfinance.exception.BusinessException;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.repository.ProductPriceHistoryRepository;
import com.familyfinance.repository.ShoppingListRepository;
import com.familyfinance.repository.ShoppingPurchaseRepository;
import com.familyfinance.service.shopping.ProductNameNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShoppingListService {

    private final ShoppingListRepository listRepository;
    private final ProductPriceHistoryRepository priceHistoryRepository;
    private final ShoppingPurchaseRepository purchaseRepository;
    private final ShoppingPurchaseService shoppingPurchaseService;

    // ─── CRUD lista ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ShoppingListResponse> list(UUID groupId) {
        return listRepository.findByFamilyGroupIdOrderByCreatedAtDesc(groupId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public ShoppingListResponse getById(UUID groupId, UUID id) {
        return toResponse(findAndValidate(groupId, id));
    }

    @Transactional
    public ShoppingListResponse create(UUID groupId, ShoppingListRequest req, User user) {
        FamilyGroup group = new FamilyGroup(); group.setId(groupId);
        ShoppingList list = ShoppingList.builder()
                .familyGroup(group).createdBy(user)
                .name(req.name()).description(req.description())
                .status(ShoppingListStatus.ABERTA)
                .build();
        if (req.items() != null) req.items().forEach(it -> list.getItems().add(buildItem(groupId, list, it)));
        recompute(list);
        return toResponse(listRepository.save(list));
    }

    @Transactional
    public ShoppingListResponse update(UUID groupId, UUID id, ShoppingListRequest req) {
        ShoppingList list = findAndValidate(groupId, id);
        list.setName(req.name());
        list.setDescription(req.description());
        recompute(list);
        return toResponse(listRepository.save(list));
    }

    @Transactional
    public void delete(UUID groupId, UUID id) {
        listRepository.delete(findAndValidate(groupId, id));
    }

    // ─── Itens ─────────────────────────────────────────────────────────────────

    @Transactional
    public ShoppingListResponse addItem(UUID groupId, UUID listId, ShoppingListItemRequest req) {
        ShoppingList list = findAndValidate(groupId, listId);
        list.getItems().add(buildItem(groupId, list, req));
        recompute(list);
        return toResponse(listRepository.save(list));
    }

    @Transactional
    public ShoppingListResponse updateItem(UUID groupId, UUID listId, UUID itemId, ShoppingListItemRequest req) {
        ShoppingList list = findAndValidate(groupId, listId);
        ShoppingListItem item = list.getItems().stream().filter(i -> i.getId().equals(itemId)).findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("ShoppingListItem", "id", itemId));
        item.setProductName(req.productName());
        item.setNormalizedProductName(ProductNameNormalizer.normalize(req.productName()));
        item.setCategory(req.category());
        item.setQuantity(req.quantity());
        item.setUnit(req.unit());
        item.setEstimatedUnitPrice(req.estimatedUnitPrice());
        item.setEstimatedTotalPrice(mult(req.estimatedUnitPrice(), req.quantity()));
        item.setPreferredStore(req.preferredStore());
        if (req.checked() != null) item.setChecked(req.checked());
        item.setRealUnitPrice(req.realUnitPrice());
        item.setRealTotalPrice(mult(req.realUnitPrice(), req.quantity()));
        recompute(list);
        return toResponse(listRepository.save(list));
    }

    @Transactional
    public ShoppingListResponse deleteItem(UUID groupId, UUID listId, UUID itemId) {
        ShoppingList list = findAndValidate(groupId, listId);
        list.getItems().removeIf(i -> i.getId().equals(itemId));
        recompute(list);
        return toResponse(listRepository.save(list));
    }

    // ─── Converter em compra (RASCUNHO, sem despesa) ───────────────────────────

    @Transactional
    public ShoppingPurchaseResponse convertToPurchase(UUID groupId, UUID listId, ConvertListRequest req, User user) {
        ShoppingList list = findAndValidate(groupId, listId);
        if (list.getConvertedPurchaseId() != null) {
            throw new BusinessException("Lista já convertida em compra");
        }
        FamilyGroup group = new FamilyGroup(); group.setId(groupId);

        ShoppingPurchase purchase = ShoppingPurchase.builder()
                .familyGroup(group).createdBy(user)
                .storeName(req != null && req.storeName() != null ? req.storeName() : list.getName())
                .purchaseDate(req != null && req.purchaseDate() != null ? req.purchaseDate() : LocalDate.now())
                .paymentMethod(req != null ? req.paymentMethod() : null)
                .sourceType(ShoppingSourceType.SHOPPING_LIST)
                .status(PurchaseStatus.RASCUNHO)
                .build();
        if (req != null) {
            if (req.accountId() != null) { Account a = new Account(); a.setId(req.accountId()); purchase.setAccount(a); }
            if (req.creditCardId() != null) { CreditCard c = new CreditCard(); c.setId(req.creditCardId()); purchase.setCreditCard(c); }
            if (req.categoryId() != null) { Category cat = new Category(); cat.setId(req.categoryId()); purchase.setCategory(cat); }
        }

        BigDecimal total = BigDecimal.ZERO;
        for (ShoppingListItem li : list.getItems()) {
            BigDecimal unit = li.getRealUnitPrice() != null ? li.getRealUnitPrice() : li.getEstimatedUnitPrice();
            BigDecimal lineTotal = mult(unit, li.getQuantity());
            purchase.getItems().add(ShoppingPurchaseItem.builder()
                    .purchase(purchase)
                    .productName(li.getProductName())
                    .normalizedProductName(li.getNormalizedProductName())
                    .category(li.getCategory())
                    .quantity(li.getQuantity())
                    .unit(li.getUnit())
                    .unitPrice(unit)
                    .totalPrice(lineTotal)
                    .build());
            if (lineTotal != null) total = total.add(lineTotal);
        }
        purchase.setTotalAmount(total.signum() > 0 ? total : null);
        purchase = purchaseRepository.save(purchase);

        list.setConvertedPurchaseId(purchase.getId());
        list.setStatus(ShoppingListStatus.CONVERTIDA_EM_COMPRA);
        listRepository.save(list);

        return shoppingPurchaseService.getById(groupId, purchase.getId());
    }

    // ─── Internos ───────────────────────────────────────────────────────────────

    private ShoppingListItem buildItem(UUID groupId, ShoppingList list, ShoppingListItemRequest req) {
        String norm = ProductNameNormalizer.normalize(req.productName());
        BigDecimal lastPaid = priceHistoryRepository
                .findByFamilyGroupIdAndNormalizedProductNameOrderByPurchaseDateDescCreatedAtDesc(groupId, norm)
                .stream().findFirst().map(ProductPriceHistory::getUnitPrice).orElse(null);
        return ShoppingListItem.builder()
                .shoppingList(list)
                .productName(req.productName())
                .normalizedProductName(norm)
                .category(req.category())
                .quantity(req.quantity())
                .unit(req.unit())
                .estimatedUnitPrice(req.estimatedUnitPrice())
                .estimatedTotalPrice(mult(req.estimatedUnitPrice(), req.quantity()))
                .lastPaidPrice(lastPaid)
                .preferredStore(req.preferredStore())
                .checked(req.checked() != null ? req.checked() : false)
                .realUnitPrice(req.realUnitPrice())
                .realTotalPrice(mult(req.realUnitPrice(), req.quantity()))
                .build();
    }

    private void recompute(ShoppingList list) {
        BigDecimal est = list.getItems().stream()
                .map(i -> i.getEstimatedTotalPrice() != null ? i.getEstimatedTotalPrice()
                        : mult(i.getEstimatedUnitPrice(), i.getQuantity()))
                .filter(java.util.Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        list.setEstimatedTotal(est.signum() > 0 ? est : null);
    }

    private BigDecimal mult(BigDecimal a, BigDecimal b) {
        return (a != null && b != null) ? a.multiply(b) : null;
    }

    private ShoppingList findAndValidate(UUID groupId, UUID id) {
        ShoppingList l = listRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ShoppingList", "id", id));
        if (!l.getFamilyGroup().getId().equals(groupId)) {
            throw new BusinessException("Lista não pertence a este grupo");
        }
        return l;
    }

    private ShoppingListResponse toResponse(ShoppingList l) {
        List<ShoppingListItemResponse> items = l.getItems().stream()
                .map(i -> new ShoppingListItemResponse(i.getId(), i.getProductName(), i.getCategory(),
                        i.getQuantity(), i.getUnit(), i.getEstimatedUnitPrice(), i.getEstimatedTotalPrice(),
                        i.getLastPaidPrice(), i.getPreferredStore(), Boolean.TRUE.equals(i.getChecked()),
                        i.getRealUnitPrice(), i.getRealTotalPrice()))
                .toList();
        return new ShoppingListResponse(l.getId(), l.getName(), l.getDescription(), l.getStatus(),
                l.getEstimatedTotal(), l.getConvertedPurchaseId(), items, l.getCreatedAt());
    }
}
