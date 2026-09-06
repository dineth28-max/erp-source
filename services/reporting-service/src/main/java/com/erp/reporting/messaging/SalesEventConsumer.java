package com.erp.reporting.messaging;

import com.erp.reporting.service.ReportingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class SalesEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(SalesEventConsumer.class);

    private final ObjectMapper objectMapper;
    private final ReportingService reportingService;

    public SalesEventConsumer(ObjectMapper objectMapper, ReportingService reportingService) {
        this.objectMapper = objectMapper;
        this.reportingService = reportingService;
    }

    @KafkaListener(topics = "${app.kafka.topic.sales-events}")
    public void onMessage(String payload) {
        try {
            SalesEventDto event = objectMapper.readValue(payload, SalesEventDto.class);
            reportingService.applySalesEvent(event);
        } catch (Exception e) {
            // Logged and dropped rather than retried/DLQ'd - a real deployment
            // would route this to a dead-letter topic for replay; out of scope
            // for this reference implementation, but a real gap, not an oversight.
            log.error("Failed to process sales event, dropping: {}", payload, e);
        }
    }
}
