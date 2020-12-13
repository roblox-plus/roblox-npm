import { HttpClient } from "@tix-factory/http";
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
};
