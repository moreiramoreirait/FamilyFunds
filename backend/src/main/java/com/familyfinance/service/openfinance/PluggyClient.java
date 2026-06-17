package com.familyfinance.service.openfinance;

import com.familyfinance.exception.BusinessException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Cliente HTTP da API do Pluggy (Open Finance). Autentica com clientId/clientSecret,
 * cacheia a apiKey (~2h) e expõe os recursos usados: connect token, item, contas e transações.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class PluggyClient {

    @Value("${pluggy.client-id:}")
    private String clientId;
    @Value("${pluggy.client-secret:}")
    private String clientSecret;
    @Value("${pluggy.base-url:https://api.pluggy.ai}")
    private String baseUrl;

    private final ObjectMapper mapper;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    private volatile String apiKey;
    private volatile long apiKeyExpiresAt; // epoch millis

    public boolean isConfigured() {
        return clientId != null && !clientId.isBlank() && clientSecret != null && !clientSecret.isBlank();
    }

    private void assertConfigured() {
        if (!isConfigured()) {
            throw new BusinessException("Open Finance não está configurado. Defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET.");
        }
    }

    private synchronized String apiKey() throws Exception {
        if (apiKey != null && System.currentTimeMillis() < apiKeyExpiresAt) return apiKey;
        String body = mapper.writeValueAsString(Map.of("clientId", clientId, "clientSecret", clientSecret));
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/auth"))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(15))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 300) {
            throw new BusinessException("Falha ao autenticar no Pluggy (" + resp.statusCode() + ")");
        }
        apiKey = mapper.readTree(resp.body()).path("apiKey").asText();
        apiKeyExpiresAt = System.currentTimeMillis() + 100 * 60 * 1000L; // 100 min (token vale ~2h)
        return apiKey;
    }

    /** Token efêmero para o widget Pluggy Connect. itemId opcional (para reconectar/atualizar). */
    public String createConnectToken(String itemId) {
        assertConfigured();
        try {
            String body = itemId != null
                    ? mapper.writeValueAsString(Map.of("itemId", itemId))
                    : "{}";
            JsonNode node = post("/connect_token", body);
            return node.path("accessToken").asText();
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Erro ao criar connect token Pluggy", e);
            throw new BusinessException("Erro ao iniciar conexão com o banco");
        }
    }

    public JsonNode getItem(String itemId) {
        assertConfigured();
        return get("/items/" + enc(itemId));
    }

    public List<JsonNode> getAccounts(String itemId) {
        assertConfigured();
        JsonNode node = get("/accounts?itemId=" + enc(itemId) + "&pageSize=200");
        return toList(node.path("results"));
    }

    /** Transações de uma conta a partir de uma data (inclusive), paginando. */
    public List<JsonNode> getTransactions(String accountId, String fromIsoDate) {
        assertConfigured();
        List<JsonNode> all = new ArrayList<>();
        int page = 1, totalPages = 1;
        do {
            String url = "/transactions?accountId=" + enc(accountId) + "&pageSize=500&page=" + page;
            if (fromIsoDate != null) url += "&from=" + fromIsoDate;
            JsonNode node = get(url);
            all.addAll(toList(node.path("results")));
            totalPages = node.path("totalPages").asInt(1);
            page++;
        } while (page <= totalPages && page <= 20); // teto de segurança
        return all;
    }

    // ─── HTTP helpers ─────────────────────────────────────────────────────────

    private JsonNode get(String path) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + path))
                    .header("X-API-KEY", apiKey())
                    .header("accept", "application/json")
                    .timeout(Duration.ofSeconds(30))
                    .GET().build();
            return send(req);
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("Erro ao consultar o Pluggy: " + e.getMessage());
        }
    }

    private JsonNode post(String path, String body) throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + path))
                .header("X-API-KEY", apiKey())
                .header("Content-Type", "application/json")
                .header("accept", "application/json")
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        return send(req);
    }

    private JsonNode send(HttpRequest req) {
        try {
            HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() >= 300) {
                String path = req.uri().getPath();
                log.warn("Pluggy {} {} -> {} : {}", req.method(), path, resp.statusCode(), resp.body());
                String body = resp.body() == null ? "" : resp.body();
                String detail = body.length() > 240 ? body.substring(0, 240) : body;
                throw new BusinessException("Pluggy " + path + " respondeu " + resp.statusCode()
                        + (detail.isBlank() ? "" : " — " + detail));
            }
            return mapper.readTree(resp.body());
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException("Erro de comunicação com o Pluggy: " + e.getMessage());
        }
    }

    private List<JsonNode> toList(JsonNode array) {
        List<JsonNode> out = new ArrayList<>();
        if (array != null && array.isArray()) array.forEach(out::add);
        return out;
    }

    private String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
