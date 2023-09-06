import axios from "axios"
import * as err from "./error.js"

class TwinClient {
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

    async info() {
        try {
            let res = await this.httpClient.get("/info"); 
            return res.data;
        } catch (e) {
            if (e.response.status == 403) {
                throw err.TwinAuthError();
            }
            throw new err.TwinError()
        }
    }

    async micropay(url, tokenTypeHash, amount, { method="GET", data }={}) {
        let destTwinClient = new TwinClient({ url });
        let destInfo = await destTwinClient.info(); 
        let {address: destinationAddress} = destInfo
        let destinationUrl = encodeURIComponent(`${url}/paywall`);
        try {
            let res = await this.httpClient.request({
                method,
                url: `/pay/${destinationAddress}/${tokenTypeHash}/${amount}/${destinationUrl}`,
                ... data ? { data } : {}
            });
            return res.data;
        } catch (e) {
            throw new err.TwinMicropayError()
        }
    }
}

export { TwinClient };
