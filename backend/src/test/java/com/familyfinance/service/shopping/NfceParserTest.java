package com.familyfinance.service.shopping;

import com.familyfinance.entity.ExtractionStatus;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class NfceParserTest {

    // HTML simplificado no layout comum (SP e similares)
    private static final String HTML_OK = """
        <html><body>
          <div class="txtTopo">SUPERMERCADO TESTE LTDA</div>
          <div>CNPJ: 12.345.678/0001-90</div>
          <table id="tabResult">
            <tr>
              <td><span class="txtTit">LEITE INTEGRAL 1L</span>
                  <span class="Rqtd">Qtde.: 2</span>
                  <span class="RUN">UN: UN</span>
                  <span class="RvlUnit">Vl. Unit.:  5,50</span></td>
              <td class="valor">11,00</td>
            </tr>
            <tr>
              <td><span class="txtTit">CAFE PILAO 500G</span>
                  <span class="Rqtd">Qtde.: 1</span>
                  <span class="RvlUnit">Vl. Unit.:  18,90</span></td>
              <td class="valor">18,90</td>
            </tr>
          </table>
          <div id="linhaTotal"><span class="totalNumb">29,90</span></div>
          <div class="chave">3525 0612 3456 7800 0190 6500 1000 0000 0712 3456 7890</div>
        </body></html>
        """;

    @Test
    void parsesStoreCnpjTotalAndItems_success() {
        var r = NfceParser.parse(HTML_OK, "https://nfce.fazenda.sp.gov.br/qrcode?p=35250612345678000190650010000000071234567890|2|1|1|abc");

        assertThat(r.status()).isEqualTo(ExtractionStatus.IMPORTADO_COM_SUCESSO);
        assertThat(r.storeName()).isEqualTo("SUPERMERCADO TESTE LTDA");
        assertThat(r.cnpj()).isEqualTo("12.345.678/0001-90");
        assertThat(r.total()).isEqualByComparingTo("29.90");
        assertThat(r.items()).hasSize(2);
        assertThat(r.items().get(0).name()).isEqualTo("LEITE INTEGRAL 1L");
        assertThat(r.items().get(0).quantity()).isEqualByComparingTo("2");
        assertThat(r.items().get(0).unitPrice()).isEqualByComparingTo("5.50");
        assertThat(r.items().get(0).totalPrice()).isEqualByComparingTo("11.00");
    }

    @Test
    void unrecognizedLayout_isPartialOrFail() {
        var r = NfceParser.parse("<html><body><p>Página sem estrutura conhecida</p></body></html>", "http://x/y");
        assertThat(r.status()).isIn(ExtractionStatus.IMPORTADO_PARCIALMENTE, ExtractionStatus.FALHA_NA_IMPORTACAO);
        assertThat(r.items()).isEmpty();
    }

    @Test
    void emptyHtml_isFailure() {
        var r = NfceParser.parse("", "http://x/y");
        assertThat(r.status()).isEqualTo(ExtractionStatus.FALHA_NA_IMPORTACAO);
    }

    @Test
    void accessKeyExtractedFromUrl() {
        String key = NfceParser.accessKeyFromUrl("https://nfce.x/qr?p=35250612345678000190650010000000071234567890|2|1");
        assertThat(key).isEqualTo("35250612345678000190650010000000071234567890");
    }

    @Test
    void moneyParsesBrazilianFormat() {
        assertThat(NfceParser.money("1.234,56")).isEqualByComparingTo("1234.56");
        assertThat(NfceParser.money("R$ 5,50")).isEqualByComparingTo("5.50");
        assertThat(NfceParser.money("abc")).isNull();
    }
}
