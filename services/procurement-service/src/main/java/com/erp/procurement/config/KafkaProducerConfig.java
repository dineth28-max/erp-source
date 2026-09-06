package com.erp.procurement.config;

import com.erp.procurement.messaging.ProcurementEvent;
import org.springframework.boot.autoconfigure.kafka.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;

@Configuration
public class KafkaProducerConfig {

    @Bean
    public ProducerFactory<String, ProcurementEvent> procurementProducerFactory(KafkaProperties kafkaProperties) {
        return new DefaultKafkaProducerFactory<>(kafkaProperties.buildProducerProperties(null));
    }

    @Bean
    public KafkaTemplate<String, ProcurementEvent> procurementKafkaTemplate(ProducerFactory<String, ProcurementEvent> producerFactory) {
        return new KafkaTemplate<>(producerFactory);
    }
}
