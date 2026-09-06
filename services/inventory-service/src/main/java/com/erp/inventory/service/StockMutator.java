package com.erp.inventory.service;

import com.erp.inventory.config.TenantContext;
import com.erp.inventory.domain.ReservationStatus;
import com.erp.inventory.domain.StockLevel;
import com.erp.inventory.domain.StockReservation;
import com.erp.inventory.domain.Warehouse;
import com.erp.inventory.messaging.InventoryEvent;
import com.erp.inventory.messaging.InventoryEventPublisher;
import com.erp.inventory.domain.StockReceipt;
import com.erp.inventory.repository.StockLevelRepository;
import com.erp.inventory.repository.StockReceiptRepository;
import com.erp.inventory.repository.StockReservationRepository;
import com.erp.inventory.repository.WarehouseRepository;
import com.erp.inventory.web.dto.ReserveStockRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Holds the actual transactional stock mutations, kept in a separate bean from
 * {@link InventoryService} so its retry loop calls through the Spring proxy
 * (self-invocation of an @Transactional method on the same bean is silently
 * ignored by Spring AOP, which would otherwise make the retry-on-optimistic-lock
 * logic in InventoryService non-transactional and pointless).
 *
 * reserveOnce/releaseOnce are idempotent per (tenantId, itemId, referenceId):
 * a caller (sales-service, via Resilience4j Retry) may see a timeout even
 * though the request actually succeeded server-side, and will retry with the
 * same referenceId. Without the stock_reservations ledger that retry would
 * double-reserve/double-release; with it, a replay is a no-op.
 */
@Service
public class StockMutator {

    private static final Logger log = LoggerFactory.getLogger(StockMutator.class);
    private static final String DEFAULT_WAREHOUSE_CODE = "MAIN";

    private final WarehouseRepository warehouseRepository;
    private final StockLevelRepository stockLevelRepository;
    private final StockReservationRepository stockReservationRepository;
    private final StockReceiptRepository stockReceiptRepository;
    private final InventoryEventPublisher eventPublisher;

    public StockMutator(WarehouseRepository warehouseRepository, StockLevelRepository stockLevelRepository,
                         StockReservationRepository stockReservationRepository, StockReceiptRepository stockReceiptRepository,
                         InventoryEventPublisher eventPublisher) {
        this.warehouseRepository = warehouseRepository;
        this.stockLevelRepository = stockLevelRepository;
        this.stockReservationRepository = stockReservationRepository;
        this.stockReceiptRepository = stockReceiptRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public StockLevel reserveOnce(ReserveStockRequest request) {
        UUID tenantId = TenantContext.get().tenantId();

        Optional<StockReservation> existing = stockReservationRepository
                .findByTenantIdAndItemIdAndReferenceId(tenantId, request.itemId(), request.referenceId());
        if (existing.isPresent()) {
            log.info("Replayed reservation for referenceId {} on item {} - returning current stock unchanged",
                    request.referenceId(), request.itemId());
            return currentStock(tenantId, request.itemId());
        }

        Warehouse warehouse = defaultWarehouse(tenantId);
        StockLevel stock = stockLevelRepository.findByTenantIdAndItemIdAndWarehouseId(tenantId, request.itemId(), warehouse.getId())
                .orElseThrow(() -> new InventoryException(HttpStatus.NOT_FOUND, "No stock record for item: " + request.itemId()));

        if (stock.quantityAvailable().compareTo(request.quantity()) < 0) {
            eventPublisher.publish(InventoryEvent.reservationFailed(tenantId, request.itemId(), warehouse.getId(),
                    request.referenceId(), request.quantity(), "Insufficient available stock"));
            throw new InventoryException(HttpStatus.CONFLICT, "Insufficient available stock for item: " + request.itemId());
        }

        stock.setQuantityReserved(stock.getQuantityReserved().add(request.quantity()));
        StockLevel saved = stockLevelRepository.save(stock);

        StockReservation reservation = new StockReservation();
        reservation.setTenantId(tenantId);
        reservation.setItemId(request.itemId());
        reservation.setReferenceId(request.referenceId());
        reservation.setQuantity(request.quantity());
        reservation.setStatus(ReservationStatus.RESERVED);
        stockReservationRepository.save(reservation);

        eventPublisher.publish(InventoryEvent.reserved(tenantId, request.itemId(), warehouse.getId(), request.referenceId(), request.quantity()));
        return saved;
    }

    @Transactional
    public StockLevel releaseOnce(ReserveStockRequest request) {
        UUID tenantId = TenantContext.get().tenantId();

        Optional<StockReservation> existing = stockReservationRepository
                .findByTenantIdAndItemIdAndReferenceId(tenantId, request.itemId(), request.referenceId());

        if (existing.isEmpty() || existing.get().getStatus() == ReservationStatus.RELEASED) {
            log.info("No-op release for referenceId {} on item {} (nothing reserved or already released)",
                    request.referenceId(), request.itemId());
            return currentStock(tenantId, request.itemId());
        }

        StockReservation reservation = existing.get();
        Warehouse warehouse = defaultWarehouse(tenantId);
        StockLevel stock = stockLevelRepository.findByTenantIdAndItemIdAndWarehouseId(tenantId, request.itemId(), warehouse.getId())
                .orElseThrow(() -> new InventoryException(HttpStatus.NOT_FOUND, "No stock record for item: " + request.itemId()));

        // Release exactly what this reservation recorded, not the caller-supplied
        // quantity, so a mismatched replay can't under/over-release.
        stock.setQuantityReserved(stock.getQuantityReserved().subtract(reservation.getQuantity()).max(java.math.BigDecimal.ZERO));
        StockLevel saved = stockLevelRepository.save(stock);

        reservation.setStatus(ReservationStatus.RELEASED);
        stockReservationRepository.save(reservation);

        eventPublisher.publish(InventoryEvent.released(tenantId, request.itemId(), warehouse.getId(), request.referenceId(), reservation.getQuantity()));
        return saved;
    }

    /**
     * Adds received quantity to on-hand stock - the procurement-side counterpart
     * to reserve/release, called when a purchase order is marked received.
     * Idempotent per (tenantId, itemId, referenceId) via stock_receipts, same
     * reasoning as reserveOnce/releaseOnce.
     */
    @Transactional
    public StockLevel receiveOnce(ReserveStockRequest request) {
        UUID tenantId = TenantContext.get().tenantId();

        Optional<StockReceipt> existing = stockReceiptRepository
                .findByTenantIdAndItemIdAndReferenceId(tenantId, request.itemId(), request.referenceId());
        if (existing.isPresent()) {
            log.info("Replayed receipt for referenceId {} on item {} - returning current stock unchanged",
                    request.referenceId(), request.itemId());
            return currentStock(tenantId, request.itemId());
        }

        Warehouse warehouse = defaultWarehouse(tenantId);
        StockLevel stock = stockLevelRepository.findByTenantIdAndItemIdAndWarehouseId(tenantId, request.itemId(), warehouse.getId())
                .orElseThrow(() -> new InventoryException(HttpStatus.NOT_FOUND, "No stock record for item: " + request.itemId()));

        stock.setQuantityOnHand(stock.getQuantityOnHand().add(request.quantity()));
        StockLevel saved = stockLevelRepository.save(stock);

        StockReceipt receipt = new StockReceipt();
        receipt.setTenantId(tenantId);
        receipt.setItemId(request.itemId());
        receipt.setReferenceId(request.referenceId());
        receipt.setQuantity(request.quantity());
        stockReceiptRepository.save(receipt);

        eventPublisher.publish(InventoryEvent.received(tenantId, request.itemId(), warehouse.getId(), request.referenceId(), request.quantity()));
        return saved;
    }

    private StockLevel currentStock(UUID tenantId, UUID itemId) {
        Warehouse warehouse = defaultWarehouse(tenantId);
        return stockLevelRepository.findByTenantIdAndItemIdAndWarehouseId(tenantId, itemId, warehouse.getId())
                .orElseThrow(() -> new InventoryException(HttpStatus.NOT_FOUND, "No stock record for item: " + itemId));
    }

    Warehouse defaultWarehouse(UUID tenantId) {
        return warehouseRepository.findByTenantIdAndCode(tenantId, DEFAULT_WAREHOUSE_CODE)
                .orElseThrow(() -> new InventoryException(HttpStatus.INTERNAL_SERVER_ERROR, "Default warehouse not configured for tenant"));
    }
}
