import { HttpHandler, httpMethods } from "@tix-factory/http";

const robloxDomain = ".roblox.com";
const xsrfHeaderName = "X-CSRF-Token";
const maxRetries = 2;
const xsrfStatusCode = 403;
const xsrfHttpMethods = [httpMethods.post, httpMethods.put, httpMethods.delete, httpMethods.patch];

export default class extends HttpHandler {
	constructor() {
		super();

		this._xsrfToken = "";
	}

	async execute(httpRequest) {
		if (!xsrfHttpMethods.includes(httpRequest.method) || !httpRequest.url.hostname.endsWith(robloxDomain)) {
			return await super.execute(httpRequest);
		}

		let httpResponse = null;
		for (let i = 0; i < maxRetries; i++) {
			if (this._xsrfToken) {
				httpRequest.addOrUpdateHeader(xsrfHeaderName, this._xsrfToken);
			}

			httpResponse = await super.execute(httpRequest);

			if (httpResponse.statusCode === xsrfStatusCode) {
				let returnedXsrfToken = httpResponse.getHeader(xsrfHeaderName);
				if (returnedXsrfToken) {
					this._xsrfToken = returnedXsrfToken;
					continue;
				}
			}

			break;
		}

		return Promise.resolve(httpResponse);
	}
};
