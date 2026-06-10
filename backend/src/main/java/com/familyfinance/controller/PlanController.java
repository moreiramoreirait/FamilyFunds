package com.familyfinance.controller;

import com.familyfinance.dto.response.PlanResponse;
import com.familyfinance.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/plans")
@RequiredArgsConstructor
public class PlanController {

    private final SubscriptionService subscriptionService;

    @GetMapping
    public ResponseEntity<List<PlanResponse>> listPlans() {
        return ResponseEntity.ok(subscriptionService.listPlans());
    }
}
