import axios from "axios"
import { HttpError } from "./error.js"

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
        } catch (err) {
            if (err.response) {
                throw new HttpError(err.response.status, err.response.data);
            }
            throw err;
        }
    }
}

export { TwinHttpClient };
