export class HttpError extends Error {
    constructor(status, data) {
        super("HttpError");
        this.status = status;
        this.data = data;
    }
}

export class TwinError extends Error {
    constructor(arg1, arg2) {
        if (!arg2) {
            super("TwinError");
            this.data = arg1;
        } else {
            super(arg1);
            this.data = arg2;
        }
    }
};
export class TwinAuthError extends TwinError {};
export class TwinMicropayError extends TwinError {};
export class TwinMicropayAmountMismatchError extends TwinMicropayError {};
export class TwinMicropayTokenMismatchError extends TwinMicropayError {};
