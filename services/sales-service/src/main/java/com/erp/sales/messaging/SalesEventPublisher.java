package com.erp.sales.messaging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
public class SalesEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(SalesEventPublisher.class);

    private final KafkaTemplate<String, SalesEvent> kafkaTemplate;
    private final String topic;

    public SalesEventPublisher(KafkaTemplate<String, SalesEvent> kafkaTemplate,
                                @Value("${app.kafka.topic.sales-events}") String topic) {
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
    }

    public void publish(SalesEvent event) {
        String key = event.orderId().toString();
        kafkaTemplate.send(topic, key, event).whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Failed to publish sales event {} for order {}: {}", event.eventType(), event.orderId(), ex.getMessage(), ex);
            } else {
                log.debug("Published {} for order {} at offset {}", event.eventType(), event.orderId(),
                        result.getRecordMetadata().offset());
            }
        });
    }
}
