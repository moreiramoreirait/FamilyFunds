package com.familyfinance.service;

import com.familyfinance.dto.request.AccountRequest;
import com.familyfinance.dto.response.AccountResponse;
import com.familyfinance.entity.Account;
import com.familyfinance.entity.FamilyGroup;
import com.familyfinance.entity.User;
import com.familyfinance.exception.BusinessException;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;

    public List<AccountResponse> getAll(UUID familyGroupId) {
        return accountRepository.findByFamilyGroupIdAndIsActiveTrueOrderByNameAsc(familyGroupId)
                .stream().map(this::toResponse).toList();
    }

    public AccountResponse getById(UUID familyGroupId, UUID accountId) {
        Account account = findAndValidate(familyGroupId, accountId);
        return toResponse(account);
    }

    @Transactional
    public AccountResponse create(UUID familyGroupId, AccountRequest request, User currentUser) {
        FamilyGroup group = new FamilyGroup();
        group.setId(familyGroupId);

        BigDecimal balance = request.initialBalance() != null ? request.initialBalance() : BigDecimal.ZERO;

        Account account = Account.builder()
                .familyGroup(group)
                .name(request.name())
                .bankName(request.bankName())
                .type(request.type())
                .initialBalance(balance)
                .currentBalance(balance)
                .color(request.color())
                .icon(request.icon())
                .isActive(true)
                .includeInTotal(request.includeInTotal() != null ? request.includeInTotal() : true)
                .notes(request.notes())
                .createdBy(currentUser)
                .build();
        return toResponse(accountRepository.save(account));
    }

    @Transactional
    public AccountResponse update(UUID familyGroupId, UUID accountId, AccountRequest request) {
        Account account = findAndValidate(familyGroupId, accountId);
        account.setName(request.name());
        account.setBankName(request.bankName());
        account.setType(request.type());
        account.setColor(request.color());
        account.setIcon(request.icon());
        if (request.includeInTotal() != null) account.setIncludeInTotal(request.includeInTotal());
        account.setNotes(request.notes());
        return toResponse(accountRepository.save(account));
    }

    @Transactional
    public void delete(UUID familyGroupId, UUID accountId) {
        Account account = findAndValidate(familyGroupId, accountId);
        account.setIsActive(false);
        accountRepository.save(account);
    }

    public void updateBalance(UUID accountId, BigDecimal delta) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));
        account.setCurrentBalance(account.getCurrentBalance().add(delta));
        accountRepository.save(account);
    }

    private Account findAndValidate(UUID familyGroupId, UUID accountId) {
        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account", "id", accountId));
        if (!account.getFamilyGroup().getId().equals(familyGroupId)) {
            throw new BusinessException("Account does not belong to this group");
        }
        return account;
    }

    public AccountResponse toResponse(Account a) {
        return new AccountResponse(a.getId(), a.getName(), a.getBankName(), a.getType(),
                a.getInitialBalance(), a.getCurrentBalance(), a.getColor(), a.getIcon(),
                a.getIsActive(), a.getIncludeInTotal(), a.getNotes(), a.getCreatedAt());
    }
}
