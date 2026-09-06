package com.erp.sales.service;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * A requested order line after its price has been resolved from
 * master-data-service. Everything downstream of price resolution (stock
 * reservation, compensation, order persistence) works off this instead of
 * the raw CreateOrderLineRequest.
 */
record ResolvedOrderLine(UUID itemId, BigDecimal quantity, BigDecimal unitPrice) {
}
