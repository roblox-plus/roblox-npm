import { HttpClient, HttpRequest, HttpRequestError, httpMethods } from "@tix-factory/http";
import XsrfTokenHandler from "./../handlers/xsrfTokenHandler.js";

const modifyOptions = options => {
	if (!options) {
		options = {};
	}

	if (!options.handlers) {
		options.handlers = [];
	}

	options.handlers.push(new XsrfTokenHandler());
	
	return options;
};

export default class extends HttpClient {
	constructor(options) {
		super(modifyOptions(options));
	}

	async getAuthenticatedUser() {
		const httpRequest = new HttpRequest(httpMethods.get, new URL("https://users.roblox.com/v1/users/authenticated"));
		const httpResponse = await this.send(httpRequest);
		if (httpResponse.statusCode !== 200) {
			return Promise.reject(new HttpRequestError(httpRequest, httpResponse));
		}

		const user = JSON.parse(httpResponse.body.toString());
		return Promise.resolve(user);
	}

	async authenticate(authenticationTicket) {
		const httpRequest = new HttpRequest(httpMethods.post, new URL("https://auth.roblox.com/v1/authentication-ticket/redeem"));
		httpRequest.addOrUpdateHeader("Content-Type", "application/json");
		httpRequest.addOrUpdateHeader("RBXAuthenticationNegotiation", "https://www.npmjs.com/package/roblox");
		httpRequest.body = Buffer.from(JSON.stringify({
			authenticationTicket: authenticationTicket
		}));

		const httpResponse = await this.send(httpRequest);
		switch (httpResponse.statusCode) {
			case 200:
			case 204:
				return this.getAuthenticatedUser();
			default:
				return Promise.reject(new HttpRequestError(httpRequest, httpResponse));
		}
	}
};
