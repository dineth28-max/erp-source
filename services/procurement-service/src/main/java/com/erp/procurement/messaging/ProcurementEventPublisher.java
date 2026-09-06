package com.erp.procurement.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class ProcurementEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(ProcurementEventPublisher.class);

    private final KafkaTemplate<String, ProcurementEvent> kafkaTemplate;
    private final String topic;

    public ProcurementEventPublisher(KafkaTemplate<String, ProcurementEvent> kafkaTemplate,
                                      @Value("${app.kafka.topic.procurement-events}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    public void publish(ProcurementEvent event) {
        String key = event.purchaseOrderId().toString();
        kafkaTemplate.send(topic, key, event).whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish procurement event {} for PO {}: {}", event.eventType(), event.purchaseOrderId(), ex.getMessage(), ex);
            } else {
                log.debug("Published {} for PO {} at offset {}", event.eventType(), event.purchaseOrderId(),
                        result.getRecordMetadata().offset());
            }
        });
    }
}
