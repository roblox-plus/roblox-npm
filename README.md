# roblox
This module is intended to be used to access the Roblox platform and handle (the best it can) mumbojumbo like `X-CSRF-Token` headers and throttling/retries.

This package is not published by or supported by Roblox, and is published independently. It may break at any time. Feel free to fork it.

## Authentication
### Example
```js
import { RobloxHttpClient } from "roblox";

const robloxHttpClient = new RobloxHttpClient({
	// You can put @tix-factory/http HttpClient options here
	// See: https://www.npmjs.com/package/@tix-factory/http
});

const authenticationTicket = "some authentication ticket that came from https://auth.roblox.com/v1/authentication-ticket (POST, RBX-Authentication-Ticket header)";
robloxHttpClient.authenticate(authenticationTicket).then(user => {
	console.log("logged in as", user);
}).catch(err => {
	// Failed to authenticate :(
	console.error(err);
});
```

## Catalog
### Example
```js
import { RobloxHttpClient, CatalogClient } from "roblox";

const robloxHttpClient = new RobloxHttpClient({
	// You can put @tix-factory/http HttpClient options here
	// See: https://www.npmjs.com/package/@tix-factory/http
});

const robloxCatalogClient = new RobloxCatalogClient(robloxHttpClient, err => {
	// An error occurred while sending a request through the client.
	// Because the request is retried/batched it's possible this will not affect any awaiting promises.
	// This method exists so the module doesn't completely drop the error into the void.
	// You can expect any individual method call to reject if it maxes out on retries.
	console.warn("An unexpected error occurred while processing catalog request", err);
}, {
	// These are some options that can be overridden, they have defaults if you don't though
	bundleCacheExpiryInMilliseconds: 1000,
	assetCacheExpiryInMilliseconds: 1000,

	// these are wait times before sending requests
	// 15 seconds is high, but I've found it necessary to make sure to avoid 429s
	minProcessDelay: 15 * 1000,
	processDelay: 1000
});

robloxCatalogClient.getAsset(1272714).then(asset => {
	// We loaded an asset!
	console.log(asset);
}).catch(err => {
	// oh no
	console.error(err);
});
```

## Thumbnails
### Example
```js
import { RobloxHttpClient, ThumbnailsClient } from "roblox";

const robloxHttpClient = new RobloxHttpClient({
	// You can put @tix-factory/http HttpClient options here
	// See: https://www.npmjs.com/package/@tix-factory/http
});

const thumbnailsClient = new ThumbnailsClient(robloxHttpClient, err => {
	console.warn("An unexpected error occurred while processing thumbnail request", err);
}, {
	// Thumbnails client specific options woooo
});
```

## Users
### Example
```js
import { RobloxHttpClient, UsersClient } from "roblox";

const robloxHttpClient = new RobloxHttpClient({
	// You can put @tix-factory/http HttpClient options here
	// See: https://www.npmjs.com/package/@tix-factory/http
});

const usersClient = new UsersClient(robloxHttpClient, err => {
	console.warn("An unexpected error occurred while processing user request", err);
}, {
	// Users client specific options woooo
});
```
