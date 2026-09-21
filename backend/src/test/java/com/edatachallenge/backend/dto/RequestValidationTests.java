package com.edatachallenge.backend.dto;

import com.edatachallenge.backend.model.*;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import java.util.Set;
import java.util.stream.Collectors;
import static org.assertj.core.api.Assertions.assertThat;

class RequestValidationTests {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        factory.close();
    }

    private Set<String> errors(Object value) {
        return validator.validate(value).stream()
                .map(violation -> violation.getPropertyPath() + ": " + violation.getMessage())
                .collect(Collectors.toSet());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" ", "   ", "\t\n"})
    void rejectsBlankTitleAndDescriptionWithEnglishMessages(String blank) {
        assertThat(errors(new CreateRequestRequest(blank, blank,
                RequestCategory.ACCESS, RequestPriority.MEDIUM)))
                .containsExactlyInAnyOrder("title: Title is required.",
                        "description: Description is required.");
        assertThat(errors(new UpdateRequestRequest(blank, blank,
                RequestCategory.ACCESS, RequestPriority.MEDIUM, RequestStatus.OPEN)))
                .containsExactlyInAnyOrder("title: Title is required.",
                        "description: Description is required.");
    }

    @Test
    void acceptsExactMaximumLengthsForCreateAndUpdate() {
        assertThat(errors(new CreateRequestRequest("a".repeat(120), "b".repeat(2000),
                RequestCategory.OTHER, RequestPriority.LOW))).isEmpty();
        assertThat(errors(new UpdateRequestRequest("a".repeat(120), "b".repeat(2000),
                RequestCategory.OTHER, RequestPriority.LOW, RequestStatus.REJECTED))).isEmpty();
    }

    @Test
    void rejectsLengthsAboveMaximumForCreateAndUpdate() {
        Set<String> expected = Set.of("title: Title must not exceed 120 characters.",
                "description: Description must not exceed 2000 characters.");
        assertThat(errors(new CreateRequestRequest("a".repeat(121), "b".repeat(2001),
                RequestCategory.OTHER, RequestPriority.LOW))).isEqualTo(expected);
        assertThat(errors(new UpdateRequestRequest("a".repeat(121), "b".repeat(2001),
                RequestCategory.OTHER, RequestPriority.LOW, RequestStatus.OPEN))).isEqualTo(expected);
    }

    @Test
    void requiresCategoryAndPriorityAndAlsoStatusOnUpdate() {
        assertThat(errors(new CreateRequestRequest("Title", "Description", null, null)))
                .containsExactlyInAnyOrder("category: Category is required.",
                        "priority: Priority is required.");
        assertThat(errors(new UpdateRequestRequest("Title", "Description", null, null, null)))
                .containsExactlyInAnyOrder("category: Category is required.",
                        "priority: Priority is required.", "status: Status is required.");
    }
}
