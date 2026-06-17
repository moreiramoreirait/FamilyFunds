package com.familyfinance.service.openfinance;

import com.familyfinance.dto.response.BankConnectionResponse;
import com.familyfinance.dto.response.SyncResultResponse;
import com.familyfinance.entity.*;
import com.familyfinance.exception.BusinessException;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.repository.AccountRepository;
import com.familyfinance.repository.BankConnectionRepository;
import com.familyfinance.repository.TransactionRepository;
import com.familyfinance.service.FamilyGroupService;
import com.familyfinance.service.SubscriptionService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Etapa 1: conexão bancária (connect token + salvar/listar/remover). Restrito ao Premium. */
@Service
@RequiredArgsConstructor
@Slf4j
public class OpenFinanceService {

    private final PluggyClient pluggy;
    private final BankConnectionRepository connectionRepository;
    private final AccountRepository accountRepository;
    private final TransactionRepository transactionRepository;
    private final FamilyGroupService familyGroupService;
    private final SubscriptionService subscriptionService;

    public String createConnectToken(UUID groupId, User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        subscriptionService.checkOpenFinanceAccess(groupId);
        return pluggy.createConnectToken(null);
    }

    @Transactional
    public BankConnectionResponse saveConnection(UUID groupId, String itemId, User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        subscriptionService.checkOpenFinanceAccess(groupId);

        JsonNode item = pluggy.getItem(itemId);
        String connectorName = item.path("connector").path("name").asText(null);
        String connectorImg = item.path("connector").path("imageUrl").asText(null);
        String status = item.path("status").asText("UNKNOWN");

        BankConnection conn = connectionRepository.findByPluggyItemId(itemId).orElse(null);
        if (conn != null) {
            if (!conn.getFamilyGroup().getId().equals(groupId)) {
                throw new BusinessException("Esta conexão já pertence a outro grupo");
            }
            conn.setConnectorName(connectorName);
            conn.setConnectorImageUrl(connectorImg);
            conn.setStatus(status);
        } else {
            FamilyGroup g = new FamilyGroup(); g.setId(groupId);
            conn = BankConnection.builder()
                    .familyGroup(g).createdBy(user)
                    .pluggyItemId(itemId)
                    .connectorName(connectorName)
                    .connectorImageUrl(connectorImg)
                    .status(status)
                    .build();
        }
        return toResponse(connectionRepository.save(conn));
    }

    @Transactional(readOnly = true)
    public List<BankConnectionResponse> listConnections(UUID groupId, User user) {
        familyGroupService.assertMember(groupId, user.getId());
        return connectionRepository.findByFamilyGroupIdOrderByCreatedAtDesc(groupId).stream()
                .map(this::toResponse).toList();
    }

    @Transactional
    public void deleteConnection(UUID groupId, UUID id, User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        BankConnection conn = connectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Conexão não encontrada"));
        if (!conn.getFamilyGroup().getId().equals(groupId)) {
            throw new BusinessException("Conexão não pertence a este grupo");
        }
        connectionRepository.delete(conn);
    }

    /** Etapa 2: busca contas + extrato do agregador e concilia (dedup por external_id). */
    @Transactional
    public SyncResultResponse syncConnection(UUID groupId, UUID connectionId, User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);
        subscriptionService.checkOpenFinanceAccess(groupId);

        BankConnection conn = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Conexão não encontrada"));
        if (!conn.getFamilyGroup().getId().equals(groupId)) {
            throw new BusinessException("Conexão não pertence a este grupo");
        }

        String itemId = conn.getPluggyItemId();
        JsonNode item = pluggy.getItem(itemId);
        conn.setStatus(item.path("status").asText(conn.getStatus()));

        // 1ª sync: último ano; depois: desde a última sincronização
        LocalDate from = conn.getLastSyncedAt() != null
                ? conn.getLastSyncedAt().toLocalDate()
                : LocalDate.now().minusYears(1);

        FamilyGroup group = new FamilyGroup(); group.setId(groupId);
        int accountsLinked = 0, txImported = 0;

        for (JsonNode acc : pluggy.getAccounts(itemId)) {
            String extAccId = text(acc, "id");
            if (extAccId == null) continue;

            String accName = firstNonBlank(text(acc, "marketingName"), text(acc, "name"), conn.getConnectorName(), "Conta");
            BigDecimal balance = money(acc, "balance");

            Account account = accountRepository.findByFamilyGroupIdAndExternalAccountId(groupId, extAccId).orElse(null);
            if (account == null) {
                account = Account.builder()
                        .familyGroup(group).createdBy(user)
                        .name(accName).bankName(conn.getConnectorName())
                        .type(mapAccountType(acc))
                        .initialBalance(BigDecimal.ZERO).currentBalance(balance)
                        .isActive(true).includeInTotal(true)
                        .bankConnectionId(conn.getId()).externalAccountId(extAccId)
                        .build();
                account = accountRepository.save(account);
                accountsLinked++;
            } else {
                account.setCurrentBalance(balance);
                account.setName(accName);
                accountRepository.save(account);
            }

            for (JsonNode tx : pluggy.getTransactions(extAccId, from.toString())) {
                String extId = text(tx, "id");
                if (extId == null || transactionRepository.existsByFamilyGroupIdAndExternalId(groupId, extId)) continue;

                BigDecimal amount = money(tx, "amount");
                boolean expense = amount.signum() < 0;
                LocalDate date = parseDate(text(tx, "date"));

                Transaction t = Transaction.builder()
                        .familyGroup(group).createdBy(user)
                        .type(expense ? TransactionType.EXPENSE : TransactionType.INCOME)
                        .description(truncate(firstNonBlank(text(tx, "description"), "Transação"), 255))
                        .amount(amount.abs())
                        .transactionDate(date).paidDate(date)
                        .account(account)
                        .status(TransactionStatus.PAID)
                        .originType(OriginType.OPEN_FINANCE)
                        .externalId(extId)
                        .build();
                transactionRepository.save(t);
                txImported++;
            }
        }

        conn.setLastSyncedAt(LocalDateTime.now());
        connectionRepository.save(conn);
        log.info("Open Finance sync {} -> {} contas, {} transações", connectionId, accountsLinked, txImported);
        return new SyncResultResponse(accountsLinked, txImported, conn.getStatus());
    }

    private AccountType mapAccountType(JsonNode acc) {
        String type = text(acc, "type");
        String subtype = text(acc, "subtype");
        if ("BANK".equalsIgnoreCase(type)) {
            return subtype != null && subtype.toUpperCase().contains("SAVING") ? AccountType.SAVINGS : AccountType.CHECKING;
        }
        return AccountType.OTHER; // CREDIT e demais
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return v.isMissingNode() || v.isNull() || v.asText().isBlank() ? null : v.asText();
    }

    private static BigDecimal money(JsonNode node, String field) {
        String v = text(node, field);
        try { return v != null ? new BigDecimal(v) : BigDecimal.ZERO; }
        catch (NumberFormatException e) { return BigDecimal.ZERO; }
    }

    private static LocalDate parseDate(String iso) {
        if (iso == null) return LocalDate.now();
        try { return LocalDate.parse(iso.substring(0, 10)); }
        catch (Exception e) { return LocalDate.now(); }
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) if (v != null && !v.isBlank()) return v;
        return null;
    }

    private static String truncate(String s, int max) {
        return s == null ? null : (s.length() > max ? s.substring(0, max) : s);
    }

    private BankConnectionResponse toResponse(BankConnection c) {
        return new BankConnectionResponse(c.getId(), c.getConnectorName(), c.getConnectorImageUrl(),
                c.getStatus(), c.getStatusDetail(), c.getLastSyncedAt(), c.getCreatedAt());
    }
}
