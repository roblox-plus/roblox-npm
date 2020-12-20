import { HttpRequest, HttpRequestError, httpMethods } from "@tix-factory/http";
import { BatchItemProcessor } from "@tix-factory/queueing";

const defaultSettings = {
	processDelay: 100,
	minProcessDelay: 500,

	batchSize: 100,

	cacheExpiry: 60 * 1000,

	retryCooldownInMilliseconds: 1000
};

export default class {
	constructor(httpClient, errorHandler, settings) {
		this.httpClient = httpClient;
		this.thumbnailsCache = {};

		if (!settings) {
			settings = {};
		}

		for (let key in defaultSettings) {
			if (!settings.hasOwnProperty(key)) {
				settings[key] = defaultSettings[key];
			}
		}

		this.settings = settings;

		this.thumbnailsBatchProcessor = new BatchItemProcessor({
			minProcessDelay: settings.minProcessDelay,
			processDelay: settings.processDelay,
			batchSize: settings.batchSize
		}, this.loadThumbnails.bind(this), errorHandler);
	}

	getAssetThumbnail(assetId, size) {
		const cacheKey = `Asset_${assetId}_${size}`;
		if (this.thumbnailsCache.hasOwnProperty(cacheKey)) {
			// I suppose there _could_ be a race condition here...
			return Promise.resolve(this.thumbnailsCache[cacheKey]);
		}

		return new Promise((resolve, reject) => {
			this.thumbnailsBatchProcessor.push({
				id: assetId,
				size: size,
				type: "Asset"
			}).then(thumbnail => {
				if (this.settings.cacheExpiry > 0) {
					this.thumbnailsCache[cacheKey] = thumbnail;

					setTimeout(() => {
						delete this.thumbnailsCache[cacheKey];
					}, this.settings.cacheExpiry);
				}

				resolve(thumbnail);
			}).catch(reject);
		});
	}

	getBundleThumbnail(bundleId, size) {
		const cacheKey = `Bundle_${bundleId}_${size}`;
		if (this.thumbnailsCache.hasOwnProperty(cacheKey)) {
			// I suppose there _could_ be a race condition here...
			return Promise.resolve(this.thumbnailsCache[cacheKey]);
		}

		return new Promise((resolve, reject) => {
			this.thumbnailsBatchProcessor.push({
				id: bundleId,
				size: size,
				type: "BundleThumbnail"
			}).then(thumbnail => {
				if (this.settings.cacheExpiry > 0) {
					this.thumbnailsCache[cacheKey] = thumbnail;

					setTimeout(() => {
						delete this.thumbnailsCache[cacheKey];
					}, this.settings.cacheExpiry);
				}

				resolve(thumbnail);
			}).catch(reject);
		});
	}

	getUserHeadershotThumbnail(userId, size) {
		const cacheKey = `UserHeadshot_${userId}_${size}`;
		if (this.thumbnailsCache.hasOwnProperty(cacheKey)) {
			// I suppose there _could_ be a race condition here...
			return Promise.resolve(this.thumbnailsCache[cacheKey]);
		}

		return new Promise((resolve, reject) => {
			this.thumbnailsBatchProcessor.push({
				id: userId,
				size: size,
				type: "AvatarHeadShot"
			}).then(thumbnail => {
				if (this.settings.cacheExpiry > 0) {
					this.thumbnailsCache[cacheKey] = thumbnail;

					setTimeout(() => {
						delete this.thumbnailsCache[cacheKey];
					}, this.settings.cacheExpiry);
				}

				resolve(thumbnail);
			}).catch(reject);
		});
	}

	loadThumbnails(requests) {
		return new Promise(async (resolve, reject) => {
			const httpRequest = new HttpRequest(httpMethods.post, new URL(`https://thumbnails.roblox.com/v1/batch`));
			httpRequest.addOrUpdateHeader("Content-Type", "application/json");
			httpRequest.addOrUpdateHeader("Content-Encoding", "gzip");
			httpRequest.body = Buffer.from(JSON.stringify(requests.map(r => {
				return {
					requestId: `${r.type}_${r.id}_${r.size}`,
					targetId: r.id,
					size: r.size,
					type: r.type
				};
			})));

			this.httpClient.send(httpRequest).then(httpResponse => {
				if (httpResponse.statusCode !== 200) {
					reject(new HttpRequestError(httpRequest, httpResponse));
					return;
				}

				const responseBody = JSON.parse(httpResponse.body.toString());
				const results = [];
				const itemsByRequestId = Object.fromEntries(requests.map(r => [`${r.type}_${r.id}_${r.size}`, r]));
				const thumbnailsByRequestId = Object.fromEntries(responseBody.data.map(t => [t.requestId, {
					state: t.state,
					imageUrl: t.imageUrl
				}]));

				requests.forEach(request => {
					const requestId = `${request.type}_${request.id}_${request.size}`;
					const thumbnail = thumbnailsByRequestId[requestId];
					if (thumbnail.state === "Pending") {
						return;
					}

					results.push({
						item: itemsByRequestId[requestId],
						value: thumbnail,
						success: true
					});
				});

				resolve(results);
			}).catch(reject);
		});
	}
}