export class HttpError extends Error {
    constructor(status, data) {
        super("HttpError");
        this.status = status;
        this.data = data;
    }
}

export class TwinError extends Error {
    constructor(message, data) {
        super(message || "TwinError");
        if (data) this.data = data;
    }
};

export class TwinAuthError extends TwinError {
    constructor(message, data) {
        super(message || "TwinAuthError", data);
    }
};

export class TwinBusyError extends TwinError {
    constructor(message, data) {
        super(message || "TwinBusyError", data);
    }
}

export class TwinMicropayError extends TwinError {
    constructor(message, data) {
        super(message || "TwinMicropayError", data);
    }
    static fromTwinError({ message, data }) {
        return new this(message, data);
    }
};

export class TwinMicropayAmountMismatchError extends TwinMicropayError {
    constructor(message, data) {
        super(message || "TwinMicropayAmountMismatchError", data);
    }
};

export class TwinMicropayTokenMismatchError extends TwinMicropayError {
    constructor(message, data) {
        super(message || "TwinMicropayTokenMismatchError", data);
    }
};
