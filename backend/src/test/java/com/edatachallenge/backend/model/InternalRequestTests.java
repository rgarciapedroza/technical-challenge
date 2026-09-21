package com.edatachallenge.backend.model;

import com.edatachallenge.backend.dto.RequestResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import static org.assertj.core.api.Assertions.assertThat;

class InternalRequestTests {

    private InternalRequest request(RequestPriority priority) {
        return new InternalRequest("Repository access", "Grant access to the team repository.",
                RequestCategory.ACCESS, priority);
    }

    @Test
    void creationStartsOpenAndTimestampsWaitForPersistence() {
        InternalRequest request = request(RequestPriority.HIGH);
        assertThat(request.getStatus()).isEqualTo(RequestStatus.OPEN);
        assertThat(request.getCreatedAt()).isNull();
        assertThat(request.getUpdatedAt()).isNull();
    }

    @ParameterizedTest
    @CsvSource({
            "HIGH, OPEN, true", "HIGH, IN_PROGRESS, true",
            "HIGH, DONE, false", "HIGH, REJECTED, false",
            "MEDIUM, OPEN, false", "MEDIUM, IN_PROGRESS, false",
            "MEDIUM, DONE, false", "MEDIUM, REJECTED, false",
            "LOW, OPEN, false", "LOW, IN_PROGRESS, false",
            "LOW, DONE, false", "LOW, REJECTED, false"
    })
    void attentionIsDerivedFromCurrentPriorityAndStatus(
            RequestPriority priority, RequestStatus status, boolean expected) {
        InternalRequest request = request(priority);
        request.update(request.getTitle(), request.getDescription(),
                request.getCategory(), priority, status);
        assertThat(request.isNeedsAttention()).isEqualTo(expected);
        assertThat(RequestResponse.from(request).needsAttention()).isEqualTo(expected);
    }

    @Test
    void updateChangesEditableFieldsAndAllowsReopening() {
        InternalRequest request = request(RequestPriority.HIGH);
        request.update("Replace laptop", "Replace the damaged laptop.",
                RequestCategory.HARDWARE, RequestPriority.LOW, RequestStatus.REJECTED);
        assertThat(request.getTitle()).isEqualTo("Replace laptop");
        assertThat(request.getDescription()).isEqualTo("Replace the damaged laptop.");
        assertThat(request.getCategory()).isEqualTo(RequestCategory.HARDWARE);
        assertThat(request.getPriority()).isEqualTo(RequestPriority.LOW);
        assertThat(request.getStatus()).isEqualTo(RequestStatus.REJECTED);

        request.update(request.getTitle(), request.getDescription(),
                request.getCategory(), RequestPriority.HIGH, RequestStatus.OPEN);
        assertThat(request.getStatus()).isEqualTo(RequestStatus.OPEN);
        assertThat(request.isNeedsAttention()).isTrue();
    }

    @Test
    void persistenceCallbacksPreserveCreationTimeAndRefreshUpdateTime() {
        InternalRequest request = request(RequestPriority.MEDIUM);
        Instant beforeCreation = Instant.now().truncatedTo(ChronoUnit.MICROS);
        request.onCreate();
        Instant createdAt = request.getCreatedAt();
        assertThat(createdAt).isBetween(beforeCreation, Instant.now());
        assertThat(request.getUpdatedAt()).isEqualTo(createdAt);
        assertThat(createdAt.getNano() % 1000).isZero();

        Instant beforeUpdate = Instant.now().truncatedTo(ChronoUnit.MICROS);
        request.onUpdate();
        assertThat(request.getCreatedAt()).isEqualTo(createdAt);
        assertThat(request.getUpdatedAt()).isBetween(beforeUpdate, Instant.now());
        assertThat(request.getUpdatedAt().getNano() % 1000).isZero();
    }
}
