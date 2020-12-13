import { HttpRequest, HttpRequestError, httpMethods } from "@tix-factory/http";
import AssetTypesById from "./../constants/assetTypesById.js";
import BatchItemProcessor from "./../implementation/batchItemProcessor.js";

const defaultSettings = {
	// The catalog Api is pretty heavily throttled.
	// By default we want to wait a while between requests, to enforce the maximum batch size when possible.
	processDelay: 100,
	minProcessDelay: 10 * 1000,

	batchSize: 100,

	assetCacheExpiryInMilliseconds: 60 * 1000,
	bundleCacheExpiryInMilliseconds: 60 * 1000,
	resaleDataCacheExpiryInMilliseconds: 60 * 1000,

	retryCooldownInMilliseconds: 1000
};

export default class {
	constructor(httpClient, errorHandler, settings) {
		this.httpClient = httpClient;
		this.assetCache = {};
		this.bundleCache = {};
		this.assetResaleCache = {};

		if (!settings) {
			settings = {};
		}

		for (let key in defaultSettings) {
			if (!settings.hasOwnProperty(key)) {
				settings[key] = defaultSettings[key];
			}
		}

		this.settings = settings;

		this.assetDetailsBatchProcessor = new BatchItemProcessor({
			minProcessDelay: settings.minProcessDelay,
			processDelay: settings.processDelay,
			batchSize: settings.batchSize
		}, this.loadAssets.bind(this), errorHandler);

		this.bundleDetailsBatchProcessor = new BatchItemProcessor({
			minProcessDelay: settings.minProcessDelay,
			processDelay: settings.processDelay,
			batchSize: settings.batchSize
		}, this.loadBundles.bind(this), errorHandler);

		this.assetResaleBatchProcessor = new BatchItemProcessor({
			// The asset resale data endpoint does not support batching.
			// We use the batch processor anyway for the retries, and consistency.
			// Additionally, we can hope someday it might support batching...
			minProcessDelay: 1000,
			processDelay: 0,
			batchSize: 1
		}, this.loadAssetResaleData.bind(this), errorHandler);
	}

	getAsset(assetId) {
		if (this.assetCache.hasOwnProperty(assetId)) {
			// I suppose there _could_ be a race condition here...
			return Promise.resolve(this.assetCache[assetId]);
		}

		return new Promise((resolve, reject) => {
			this.assetDetailsBatchProcessor.push(assetId).then(asset => {
				if (this.settings.assetCacheExpiryInMilliseconds > 0) {
					this.assetCache[assetId] = asset;

					setTimeout(() => {
						delete this.assetCache[assetId];
					}, this.settings.assetCacheExpiryInMilliseconds);
				}

				resolve(asset);
			}).catch(reject);
		});
	}

	getAssetResaleData(assetId) {
		if (this.assetResaleCache.hasOwnProperty(assetId)) {
			// I suppose there _could_ be a race condition here...
			return Promise.resolve(this.assetResaleCache[assetId]);
		}

		return new Promise((resolve, reject) => {
			this.assetResaleBatchProcessor.push(assetId).then(assetResaleData => {
				if (this.settings.resaleDataCacheExpiryInMilliseconds > 0) {
					this.assetResaleCache[assetId] = assetResaleData;

					setTimeout(() => {
						delete this.assetResaleCache[assetId];
					}, this.settings.resaleDataCacheExpiryInMilliseconds);
				}

				resolve(assetResaleData);
			}).catch(reject);
		});
	}

	getBundle(bundleId) {
		if (this.bundleCache.hasOwnProperty(bundleId)) {
			// I suppose there _could_ be a race condition here...
			return Promise.resolve(this.bundleCache[bundleId]);
		}

		return new Promise((resolve, reject) => {
			this.bundleDetailsBatchProcessor.push(bundleId).then(bundle => {
				if (this.settings.bundleCacheExpiryInMilliseconds > 0) {
					this.bundleCache[bundleId] = bundle;

					setTimeout(() => {
						delete this.bundleCache[bundleId];
					}, this.settings.bundleCacheExpiryInMilliseconds);
				}

				resolve(bundle);
			}).catch(reject);
		});
	}

	loadAssets(assetIds) {
		return new Promise(async (resolve, reject) => {
			const httpRequest = new HttpRequest(httpMethods.post, new URL(`https://catalog.roblox.com/v1/catalog/items/details`));
			httpRequest.addOrUpdateHeader("Content-Type", "application/json");
			httpRequest.body = Buffer.from(JSON.stringify({
				items: assetIds.map(i => {
					return {
						id: i,
						itemType: "Asset",
						key: `Asset_${i}`,
						thumbnailType: "assetThumbnail"
					};
				})
			}));

			this.httpClient.send(httpRequest).then(httpResponse => {
				if (httpResponse.statusCode !== 200) {
					reject(new HttpRequestError(httpRequest, httpResponse));
					return;
				}

				const results = [];
				const responseBody = JSON.parse(httpResponse.body.toString());
				const assetsById = Object.fromEntries(responseBody.data.map(a => [a.id, a]));

				assetIds.forEach(assetId => {
					const asset = assetsById[assetId];
					if (asset) {
						const itemRestrictions = asset.itemRestrictions || [];
						results.push({
							item: assetId,
							value: {
								id: asset.id,

								name: asset.name,

								description: asset.description,

								price: asset.price === 0 ? 0 : (asset.price || null),

								creator: {
									id: asset.creatorTargetId,
									type: asset.creatorType
								},

								productId: asset.productId,

								limited: itemRestrictions.includes("LimitedUnqiue") || itemRestrictions.includes("Limited"),

								// Safety precaution? In case Roblox changes this from an int -> string?
								// Wouldn't be the first time a breaking change has been made to a response body :shrug:
								assetType: typeof (asset.assetType) === "number" ? AssetTypesById[asset.assetType] : asset.assetType,

								// TODO: The actual off sale date time... this requires there to be an item in the catalog with an off sale date time so I can figure out how to parse it.
								// Roblox appears to be hide as much relevant documentation as possible to make third party development as difficult as possible.
								offSaleDateTime: null
							},
							success: true
						});
					} else {
						results.push({
							item: assetId,
							value: null,
							success: true
						});
					}
				});

				resolve(results);
			}).catch(reject);
		});
	}

	loadBundles(bundleIds) {
		return new Promise(async (resolve, reject) => {
			const httpRequest = new HttpRequest(httpMethods.get, new URL(`https://catalog.roblox.com/v1/bundles/details?bundleIds=${bundleIds.join(",")}`));

			this.httpClient.send(httpRequest).then(httpResponse => {
				if (httpResponse.statusCode !== 200) {
					reject(new HttpRequestError(httpRequest, httpResponse));
					return;
				}

				const results = [];
				const responseBody = JSON.parse(httpResponse.body.toString());
				const bundlesById = Object.fromEntries(responseBody.map(b => [b.id, b]));

				bundleIds.forEach(bundleId => {
					const bundle = bundlesById[bundleId];
					if (bundle) {
						const resultBundle = {
							id: bundle.id,
							name: bundle.name,
							description: bundle.description,
							bundleType: bundle.bundleType,

							creator: {
								id: bundle.creator.id,
								type: bundle.creator.type
							},

							items: bundle.items.map(i => {
								// I realize this strips out the 'owned' field... this is in anticipation for it to not be supported in the future.
								// it's the only piece of information in this response that isn't static information about the bundle
								// and is dynamic based on the authenticated user
								return {
									id: i.id,
									name: i.name,
									type: i.type
								};
							}),

							price: null,
							productId: null
						};

						if (bundle.product) {
							resultBundle.productId = bundle.product.id;
							resultBundle.price = bundle.product.isPublicDomain ? 0 : (bundle.product.isForSale ? bundle.product.priceInRobux : null)
						}

						results.push({
							item: bundleId,
							value: resultBundle,
							success: true
						});
					} else {
						results.push({
							item: bundleId,
							value: null,
							success: true
						});
					}
				});

				resolve(results);
			}).catch(reject);
		});
	}

	loadAssetResaleData(assetIds) {
		return new Promise(async (resolve, reject) => {
			const httpRequest = new HttpRequest(httpMethods.get, new URL(`https://economy.roblox.com/v1/assets/${assetIds[0]}/resale-data`));

			this.httpClient.send(httpRequest).then(httpResponse => {
				switch (httpResponse.statusCode) {
					case 200:
						const responseBody = JSON.parse(httpResponse.body.toString());
						resolve([
							{
								item: assetIds[0],
								// Someday I will regret not translating this response.
								value: responseBody,
								success: true
							}
						]);

						return;
					case 400:
						resolve([
							{
								item: assetIds[0],
								value: null,
								success: true
							}
						]);

						return;
					default:
						reject(new HttpRequestError(httpRequest, httpResponse));

						return;
				}
			}).catch(reject);
		});

	}
}