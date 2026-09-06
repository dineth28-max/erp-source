package com.erp.reporting.messaging;

import com.erp.reporting.service.ReportingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class InventoryEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(InventoryEventConsumer.class);

    private final ObjectMapper objectMapper;
    private final ReportingService reportingService;

    public InventoryEventConsumer(ObjectMapper objectMapper, ReportingService reportingService) {
        this.objectMapper = objectMapper;
        this.reportingService = reportingService;
    }

    @KafkaListener(topics = "${app.kafka.topic.inventory-events}")
    public void onMessage(String payload) {
        try {
            InventoryEventDto event = objectMapper.readValue(payload, InventoryEventDto.class);
            reportingService.logInventoryEvent(event);
        } catch (Exception e) {
            log.error("Failed to process inventory event, dropping: {}", payload, e);
        }
    }
}
