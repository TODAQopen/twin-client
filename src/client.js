import axios from "axios"

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
            headers,
            params: apiKey ? { apiKey: this.apiKey } : {},
            validateStatus: () => true // do not validate
        };

        this.httpClient = axios.create(this.clientConfig);
    }

    async info() {
        let res = await this.httpClient.get("/info"); 
        return res.data;
    }

    async micropay(url, tokenTypeHash, amount) {
        let destTwinClient = new TwinClient({ url });
        let destInfo = await destTwinClient.info(); 
        let {address: destinationAddress} = destInfo
        let destinationUrl = encodeURI(`${url}/paywall`);
        let res = await this.httpClient({
            method,
            url: `/pay/${destinationAddress}/${tokenTypeHash}/${amount}/${destinationUrl}`
        });

        return res.data;
    }

}

export { TwinClient };
