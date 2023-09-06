export class TwinError extends Error {};
export class TwinAuthError extends TwinError {};
export class TwinMicropayError extends TwinError {};
export class TwinMicropayAmountMismatchError extends TwinMicropayError {};
export class TwinMicropayTokenMismatchError extends TwinMicropayError {};
