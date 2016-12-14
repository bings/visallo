package org.visallo.ingestontologymapping.util;

import org.visallo.core.exception.VisalloException;

public class SkipRowException extends VisalloException {

    public SkipRowException(String message) {
        super(message);
    }

    public SkipRowException(String message, Throwable cause) {
        super(message, cause);
    }
}
