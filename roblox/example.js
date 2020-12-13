import { RobloxHttpClient, CatalogClient } from "./index.js";

const httpClient = new RobloxHttpClient({
	requestTimeout: 30 * 1000
});

const catalogClient = new CatalogClient(httpClient, err => {
	console.error("An unexpected error occurred while processing request", err);
}, {
	cacheExpiryInMilliseconds: 15 * 1000
});

catalogClient.getAsset(1272714).then(asset => {
	console.log(asset);
}).catch(err => {
	console.error("rip wanwood antlers", err);
});

catalogClient.getBundle(192).then(bundle => {
	console.log(bundle);
}).catch(err => {
	console.error("rip korblox deathspeaker", err);
});
