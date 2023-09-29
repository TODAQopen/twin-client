import requests
import traceback

class TwinClient:
  def __init__(self, url: str, api_key: str = None):
    self.url = url
    self.api_key = api_key

  # async def request(self, method, url, config):

  #   if not "params" in config:
  #     config["params"] = {}
  #   if not "api_key" in config["params"]:


  #   try:
  #     result = await requests.request(method, url, **config)
  #     return result["data"]
  #   except Exception as e:
  #     print("Something went terribly wrong!")
  #     traceback.print_exc()

  def info(self):
    return requests.get(f"{self.url}/info").json()

  def pay(self):
    pass

  def fetch(self, hash):
    # fetch(hash) {
    #     return this.request({
    #         method: "GET",
    #         url: `/toda/${hash}`,
    #         headers: { "content-type": "application/octet-stream" }
    #     });
    # }

    return requests.get(f"{self.url}/toda/{hash}",{"apiKey": self.api_key}, headers={"content-type":"application/octet-stream"}).content
