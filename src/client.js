import * as err from "./error.js"
import { TwinHttpClient } from "./http.js";

class TwinClient {
    constructor({ url, apiKey }) {
        this.httpClient = new TwinHttpClient({ url, apiKey});
    }

    info() {
        return this.httpClient.request({
            method: "GET",
            url: "/info"
        });
    }

    async micropay(url, tokenTypeHash, amount, { method = "GET", data } = {}) {
        let paywallClient = new TwinClient({ url });
        let paywallInfo = await paywallClient.info();

        let paywallConfig = paywallInfo.paywall;
        if (tokenTypeHash != paywallConfig.targetPayType) {
            throw new err.TwinMicropayTokenMismatchError("");
        }

        if (amount != paywallConfig.targetPayQuantity) {
            throw new err.TwinMicropayAmountMismatchError();
        }

        let { address: destinationAddress } = paywallInfo;
        let destinationUrl = encodeURIComponent(`${url}/paywall`);

        return await this.httpClient.request({
            method,
            url: `/pay/${destinationAddress}/${tokenTypeHash}/${amount}/${destinationUrl}`,
            ...data ? { data } : {}
        });
    }
}

export { TwinClient };
