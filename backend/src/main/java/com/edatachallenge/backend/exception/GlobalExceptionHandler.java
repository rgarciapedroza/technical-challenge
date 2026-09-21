package com.edatachallenge.backend.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.validation.method.ParameterErrors;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.Map;
import java.util.TreeMap;

@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(RequestNotFoundException.class)
    public ResponseEntity<Object> handleNotFound(RequestNotFoundException ex, WebRequest request) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), Map.of(), new HttpHeaders(), request);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        Map<String, String> fields = new TreeMap<>();
        ex.getBindingResult().getFieldErrors().forEach(field ->
                fields.putIfAbsent(field.getField(), field.getDefaultMessage()));
        return error(status, "Validation failed.", fields, headers, request);
    }

    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(
            HandlerMethodValidationException ex, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        Map<String, String> fields = new TreeMap<>();
        ex.getParameterValidationResults().forEach(result -> {
            if (result instanceof ParameterErrors errors) {
                errors.getFieldErrors().forEach(field ->
                        fields.putIfAbsent(field.getField(), field.getDefaultMessage()));
            }
        });
        String message = fields.isEmpty() ? "ID must be a positive integer." : "Validation failed.";
        return error(status, message, fields, headers, request);
    }

    @Override
    protected ResponseEntity<Object> handleTypeMismatch(
            TypeMismatchException ex, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        return error(status, "ID must be a positive integer within the supported range.",
                Map.of(), headers, request);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        return error(status, "Invalid JSON request. Check field names, types and enum values.",
                Map.of(), headers, request);
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, Object body, HttpHeaders headers,
            HttpStatusCode status, WebRequest request) {
        HttpStatus knownStatus = HttpStatus.resolve(status.value());
        String message = knownStatus == null ? "Request failed." : knownStatus.getReasonPhrase() + ".";
        return error(status, message, Map.of(), headers, request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleUnexpected(Exception ex, WebRequest request) {
        log.error("Unexpected request processing failure", ex);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred.",
                Map.of(), new HttpHeaders(), request);
    }

    private ResponseEntity<Object> error(HttpStatusCode status, String message,
                                         Map<String, String> fields, HttpHeaders headers,
                                         WebRequest request) {
        String path = ((ServletWebRequest) request).getRequest().getRequestURI();
        return new ResponseEntity<>(new ApiError(status.value(), message, path, fields), headers, status);
    }
}
