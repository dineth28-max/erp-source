package com.erp.inventory.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class InventoryEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(InventoryEventPublisher.class);

    private final KafkaTemplate<String, InventoryEvent> kafkaTemplate;
    private final String topic;

    public InventoryEventPublisher(KafkaTemplate<String, InventoryEvent> kafkaTemplate,
                                    @Value("${app.kafka.topic.inventory-events}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    public void publish(InventoryEvent event) {
        String key = event.itemId().toString();
        kafkaTemplate.send(topic, key, event).whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish inventory event {} for item {}: {}", event.eventType(), event.itemId(), ex.getMessage(), ex);
            } else {
                log.debug("Published {} for item {} at offset {}", event.eventType(), event.itemId(),
                        result.getRecordMetadata().offset());
            }
        });
    }
}
