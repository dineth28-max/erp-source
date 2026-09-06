package com.erp.finance.messaging;

import com.erp.finance.service.LedgerService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
public class ProcurementEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(ProcurementEventConsumer.class);

    private final ObjectMapper objectMapper;
    private final LedgerService ledgerService;

    public ProcurementEventConsumer(ObjectMapper objectMapper, LedgerService ledgerService) {
        this.objectMapper = objectMapper;
        this.ledgerService = ledgerService;
    }

    @KafkaListener(topics = "${app.kafka.topic.procurement-events}")
    public void onMessage(String payload) {
        try {
            ProcurementEventDto event = objectMapper.readValue(payload, ProcurementEventDto.class);
            ledgerService.applyProcurementEvent(event);
        } catch (Exception e) {
            log.error("Failed to process procurement event, dropping: {}", payload, e);
        }
    }
}
