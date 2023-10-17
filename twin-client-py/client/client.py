import os
import requests
from urllib.parse import quote
from .error import *

# __all___
# python poetry for package management
# make sure all 3.7+ python version work.

class TwinClient:
  def __init__(self, url: str, api_key: str = None):
    self.url = url
    self.api_key = api_key

  def request(self, method, url, **req_config):
    if not 'headers' in req_config:
      req_config['headers'] = {}
    if not 'content-type' in req_config['headers']:
      req_config['headers']['content-type'] = 'application/json'
    if not 'params' in req_config:
      req_config['params'] = {}
    if not 'apiKey' in req_config:
      if self.api_key:
        req_config['params']['apiKey'] = self.api_key
    resp = requests.request(method, f'{self.url}{url}', **req_config)
    if resp.status_code >= 200 and resp.status_code < 300:
      return resp
    elif resp.status_code == 400:
      raise TwinError('Bad Request', resp.json())
    elif resp.status_code == 403:
      raise TwinAuthError('Forbidden', resp.json())
    else:
      raise TwinError('Unhandled', resp.json())

  def info(self):
    return self.request('get', '/info').json()

  def pay(self, url, token_type_hash, amount):
    try:
      TwinClient(url=url).info()
    except TwinError as err:
      raise TwinError('Error connecting to destination twin', err)
    return self.request('post', f'/dq/{token_type_hash}/transfer', json={
      'destination': url,
      'amount': amount
    }).json()

  def fetch(self, hash):
    headers = {'content-type':'application/octet-stream'}
    return self.request('get', f'/toda/{hash}', headers=headers).content

  def download(self, hash, dir='.'):
    file_bytes = self.fetch(hash)
    with open(os.path.join(dir, f'{hash}.toda'), 'wb') as f:
      f.write(file_bytes)
    return file_bytes

  def import_file(self, file):
    headers = {'content-type':'application/octet-stream'}
    return self.request('post', '/toda', headers=headers, data=file).json()

  def upload(self, file_path):
    with open(file_path, 'rb') as f:
      file_bytes = f.read()
    return self.import_file(file_bytes)

  def micropay(self, url, token_type_hash, amount, method='get', data=None):
    paywall_client = TwinClient(url=url)
    try:
      paywall_info = paywall_client.info()
    except TwinError as err:
      raise TwinError('Error connecting to destination twin', err)
    paywall_config = paywall_info['paywall']
    if token_type_hash != paywall_config['targetPayType']:
      raise TwinMicropayTokenMismatchError(f'paywall requires payment of token {paywall_config["targetPayType"]}; attempted to send {token_type_hash}')
    if amount != paywall_config['targetPayQuantity']:
      raise TwinMicropayAmountMismatchError(f'paywall requires payment of {paywall_config["targetPayQuantity"]}; attempted to send {amount}')

    destination_address = paywall_config['address']
    destination_url = quote(f'{url}/paywall')
    try:
      return self.request(method, f'/pay/{destination_address}/{token_type_hash}/{amount}/{destination_url}', json=data)
    except TwinError as err:
      if err.message == 'Bad Request':
        raise TwinMicropayError.from_twin_error(err)
      raise err
