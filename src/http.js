import axios from "axios"
import { TwinError, TwinAuthError } from "./error.js"

class TwinHttpClient {
    constructor({ url, apiKey }) {
        this.url = url;
        this.apiKey = apiKey;

        this.defaultHeaders = {
            "Content-Type": "application/json"
        };

        this.headers = {
            ...this.defaultHeaders,
        };

        this.clientConfig = {
            baseURL: this.url,
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
                    throw new TwinError("Bad Request", data)
                }
                if (status == 403) {
                    throw new TwinAuthError("Forbidden", data);
                }
                throw new TwinError("Unhandled", data)
            }
            throw e;
        }
    }
}

export { TwinHttpClient };
