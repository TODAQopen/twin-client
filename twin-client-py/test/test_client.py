import multiprocessing
import numbers
import os
import shutil
import tempfile
import time
import unittest

import requests_mock

from client import TwinClient
from client.error import *

from .config import test_config

payer, paywall = test_config["payer"], test_config["paywall"]


class RetryingClient(TwinClient):
    def request(self, *args, **kwargs):
        for i in range(5):
            try:
                return super().request(*args, **kwargs)
            except TwinBusyError as e:
                raise e if i == 4 else time.sleep(5)


class TestTwinClient(unittest.TestCase):
    @requests_mock.Mocker()
    def test_twin_error(self, mreq):
        url = "https://im-a-teapot"
        mreq.register_uri(
            "get", f"{url}/info", status_code=418, json={"error": "Teapot"}
        )
        try:
            RetryingClient(url).info()
            assert False
        except TwinError as err:
            print(err.message, err.data)
            assert err.data["error"] == "Teapot"

    def test_twin_auth_error(self):
        try:
            RetryingClient(payer["url"], "definitely-wrong-api-key").request(
                "get", "/config"
            )
            assert False
        except TwinAuthError as err:
            print(err.message, err.data)
            assert err.message == "Forbidden"

    def test_info(self):
        info = RetryingClient(paywall["url"]).info()
        self.assertEqual(info["address"], paywall["address"])
        self.assertDictEqual(info["paywall"], paywall["config"])

    def test_balance(self):
        type_hash = paywall["config"]["targetPayType"]
        result = RetryingClient(**payer).balance(type_hash)
        assert result
        assert isinstance(result["balance"], numbers.Number)
        assert result["type"] == type_hash

    def test_fetch(self):
        client = RetryingClient(**payer)
        binder_id = client.info()["binderId"]
        binder_binary = client.fetch(binder_id)
        self.assertTrue(len(binder_binary) > 0)

    def test_download(self):
        with tempfile.TemporaryDirectory() as store_dir:
            client = RetryingClient(**payer)
            binder_id = client.info()["binderId"]
            binder_bytes = client.download(binder_id, store_dir)
            assert len(binder_bytes) > 0
            with open(os.path.join(store_dir, f"{binder_id}.toda"), "rb") as f:
                bytes_on_disk = f.read()
            assert bytes_on_disk == binder_bytes

    @requests_mock.Mocker(real_http=True)
    def test_import_file_fail(self, mreq):
        url = "https://import-file-error"
        data = b"some-binary-file-content"
        mreq.register_uri(
            "post",
            f"{url}/toda",
            status_code=400,
            json={"error": "Import error string"},
        )
        try:
            RetryingClient(url).import_file(data)
            assert False
        except TwinError as err:
            print(err.message, err.data)
            assert err.message == "Bad Request"
            assert err.data == {"error": "Import error string"}

    @requests_mock.Mocker(real_http=True)
    def test_import_file(self, mreq):
        url = "https://import-file-success"
        data = b"some-binary-file-content"
        mreq.register_uri("post", f"{url}/toda", json={})
        result = RetryingClient(url).import_file(data)
        assert result == {}

    @requests_mock.Mocker(real_http=True)
    def test_upload(self, mreq):
        with tempfile.TemporaryDirectory() as store_dir:
            file_name = "upload-test-file.toda"
            file_path = os.path.join(store_dir, file_name)
            data = b"some-binary-file-content"
            with open(file_path, "wb") as f:
                f.write(data)
            url = "https://upload-file-success"
            mreq.register_uri("post", f"{url}/toda", status_code=201, json={})
            result = RetryingClient(url).upload(file_path)
            assert result == {}

    def test_pay_dest_fail(self):
        try:
            client = RetryingClient(paywall["url"], paywall["api_key"])
            url = "https://4123456.tq.biz.todaq.net"
            token_type_hash = paywall["config"]["targetPayType"]
            amount = paywall["config"]["targetPayQuantity"]
            client.pay(url, token_type_hash, amount)
            print("Should trow TwinError")
            assert False
        except TwinError as err:
            assert err.message == "Error retrieving destination twin info"

    def test_pay_busy_fail(self):
        time.sleep(5)
        try:
            client = RetryingClient(url=paywall["url"], api_key=paywall["api_key"])
            url = payer["url"]
            token_type_hash = paywall["config"]["targetPayType"]
            amount = paywall["config"]["targetPayQuantity"]

            inputs = [[url, token_type_hash, amount], [url, token_type_hash, amount]]
            with multiprocessing.Pool(processes=2) as pool:
                for res in pool.starmap(client.pay, inputs):
                    print(res.status_code)

            print("Should throw TwinBusyError")
            assert False
        except TwinBusyError as err:
            print(err.message, err.data)
            assert err.message == "TwinBusyError"

    def test_pay(self):
        # NOTE(sfertman): This test transfers from PAYWALL back to the PAYEE twin.
        client = RetryingClient(paywall["url"], paywall["api_key"])
        url = payer["url"]
        token_type_hash = paywall["config"]["targetPayType"]
        amount = paywall["config"]["targetPayQuantity"]
        try:
            result = client.pay(url, token_type_hash, amount)
        except Exception as err:
            print(err.message, err.data)
            raise err
        assert result["result"] == "Success"

    def test_micropay_amt_mismatch_error(self):
        pay_url = paywall["url"]
        pay_type = paywall["config"]["targetPayType"]
        pay_amt = paywall["config"]["targetPayQuantity"]
        wrong_amount = 0.1
        try:
            RetryingClient(**payer).micropay(pay_url, pay_type, wrong_amount)
            print("Should throw TwinMicropayAmountMismatchError")
            assert False
        except TwinMicropayAmountMismatchError as err:
            print(err.message, err.data)
            assert (
                err.message
                == f"paywall requires payment of {pay_amt}; attempted to send {wrong_amount}"
            )

    def test_micropay_type_mismatch_error(sef):
        pay_url = paywall["url"]
        pay_type = paywall["config"]["targetPayType"]
        pay_amt = paywall["config"]["targetPayQuantity"]
        wrong_type = paywall["address"]  # toda hash but not a token
        try:
            RetryingClient(**payer).micropay(pay_url, wrong_type, pay_amt)
            print("Should throw TwinMicropayTokenMismatchError")
            assert False
        except TwinMicropayTokenMismatchError as err:
            print(err.message, err.data)
            assert (
                err.message
                == f"paywall requires payment of token {pay_type}; attempted to send {wrong_type}"
            )

    @requests_mock.Mocker(real_http=True)
    def test_micropay_error(self, mreq):
        payer_url = "https://payer-twin"
        payee_url = "https://payee-twin"
        payee_address = "mock-address"
        token_type = "mock-token-type"
        quantity = 1
        data = {"mock": "data"}
        mreq.register_uri(
            "get",
            f"{payee_url}/info",
            json={
                "address": payee_address,
                "paywall": {"targetPayType": token_type, "targetPayQuantity": quantity},
            },
        )
        micropay_url = f"{payer_url}/pay/{payee_address}/{token_type}/{quantity}/https%3A%2F%2Fpayee-twin%2Fpaywall%2F"
        mreq.register_uri(
            "post",
            micropay_url,
            status_code=400,
            json={"error": "Any bad micropay request"},
        )
        try:
            RetryingClient(payer_url).micropay(
                payee_url, token_type, quantity, method="post", data=data
            )
            print("Should throw TwinMicropayError")
            assert False
        except TwinMicropayError as err:
            print(err.message, err.data)
            assert err.message == "Bad Request"
            assert err.data == {"error": "Any bad micropay request"}

    def test_micropay_example_404(self):
        pay_url = paywall["url"]
        pay_type = paywall["config"]["targetPayType"]
        pay_amt = paywall["config"]["targetPayQuantity"]
        try:
            RetryingClient(**payer).micropay(
                pay_url,
                pay_type,
                pay_amt,
                paywall_path="/hello?some-param=42&some-other-param=53",
            )
            # NOTE(sfertman): ^ /hello... returns 404 from example.com
            assert False
        except Exception as err:
            print(err.message, err.data)
            assert err.message == "Unhandled"
            assert err.data.status_code == 404

    def test_micropay(self):
        pay_url = paywall["url"]
        pay_type = paywall["config"]["targetPayType"]
        pay_amt = paywall["config"]["targetPayQuantity"]
        try:
            result = RetryingClient(**payer).micropay(
                pay_url,
                pay_type,
                pay_amt,
                paywall_path="?some-param=42&some-other-param=53",
            )
        except Exception as err:
            print(err.message, err.data)
            raise err
        assert result
