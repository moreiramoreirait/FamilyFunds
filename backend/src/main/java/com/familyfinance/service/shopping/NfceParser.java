package com.familyfinance.service.shopping;

import com.familyfinance.entity.ExtractionStatus;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Parser best-effort do HTML de uma página de consulta de NFC-e.
 *
 * IMPORTANTE: o layout das páginas de consulta varia MUITO entre as SEFAZ
 * estaduais. Este parser cobre o layout mais comum (ex.: SP — tabela
 * #tabResult com classes txtTit/Rqtd/RvlUnit/valor) e cai para extração
 * parcial/falha quando não reconhece a estrutura. Nunca tenta contornar
 * CAPTCHA/bloqueios — nesses casos retorna FALHA e o fluxo usa fallback manual.
 * Estrutura pensada para receber parsers específicos por estado no futuro.
 */
public final class NfceParser {

    private static final Pattern CNPJ = Pattern.compile("\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}");
    private static final Pattern ACCESS_KEY = Pattern.compile("\\b\\d{44}\\b");
    private static final Pattern MONEY = Pattern.compile("(\\d{1,3}(?:\\.\\d{3})*,\\d{2}|\\d+,\\d{2})");
    private static final Pattern NUMBER = Pattern.compile("(\\d+(?:[.,]\\d+)?)");

    private NfceParser() {}

    public record ParsedItem(String name, BigDecimal quantity, String unit,
                             BigDecimal unitPrice, BigDecimal totalPrice, String code) {}

    public record ParsedReceipt(String storeName, String cnpj, String accessKey,
                                BigDecimal total, List<ParsedItem> items,
                                ExtractionStatus status, String error) {}

    /** Extrai a chave de acesso (44 dígitos) do parâmetro `p` da URL do QR, se houver. */
    public static String accessKeyFromUrl(String url) {
        if (url == null) return null;
        Matcher m = ACCESS_KEY.matcher(url.replaceAll("[^0-9]", " "));
        return m.find() ? m.group() : null;
    }

    public static ParsedReceipt parse(String html, String url) {
        if (html == null || html.isBlank()) {
            return new ParsedReceipt(null, null, accessKeyFromUrl(url), null, List.of(),
                    ExtractionStatus.FALHA_NA_IMPORTACAO, "HTML vazio");
        }
        Document doc = Jsoup.parse(html);
        String text = doc.text();

        String store = extractStore(doc);
        String cnpj = firstMatch(CNPJ, text);
        String accessKey = extractAccessKey(doc, url);
        List<ParsedItem> items = extractItems(doc);
        BigDecimal total = extractTotal(doc, text, items);

        ExtractionStatus status;
        if (total != null && !items.isEmpty()) {
            status = ExtractionStatus.IMPORTADO_COM_SUCESSO;
        } else if (total != null || store != null || !items.isEmpty()) {
            status = ExtractionStatus.IMPORTADO_PARCIALMENTE;
        } else {
            status = ExtractionStatus.FALHA_NA_IMPORTACAO;
        }
        return new ParsedReceipt(store, cnpj, accessKey, total, items, status, null);
    }

    // ─── extração ────────────────────────────────────────────────────────────

    private static String extractStore(Document doc) {
        for (String sel : new String[]{".txtTopo", "#u20", ".NFCCabecalho_SubTitulo", "h4", "h1"}) {
            Element el = doc.selectFirst(sel);
            if (el != null && !el.text().isBlank()) return el.text().trim();
        }
        return null;
    }

    private static String extractAccessKey(Document doc, String url) {
        Element chave = doc.selectFirst(".chave, #u42, span.chave");
        if (chave != null) {
            String digits = chave.text().replaceAll("[^0-9]", "");
            if (digits.length() == 44) return digits;
        }
        return accessKeyFromUrl(url);
    }

    private static List<ParsedItem> extractItems(Document doc) {
        List<ParsedItem> items = new ArrayList<>();
        // Layout comum (SP e similares): tabela #tabResult, uma linha (tr) por item.
        Elements rows = doc.select("#tabResult tr");
        for (Element row : rows) {
            String name = textOf(row, ".txtTit, .txtTit2");
            if (name == null) continue;
            BigDecimal qty = number(textOf(row, ".Rqtd"));
            String unit = labelValue(textOf(row, ".RUN"));
            BigDecimal unitPrice = money(textOf(row, ".RvlUnit"));
            BigDecimal totalPrice = money(textOf(row, ".valor, .RvlTotal"));
            String code = labelValue(textOf(row, ".RCod"));
            items.add(new ParsedItem(name.trim(), qty, unit, unitPrice, totalPrice, code));
        }
        return items;
    }

    private static BigDecimal extractTotal(Document doc, String pageText, List<ParsedItem> items) {
        for (String sel : new String[]{"#linhaTotal .totalNumb", ".totalNumb", "#totalNota .totalNumb"}) {
            BigDecimal v = money(textOf(doc, sel));
            if (v != null) return v;
        }
        // fallback: soma dos itens, se houver
        BigDecimal sum = items.stream().map(ParsedItem::totalPrice)
                .filter(java.util.Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.signum() > 0 ? sum : null;
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private static String textOf(Element scope, String selector) {
        Element el = scope.selectFirst(selector);
        return el != null ? el.text() : null;
    }

    private static String labelValue(String raw) {
        if (raw == null) return null;
        int idx = raw.indexOf(':');
        return (idx >= 0 ? raw.substring(idx + 1) : raw).trim();
    }

    private static String firstMatch(Pattern p, String text) {
        Matcher m = p.matcher(text);
        return m.find() ? m.group() : null;
    }

    /** Converte "1.234,56" / "12,90" / "R$ 5,50" em BigDecimal. */
    static BigDecimal money(String raw) {
        if (raw == null) return null;
        Matcher m = MONEY.matcher(raw);
        if (!m.find()) return null;
        String num = m.group().replace(".", "").replace(",", ".");
        try { return new BigDecimal(num); } catch (NumberFormatException e) { return null; }
    }

    /** Quantidade pode ser inteira ou decimal ("2", "1,5", "0.750"). */
    static BigDecimal number(String raw) {
        if (raw == null) return null;
        Matcher m = NUMBER.matcher(raw);
        if (!m.find()) return null;
        try { return new BigDecimal(m.group().replace(",", ".")); }
        catch (NumberFormatException e) { return null; }
    }
}
