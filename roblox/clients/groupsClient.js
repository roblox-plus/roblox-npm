import { HttpRequest, HttpRequestError, httpMethods } from "@tix-factory/http";
import { BatchItemProcessor } from "@tix-factory/queueing";

const defaultSettings = {
	processDelay: 100,
	minProcessDelay: 500,

	// The max number of items that can be queued for batching at a single time.
	// If the queue.length exceeds this, new pushes will be rejected.
	maxQueueSize: Infinity,

	batchSize: 50,

	cacheExpiry: 5 * 60 * 1000,

	retryCooldownInMilliseconds: 1000
};

export default class {
	constructor(httpClient, errorHandler, settings) {
		this.httpClient = httpClient;
		this.groupsByIdCache = {};

		if (!settings) {
			settings = {};
		}

		for (let key in defaultSettings) {
			if (!settings.hasOwnProperty(key)) {
				settings[key] = defaultSettings[key];
			}
		}

		this.settings = settings;

		this.groupsByIdBatchProcessor = new BatchItemProcessor({
			minProcessDelay: settings.minProcessDelay,
			processDelay: settings.processDelay,
			batchSize: settings.batchSize,
			maxQueueSize: settings.maxQueueSize
		}, this.loadGroupById.bind(this), errorHandler);
	}

	getGroupById(groupId) {
		if (this.groupsByIdCache.hasOwnProperty(groupId)) {
			// I suppose there _could_ be a race condition here...
			return Promise.resolve(this.groupsByIdCache[groupId]);
		}

		return new Promise((resolve, reject) => {
			this.groupsByIdBatchProcessor.push(groupId).then(group => {
				if (this.settings.cacheExpiry > 0 && group && group.id) {
					this.groupsByIdCache[group.id] = group;

					setTimeout(() => {
						delete this.groupsByIdCache[group.id];
					}, this.settings.cacheExpiry);
				}

				resolve(group ? {
					id: group.id,
					name: group.name,
					owner: {
						id: group.owner.id,
						type: group.owner.type
					}
				} : null);
			}).catch(reject);
		});
	}

	loadGroupById(groupIds) {
		return new Promise(async (resolve, reject) => {
			const httpRequest = new HttpRequest(httpMethods.get, new URL(`https://groups.roblox.com/v2/groups?groupIds=${groupIds.join(",")}`));
			this.httpClient.send(httpRequest).then(httpResponse => {
				if (httpResponse.statusCode !== 200) {
					reject(new HttpRequestError(httpRequest, httpResponse));
					return;
				}

				const responseBody = JSON.parse(httpResponse.body.toString());
				const groupsByIds = Object.fromEntries(responseBody.data.map(g => [g.id, g]));
				
				resolve(groupIds.map(groupId => {
					return {
						item: groupId,
						value: groupsByIds[groupId],
						success: true
					};
				}));
			}).catch(reject);
		});
	}
}