package com.edatachallenge.backend.config;

import com.edatachallenge.backend.model.*;
import com.edatachallenge.backend.repository.InternalRequestRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
public class DemoDataInitializer implements ApplicationRunner {

    private final InternalRequestRepository repository;
    private final boolean enabled;

    public DemoDataInitializer(InternalRequestRepository repository,
                               @Value("${app.seed-demo-data}") boolean enabled) {
        this.repository = repository;
        this.enabled = enabled;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled || repository.count() > 0) {
            return;
        }
        repository.saveAll(List.of(
                demo("Repository access", "Grant read and write access to the team source repository.",
                        RequestCategory.ACCESS, RequestPriority.MEDIUM, RequestStatus.OPEN),
                demo("Purchase monitors", "Purchase two monitors for the shared workstation.",
                        RequestCategory.PURCHASE, RequestPriority.LOW, RequestStatus.OPEN),
                demo("Install design software", "Install the approved design software on the team laptop.",
                        RequestCategory.SOFTWARE, RequestPriority.MEDIUM, RequestStatus.IN_PROGRESS),
                demo("Repair reception laptop", "Repair the reception laptop that shuts down during check-in.",
                        RequestCategory.HARDWARE, RequestPriority.HIGH, RequestStatus.IN_PROGRESS),
                demo("Review meeting room connection", "Restore the network connection needed for meeting room calls.",
                        RequestCategory.IT_SUPPORT, RequestPriority.HIGH, RequestStatus.OPEN),
                demo("Replace faulty keyboard", "Replace the shared workstation keyboard with unresponsive keys.",
                        RequestCategory.HARDWARE, RequestPriority.LOW, RequestStatus.DONE),
                demo("Purchase duplicate software licence", "Review a licence purchase that duplicates an existing team subscription.",
                        RequestCategory.PURCHASE, RequestPriority.HIGH, RequestStatus.REJECTED)
        ));
    }

    private InternalRequest demo(String title, String description, RequestCategory category,
                                 RequestPriority priority, RequestStatus status) {
        InternalRequest request = new InternalRequest(title, description, category, priority);
        request.update(title, description, category, priority, status);
        return request;
    }
}
