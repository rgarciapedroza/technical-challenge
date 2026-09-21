package com.edatachallenge.backend.config;

import com.edatachallenge.backend.model.InternalRequest;
import com.edatachallenge.backend.model.RequestStatus;
import com.edatachallenge.backend.repository.InternalRequestRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DemoDataInitializerTests {

    @Mock
    private InternalRequestRepository repository;

    @Test
    void disabledInitializerDoesNotAccessRepository() {
        new DemoDataInitializer(repository, false).run(null);
        verifyNoInteractions(repository);
    }

    @Test
    void anyExistingRequestPreventsSeeding() {
        when(repository.count()).thenReturn(1L);
        new DemoDataInitializer(repository, true).run(null);
        verify(repository).count();
        verifyNoMoreInteractions(repository);
    }

    @Test
    void emptyDatabaseReceivesSevenDemoRequestsWithExpectedCounters() {
        when(repository.count()).thenReturn(0L);
        new DemoDataInitializer(repository, true).run(null);
        ArgumentCaptor<Iterable<InternalRequest>> captor = ArgumentCaptor.captor();
        verify(repository).saveAll(captor.capture());
        assertThat(captor.getValue()).hasSize(7);
        assertThat(captor.getValue()).extracting(InternalRequest::getTitle).containsExactly(
                "Repository access", "Purchase monitors", "Install design software",
                "Repair reception laptop", "Review meeting room connection",
                "Replace faulty keyboard", "Purchase duplicate software licence");
        assertThat(captor.getValue()).filteredOn(InternalRequest::isNeedsAttention).hasSize(2);
        assertThat(captor.getValue()).filteredOn(r -> r.getStatus() == RequestStatus.DONE).hasSize(1);
        assertThat(captor.getValue()).filteredOn(r -> r.getStatus() == RequestStatus.IN_PROGRESS).hasSize(2);
        assertThat(captor.getValue()).allSatisfy(request -> {
            assertThat(request.getDescription()).isNotBlank();
            assertThat(request.getCreatedAt()).isNull();
            assertThat(request.getUpdatedAt()).isNull();
        });
    }
}
