package com.familyfinance.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Geração automática diária dos lançamentos recorrentes (assinaturas e, na Etapa 2,
 * despesas recorrentes). A geração é idempotente (dedup por origem + competência),
 * então rodar diariamente é seguro.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecurrenceSchedulerService {

    private final ServiceSubscriptionService serviceSubscriptionService;

    @Scheduled(cron = "0 0 2 * * *") // todo dia às 02:00
    public void generateRecurringTransactions() {
        try {
            serviceSubscriptionService.generateAllActive();
        } catch (Exception e) {
            log.error("Falha na geração agendada de assinaturas", e);
        }
    }
}
