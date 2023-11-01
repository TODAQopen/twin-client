import numbers
import os
import shutil
import time
import unittest
import requests_mock
import multiprocessing
from client import TwinClient
from client.error import *

paywall = {
  'url': "https://41678ba2d72dc94b1ba816b93bc98045.tq.biz.todaq.net",
  'address': "41678ba2d72dc94b1ba816b93bc98045a2dee5af6982c75685e1f1b57c19dcac29",
  'api_key': "f9ee1ee8-2966-4ed9-b3a7-3dc6dc9a7fc9",
  'config': {
    'targetPayType': "41796848130c3b7527d2bcf289ff3504ebc105f4976741c3b8af65f02db43a81ee",
    'targetPayQuantity': 1
  }
}

payer = {
  'url': "https://410ff3ca7c44caa0716cf831cda444e2.tq.biz.todaq.net",
  'api_key': "fff53e8c-bb79-4662-a3c7-96ee294c13e6"
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

  def test_balance(self):
    type_hash = paywall['config']['targetPayType']
    result = TwinClient(**payer).balance(type_hash)
    assert result
    assert isinstance(result['balance'], numbers.Number)
    assert result['type'] == type_hash

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
      assert err.message == 'Error retrieving destination twin info'

  def test_pay_busy_fail(self):
    time.sleep(5)
    try:
      client = TwinClient(url=paywall['url'], api_key=paywall['api_key'])
      url = payer['url']
      token_type_hash = paywall['config']['targetPayType']
      amount = paywall['config']['targetPayQuantity']

      inputs = [[url, token_type_hash, amount],
                [url, token_type_hash, amount]]
      with multiprocessing.Pool(processes=2) as pool:
        for res in pool.starmap(client.pay, inputs):
          print(res.status_code)

      print('Should throw TwinBusyError')
      assert False
    except TwinBusyError as err:
      print(err.message, err.data)
      assert err.message == 'TwinBusyError'

  def test_pay(self):
    # NOTE(sfertman): This test transfers from PAYWALL back to the PAYEE twin.
    time.sleep(5)
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
    micropay_url = f'{payer_url}/pay/{payee_address}/{token_type}/{quantity}/https%3A%2F%2Fpayee-twin%2Fpaywall%2F'
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

  def test_micropay_example_404(self):
    time.sleep(5)
    pay_url = paywall['url']
    pay_type = paywall['config']['targetPayType']
    pay_amt = paywall['config']['targetPayQuantity']
    try:
      TwinClient(**payer).micropay(pay_url, pay_type, pay_amt, paywall_path='/hello?some-param=42&some-other-param=53')
      # NOTE(sfertman): ^ /hello... returns 404 from example.com
      assert False
    except Exception as err:
      print(err.message, err.data)
      assert err.message == 'Unhandled'
      assert err.data.status_code == 404

  def test_micropay(self):
    time.sleep(5)
    pay_url = paywall['url']
    pay_type = paywall['config']['targetPayType']
    pay_amt = paywall['config']['targetPayQuantity']
    try:
      result = TwinClient(**payer).micropay(pay_url, pay_type, pay_amt, paywall_path='?some-param=42&some-other-param=53')
    except Exception as err:
      print(err.message, err.data)
      raise err
    assert result
