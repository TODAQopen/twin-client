import unittest
from client.client import TwinClient

paywall = {
    "url": "https://41d83ecbac7b2a50e451ee2a453fb8f4.tq.biz.todaq.net",
    "address": "41d83ecbac7b2a50e451ee2a453fb8f46a32fa071c9fab08f0d597eed3d0e74a0e",
    "api_key": "8c0b7fb3-c832-4c54-9f8f-3a5e8eef4e52",
    "config": {
      "targetPayType": "41f88b1490292e22ac37a5da7d9cdb88cffda408ae12a188243ad209e6f9fa5ef9",
      "targetPayQuantity": 1
    }
  }

payer = {
  "url": "https://4112873c42e819316dcfafdddb95a5cf.tq.biz.todaq.net",
  "api_key": "41b95538-b2a5-4aea-9121-a7d4e8558a63"
}

class TestTwinClient(unittest.TestCase):

  def test_info(self):
    client = TwinClient(url=paywall["url"])
    info = client.info()
    self.assertEqual(info["address"], paywall["address"])
    self.assertDictEqual(info["paywall"], paywall["config"])

  def test_fetch(self):
    client = TwinClient(**payer)
    binder_id = client.info()["binderId"]
    binder_binary = client.fetch(binder_id)
    self.assertTrue(len(binder_binary) > 0)

