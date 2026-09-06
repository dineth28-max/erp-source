package com.erp.reporting.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Marks a Kafka record as already applied to revenue_summary. Kafka delivers
 * at-least-once - a consumer-group rebalance can redeliver a record whose
 * offset was processed but not yet committed. Without this table a redelivery
 * would double-count revenue; the unique key on event_key makes applying the
 * same event twice a no-op instead of an error or a silent double-count.
 */
@Entity
@Table(name = "processed_events")
@Getter
@Setter
@NoArgsConstructor
public class ProcessedEvent {

    @Id
    @Column(name = "event_key", length = 300)
    private String eventKey;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    public ProcessedEvent(String eventKey) {
        this.eventKey = eventKey;
        this.processedAt = Instant.now();
    }
}
