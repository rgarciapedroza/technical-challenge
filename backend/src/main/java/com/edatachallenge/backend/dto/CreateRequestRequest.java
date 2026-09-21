package com.edatachallenge.backend.dto;

import com.edatachallenge.backend.model.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateRequestRequest(
        @NotBlank(message = "Title is required.")
        @Size(max = 120, message = "Title must not exceed 120 characters.")
        String title,
        @NotBlank(message = "Description is required.")
        @Size(max = 2000, message = "Description must not exceed 2000 characters.")
        String description,
        @NotNull(message = "Category is required.")
        RequestCategory category,
        @NotNull(message = "Priority is required.")
        RequestPriority priority
) {
}
