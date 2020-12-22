const baseUrl = "https://www.roblox.com/";

const getSeoName = name => {
	if (!name) {
		return "redirect";
	}

	return name
		// TODO: Make this list more accurate.. is there anything besides quotes? Is underscore valid to remove?
		.replace(/["'_]+/g, "")
		.replace(/\W+/g, "-")
		.replace(/^-+/, "")
		.replace(/-+$/, "");
};

class UrlProvider {
	constructor() {
		this.rbxp = 0;
	}

	getAssetUrl(assetId, assetName) {
		const seoName = getSeoName(assetName);
		let url = `${baseUrl}catalog/${assetId}/${seoName}`;

		if (this.rbxp) {
			url += `?rbxp=${this.rbxp}`;
		}

		return url;
	}

	getBundleUrl(bundleId, bundleName) {
		const seoName = getSeoName(bundleName);
		let url = `${baseUrl}bundles/${bundleId}/${seoName}`;

		if (this.rbxp) {
			url += `?rbxp=${this.rbxp}`;
		}

		return url;
	}
};

export default new UrlProvider();
