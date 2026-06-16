package com.familyfinance.service.openfinance;

import com.familyfinance.dto.response.BankConnectionResponse;
import com.familyfinance.entity.BankConnection;
import com.familyfinance.entity.FamilyGroup;
import com.familyfinance.entity.MemberRole;
import com.familyfinance.entity.User;
import com.familyfinance.exception.BusinessException;
import com.familyfinance.exception.ResourceNotFoundException;
import com.familyfinance.repository.BankConnectionRepository;
import com.familyfinance.service.FamilyGroupService;
import com.familyfinance.service.SubscriptionService;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/** Etapa 1: conexão bancária (connect token + salvar/listar/remover). Restrito ao Premium. */
@Service
@RequiredArgsConstructor
@Slf4j
public class OpenFinanceService {

    private final PluggyClient pluggy;
    private final BankConnectionRepository connectionRepository;
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

    private BankConnectionResponse toResponse(BankConnection c) {
        return new BankConnectionResponse(c.getId(), c.getConnectorName(), c.getConnectorImageUrl(),
                c.getStatus(), c.getStatusDetail(), c.getLastSyncedAt(), c.getCreatedAt());
    }
}
