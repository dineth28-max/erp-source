package com.erp.finance.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** Same idempotency guard as reporting-service's ProcessedEvent - see that Javadoc. */
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
