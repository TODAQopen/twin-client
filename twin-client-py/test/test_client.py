import os
import shutil
import time
import unittest
import requests_mock
from client import TwinClient
from client.error import *

paywall = {
  ## TODO(sfertman): need to make new account for the python client because tests will run at the same time and clobber each other
  'url': 'https://41d83ecbac7b2a50e451ee2a453fb8f4.tq.biz.todaq.net',
  'address': '41d83ecbac7b2a50e451ee2a453fb8f46a32fa071c9fab08f0d597eed3d0e74a0e',
  'api_key': '8c0b7fb3-c832-4c54-9f8f-3a5e8eef4e52',
  'config': {
    'targetPayType': '41f88b1490292e22ac37a5da7d9cdb88cffda408ae12a188243ad209e6f9fa5ef9',
    'targetPayQuantity': 1
  }
}

payer = {
  ## TODO(sfertman): need to make new account for the python client because tests will run at the same time and clobber each other
  'url': 'https://4112873c42e819316dcfafdddb95a5cf.tq.biz.todaq.net',
  'api_key': '41b95538-b2a5-4aea-9121-a7d4e8558a63'
}

class TestTwinClient(unittest.TestCase):

  @requests_mock.Mocker()
  def test_twin_error(self, mreq):
    url = 'https://im-a-teapot'
    mreq.register_uri('get', f'{url}/info',
                      status_code=418,
                      json={'error':'Teapot'})
    try:
      TwinClient(url).info()
      assert False
    except TwinError as err:
      print(err.message, err.data)
      assert err.data['error'] == 'Teapot'

  def test_twin_auth_error(self):
    try:
      TwinClient(payer['url'], 'definitely-wrong-api-key').request('get', '/config')
      assert False
    except TwinAuthError as err:
      print(err.message, err.data)
      assert err.message == 'Forbidden'

  def test_info(self):
    info = TwinClient(paywall['url']).info()
    self.assertEqual(info['address'], paywall['address'])
    self.assertDictEqual(info['paywall'], paywall['config'])

  def test_fetch(self):
    client = TwinClient(**payer)
    binder_id = client.info()['binderId']
    binder_binary = client.fetch(binder_id)
    self.assertTrue(len(binder_binary) > 0)

  def test_download(self):
    try:
      store_dir = './test/download'
      os.makedirs(store_dir, exist_ok=True)
      client = TwinClient(**payer)
      binder_id = client.info()['binderId']
      binder_bytes = client.download(binder_id, store_dir)
      assert len(binder_bytes) > 0
      with open(os.path.join(store_dir, f'{binder_id}.toda'), 'rb') as f:
        bytes_on_disk = f.read()
      assert bytes_on_disk == binder_bytes
    finally:
      shutil.rmtree(store_dir)

  @requests_mock.Mocker(real_http=True)
  def test_import_file_fail(self, mreq):
    url = 'https://import-file-error'
    data = b'some-binary-file-content'
    mreq.register_uri('post', f'{url}/toda',
                      status_code=400,
                      json={ 'error': 'Import error string' })
    try:
      TwinClient(url).import_file(data)
      assert False
    except TwinError as err:
      print(err.message, err.data)
      assert err.message == 'Bad Request'
      assert err.data == { 'error': 'Import error string' }

  @requests_mock.Mocker(real_http=True)
  def test_import_file(self, mreq):
    url = 'https://import-file-success'
    data = b'some-binary-file-content'
    mreq.register_uri('post', f'{url}/toda', json={})
    result = TwinClient(url).import_file(data)
    assert result == {}

  @requests_mock.Mocker(real_http=True)
  def test_upload(self, mreq):
    store_dir = './test/upload'
    file_name = 'upload-test-file.toda'
    file_path = os.path.join(store_dir, file_name)
    data = b'some-binary-file-content'
    os.makedirs(store_dir, exist_ok=True)
    with open(file_path, 'wb') as f:
      f.write(data)
    url = 'https://upload-file-success'
    mreq.register_uri('post', f'{url}/toda', status_code=201, json={})
    try:
      result = TwinClient(url).upload(file_path)
      assert result == {}
    finally:
      shutil.rmtree(store_dir)

  def test_pay_dest_fail(self):
    try:
      client = TwinClient(paywall['url'], paywall['api_key'])
      url = 'https://4123456.tq.biz.todaq.net'
      token_type_hash = paywall['config']['targetPayType']
      amount = paywall['config']['targetPayQuantity']
      client.pay(url, token_type_hash, amount)
      print('Should trow TwinError')
      assert False
    except TwinError as err:
      assert err.message == 'Error connecting to destination twin'

  def test_pay(self):
    # NOTE(sfertman): This test transfers from PAYWALL back to the PAYEE twin.
    time.sleep(10)
    client = TwinClient(paywall['url'], paywall['api_key'])
    url = payer['url']
    token_type_hash = paywall['config']['targetPayType']
    amount = paywall['config']['targetPayQuantity']
    try:
      result = client.pay(url, token_type_hash, amount)
    except Exception as err:
      print(err.message, err.data)
      raise err
    assert result['result'] == 'Success'

  def test_micropay_amt_mismatch_error(self):
    pay_url = paywall['url']
    pay_type = paywall['config']['targetPayType']
    pay_amt = paywall['config']['targetPayQuantity']
    wrong_amount = 0.1
    try:
      TwinClient(**payer).micropay(pay_url, pay_type, wrong_amount)
      print('Should throw TwinMicropayAmountMismatchError')
      assert False
    except TwinMicropayAmountMismatchError as err:
      print(err.message, err.data)
      assert err.message == f'paywall requires payment of {pay_amt}; attempted to send {wrong_amount}'

  def test_micropay_type_mismatch_error(sef):
    pay_url = paywall['url']
    pay_type = paywall['config']['targetPayType']
    pay_amt = paywall['config']['targetPayQuantity']
    wrong_type = paywall['address'] # toda hash but not a token
    try:
      TwinClient(**payer).micropay(pay_url, wrong_type, pay_amt)
      print('Should throw TwinMicropayTokenMismatchError')
      assert False
    except TwinMicropayTokenMismatchError as err:
      print(err.message, err.data)
      assert err.message == f'paywall requires payment of token {pay_type}; attempted to send {wrong_type}'

  @requests_mock.Mocker(real_http=True)
  def test_micropay_error(self, mreq):
    payer_url = 'https://payer-twin'
    payee_url = 'https://payee-twin'
    payee_address = 'mock-address'
    token_type = 'mock-token-type'
    quantity = 1
    data = { 'mock': 'data' }
    mreq.register_uri('get', f'{payee_url}/info', json={
      'address': payee_address,
      'paywall': {
        'targetPayType': token_type,
        'targetPayQuantity': quantity }})
    micropay_url = f'{payer_url}/pay/{payee_address}/{token_type}/{quantity}/https%3A%2F%2Fpayee-twin%2Fpaywall'
    mreq.register_uri('post', micropay_url,
                      status_code=400,
                      json={ 'error': "Any bad micropay request" })
    try:
      TwinClient(payer_url).micropay(payee_url, token_type, quantity,
                                     method='post', data=data)
      print('Should throw TwinMicropayError')
      assert False
    except TwinMicropayError as err:
      print(err.message, err.data)
      assert err.message == 'Bad Request'
      assert err.data == { 'error': "Any bad micropay request" }

  def test_micropay(self):
    time.sleep(10)
    pay_url = paywall['url']
    pay_type = paywall['config']['targetPayType']
    pay_amt = paywall['config']['targetPayQuantity']
    try:
      result = TwinClient(**payer).micropay(pay_url, pay_type, pay_amt)
    except Exception as err:
      print(err.message, err.data)
      raise err
    assert result
