package com.edatachallenge.backend.service;

import com.edatachallenge.backend.dto.CreateRequestRequest;
import com.edatachallenge.backend.dto.RequestResponse;
import com.edatachallenge.backend.dto.UpdateRequestRequest;
import com.edatachallenge.backend.exception.RequestNotFoundException;
import com.edatachallenge.backend.model.InternalRequest;
import com.edatachallenge.backend.model.RequestCategory;
import com.edatachallenge.backend.model.RequestPriority;
import com.edatachallenge.backend.model.RequestStatus;
import com.edatachallenge.backend.repository.InternalRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InternalRequestServiceTests {

    @Mock
    private InternalRequestRepository repository;

    private InternalRequestService service;

    @BeforeEach
    void setUp() {
        service = new InternalRequestService(repository);
    }

    private InternalRequest persistedRequest() {
        InternalRequest request = new InternalRequest("Repository access",
                "Grant access to the team repository.", RequestCategory.ACCESS,
                RequestPriority.MEDIUM);
        ReflectionTestUtils.setField(request, "id", 42L);
        ReflectionTestUtils.setField(request, "createdAt", Instant.parse("2026-09-21T10:00:00Z"));
        ReflectionTestUtils.setField(request, "updatedAt", Instant.parse("2026-09-21T10:00:00Z"));
        return request;
    }

    @Test
    void emptyRepositoryReturnsEmptyList() {
        when(repository.findAll()).thenReturn(List.of());

        assertThat(service.findAll()).isEmpty();
    }

    @Test
    void listReturnsResponseDtosForEveryRequest() {
        InternalRequest first = persistedRequest();
        InternalRequest second = new InternalRequest("Repair laptop", "Repair the broken screen.",
                RequestCategory.HARDWARE, RequestPriority.HIGH);
        when(repository.findAll()).thenReturn(List.of(first, second));

        assertThat(service.findAll()).containsExactly(
                RequestResponse.from(first), RequestResponse.from(second));
    }

    @Test
    void existingRequestReturnsItsDetailsAndPersistenceMetadata() {
        InternalRequest request = persistedRequest();
        when(repository.findById(42L)).thenReturn(Optional.of(request));

        RequestResponse response = service.findById(42L);

        assertThat(response.id()).isEqualTo(42L);
        assertThat(response.title()).isEqualTo("Repository access");
        assertThat(response.description()).isEqualTo("Grant access to the team repository.");
        assertThat(response.category()).isEqualTo(RequestCategory.ACCESS);
        assertThat(response.priority()).isEqualTo(RequestPriority.MEDIUM);
        assertThat(response.status()).isEqualTo(RequestStatus.OPEN);
        assertThat(response.needsAttention()).isFalse();
        assertThat(response.createdAt()).isEqualTo(request.getCreatedAt());
        assertThat(response.updatedAt()).isEqualTo(request.getUpdatedAt());
    }

    @Test
    void missingRequestThrowsNotFound() {
        when(repository.findById(42L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.findById(42L))
                .isInstanceOf(RequestNotFoundException.class)
                .hasMessage("Request with ID 42 was not found.");
    }

    @Test
    void creationSavesInputWithOpenStatusAndReturnsPersistedResult() {
        CreateRequestRequest input = new CreateRequestRequest("Repair laptop",
                "Repair the broken screen.", RequestCategory.HARDWARE, RequestPriority.HIGH);
        when(repository.saveAndFlush(any(InternalRequest.class))).thenAnswer(invocation -> {
            InternalRequest saved = invocation.getArgument(0);
            ReflectionTestUtils.setField(saved, "id", 7L);
            Instant timestamp = Instant.parse("2026-09-21T11:00:00Z");
            ReflectionTestUtils.setField(saved, "createdAt", timestamp);
            ReflectionTestUtils.setField(saved, "updatedAt", timestamp);
            return saved;
        });

        RequestResponse response = service.create(input);

        ArgumentCaptor<InternalRequest> captor = ArgumentCaptor.forClass(InternalRequest.class);
        verify(repository).saveAndFlush(captor.capture());
        InternalRequest saved = captor.getValue();
        assertThat(saved.getTitle()).isEqualTo(input.title());
        assertThat(saved.getDescription()).isEqualTo(input.description());
        assertThat(saved.getCategory()).isEqualTo(input.category());
        assertThat(saved.getPriority()).isEqualTo(input.priority());
        assertThat(saved.getStatus()).isEqualTo(RequestStatus.OPEN);
        assertThat(response.id()).isEqualTo(7L);
        assertThat(response.status()).isEqualTo(RequestStatus.OPEN);
        assertThat(response.needsAttention()).isTrue();
        assertThat(response.createdAt()).isEqualTo(Instant.parse("2026-09-21T11:00:00Z"));
        assertThat(response.updatedAt()).isEqualTo(response.createdAt());
    }

    @Test
    void updateSavesAllEditableFieldsAndReturnsTimestampAfterFlush() {
        InternalRequest existing = persistedRequest();
        Instant originalCreation = existing.getCreatedAt();
        Instant updatedAt = Instant.parse("2026-09-21T12:00:00Z");
        when(repository.findById(42L)).thenReturn(Optional.of(existing));
        when(repository.saveAndFlush(existing)).thenAnswer(invocation -> {
            ReflectionTestUtils.setField(existing, "updatedAt", updatedAt);
            return existing;
        });
        UpdateRequestRequest input = new UpdateRequestRequest("Replace monitor",
                "Replace the damaged monitor.", RequestCategory.PURCHASE,
                RequestPriority.HIGH, RequestStatus.REJECTED);

        RequestResponse response = service.update(42L, input);

        verify(repository).saveAndFlush(existing);
        assertThat(response.id()).isEqualTo(42L);
        assertThat(response.title()).isEqualTo(input.title());
        assertThat(response.description()).isEqualTo(input.description());
        assertThat(response.category()).isEqualTo(input.category());
        assertThat(response.priority()).isEqualTo(input.priority());
        assertThat(response.status()).isEqualTo(RequestStatus.REJECTED);
        assertThat(response.needsAttention()).isFalse();
        assertThat(response.createdAt()).isEqualTo(originalCreation);
        assertThat(response.updatedAt()).isEqualTo(updatedAt);
    }

    @Test
    void missingRequestCannotBeUpdatedOrSaved() {
        when(repository.findById(42L)).thenReturn(Optional.empty());
        UpdateRequestRequest input = new UpdateRequestRequest("Title", "Description",
                RequestCategory.OTHER, RequestPriority.LOW, RequestStatus.DONE);

        assertThatThrownBy(() -> service.update(42L, input))
                .isInstanceOf(RequestNotFoundException.class)
                .hasMessage("Request with ID 42 was not found.");
        verify(repository, never()).saveAndFlush(any(InternalRequest.class));
    }

    @ParameterizedTest
    @CsvSource({
            "HIGH, OPEN, true", "HIGH, IN_PROGRESS, true",
            "HIGH, DONE, false", "HIGH, REJECTED, false",
            "MEDIUM, OPEN, false", "MEDIUM, IN_PROGRESS, false",
            "LOW, OPEN, false", "LOW, IN_PROGRESS, false"
    })
    void reopeningOrClosingRequestReturnsCurrentAttentionRule(
            RequestPriority priority, RequestStatus status, boolean expected) {
        InternalRequest existing = persistedRequest();
        existing.update(existing.getTitle(), existing.getDescription(), existing.getCategory(),
                RequestPriority.HIGH, RequestStatus.REJECTED);
        when(repository.findById(42L)).thenReturn(Optional.of(existing));
        when(repository.saveAndFlush(existing)).thenReturn(existing);

        RequestResponse response = service.update(42L, new UpdateRequestRequest(
                existing.getTitle(), existing.getDescription(), existing.getCategory(),
                priority, status));

        assertThat(response.status()).isEqualTo(status);
        assertThat(response.needsAttention()).isEqualTo(expected);
    }
}
