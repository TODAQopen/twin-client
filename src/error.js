class TwinError extends Error {};
class TwinAuthError extends TwinError {};
class TwinMicropayError extends TwinError {};
class TwinMicropayAmountMismatchError extends TwinMicropayError {};
class TwinMicropayTokenMismatchError extends TwinMicropayError {};
