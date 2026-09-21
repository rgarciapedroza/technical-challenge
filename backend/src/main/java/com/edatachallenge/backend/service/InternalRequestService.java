package com.edatachallenge.backend.service;

import com.edatachallenge.backend.dto.CreateRequestRequest;
import com.edatachallenge.backend.dto.RequestResponse;
import com.edatachallenge.backend.dto.UpdateRequestRequest;
import com.edatachallenge.backend.exception.RequestNotFoundException;
import com.edatachallenge.backend.model.InternalRequest;
import com.edatachallenge.backend.repository.InternalRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class InternalRequestService {

    private final InternalRequestRepository repository;

    public InternalRequestService(InternalRequestRepository repository) {
        this.repository = repository;
    }

    public List<RequestResponse> findAll() {
        return repository.findAll().stream()
                .map(RequestResponse::from)
                .toList();
    }

    public RequestResponse findById(Long id) {
        return RequestResponse.from(getRequest(id));
    }

    @Transactional
    public RequestResponse create(CreateRequestRequest input) {
        InternalRequest request = new InternalRequest(
                input.title(), input.description(), input.category(), input.priority());
        return RequestResponse.from(repository.saveAndFlush(request));
    }

    @Transactional
    public RequestResponse update(Long id, UpdateRequestRequest input) {
        InternalRequest request = getRequest(id);
        request.update(input.title(), input.description(), input.category(),
                input.priority(), input.status());
        // Flush before mapping so persistence-generated timestamps are available.
        return RequestResponse.from(repository.saveAndFlush(request));
    }

    private InternalRequest getRequest(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RequestNotFoundException(id));
    }
}
