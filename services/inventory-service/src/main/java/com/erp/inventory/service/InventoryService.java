package com.erp.inventory.service;

import com.erp.inventory.config.TenantContext;
import com.erp.inventory.domain.Item;
import com.erp.inventory.domain.StockLevel;
import com.erp.inventory.domain.Warehouse;
import com.erp.inventory.repository.ItemRepository;
import com.erp.inventory.repository.StockLevelRepository;
import com.erp.inventory.web.dto.CreateItemRequest;
import com.erp.inventory.web.dto.ReserveStockRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class InventoryService {

    private static final int MAX_RETRIES = 3;

    private final ItemRepository itemRepository;
    private final StockLevelRepository stockLevelRepository;
    private final StockMutator stockMutator;

    public InventoryService(ItemRepository itemRepository, StockLevelRepository stockLevelRepository, StockMutator stockMutator) {
        this.itemRepository = itemRepository;
        this.stockLevelRepository = stockLevelRepository;
        this.stockMutator = stockMutator;
    }

    @Transactional
    public Item createItem(CreateItemRequest request) {
        UUID tenantId = TenantContext.get().tenantId();
        if (itemRepository.existsByTenantIdAndSku(tenantId, request.sku())) {
            throw new InventoryException(HttpStatus.CONFLICT, "SKU already exists: " + request.sku());
        }
        Item item = new Item();
        item.setTenantId(tenantId);
        item.setSku(request.sku());
        item.setName(request.name());
        item.setDescription(request.description());
        Item saved = itemRepository.save(item);

        // Every item needs a StockLevel row in the default warehouse or a later
        // /stock/reserve call 404s with "no stock record" instead of a clean
        // "insufficient stock" - starting at zero is correct (nothing has been
        // received into the warehouse yet). Quantity gets added via
        // /stock/receive, called by procurement-service when a PO is received.
        Warehouse warehouse = stockMutator.defaultWarehouse(tenantId);
        StockLevel stock = new StockLevel();
        stock.setTenantId(tenantId);
        stock.setItemId(saved.getId());
        stock.setWarehouseId(warehouse.getId());
        stock.setQuantityOnHand(java.math.BigDecimal.ZERO);
        stock.setQuantityReserved(java.math.BigDecimal.ZERO);
        stockLevelRepository.save(stock);

        return saved;
    }

    @Transactional(readOnly = true)
    public Page<Item> listItems(Pageable pageable) {
        UUID tenantId = TenantContext.get().tenantId();
        return itemRepository.findByTenantId(tenantId, pageable);
    }

    @Transactional(readOnly = true)
    public Item getItem(UUID itemId) {
        UUID tenantId = TenantContext.get().tenantId();
        return itemRepository.findByIdAndTenantId(itemId, tenantId)
                .orElseThrow(() -> new InventoryException(HttpStatus.NOT_FOUND, "Item not found: " + itemId));
    }

    @Transactional(readOnly = true)
    public StockLevel getStock(UUID itemId) {
        UUID tenantId = TenantContext.get().tenantId();
        Warehouse warehouse = stockMutator.defaultWarehouse(tenantId);
        return stockLevelRepository.findByTenantIdAndItemIdAndWarehouseId(tenantId, itemId, warehouse.getId())
                .orElseThrow(() -> new InventoryException(HttpStatus.NOT_FOUND, "No stock record for item: " + itemId));
    }

    /**
     * Retries on optimistic-lock conflicts because at high concurrency (many
     * checkouts hitting the same hot SKU) losing the version race is expected,
     * not exceptional - it is a transient condition, not a business failure.
     */
    public StockLevel reserve(ReserveStockRequest request) {
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                return stockMutator.reserveOnce(request);
            } catch (ObjectOptimisticLockingFailureException e) {
                if (attempt == MAX_RETRIES) {
                    throw new InventoryException(HttpStatus.CONFLICT, "Could not reserve stock due to high contention, please retry");
                }
            }
        }
        throw new IllegalStateException("unreachable");
    }

    public StockLevel release(ReserveStockRequest request) {
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                return stockMutator.releaseOnce(request);
            } catch (ObjectOptimisticLockingFailureException e) {
                if (attempt == MAX_RETRIES) {
                    throw new InventoryException(HttpStatus.CONFLICT, "Could not release stock due to high contention, please retry");
                }
            }
        }
        throw new IllegalStateException("unreachable");
    }

    public StockLevel receive(ReserveStockRequest request) {
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                return stockMutator.receiveOnce(request);
            } catch (ObjectOptimisticLockingFailureException e) {
                if (attempt == MAX_RETRIES) {
                    throw new InventoryException(HttpStatus.CONFLICT, "Could not receive stock due to high contention, please retry");
                }
            }
        }
        throw new IllegalStateException("unreachable");
    }
}
