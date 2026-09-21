package com.edatachallenge.backend.repository;

import com.edatachallenge.backend.model.InternalRequest;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InternalRequestRepository extends JpaRepository<InternalRequest, Long> {
}
