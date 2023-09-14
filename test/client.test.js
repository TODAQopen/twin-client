import assert from "assert";
import { TwinClient } from "../src/client.js";
import {
    TwinError,
    TwinAuthError,
    TwinMicropayError,
    TwinMicropayAmountMismatchError,
    TwinMicropayTokenMismatchError } from "../src/error.js";

const paywall = {
    url: "https://41d83ecbac7b2a50e451ee2a453fb8f4.tq.biz.todaq.net",
    address: "41d83ecbac7b2a50e451ee2a453fb8f46a32fa071c9fab08f0d597eed3d0e74a0e",
    config: {
        targetUrl: "https://example.com",
        targetPayType: "41f88b1490292e22ac37a5da7d9cdb88cffda408ae12a188243ad209e6f9fa5ef9",
        targetPayQuantity: 1
    }
};

const payerClient = new TwinClient({
    url: "https://4112873c42e819316dcfafdddb95a5cf.tq.biz.todaq.net",
    apiKey: "41b95538-b2a5-4aea-9121-a7d4e8558a63"
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
    it("Should micropay the paywall", async function() {
        let res = await payerClient.micropay(paywall.url, paywall.config.targetPayType, paywall.config.targetPayQuantity);
        assert(res);
    });
});
