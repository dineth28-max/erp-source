package com.erp.masterdata.web;

import com.erp.masterdata.service.PriceService;
import com.erp.masterdata.web.dto.PriceResponse;
import com.erp.masterdata.web.dto.SetPriceRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/prices")
public class PriceController {

    private final PriceService priceService;

    public PriceController(PriceService priceService) {
        this.priceService = priceService;
    }

    @PostMapping
    public ResponseEntity<PriceResponse> setPrice(@Valid @RequestBody SetPriceRequest request) {
        return ResponseEntity.ok(PriceResponse.from(priceService.setPrice(request)));
    }

    @GetMapping("/{itemId}")
    public ResponseEntity<PriceResponse> getPrice(@PathVariable UUID itemId) {
        return ResponseEntity.ok(PriceResponse.from(priceService.getPrice(itemId)));
    }
}
