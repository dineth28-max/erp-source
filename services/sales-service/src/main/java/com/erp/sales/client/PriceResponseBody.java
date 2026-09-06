package com.erp.sales.client;

import java.math.BigDecimal;
import java.util.UUID;

public record PriceResponseBody(UUID itemId, BigDecimal unitPrice) {
}
