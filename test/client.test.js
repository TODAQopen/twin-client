import assert from "assert";
import { TwinClient } from "../src/client.js";
import {
    TwinError,
    TwinAuthError,
    TwinMicropayError,
    TwinMicropayAmountMismatchError,
    TwinMicropayTokenMismatchError } from "../src/error.js";

const paywall = {
    url: "https://41cb6b639b57b0e02ba4e2846cba8ca1.tq.biz.todaq.net",
    address: "41cb6b639b57b0e02ba4e2846cba8ca19d24c6b474038763adb0052b747e16dd3f",
    config: {
        targetUrl: "https://example.com",
        targetPayType: "416c211b974961041c0df25e477a8c9feeac479444da73fca08eda652b042c69c9",
        targetPayQuantity: 1
    }
};

const payerClient = new TwinClient({
    url: "https://41692d1e30fe869cf0c8f07838655635.tq.biz.todaq.net",
    apiKey: "2e2bb15f-0355-4dd2-84b4-35a4d9ddf63c"
});

describe("TwinError", async function() {
    it("Should throw TwinError when error is not handled", async function() {
        try {
            await payerClient.request({method: "GET", url: "/not-an-endpoint"}); // the twin will respond with 404
        } catch (err) {
            console.error(err)
            assert(err instanceof TwinError);
        }
    });
});

describe("TwinAuthError", async function() {
    it("Should throw TwinAuthError when response status is 403", async function() {
        let client = new TwinClient({url: payerClient.httpClient.url, apiKey: "definitely-wrong-api-key"});
        try {
            await client.request({ method: "GET", url: "/config" });
        } catch (err) {
            console.error(err)
            assert(err instanceof TwinAuthError);
        }
    });
});

describe("info", async function() {
    it("Should retrieve info", async function() {
        let client = new TwinClient({url: paywall.url});
        let info = await client.info();
        console.log(info);
        assert.equal(info.address, paywall.address);
        assert.deepEqual(info.paywall, paywall.config);
    });
});

describe("micropay", async function() {
    it("Should throw TwinMicropayAmountMismatchError on wrong amount ", async function() {
        let wrongAmount = 0.1;
        try {
            await payerClient.micropay(paywall.url, paywall.config.targetPayType, wrongAmount)
            assert.fail("Should throw TwinMicropayAmountMismatchError");
        } catch (err) {
            console.error(err);
            assert(err instanceof TwinMicropayAmountMismatchError);
        }
    });
    it("Should throw TwinMicropayTokenMismatchError on wrong token ", async function() {
        let wrongTokenHash = paywall.address; // toda hash but not a token
        try {
            await payerClient.micropay(paywall.url, wrongTokenHash, paywall.config.targetPayQuantity);
        } catch (err) {
            console.error(err);
            assert(err instanceof TwinMicropayTokenMismatchError);
        }
    });
    xit("Should throw TwinMicropayError otherwise" , async function() {

    });
    xit("Should micropay the paywall", async function() {
        let res = await payerClient.micropay(paywall.url, paywall.config.targetPayType, paywall.config.targetPayQuantity);
        assert(res);
    });
});
