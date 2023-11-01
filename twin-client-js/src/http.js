import axios from "axios"
import { HttpError } from "./error.js"

class HttpClient {
    constructor(url) {
        this.url = url;

        this.httpClient = axios.create({
            baseURL: this.url
        });
    }

    async request(config) {
        try {
            let res = await this.httpClient.request(config);
            return res.data;
        } catch (err) {
            if (err.response) {
                throw new HttpError(err.response.status, err.response.data);
            }
            throw err;
        }
    }
}

export { HttpClient };
