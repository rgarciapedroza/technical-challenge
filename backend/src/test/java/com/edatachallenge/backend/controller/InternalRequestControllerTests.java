package com.edatachallenge.backend.controller;

import com.edatachallenge.backend.dto.CreateRequestRequest;
import com.edatachallenge.backend.dto.RequestResponse;
import com.edatachallenge.backend.dto.UpdateRequestRequest;
import com.edatachallenge.backend.exception.RequestNotFoundException;
import com.edatachallenge.backend.model.*;
import com.edatachallenge.backend.service.InternalRequestService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InternalRequestController.class)
class InternalRequestControllerTests {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private InternalRequestService service;

    private static final String CREATE = """
            {"title":"Repository access","description":"Grant repository access.",
             "category":"ACCESS","priority":"HIGH"}
            """;
    private static final String UPDATE = """
            {"title":"Repository access","description":"Grant repository access.",
             "category":"ACCESS","priority":"HIGH","status":"REJECTED"}
            """;

    private RequestResponse response(RequestStatus status) {
        Instant timestamp = Instant.parse("2026-09-21T10:00:00Z");
        return new RequestResponse(42L, "Repository access", "Grant repository access.",
                RequestCategory.ACCESS, RequestPriority.HIGH, status,
                status == RequestStatus.OPEN || status == RequestStatus.IN_PROGRESS,
                timestamp, timestamp);
    }

    @Test
    void getListReturnsRequests() throws Exception {
        when(service.findAll()).thenReturn(List.of(response(RequestStatus.OPEN)));
        mvc.perform(get("/api/requests"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(42))
                .andExpect(jsonPath("$[0].needsAttention").value(true));
    }

    @Test
    void emptyListReturnsAnArray() throws Exception {
        when(service.findAll()).thenReturn(List.of());
        mvc.perform(get("/api/requests"))
                .andExpect(status().isOk()).andExpect(content().json("[]"));
    }

    @Test
    void getExistingRequestReturnsDetails() throws Exception {
        when(service.findById(42L)).thenReturn(response(RequestStatus.OPEN));
        mvc.perform(get("/api/requests/42"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(42))
                .andExpect(jsonPath("$.createdAt").value("2026-09-21T10:00:00Z"))
                .andExpect(jsonPath("$.updatedAt").value("2026-09-21T10:00:00Z"))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    void getMissingRequestReturnsConsistentNotFoundError() throws Exception {
        when(service.findById(42L)).thenThrow(new RequestNotFoundException(42L));
        mvc.perform(get("/api/requests/42"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Request with ID 42 was not found."))
                .andExpect(jsonPath("$.path").value("/api/requests/42"))
                .andExpect(jsonPath("$.fieldErrors").isMap())
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    @Test
    void postReturnsCreatedDtoAndLocationAndPassesCorrectInput() throws Exception {
        when(service.create(any())).thenReturn(response(RequestStatus.OPEN));
        mvc.perform(post("/api/requests").contentType(MediaType.APPLICATION_JSON).content(CREATE))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "http://localhost/api/requests/42"))
                .andExpect(jsonPath("$.status").value("OPEN"));
        verify(service).create(new CreateRequestRequest("Repository access",
                "Grant repository access.", RequestCategory.ACCESS, RequestPriority.HIGH));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "   "})
    void postRejectsBlankTitleWithEnglishErrorEvenForSpanishClient(String title) throws Exception {
        mvc.perform(post("/api/requests").header("Accept-Language", "es")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE.replace("Repository access", title)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validation failed."))
                .andExpect(jsonPath("$.path").value("/api/requests"))
                .andExpect(jsonPath("$.fieldErrors.title").value("Title is required."));
        verifyNoInteractions(service);
    }

    @Test
    void postRequiresAllCreationFields() throws Exception {
        mvc.perform(post("/api/requests").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.title").value("Title is required."))
                .andExpect(jsonPath("$.fieldErrors.description").value("Description is required."))
                .andExpect(jsonPath("$.fieldErrors.category").value("Category is required."))
                .andExpect(jsonPath("$.fieldErrors.priority").value("Priority is required."));
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{", "[]",
            "{\"title\":\"Title\",\"description\":\"Description\",\"category\":\"INVALID\",\"priority\":\"HIGH\"}",
            "{\"title\":\"Title\",\"description\":\"Description\",\"category\":\"ACCESS\",\"priority\":\"URGENT\"}",
            "{\"title\":\"Title\",\"description\":\"Description\",\"category\":\"ACCESS\",\"priority\":\"HIGH\",\"status\":\"DONE\"}"
    })
    void postRejectsMalformedJsonInvalidEnumsAndStatus(String body) throws Exception {
        mvc.perform(post("/api/requests").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(
                        "Invalid JSON request. Check field names, types and enum values."))
                .andExpect(jsonPath("$.fieldErrors").isMap())
                .andExpect(jsonPath("$.trace").doesNotExist());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc", "0", "-1", "1.5", "9223372036854775808"})
    void invalidIdentifiersAreRejectedForGetAndPut(String id) throws Exception {
        mvc.perform(get("/api/requests/" + id))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
        mvc.perform(put("/api/requests/" + id).contentType(MediaType.APPLICATION_JSON).content(UPDATE))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
        verifyNoInteractions(service);
    }

    @Test
    void putReturnsUpdatedDtoAndPassesAllFieldsIncludingStatus() throws Exception {
        when(service.update(eq(42L), any())).thenReturn(response(RequestStatus.REJECTED));
        mvc.perform(put("/api/requests/42").contentType(MediaType.APPLICATION_JSON).content(UPDATE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.needsAttention").value(false));
        verify(service).update(42L, new UpdateRequestRequest("Repository access",
                "Grant repository access.", RequestCategory.ACCESS, RequestPriority.HIGH,
                RequestStatus.REJECTED));
    }

    @Test
    void putMissingRequestReturnsNotFound() throws Exception {
        when(service.update(eq(42L), any())).thenThrow(new RequestNotFoundException(42L));
        mvc.perform(put("/api/requests/42").contentType(MediaType.APPLICATION_JSON).content(UPDATE))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.path").value("/api/requests/42"));
    }

    @Test
    void putRequiresStatus() throws Exception {
        mvc.perform(put("/api/requests/42").contentType(MediaType.APPLICATION_JSON).content(CREATE))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.status").value("Status is required."));
        verifyNoInteractions(service);
    }

    @Test
    void putRejectsPartialUpdates() throws Exception {
        mvc.perform(put("/api/requests/42").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"DONE\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.title").value("Title is required."))
                .andExpect(jsonPath("$.fieldErrors.description").value("Description is required."))
                .andExpect(jsonPath("$.fieldErrors.category").value("Category is required."))
                .andExpect(jsonPath("$.fieldErrors.priority").value("Priority is required."));
        verifyNoInteractions(service);
    }

    @Test
    void putRejectsUnknownStatus() throws Exception {
        mvc.perform(put("/api/requests/42").contentType(MediaType.APPLICATION_JSON)
                        .content(UPDATE.replace("REJECTED", "INVALID")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
        verifyNoInteractions(service);
    }

    @Test
    void unexpectedFailuresDoNotExposeInternalDetails() throws Exception {
        when(service.findAll()).thenThrow(new IllegalStateException("Private database details"));
        mvc.perform(get("/api/requests"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.message").value("An unexpected error occurred."))
                .andExpect(jsonPath("$.path").value("/api/requests"))
                .andExpect(jsonPath("$.fieldErrors").isMap())
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    @Test
    void unsupportedDeleteReturnsStructuredMethodNotAllowed() throws Exception {
        mvc.perform(delete("/api/requests/42"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405))
                .andExpect(header().exists("Allow"));
        verifyNoInteractions(service);
    }
}
