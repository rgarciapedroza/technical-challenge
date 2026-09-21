package com.edatachallenge.backend.dto;

import com.edatachallenge.backend.model.*;
import java.time.Instant;

public record RequestResponse(
        Long id,
        String title,
        String description,
        RequestCategory category,
        RequestPriority priority,
        RequestStatus status,
        boolean needsAttention,
        Instant createdAt,
        Instant updatedAt
) {
    public static RequestResponse from(InternalRequest request) {
        return new RequestResponse(
                request.getId(), request.getTitle(), request.getDescription(),
                request.getCategory(), request.getPriority(), request.getStatus(),
                request.isNeedsAttention(), request.getCreatedAt(), request.getUpdatedAt());
    }
}
