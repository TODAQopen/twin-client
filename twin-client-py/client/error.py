class TwinError(Exception):
  def __init__(self, message=None, data=None):
    self.message = message if message else self.__class__.__name__
    self.data = data
    super().__init__(self.message)

class TwinAuthError(TwinError):
  def __init__(self, message=None, data=None):
    super().__init__(message, data)

class TwinMicropayError(TwinError):
  def __init__(self, message=None, data=None):
    super().__init__(message, data)

  @staticmethod
  def from_twin_error(err):
    return TwinMicropayError(err.message, err.data)

class TwinMicropayAmountMismatchError(TwinMicropayError):
  def __init__(self, message=None, data=None):
    super().__init__(message, data)

class TwinMicropayTokenMismatchError(TwinMicropayError):
  def __init__(self, message=None, data=None):
    super().__init__(message, data)
