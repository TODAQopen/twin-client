import { HttpClient } from "./http.js";
import {
    HttpError,
    TwinError,
    TwinAuthError,
    TwinMicropayAmountMismatchError,
    TwinMicropayTokenMismatchError } from "./error.js"

class TwinClient {
    constructor({ url, apiKey }) {
        this.url = url;
        this.apiKey = apiKey;
        this.httpClient = new HttpClient(url);
    }

    async request(config) {
        try {
            let reqConfig = config;

            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }

            if (!reqConfig.headers["content-type"]) {
                reqConfig.headers["content-type"] = "application/json";
            }

            if (!reqConfig.params) {
                reqConfig.params = {};
            }

            if (!reqConfig.params.apiKey) {
                if (this.apiKey) {
                    reqConfig.params.apiKey = this.apiKey;
                }
            }

            return await this.httpClient.request(reqConfig);
            // add apiKey here
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
