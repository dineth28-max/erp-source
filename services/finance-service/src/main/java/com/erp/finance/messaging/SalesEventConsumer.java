package com.erp.finance.messaging;

import com.erp.finance.service.LedgerService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class SalesEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(SalesEventConsumer.class);

    private final ObjectMapper objectMapper;
    private final LedgerService ledgerService;

    public SalesEventConsumer(ObjectMapper objectMapper, LedgerService ledgerService) {
        this.objectMapper = objectMapper;
        this.ledgerService = ledgerService;
    }

    @KafkaListener(topics = "${app.kafka.topic.sales-events}")
    public void onMessage(String payload) {
        try {
            SalesEventDto event = objectMapper.readValue(payload, SalesEventDto.class);
            ledgerService.applySalesEvent(event);
        } catch (Exception e) {
            log.error("Failed to process sales event, dropping: {}", payload, e);
        }
    }
}
