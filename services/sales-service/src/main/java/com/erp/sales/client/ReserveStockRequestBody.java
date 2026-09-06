package com.erp.sales.client;

import java.math.BigDecimal;
import java.util.UUID;

public record ReserveStockRequestBody(UUID itemId, BigDecimal quantity, String referenceId) {
}
