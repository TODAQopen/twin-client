class TwinError(Exception):
  def __init__(self, message=None, data=None):
    self.message = message if message else self.__class__.__name__
    self.data = data
    super().__init__(self.message)

class TwinAuthError(TwinError):
  pass

class TwinBusyError(TwinError):
  pass

class TwinMicropayError(TwinError):
  @staticmethod
  def from_twin_error(err):
    return TwinMicropayError(err.message, err.data)

class TwinMicropayAmountMismatchError(TwinMicropayError):
  pass

class TwinMicropayTokenMismatchError(TwinMicropayError):
  pass
