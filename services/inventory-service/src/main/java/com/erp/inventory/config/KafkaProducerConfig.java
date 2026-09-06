package com.erp.inventory.config;

import com.erp.inventory.messaging.InventoryEvent;
import org.springframework.boot.autoconfigure.kafka.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;

@Configuration
public class KafkaProducerConfig {

    @Bean
    public ProducerFactory<String, InventoryEvent> inventoryProducerFactory(KafkaProperties kafkaProperties) {
        return new DefaultKafkaProducerFactory<>(kafkaProperties.buildProducerProperties(null));
    }

    @Bean
    public KafkaTemplate<String, InventoryEvent> inventoryKafkaTemplate(ProducerFactory<String, InventoryEvent> producerFactory) {
        return new KafkaTemplate<>(producerFactory);
    }
}
