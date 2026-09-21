package com.edatachallenge.backend.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "internal_requests")
public class InternalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 2000)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected InternalRequest() {
    }

    public InternalRequest(String title, String description,
                           RequestCategory category, RequestPriority priority) {
        this.title = title;
        this.description = description;
        this.category = category;
        this.priority = priority;
        this.status = RequestStatus.OPEN;
    }

    public void update(String title, String description, RequestCategory category,
                       RequestPriority priority, RequestStatus status) {
        this.title = title;
        this.description = description;
        this.category = category;
        this.priority = priority;
        this.status = status;
    }

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    @Transient
    public boolean isNeedsAttention() {
        return priority == RequestPriority.HIGH
                && (status == RequestStatus.OPEN || status == RequestStatus.IN_PROGRESS);
    }

    public Long getId() { return id; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public RequestCategory getCategory() { return category; }
    public RequestPriority getPriority() { return priority; }
    public RequestStatus getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
