import { RobloxHttpClient, CatalogClient, ThumbnailsClient, UsersClient } from "./index.js";

const httpClient = new RobloxHttpClient({
	requestTimeout: 30 * 1000
});

const catalogClient = new CatalogClient(httpClient, err => {
	console.error("An unexpected error occurred while processing catalog request", err);
}, {
	cacheExpiryInMilliseconds: 15 * 1000
});

const usersClient = new UsersClient(httpClient, err => {
	console.error("An unexpected error occurred while processing user request", err);
}, {
	cacheExpiryInMilliseconds: 15 * 1000
});

const thumbnailsClient = new ThumbnailsClient(httpClient, err => {
	console.error("An unexpected error occurred while processing thumbnail request", err);
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

	usersClient.getUserNameById(3336955).then(userName => {
		console.log("USER NAME:", userName);
	}).catch(err => {
		console.error("rip username", err);
	});

	usersClient.getUserIdByName("WebGL3D").then(userId => {
		console.log("USER ID:", userId);
	}).catch(err => {
		console.error("rip userId", err);
	});

	thumbnailsClient.getUserHeadershotThumbnail(48103520, "420x420").then(thumb => {
		console.log("WebGL3D's headshot:", thumb);
	}).catch(err => {
		console.error("rip headshot thumbnail", err);
	});

	thumbnailsClient.getAssetThumbnail(1272714, "420x420").then(thumb => {
		console.log("Wanwood antlers be like:", thumb);
	}).catch(err => {
		console.error("rip asset thumbnail", err);
	});

	thumbnailsClient.getBundleThumbnail(192, "420x420").then(thumb => {
		console.log("bundles thumbnails are:", thumb);
	}).catch(err => {
		console.error("rip bundle thumbnail", err);
	});
}).catch(err => {
	console.error("rip authenticated user", err);
});
