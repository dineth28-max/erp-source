package com.erp.sales.repository;

import com.erp.sales.domain.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    // Lines are LAZY and open-in-view is disabled, so the detail view must
    // fetch them inside the same transaction via JOIN FETCH - otherwise
    // OrderResponse.from() would hit a closed Hibernate session.
    @Query("select o from Order o left join fetch o.lines where o.id = :id and o.tenantId = :tenantId")
    Optional<Order> findByIdAndTenantIdFetchLines(UUID id, UUID tenantId);

    Page<Order> findByTenantId(UUID tenantId, Pageable pageable);
}
