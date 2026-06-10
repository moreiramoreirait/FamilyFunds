package com.familyfinance.service;

import com.familyfinance.dto.BankImportItemResponse;
import com.familyfinance.dto.BankImportResponse;
import com.familyfinance.entity.*;
import com.familyfinance.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class BankImportService {

    private static final List<DateTimeFormatter> DATE_FORMATTERS = List.of(
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("yyyyMMdd")
    );

    private final BankImportRepository    bankImportRepository;
    private final BankImportItemRepository bankImportItemRepository;
    private final FamilyGroupRepository   familyGroupRepository;
    private final AccountRepository       accountRepository;
    private final TransactionRepository   transactionRepository;
    private final UserRepository          userRepository;
    private final SubscriptionService     subscriptionService;

    // ─── list ────────────────────────────────────────────────────────────────

    public Page<BankImportResponse> listImports(UUID groupId, int page, int size) {
        return bankImportRepository
                .findByFamilyGroupIdOrderByCreatedAtDesc(groupId, PageRequest.of(page, size))
                .map(imp -> toResponse(imp, false));
    }

    public BankImportResponse getImport(UUID groupId, UUID importId) {
        BankImport imp = bankImportRepository.findById(importId)
                .orElseThrow(() -> new NoSuchElementException("Import not found"));
        verifyGroup(imp, groupId);
        return toResponse(imp, true);
    }

    // ─── upload & parse ──────────────────────────────────────────────────────

    @Transactional
    public BankImportResponse uploadAndParse(UUID groupId, UUID accountId,
                                             MultipartFile file, String userEmail) {
        subscriptionService.checkImportLimit(groupId);
        FamilyGroup group = familyGroupRepository.findById(groupId)
                .orElseThrow(() -> new NoSuchElementException("Group not found"));

        Account account = accountRepository.findById(accountId)
                .orElseThrow(() -> new NoSuchElementException("Account not found"));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new NoSuchElementException("User not found"));

        String originalName = file.getOriginalFilename() != null
                ? file.getOriginalFilename() : "import";
        FileType fileType = detectFileType(originalName);

        BankImport bankImport = BankImport.builder()
                .familyGroup(group)
                .account(account)
                .fileName(originalName)
                .fileType(fileType)
                .status(ImportStatus.PROCESSING)
                .importedBy(user)
                .build();
        bankImport = bankImportRepository.save(bankImport);

        List<ParsedRow> rows;
        try {
            rows = switch (fileType) {
                case CSV  -> parseCsv(file);
                case OFX  -> parseOfx(file);
                case XLSX -> parseXlsx(file);
            };
        } catch (Exception e) {
            log.error("Parse error for import {}", bankImport.getId(), e);
            bankImport.setStatus(ImportStatus.FAILED);
            bankImport.setErrorMessage("Erro ao processar arquivo: " + e.getMessage());
            bankImportRepository.save(bankImport);
            return toResponse(bankImport, false);
        }

        // Save items
        List<BankImportItem> items = new ArrayList<>();
        for (ParsedRow row : rows) {
            BankImportItem item = BankImportItem.builder()
                    .bankImport(bankImport)
                    .familyGroup(group)
                    .description(row.description())
                    .amount(row.amount().abs())
                    .transactionDate(row.date())
                    .type(row.amount().compareTo(BigDecimal.ZERO) >= 0
                            ? TransactionType.INCOME : TransactionType.EXPENSE)
                    .status(ImportItemStatus.PENDING)
                    .rawData(row.raw())
                    .build();
            items.add(item);
        }
        bankImportItemRepository.saveAll(items);

        bankImport.setTotalRecords(items.size());
        bankImport.setStatus(ImportStatus.COMPLETED);
        bankImportRepository.save(bankImport);

        return toResponse(bankImport, true);
    }

    // ─── confirm items ───────────────────────────────────────────────────────

    @Transactional
    public BankImportResponse confirmItems(UUID groupId, UUID importId, List<UUID> itemIds) {
        BankImport bankImport = bankImportRepository.findById(importId)
                .orElseThrow(() -> new NoSuchElementException("Import not found"));
        verifyGroup(bankImport, groupId);

        List<BankImportItem> items = bankImportItemRepository
                .findByBankImportIdOrderByTransactionDateAsc(importId);

        int imported = 0;
        int skipped  = 0;

        for (BankImportItem item : items) {
            if (item.getStatus() != ImportItemStatus.PENDING) continue;

            if (itemIds == null || itemIds.contains(item.getId())) {
                // Create transaction
                Transaction tx = Transaction.builder()
                        .familyGroup(bankImport.getFamilyGroup())
                        .account(bankImport.getAccount())
                        .type(item.getType())
                        .description(item.getDescription())
                        .amount(item.getAmount())
                        .transactionDate(item.getTransactionDate())
                        .status(TransactionStatus.PAID)
                        .category(item.getCategory())
                        .build();
                tx = transactionRepository.save(tx);

                item.setTransaction(tx);
                item.setStatus(ImportItemStatus.IMPORTED);
                imported++;
            } else {
                item.setStatus(ImportItemStatus.SKIPPED);
                skipped++;
            }
            bankImportItemRepository.save(item);
        }

        bankImport.setImportedRecords(imported);
        bankImport.setSkippedRecords(skipped);
        bankImportRepository.save(bankImport);

        return toResponse(bankImport, true);
    }

    // ─── delete ──────────────────────────────────────────────────────────────

    @Transactional
    public void deleteImport(UUID groupId, UUID importId) {
        BankImport bankImport = bankImportRepository.findById(importId)
                .orElseThrow(() -> new NoSuchElementException("Import not found"));
        verifyGroup(bankImport, groupId);
        bankImportItemRepository.deleteAll(
                bankImportItemRepository.findByBankImportIdOrderByTransactionDateAsc(importId));
        bankImportRepository.delete(bankImport);
    }

    // ─── parsers ─────────────────────────────────────────────────────────────

    /**
     * CSV parser — handles common Brazilian bank export formats.
     * Tries to auto-detect column positions by examining the header.
     */
    private List<ParsedRow> parseCsv(MultipartFile file) throws IOException {
        List<ParsedRow> rows = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {

            String headerLine = null;
            String line;
            int[] colMap = null; // [dateIdx, descIdx, amountIdx, debitIdx, creditIdx]

            while ((line = reader.readLine()) != null) {
                String trimmed = line.trim();
                if (trimmed.isEmpty()) continue;

                String[] parts = splitCsvLine(trimmed);

                if (colMap == null) {
                    // Try to detect header
                    colMap = detectCsvColumns(parts);
                    if (colMap != null) {
                        headerLine = trimmed;
                        continue; // skip header row
                    }
                    // No header detected — try to parse as data with defaults [0,1,2]
                    colMap = new int[]{0, 1, 2, -1, -1};
                }

                ParsedRow row = parseCsvRow(parts, colMap, trimmed);
                if (row != null) rows.add(row);
            }
        }
        return rows;
    }

    private String[] splitCsvLine(String line) {
        // Handle semicolon and comma delimiters
        String delimiter = line.contains(";") ? ";" : ",";
        List<String> result = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        boolean inQuotes = false;
        for (char c : line.toCharArray()) {
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == delimiter.charAt(0) && !inQuotes) {
                result.add(sb.toString().trim().replaceAll("^\"|\"$", ""));
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        result.add(sb.toString().trim().replaceAll("^\"|\"$", ""));
        return result.toArray(new String[0]);
    }

    /**
     * Returns [dateIdx, descIdx, amountIdx, debitIdx, creditIdx] or null if not a header.
     * debitIdx/creditIdx are -1 when there's a single amount column.
     */
    private int[] detectCsvColumns(String[] parts) {
        int dateIdx = -1, descIdx = -1, amountIdx = -1, debitIdx = -1, creditIdx = -1;
        for (int i = 0; i < parts.length; i++) {
            String h = parts[i].toLowerCase().trim()
                    .replaceAll("[^a-záéíóúâêîôûãõüçèàì]", "");
            if (h.contains("data") || h.equals("date")) {
                dateIdx = i;
            } else if (h.contains("descr") || h.contains("histor") || h.contains("memo")
                    || h.contains("lancam") || h.contains("detalhe")) {
                descIdx = i;
            } else if (h.contains("valor") || h.equals("amount") || h.equals("value")) {
                amountIdx = i;
            } else if (h.contains("debito") || h.contains("debit") || h.contains("saida")) {
                debitIdx = i;
            } else if (h.contains("credito") || h.contains("credit") || h.contains("entrada")) {
                creditIdx = i;
            }
        }
        if (dateIdx >= 0 && descIdx >= 0 && (amountIdx >= 0 || (debitIdx >= 0 && creditIdx >= 0))) {
            return new int[]{dateIdx, descIdx, amountIdx, debitIdx, creditIdx};
        }
        return null;
    }

    private ParsedRow parseCsvRow(String[] parts, int[] col, String raw) {
        try {
            if (parts.length <= Math.max(col[0], col[1])) return null;
            LocalDate date = parseDate(parts[col[0]]);
            if (date == null) return null;

            String desc = parts[col[1]];
            BigDecimal amount;

            if (col[2] >= 0 && col[2] < parts.length) {
                amount = parseAmount(parts[col[2]]);
            } else if (col[3] >= 0 && col[4] >= 0) {
                BigDecimal debit  = col[3] < parts.length ? parseAmount(parts[col[3]]) : BigDecimal.ZERO;
                BigDecimal credit = col[4] < parts.length ? parseAmount(parts[col[4]]) : BigDecimal.ZERO;
                // debit = negative (expense), credit = positive (income)
                amount = credit.subtract(debit);
            } else {
                return null;
            }

            return new ParsedRow(desc, amount, date, raw);
        } catch (Exception e) {
            log.debug("Skipping CSV row: {}", raw, e);
            return null;
        }
    }

    /**
     * OFX parser — reads SGML-like OFX 1.x format.
     */
    private List<ParsedRow> parseOfx(MultipartFile file) throws IOException {
        List<ParsedRow> rows = new ArrayList<>();
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);

        // Find all <STMTTRN> blocks
        Pattern txPattern = Pattern.compile(
                "<STMTTRN>(.*?)</STMTTRN>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
        Matcher txMatcher = txPattern.matcher(content);

        while (txMatcher.find()) {
            String block = txMatcher.group(1);
            String dateStr  = extractOfxTag(block, "DTPOSTED");
            String amtStr   = extractOfxTag(block, "TRNAMT");
            String memo     = extractOfxTag(block, "MEMO");
            if (memo == null || memo.isBlank()) {
                memo = extractOfxTag(block, "NAME");
            }

            if (dateStr == null || amtStr == null) continue;
            LocalDate date = parseDate(dateStr);
            if (date == null) continue;

            try {
                BigDecimal amount = new BigDecimal(amtStr.trim().replace(",", "."));
                String description = (memo != null ? memo : "Lançamento OFX").trim();
                rows.add(new ParsedRow(description, amount, date, block.trim()));
            } catch (NumberFormatException e) {
                log.debug("OFX amount parse error: {}", amtStr);
            }
        }
        return rows;
    }

    private String extractOfxTag(String block, String tag) {
        Pattern p = Pattern.compile(
                "<" + tag + ">([^<\r\n]+)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(block);
        return m.find() ? m.group(1).trim() : null;
    }

    /**
     * XLSX parser — reads the first sheet, auto-detects columns like CSV.
     */
    private List<ParsedRow> parseXlsx(MultipartFile file) throws IOException {
        List<ParsedRow> rows = new ArrayList<>();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rowIt = sheet.iterator();
            int[] colMap = null;
            DataFormatter formatter = new DataFormatter();

            while (rowIt.hasNext()) {
                Row row = rowIt.next();
                String[] parts = rowToStrings(row, formatter);
                if (parts.length == 0) continue;

                if (colMap == null) {
                    colMap = detectCsvColumns(parts);
                    if (colMap != null) continue; // skip header
                    colMap = new int[]{0, 1, 2, -1, -1};
                }

                ParsedRow parsed = parseCsvRow(parts, colMap,
                        String.join(";", parts));
                if (parsed != null) rows.add(parsed);
            }
        }
        return rows;
    }

    private String[] rowToStrings(Row row, DataFormatter formatter) {
        int lastCell = row.getLastCellNum();
        if (lastCell <= 0) return new String[0];
        String[] values = new String[lastCell];
        for (int i = 0; i < lastCell; i++) {
            Cell cell = row.getCell(i, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
            values[i] = cell != null ? formatter.formatCellValue(cell).trim() : "";
        }
        return values;
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private LocalDate parseDate(String raw) {
        if (raw == null || raw.isBlank()) return null;
        // OFX date format: 20240115120000[-03:00] — take first 8 chars
        String cleaned = raw.trim().replaceAll("\\[.*]$", "");
        if (cleaned.length() >= 8 && cleaned.chars().allMatch(Character::isDigit)) {
            cleaned = cleaned.substring(0, 8);
        }
        for (DateTimeFormatter fmt : DATE_FORMATTERS) {
            try {
                return LocalDate.parse(cleaned, fmt);
            } catch (DateTimeParseException ignored) {}
        }
        return null;
    }

    private BigDecimal parseAmount(String raw) {
        if (raw == null || raw.isBlank()) return BigDecimal.ZERO;
        // Remove currency symbols, normalize decimal separator
        String cleaned = raw.trim()
                .replaceAll("[R$€£\\s]", "")
                .replace(".", "")   // remove thousands separator
                .replace(",", ".");  // decimal separator
        // Handle negative in parentheses: (1.234,56) → -1234.56
        if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
            cleaned = "-" + cleaned.substring(1, cleaned.length() - 1);
        }
        return new BigDecimal(cleaned);
    }

    private FileType detectFileType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".ofx") || lower.endsWith(".qfx")) return FileType.OFX;
        if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return FileType.XLSX;
        return FileType.CSV;
    }

    private void verifyGroup(BankImport imp, UUID groupId) {
        if (!imp.getFamilyGroup().getId().equals(groupId)) {
            throw new AccessDeniedException("Access denied");
        }
    }

    // ─── response mappers ────────────────────────────────────────────────────

    private BankImportResponse toResponse(BankImport imp, boolean includeItems) {
        List<BankImportItemResponse> items = includeItems
                ? bankImportItemRepository.findByBankImportIdOrderByTransactionDateAsc(imp.getId())
                        .stream().map(this::toItemResponse).toList()
                : List.of();

        return new BankImportResponse(
                imp.getId(),
                imp.getAccount() != null ? imp.getAccount().getId() : null,
                imp.getAccount() != null ? imp.getAccount().getName() : null,
                imp.getFileName(),
                imp.getFileType(),
                imp.getTotalRecords(),
                imp.getImportedRecords(),
                imp.getSkippedRecords(),
                imp.getStatus(),
                imp.getErrorMessage(),
                imp.getCreatedAt(),
                items
        );
    }

    private BankImportItemResponse toItemResponse(BankImportItem item) {
        return new BankImportItemResponse(
                item.getId(),
                item.getDescription(),
                item.getAmount(),
                item.getTransactionDate(),
                item.getType(),
                item.getCategory() != null ? item.getCategory().getId() : null,
                item.getCategory() != null ? item.getCategory().getName() : null,
                item.getStatus(),
                item.getTransaction() != null ? item.getTransaction().getId() : null,
                item.getRawData()
        );
    }

    // ─── inner record ────────────────────────────────────────────────────────

    private record ParsedRow(String description, BigDecimal amount, LocalDate date, String raw) {}
}
