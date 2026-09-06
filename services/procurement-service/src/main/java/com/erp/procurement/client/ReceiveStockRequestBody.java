package com.erp.procurement.client;

import java.math.BigDecimal;
import java.util.UUID;

public record ReceiveStockRequestBody(UUID itemId, BigDecimal quantity, String referenceId) {
}
