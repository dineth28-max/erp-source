package com.erp.masterdata.service;

import com.erp.masterdata.config.TenantContext;
import com.erp.masterdata.domain.Customer;
import com.erp.masterdata.repository.CustomerRepository;
import com.erp.masterdata.web.dto.CustomerRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;

    public CustomerService(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    @Transactional
    public Customer create(CustomerRequest request) {
        Customer customer = new Customer();
        customer.setTenantId(TenantContext.get().tenantId());
        customer.setName(request.name());
        customer.setEmail(request.email());
        customer.setPhone(request.phone());
        return customerRepository.save(customer);
    }

    @Transactional(readOnly = true)
    public Customer get(UUID id) {
        UUID tenantId = TenantContext.get().tenantId();
        return customerRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new MasterDataException(HttpStatus.NOT_FOUND, "Customer not found: " + id));
    }

    @Transactional(readOnly = true)
    public Page<Customer> list(Pageable pageable) {
        return customerRepository.findByTenantId(TenantContext.get().tenantId(), pageable);
    }
}
