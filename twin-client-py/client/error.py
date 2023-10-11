class TwinError(Exception):
  def __init__(self, message="TwinError", data=None):
    self.message = message
    self.data = data
    super().__init__(self.message)

class TwinAuthError(TwinError):
  def __init__(self, message="TwinAuthError", data=None):
    super().__init__(message, data)

class TwinMicropayError(TwinError):
  def __init__(self, message="TwinMicropayError", data=None):
    super().__init__(message, data)

  @staticmethod
  def from_twin_error(err):
    return TwinMicropayError(err.message, err.data)


class TwinMicropayAmountMismatchError(TwinMicropayError):
  def __init__(self, message="TwinMicropayAmountMismatchError", data=None):
    super().__init__(message, data)

class TwinMicropayTokenMismatchError(TwinMicropayError):
  def __init__(self, message="TwinMicropayTokenMismatchError", data=None):
    super().__init__(message, data)
