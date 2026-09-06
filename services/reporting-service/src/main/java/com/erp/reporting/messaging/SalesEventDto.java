package com.erp.reporting.messaging;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Local mirror of sales-service's SalesEvent record, matched by JSON field
 * shape rather than Java type identity. Cross-service Kafka consumption can't
 * share the producer's class (different Maven artifacts, different
 * packages) - deserializing the raw JSON into this service's own DTO with
 * matching field names is the normal pattern; see application.yml's
 * consumer config for why the value-deserializer is a plain StringDeserializer
 * rather than Spring Kafka's type-header-based JsonDeserializer.
 */
public record SalesEventDto(
        String eventType,
        UUID tenantId,
        UUID orderId,
        UUID customerId,
        BigDecimal totalAmount,
        String reason,
        Instant occurredAt
) {
}
