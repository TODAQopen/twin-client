import axios from "axios"
import * as err from "./error.js"


class TwinHttpClient {
    constructor({ url, apiKey }) {
        this.twinUrl = url;
        this.apiKey = apiKey;

        this.defaultHeaders = {
            "Content-Type": "application/json"
        };

        this.headers = {
            ...this.defaultHeaders,
        };

        this.clientConfig = {
            baseURL: this.twinUrl,
            headers: this.headers,
            params: apiKey ? { apiKey: this.apiKey } : {},
        };

        this.httpClient = axios.create(this.clientConfig);
    }

    async request(...args) {
        try {
            let res = await this.httpClient.request(...args);
            return res.data;
        } catch (e) {
            if (e.response) {
                let { status, data } = e.response;
                if (status == 400) {
                    throw new err.TwinError("Bad Request", data)
                }
                if (status == 403) {
                    throw new err.TwinAuthError("Forbidden", data);
                }
                throw new err.TwinError("Unhandled", data)
            }
            throw e;
        }
    }
}

class TwinClient extends TwinHttpClient {
    constructor({ url, apiKey }) {
        super({ url, apiKey });
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
            throw new err.TwinMicropayTokenMismatchError();
        }

        if (amount != paywallConfig.targetPayQuantity) {
            throw new err.TwinMicropayAmountMismatchError();
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
