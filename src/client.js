import { TwinHttpClient } from "./http.js";
import {
    HttpError,
    TwinError,
    TwinAuthError,
    TwinMicropayAmountMismatchError,
    TwinMicropayTokenMismatchError } from "./error.js"

class TwinClient {
    constructor({ url, apiKey }) {
        this.httpClient = new TwinHttpClient({ url, apiKey});
    }

    async request(...args) {
        try {
            return await this.httpClient.request(...args);
        } catch (err) {
            if (err instanceof HttpError) {
                // handle it here by making more specific errors
                let { status, data } = err;
                if (status == 400) {
                    throw new TwinError("Bad Request", data);
                }
                if (status == 403) {
                    throw new TwinAuthError("Forbidden", data);
                }
                throw new TwinError("Unhandled", data)
            }
            throw err;
        }
    }

    info() {
        return this.request({
            method: "GET",
            url: "/info"
        });
    }

    async micropay(url, tokenTypeHash, amount, { method = "GET", data } = {}) {
        let paywallClient = new TwinClient({ url });
        let paywallInfo = await paywallClient.info();

        let paywallConfig = paywallInfo.paywall;
        if (tokenTypeHash != paywallConfig.targetPayType) {
            throw new TwinMicropayTokenMismatchError("");
        }

        if (amount != paywallConfig.targetPayQuantity) {
            throw new TwinMicropayAmountMismatchError();
        }

        let { address: destinationAddress } = paywallInfo;
        let destinationUrl = encodeURIComponent(`${url}/paywall`);

        return await this.request({
            method,
            url: `/pay/${destinationAddress}/${tokenTypeHash}/${amount}/${destinationUrl}`,
            ...data ? { data } : {}
        });
    }
}

export { TwinClient };
