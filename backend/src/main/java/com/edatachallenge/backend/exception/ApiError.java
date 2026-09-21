package com.edatachallenge.backend.exception;

import java.util.Map;

public record ApiError(int status, String message, String path, Map<String, String> fieldErrors) {
}
