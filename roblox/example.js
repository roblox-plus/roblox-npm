import { RobloxHttpClient, CatalogClient } from "./index.js";

const httpClient = new RobloxHttpClient({
	requestTimeout: 30 * 1000
});

const catalogClient = new CatalogClient(httpClient, err => {
	console.error("An unexpected error occurred while processing request", err);
}, {
	cacheExpiryInMilliseconds: 15 * 1000
});

const authenticationTicket = "GET FROM https://auth.roblox.com/v1/authentication-ticket (HEADER: RBX-Authentication-Ticket)";
httpClient.authenticate(authenticationTicket).then(user => {
	console.log("authenticated!", user);

	catalogClient.getAsset(1272714).then(asset => {
		console.log(asset);
	}).catch(err => {
		console.error("rip wanwood antlers", err);
	});
	
	catalogClient.getAssetResaleData(2470750640).then(assetResaleData => {
		console.log(assetResaleData);
	}).catch(err => {
		console.error("rip the resale data", err);
	});
	
	catalogClient.getBundle(192).then(bundle => {
		console.log(bundle);
	}).catch(err => {
		console.error("rip korblox deathspeaker", err);
	});

	catalogClient.getAssetResellers(1272714).then(resellers => {
		console.log(resellers);
	}).catch(err => {
		console.error("rip resellers", err);
	});
}).catch(err => {
	console.error("rip authenticated user", err);
});
