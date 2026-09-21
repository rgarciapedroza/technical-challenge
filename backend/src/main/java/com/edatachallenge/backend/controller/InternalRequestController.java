package com.edatachallenge.backend.controller;

import com.edatachallenge.backend.dto.CreateRequestRequest;
import com.edatachallenge.backend.dto.RequestResponse;
import com.edatachallenge.backend.dto.UpdateRequestRequest;
import com.edatachallenge.backend.service.InternalRequestService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/requests")
public class InternalRequestController {

    private final InternalRequestService service;

    public InternalRequestController(InternalRequestService service) {
        this.service = service;
    }

    @GetMapping
    public List<RequestResponse> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public RequestResponse findById(
            @PathVariable @Positive(message = "ID must be a positive integer.") Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<RequestResponse> create(@Valid @RequestBody CreateRequestRequest input) {
        RequestResponse response = service.create(input);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}").buildAndExpand(response.id()).toUri();
        return ResponseEntity.created(location).body(response);
    }

    @PutMapping("/{id}")
    public RequestResponse update(
            @PathVariable @Positive(message = "ID must be a positive integer.") Long id,
            @Valid @RequestBody UpdateRequestRequest input) {
        return service.update(id, input);
    }
}
