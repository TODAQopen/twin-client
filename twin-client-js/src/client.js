import { HttpClient } from "./http.js";
import {
    HttpError,
    TwinError,
    TwinAuthError,
    TwinBusyError,
    TwinMicropayAmountMismatchError,
    TwinMicropayTokenMismatchError,
    TwinMicropayError} from "./error.js"

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
                if (status == 401) {
                    throw new TwinAuthError("Unauthorized", data);
                }
                if (status == 403) {
                    throw new TwinAuthError("Forbidden", data);
                }
                if (status == 423) {
                    throw new TwinBusyError(null, data);
                }
                throw new TwinError(data?.error || "Unhandled", err);
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

    balance(typeHash) {
        return this.request({
            method: "GET",
            url: `/dq/${typeHash}`
        });
    }

    async pay(url, tokenTypeHash, amount) {

        try {
            await (new TwinClient({url})).info();
        } catch (err) {
            throw new TwinError("Error connecting to destination twin", err.response || err);
        }

        return this.request({
            method: "POST",
            url: `/dq/${tokenTypeHash}/transfer`,
            data: {
                destination: url,
                amount
            }
        });
    }

    fetch(hash) {
        return this.request({
            method: "GET",
            url: `/toda/${hash}`,
            headers: { "content-type": "application/octet-stream" },
            responseType: "arraybuffer"
        });
    }

    import(file) {
        return this.request({
            method: "POST",
            url: "/toda",
            data: file,
            headers: { "content-type": "application/octet-stream" }
        });
    }

    async micropay(url, tokenTypeHash, amount, {method="GET", paywallPath="", data} = {}) {
        let paywallClient = new TwinClient({ url });
        let paywallInfo = await paywallClient.info();

        let paywallConfig = paywallInfo.paywall;
        if (tokenTypeHash != paywallConfig.targetPayType) {
            throw new TwinMicropayTokenMismatchError(`paywall requires payment of token ${paywallConfig.targetPayType}; attempted to send ${tokenTypeHash}`);
        }

        if (amount != paywallConfig.targetPayQuantity) {
            throw new TwinMicropayAmountMismatchError(`paywall requires payment of ${paywallConfig.targetPayQuantity}; attempted to send ${amount}`);
        }

        let { address: destinationAddress } = paywallInfo;
        let destinationUrl = encodeURIComponent(`${url}/paywall/${paywallPath}`);

        try {
            return await this.request({
                method,
                url: `/pay/${destinationAddress}/${tokenTypeHash}/${amount}/${destinationUrl}`,
                ...data ? { data } : {}
            });
        } catch (err) {
            if (err instanceof TwinError && err.message == "Bad Request") {
                throw TwinMicropayError.fromTwinError(err);
            }
            throw err;
        }
    }
}

export { TwinClient };
