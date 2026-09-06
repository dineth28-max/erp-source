package com.erp.procurement.web.dto;

import com.erp.procurement.domain.PurchaseOrder;
import com.erp.procurement.domain.PurchaseOrderStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PurchaseOrderResponse(
        UUID id,
        UUID vendorId,
        PurchaseOrderStatus status,
        BigDecimal totalAmount,
        String failureReason,
        List<PurchaseOrderLineResponse> lines,
        Instant createdAt,
        Instant receivedAt
) {
    public static PurchaseOrderResponse from(PurchaseOrder po) {
        return new PurchaseOrderResponse(
                po.getId(), po.getVendorId(), po.getStatus(), po.getTotalAmount(), po.getFailureReason(),
                po.getLines().stream().map(PurchaseOrderLineResponse::from).toList(),
                po.getCreatedAt(), po.getReceivedAt()
        );
    }

    public static PurchaseOrderResponse fromSummary(PurchaseOrder po) {
        return new PurchaseOrderResponse(
                po.getId(), po.getVendorId(), po.getStatus(), po.getTotalAmount(), po.getFailureReason(),
                List.of(), po.getCreatedAt(), po.getReceivedAt()
        );
    }
}
