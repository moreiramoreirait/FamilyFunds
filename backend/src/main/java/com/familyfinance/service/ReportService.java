package com.familyfinance.service;

import com.familyfinance.entity.Transaction;
import com.familyfinance.entity.TransactionStatus;
import com.familyfinance.entity.TransactionType;
import com.familyfinance.repository.TransactionRepository;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.DocumentException;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final TransactionRepository transactionRepository;

    private static final String[] MONTH_NAMES =
        {"Janeiro","Fevereiro","Março","Abril","Maio","Junho",
         "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"};

    // ─── Excel ────────────────────────────────────────────────────────────────

    public byte[] generateCashFlowExcel(UUID familyGroupId, int year) throws Exception {
        List<MonthSummary> months = buildMonthSummaries(familyGroupId, year);

        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = wb.createSheet("Fluxo de Caixa " + year);
            sheet.setColumnWidth(0, 5000);
            sheet.setColumnWidth(1, 5000);
            sheet.setColumnWidth(2, 5000);
            sheet.setColumnWidth(3, 5000);

            CellStyle headerStyle = createHeaderStyle(wb);
            CellStyle currencyStyle = createCurrencyStyle(wb);
            CellStyle totalStyle = createTotalStyle(wb);

            // Title
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Fluxo de Caixa — " + year);
            titleCell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 3));

            // Headers
            Row hRow = sheet.createRow(1);
            String[] headers = {"Mês", "Receitas", "Despesas", "Resultado"};
            for (int i = 0; i < headers.length; i++) {
                Cell c = hRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(headerStyle);
            }

            // Data rows
            BigDecimal totalIncome = BigDecimal.ZERO;
            BigDecimal totalExpense = BigDecimal.ZERO;
            for (int i = 0; i < months.size(); i++) {
                MonthSummary m = months.get(i);
                Row row = sheet.createRow(i + 2);
                row.createCell(0).setCellValue(m.name());
                Cell incCell = row.createCell(1);
                incCell.setCellValue(m.income().doubleValue());
                incCell.setCellStyle(currencyStyle);
                Cell expCell = row.createCell(2);
                expCell.setCellValue(m.expense().doubleValue());
                expCell.setCellStyle(currencyStyle);
                Cell resCell = row.createCell(3);
                resCell.setCellValue(m.balance().doubleValue());
                resCell.setCellStyle(currencyStyle);
                totalIncome = totalIncome.add(m.income());
                totalExpense = totalExpense.add(m.expense());
            }

            // Totals
            Row totRow = sheet.createRow(months.size() + 2);
            Cell totLabel = totRow.createCell(0);
            totLabel.setCellValue("TOTAL");
            totLabel.setCellStyle(totalStyle);
            Cell totInc = totRow.createCell(1);
            totInc.setCellValue(totalIncome.doubleValue());
            totInc.setCellStyle(totalStyle);
            Cell totExp = totRow.createCell(2);
            totExp.setCellValue(totalExpense.doubleValue());
            totExp.setCellStyle(totalStyle);
            Cell totBal = totRow.createCell(3);
            totBal.setCellValue(totalIncome.subtract(totalExpense).doubleValue());
            totBal.setCellStyle(totalStyle);

            wb.write(out);
            return out.toByteArray();
        }
    }

    public byte[] generateCategoryExcel(UUID familyGroupId, int year) throws Exception {
        List<CategorySummary> categories = buildCategorySummaries(familyGroupId, year);

        try (XSSFWorkbook wb = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = wb.createSheet("Gastos por Categoria " + year);
            sheet.setColumnWidth(0, 8000);
            sheet.setColumnWidth(1, 5000);
            sheet.setColumnWidth(2, 4000);

            CellStyle headerStyle = createHeaderStyle(wb);
            CellStyle currencyStyle = createCurrencyStyle(wb);
            CellStyle totalStyle = createTotalStyle(wb);

            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("Gastos por Categoria — " + year);
            titleCell.setCellStyle(headerStyle);
            sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 2));

            Row hRow = sheet.createRow(1);
            String[] headers = {"Categoria", "Total", "% do gasto"};
            for (int i = 0; i < headers.length; i++) {
                Cell c = hRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(headerStyle);
            }

            BigDecimal grandTotal = categories.stream()
                    .map(CategorySummary::amount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            for (int i = 0; i < categories.size(); i++) {
                CategorySummary cat = categories.get(i);
                Row row = sheet.createRow(i + 2);
                row.createCell(0).setCellValue(cat.name());
                Cell amtCell = row.createCell(1);
                amtCell.setCellValue(cat.amount().doubleValue());
                amtCell.setCellStyle(currencyStyle);
                double pct = grandTotal.compareTo(BigDecimal.ZERO) == 0 ? 0
                        : cat.amount().doubleValue() / grandTotal.doubleValue() * 100;
                row.createCell(2).setCellValue(String.format("%.1f%%", pct));
            }

            Row totRow = sheet.createRow(categories.size() + 2);
            Cell totLabel = totRow.createCell(0);
            totLabel.setCellValue("TOTAL");
            totLabel.setCellStyle(totalStyle);
            Cell totAmt = totRow.createCell(1);
            totAmt.setCellValue(grandTotal.doubleValue());
            totAmt.setCellStyle(totalStyle);

            wb.write(out);
            return out.toByteArray();
        }
    }

    // ─── PDF ──────────────────────────────────────────────────────────────────

    public byte[] generateCashFlowPdf(UUID familyGroupId, int year) throws Exception {
        List<MonthSummary> months = buildMonthSummaries(familyGroupId, year);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 40, 40, 60, 40);
            PdfWriter.getInstance(doc, out);
            doc.open();

            addPdfTitle(doc, "Fluxo de Caixa — " + year);

            PdfPTable table = new PdfPTable(4);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{3f, 2.5f, 2.5f, 2.5f});
            table.setSpacingBefore(12f);

            for (String h : new String[]{"Mês","Receitas","Despesas","Resultado"}) {
                addPdfHeader(table, h);
            }

            BigDecimal totalIncome = BigDecimal.ZERO;
            BigDecimal totalExpense = BigDecimal.ZERO;
            boolean odd = false;
            for (MonthSummary m : months) {
                Color bg = odd ? new Color(248, 248, 250) : Color.WHITE;
                addPdfCell(table, m.name(), bg, Element.ALIGN_LEFT);
                addPdfCell(table, formatBRL(m.income()), bg, Element.ALIGN_RIGHT);
                addPdfCell(table, formatBRL(m.expense()), bg, Element.ALIGN_RIGHT);
                Color balColor = m.balance().compareTo(BigDecimal.ZERO) >= 0 ? new Color(21, 128, 61) : new Color(185, 28, 28);
                PdfPCell balCell = new PdfPCell(new Phrase(formatBRL(m.balance()), FontFactory.getFont(FontFactory.HELVETICA, 9, balColor)));
                balCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                balCell.setBackgroundColor(bg);
                balCell.setPadding(6);
                balCell.setBorder(Rectangle.NO_BORDER);
                table.addCell(balCell);
                totalIncome = totalIncome.add(m.income());
                totalExpense = totalExpense.add(m.expense());
                odd = !odd;
            }

            // Total row
            com.lowagie.text.Font totalFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
            Color totalBg = new Color(229, 231, 235);
            for (String v : new String[]{"TOTAL", formatBRL(totalIncome), formatBRL(totalExpense), formatBRL(totalIncome.subtract(totalExpense))}) {
                PdfPCell c = new PdfPCell(new Phrase(v, totalFont));
                c.setBackgroundColor(totalBg);
                c.setPadding(6);
                c.setBorder(Rectangle.NO_BORDER);
                c.setHorizontalAlignment(v.equals("TOTAL") ? Element.ALIGN_LEFT : Element.ALIGN_RIGHT);
                table.addCell(c);
            }

            doc.add(table);
            doc.close();
            return out.toByteArray();
        }
    }

    public byte[] generateCategoryPdf(UUID familyGroupId, int year) throws Exception {
        List<CategorySummary> categories = buildCategorySummaries(familyGroupId, year);

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 40, 40, 60, 40);
            PdfWriter.getInstance(doc, out);
            doc.open();

            addPdfTitle(doc, "Gastos por Categoria — " + year);

            BigDecimal grandTotal = categories.stream()
                    .map(CategorySummary::amount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            PdfPTable table = new PdfPTable(3);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{4f, 2.5f, 2f});
            table.setSpacingBefore(12f);

            for (String h : new String[]{"Categoria","Total","% do gasto"}) {
                addPdfHeader(table, h);
            }

            boolean odd = false;
            for (CategorySummary cat : categories) {
                Color bg = odd ? new Color(248, 248, 250) : Color.WHITE;
                addPdfCell(table, cat.name() != null ? cat.name() : "Sem categoria", bg, Element.ALIGN_LEFT);
                addPdfCell(table, formatBRL(cat.amount()), bg, Element.ALIGN_RIGHT);
                double pct = grandTotal.compareTo(BigDecimal.ZERO) == 0 ? 0
                        : cat.amount().doubleValue() / grandTotal.doubleValue() * 100;
                addPdfCell(table, String.format("%.1f%%", pct), bg, Element.ALIGN_RIGHT);
                odd = !odd;
            }

            com.lowagie.text.Font totalFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
            Color totalBg = new Color(229, 231, 235);
            addPdfBoldCell(table, "TOTAL", totalBg, Element.ALIGN_LEFT, totalFont);
            addPdfBoldCell(table, formatBRL(grandTotal), totalBg, Element.ALIGN_RIGHT, totalFont);
            addPdfBoldCell(table, "100%", totalBg, Element.ALIGN_RIGHT, totalFont);

            doc.add(table);
            doc.close();
            return out.toByteArray();
        }
    }

    // ─── Data builders ────────────────────────────────────────────────────────

    private List<MonthSummary> buildMonthSummaries(UUID familyGroupId, int year) {
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = LocalDate.of(year, 12, 31);
        List<Transaction> txs = transactionRepository
                .findByFamilyGroupIdAndTransactionDateBetweenAndStatus(familyGroupId, start, end, TransactionStatus.PAID);

        Map<Integer, BigDecimal> income = new HashMap<>();
        Map<Integer, BigDecimal> expense = new HashMap<>();
        for (Transaction t : txs) {
            int month = t.getTransactionDate().getMonthValue();
            if (t.getType() == TransactionType.INCOME) {
                income.merge(month, t.getAmount(), BigDecimal::add);
            } else if (t.getType() == TransactionType.EXPENSE) {
                expense.merge(month, t.getAmount(), BigDecimal::add);
            }
        }

        List<MonthSummary> result = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            BigDecimal inc = income.getOrDefault(m, BigDecimal.ZERO);
            BigDecimal exp = expense.getOrDefault(m, BigDecimal.ZERO);
            result.add(new MonthSummary(MONTH_NAMES[m - 1], inc, exp, inc.subtract(exp)));
        }
        return result;
    }

    private List<CategorySummary> buildCategorySummaries(UUID familyGroupId, int year) {
        LocalDate start = LocalDate.of(year, 1, 1);
        LocalDate end = LocalDate.of(year, 12, 31);
        List<Transaction> txs = transactionRepository
                .findByFamilyGroupIdAndTransactionDateBetweenAndStatus(familyGroupId, start, end, TransactionStatus.PAID);

        return txs.stream()
                .filter(t -> t.getType() == TransactionType.EXPENSE)
                .collect(Collectors.groupingBy(
                        t -> t.getCategory() != null ? t.getCategory().getName() : "Sem categoria",
                        Collectors.reducing(BigDecimal.ZERO, Transaction::getAmount, BigDecimal::add)))
                .entrySet().stream()
                .map(e -> new CategorySummary(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(CategorySummary::amount).reversed())
                .toList();
    }

    // ─── Excel helpers ────────────────────────────────────────────────────────

    private CellStyle createHeaderStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        org.apache.poi.ss.usermodel.Font font = wb.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setBorderBottom(BorderStyle.THIN);
        return style;
    }

    private CellStyle createCurrencyStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        DataFormat fmt = wb.createDataFormat();
        style.setDataFormat(fmt.getFormat("R$ #,##0.00"));
        style.setAlignment(HorizontalAlignment.RIGHT);
        return style;
    }

    private CellStyle createTotalStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        org.apache.poi.ss.usermodel.Font font = wb.createFont();
        font.setBold(true);
        style.setFont(font);
        DataFormat fmt = wb.createDataFormat();
        style.setDataFormat(fmt.getFormat("R$ #,##0.00"));
        style.setAlignment(HorizontalAlignment.RIGHT);
        style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setBorderTop(BorderStyle.THIN);
        return style;
    }

    // ─── PDF helpers ──────────────────────────────────────────────────────────

    private void addPdfTitle(Document doc, String title) throws DocumentException {
        com.lowagie.text.Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, new Color(30, 41, 59));
        Paragraph p = new Paragraph(title, titleFont);
        p.setAlignment(Element.ALIGN_CENTER);
        p.setSpacingAfter(4f);
        doc.add(p);
        com.lowagie.text.Font sub = FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(100, 116, 139));
        Paragraph subp = new Paragraph("FamilyFunds — gerado automaticamente", sub);
        subp.setAlignment(Element.ALIGN_CENTER);
        doc.add(subp);
    }

    private void addPdfHeader(PdfPTable table, String text) {
        com.lowagie.text.Font font = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(new Color(30, 41, 59));
        cell.setPadding(7);
        cell.setBorder(Rectangle.NO_BORDER);
        table.addCell(cell);
    }

    private void addPdfCell(PdfPTable table, String text, Color bg, int align) {
        com.lowagie.text.Font font = FontFactory.getFont(FontFactory.HELVETICA, 9);
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(align);
        cell.setPadding(6);
        cell.setBorder(Rectangle.NO_BORDER);
        table.addCell(cell);
    }

    private void addPdfBoldCell(PdfPTable table, String text, Color bg, int align, com.lowagie.text.Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(align);
        cell.setPadding(6);
        cell.setBorder(Rectangle.NO_BORDER);
        table.addCell(cell);
    }

    private String formatBRL(BigDecimal value) {
        return String.format("R$ %,.2f", value);
    }

    // ─── Inner records ────────────────────────────────────────────────────────

    record MonthSummary(String name, BigDecimal income, BigDecimal expense, BigDecimal balance) {}
    record CategorySummary(String name, BigDecimal amount) {}
}
