import assert from "assert";
import { TwinClient } from "../src/client.js";
import { TwinAuthError, TwinError } from "../src/error.js";
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
            await payerClient.request({method: "GET", url: "/not-an-endpoint"});
        } catch (err) {
            console.error(err)
            assert(err instanceof TwinError);
        }
    });
});

describe("TwinAuthError", async function() {
    it("Should throw TwinAuthError when response status is 403", async function() {
        let client = new TwinClient({url: payerClient.twinUrl, apiKey: "definitely-wrong-api-key"});
        try {
            await client.request({method: "GET", url: "/config"});
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

xdescribe("micropay", async function() {
    it("Should micropay the paywall", async function() {
        let res = await payerClient.micropay(paywall.url, paywall.config.targetPayType, paywall.config.targetPayQuantity);
        assert(res);
    });
});
