package com.familyfinance.service;

import com.familyfinance.dto.response.CategorizeResultResponse;
import com.familyfinance.entity.*;
import com.familyfinance.exception.BusinessException;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.repository.CategorizationRuleRepository;
import com.familyfinance.repository.CategoryRepository;
import com.familyfinance.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Categorização em massa por palavra-chave + regras para futuros lançamentos.
 * Escopos: SINGLE (só este), ALL_MATCHING (todos que contêm a palavra + regra),
 * THIS_AND_FUTURE (este + regra, sem mexer nos antigos).
 */
@Service
@RequiredArgsConstructor
public class CategorizationService {

    private final TransactionRepository transactionRepository;
    private final CategorizationRuleRepository ruleRepository;
    private final CategoryRepository categoryRepository;
    private final FamilyGroupService familyGroupService;

    @Transactional
    public CategorizeResultResponse categorize(UUID groupId, UUID txId, UUID categoryId,
                                               CategorizeScope scope, String keyword, User user) {
        familyGroupService.assertRole(groupId, user.getId(), MemberRole.EDITOR);

        Transaction tx = transactionRepository.findById(txId)
                .orElseThrow(() -> new ResourceNotFoundException("Lançamento não encontrado"));
        if (!tx.getFamilyGroup().getId().equals(groupId)) {
            throw new BusinessException("Lançamento não pertence a este grupo");
        }
        Category category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria não encontrada"));
        if (category.getFamilyGroup() == null || !category.getFamilyGroup().getId().equals(groupId)) {
            throw new BusinessException("Categoria não pertence a este grupo");
        }

        int affected = 0;
        tx.setCategory(category);
        transactionRepository.save(tx);
        affected++;

        String rawKeyword = (keyword != null && !keyword.isBlank()) ? keyword.trim() : tx.getDescription();

        if (scope == CategorizeScope.ALL_MATCHING) {
            for (Transaction m : transactionRepository
                    .findByFamilyGroupIdAndDescriptionContainingIgnoreCase(groupId, rawKeyword)) {
                if (m.getId().equals(txId)) continue;
                m.setCategory(category);
                transactionRepository.save(m);
                affected++;
            }
        }

        boolean ruleCreated = false;
        if (scope == CategorizeScope.ALL_MATCHING || scope == CategorizeScope.THIS_AND_FUTURE) {
            upsertRule(groupId, rawKeyword, category, user);
            ruleCreated = true;
        }
        return new CategorizeResultResponse(affected, ruleCreated);
    }

    private void upsertRule(UUID groupId, String rawKeyword, Category category, User user) {
        String kw = normalize(rawKeyword);
        if (kw.isBlank()) return;
        CategorizationRule rule = ruleRepository.findByFamilyGroupIdAndKeyword(groupId, kw).orElse(null);
        if (rule != null) {
            rule.setCategory(category);
        } else {
            FamilyGroup g = new FamilyGroup(); g.setId(groupId);
            rule = CategorizationRule.builder()
                    .familyGroup(g).createdBy(user).keyword(kw).category(category).build();
        }
        ruleRepository.save(rule);
    }

    /** Categoria de uma regra que casa com a descrição (ou null). Usado ao criar/importar. */
    @Transactional(readOnly = true)
    public Category resolveCategory(UUID groupId, String description) {
        if (description == null || description.isBlank()) return null;
        String d = normalize(description);
        List<CategorizationRule> rules = ruleRepository.findByFamilyGroupId(groupId);
        Category best = null;
        int bestLen = -1;
        for (CategorizationRule r : rules) {
            String kw = r.getKeyword();
            if (kw != null && !kw.isBlank() && d.contains(kw) && kw.length() > bestLen) {
                best = r.getCategory();
                bestLen = kw.length();
            }
        }
        return best;
    }

    private String normalize(String s) {
        if (s == null) return "";
        return java.text.Normalizer.normalize(s.toLowerCase().trim(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").trim();
    }
}
