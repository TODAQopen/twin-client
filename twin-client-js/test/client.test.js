import fs from "fs/promises";
import assert from "assert";
import { TwinClient } from "../src/client.js";
import {
    TwinError,
    TwinAuthError,
    TwinBusyError,
    TwinMicropayError,
    TwinMicropayAmountMismatchError,
    TwinMicropayTokenMismatchError } from "../src/error.js";

import nock from "nock"

const paywall = {
    url: "https://41d83ecbac7b2a50e451ee2a453fb8f4.tq.biz.todaq.net",
    address: "41d83ecbac7b2a50e451ee2a453fb8f46a32fa071c9fab08f0d597eed3d0e74a0e",
    apiKey: "8c0b7fb3-c832-4c54-9f8f-3a5e8eef4e52",
    config: {
        targetPayType: "41f88b1490292e22ac37a5da7d9cdb88cffda408ae12a188243ad209e6f9fa5ef9",
        targetPayQuantity: 1
    }
};

const payer = {
    url: "https://4112873c42e819316dcfafdddb95a5cf.tq.biz.todaq.net",
    apiKey: "41b95538-b2a5-4aea-9121-a7d4e8558a63"
};

describe("TwinError", async function() {
    it("Should throw TwinError when error is not handled", async function() {
        try {
            let url = "https://im-a-teapot";
            nock(url).get("/info").reply(418, { error: "Teapot" });
            await (new TwinClient({url})).info();
            assert.fail("Should throw TwinError");
        } catch (err) {
            console.error(err);
            assert(err instanceof TwinError);
            assert.equal(err.message, "Teapot");
        }
    });
});

describe("TwinAuthError", async function() {
    it("Should throw TwinAuthError when response status is 403", async function() {
        let client = new TwinClient({...payer, apiKey: "definitely-wrong-api-key"});
        try {
            await client.request({ method: "GET", url: "/config" });
        } catch (err) {
            console.error(err)
            assert(err instanceof TwinAuthError);
        }
    });
});

describe("TwinClient.info", async function() {
    it("Should retrieve info", async function() {
        let client = new TwinClient({url: paywall.url});
        let info = await client.info();
        console.log(info);
        assert.equal(info.address, paywall.address);
        assert.deepEqual(info.paywall, paywall.config);
    });
});

describe("TwinClient.balance", async function() {
    it("Should get balance for dq type", async function() {
        let client = new TwinClient(payer);
        let typeHash = paywall.config.targetPayType;
        let res = await client.balance(typeHash);
        assert(res);
        assert.equal(typeof res.balance, "number");
        assert.equal(res.type, typeHash);
    });
});

describe("TwinClient.fetch", async function() {
    it("Should fetch binary toda file from twin", async function() {
        let client = new TwinClient(payer);
        let { binderId } = await client.info();
        let binderBinary = await client.fetch(binderId);
        assert(binderBinary.length > 0);
    });
});

describe("TwinClient.download", async function () {
    it("Should fetch a binary toda file and save it", async function() {
        let storeDir = "./test/download";
        await fs.mkdir(storeDir, { recursive: true });
        try {
            let client = new TwinClient(payer);
            let { binderId } = await client.info();
            let bytes = await client.download(binderId, storeDir);
            assert(bytes.length > 0);
            let bytesOnDisk = await fs.readFile(`${storeDir}/${binderId}.toda`);
            assert.equal(bytesOnDisk.toString(), bytes.toString(), "Bytes should be saved to disk");
        } finally {
            await fs.rm(storeDir, { recursive: true });
        }
    });
});

describe("TwinClient.import", async function() {
    it("Should handle import file failure", async function() {
        try {
            let url = "https://import-file-error";
            let data = Buffer.from("some-binary-file-content");
            nock(url).post("/toda", data).reply(400, { error: "Import error string" });
            await (new TwinClient({url})).import(data);
            assert.fail("Should throw TwinError: Bad Request");
        } catch (err) {
            console.error(err);
            assert(err instanceof TwinError);
            assert.equal(err.message, "Bad Request")
            assert.deepEqual(err.data, { error: "Import error string" });
        }
    });
    it("Should handle import file success", async function() {
        let url = "https://import-file-succes";
        let data = Buffer.from("some-binary-file-content");
        nock(url).post("/toda", data).reply(201, {});
        let res = await (new TwinClient({url})).import(data);
        assert(res);
    });
});

describe("TwinClient.upload", async function() {
   it("Should read file from disk and upload to twin", async function() {
        let storeDir = "./test/upload";
        let fileName = "upload-test-file.toda";
        let filePath = `${storeDir}/${fileName}`;
        let data = Buffer.from("some-binary-file-content");
        await fs.mkdir(storeDir, { recursive: true });
        await fs.writeFile(filePath, data);
        let url = "https://upload-file-success";
        nock(url).post("/toda", data).reply(201, {});
        try {
            let res = await (new TwinClient({url})).upload(filePath)
            assert(res);
        } finally {
            await fs.rm(storeDir, { recursive: true });
        }
   });
});

describe("TwinClient.pay", async function() {
    it("Should validate destination url before attempting transfer", async function() {
        await new Promise(resolve => setTimeout(resolve, 5000));
        try {
            let client = new TwinClient({url: paywall.url, apiKey: paywall.apiKey});
            let url = "https://4123456.tq.biz.todaq.net";
            let tokenTypeHash = paywall.config.targetPayType;
            let amount = paywall.config.targetPayQuantity;
            await client.pay(url, tokenTypeHash, amount);
            assert.fail("Should throw TwinError");
        } catch (err) {
            console.error(err);
            assert(err instanceof TwinError);
            assert.equal(err.message, "Error connecting to destination twin");
        }
    });
    it("Should transfer payment to destination", async function() {
        // NOTE(sfertman): This test transfers from PAYWALL back to the PAYEE twin.
        let client = new TwinClient({url: paywall.url, apiKey: paywall.apiKey});
        let url = payer.url;
        let tokenTypeHash = paywall.config.targetPayType;
        let amount = paywall.config.targetPayQuantity;

        let res = await client.pay(url, tokenTypeHash, amount);
        assert.equal(res.result, "Success");
    });
    it("Should handle 423 when attempting parallel payments", async function() {
        await new Promise(resolve => setTimeout(resolve, 5000));
        try {
            let client = new TwinClient({url: paywall.url, apiKey: paywall.apiKey});
            let url = payer.url;
            let tokenTypeHash = paywall.config.targetPayType;
            let amount = paywall.config.targetPayQuantity;
            await Promise.all([
                client.pay(url, tokenTypeHash, amount),
                client.pay(url, tokenTypeHash, amount)
            ]);
            assert.fail("Should throw TwinBusyError");
        } catch (err) {
            console.error(err);
            assert(err instanceof TwinBusyError);
        }
    });
});

describe("TwinClient.micropay", async function() {
    it("Should throw TwinMicropayAmountMismatchError on wrong amount ", async function() {
        let wrongAmount = 0.1;
        try {
            let client = new TwinClient(payer);
            await client.micropay(paywall.url, paywall.config.targetPayType, wrongAmount)
            assert.fail("Should throw TwinMicropayAmountMismatchError");
        } catch (err) {
            console.error(err);
            assert(err instanceof TwinMicropayAmountMismatchError);
        }
    });
    it("Should throw TwinMicropayTokenMismatchError on wrong token ", async function() {
        let wrongTokenHash = paywall.address; // toda hash but not a token
        try {
            let client = new TwinClient(payer);
            await client.micropay(paywall.url, wrongTokenHash, paywall.config.targetPayQuantity);
            assert.fail("Should throw TwinMicropayTokenMismatchError");
        } catch (err) {
            console.error(err);
            assert(err instanceof TwinMicropayTokenMismatchError);
        }
    });
    it("Should throw TwinMicropayError otherwise" , async function() {
        let payerUrl = "https://payer-twin";
        let payeeUrl = "https://payee-twin";
        let payeeAddress = "mock-address";
        let tokenType = "mock-token-type";
        let quantity = 1;
        let data = { mock: "data" };

        nock(payerUrl)
            .post(`/pay/${payeeAddress}/${tokenType}/${quantity}/https%3A%2F%2Fpayee-twin%2Fpaywall%2F`, data)
            .reply(400, { error: "Any bad micropay request" });

        nock(payeeUrl)
            .get("/info")
            .reply(200, {
                address: "mock-address",
                paywall: {
                    targetPayType: tokenType,
                    targetPayQuantity: quantity }});

        try {
            await (new TwinClient({url: payerUrl})).micropay(payeeUrl, tokenType, quantity, {
                method: "POST",
                data
            });
            assert.fail("Should throw TwinMicropayError");
        } catch (err) {
            console.error(err);
            assert(err instanceof TwinMicropayError);
            assert.equal(err.message, "Bad Request")
            assert.deepEqual(err.data, { error: "Any bad micropay request" });
        }
    });
    it("Should attach path with paywallPath option (and fail w/ 404)", async function() {
        await new Promise(resolve => setTimeout(resolve, 5000));
        let client = new TwinClient(payer);
        try {
            await client.micropay(paywall.url, paywall.config.targetPayType, paywall.config.targetPayQuantity, {paywallPath: "/hello?some-param=42&some-other-param=53"});
            assert.fail("Should throw unhandled TwinError (404)");
        } catch (err) {
            console.error(err);
            assert(err instanceof TwinError);
            assert.equal(err.message, "Unhandled");
            assert.equal(err.data.status, 404);
        }
    });
    it("Should micropay the paywall", async function() {
        await new Promise(resolve => setTimeout(resolve, 5000));
        let client = new TwinClient(payer);
        try {
            let res = await client.micropay(paywall.url, paywall.config.targetPayType, paywall.config.targetPayQuantity, {paywallPath: "?some-param=42&some-other-param=53"});
            assert(res);
        } catch (err) {
            console.error(err);
            assert.fail("should not throw")
        }
    });
});
