import assert from "assert";
import { TwinClient } from "../src/client.js";

const paywallUrl = "https://41cb6b639b57b0e02ba4e2846cba8ca1.tq.biz.todaq.net";
const tokenTypeHash = "416c211b974961041c0df25e477a8c9feeac479444da73fca08eda652b042c69c9";

const payerClient = new TwinClient({
  url: "https://41692d1e30fe869cf0c8f07838655635.tq.biz.todaq.net",
  apiKey: "2e2bb15f-0355-4dd2-84b4-35a4d9ddf63c"
});

describe("micropay", async function() {
  it("Should micropay the paywall", async function() {
    let res = await payerClient.micropay(paywallUrl, tokenTypeHash, 1);
    assert.equal(res.status, 200);
  });
});