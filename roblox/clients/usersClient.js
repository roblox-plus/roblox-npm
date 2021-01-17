import { HttpRequest, HttpRequestError, httpMethods } from "@tix-factory/http";
import { BatchItemProcessor } from "@tix-factory/queueing";

const defaultSettings = {
	processDelay: 100,
	minProcessDelay: 500,

	// The max number of items that can be queued for batching at a single time.
	// If the queue.length exceeds this, new pushes will be rejected.
	maxQueueSize: Infinity,

	batchSize: 100,

	cacheExpiry: 60 * 1000,

	retryCooldownInMilliseconds: 1000
};

export default class {
	constructor(httpClient, errorHandler, settings) {
		this.httpClient = httpClient;
		this.userNamesByIdCache = {};
		this.userIdsByNameCache = {};

		if (!settings) {
			settings = {};
		}

		for (let key in defaultSettings) {
			if (!settings.hasOwnProperty(key)) {
				settings[key] = defaultSettings[key];
			}
		}

		this.settings = settings;

		this.usersByNameBatchProcessor = new BatchItemProcessor({
			minProcessDelay: settings.minProcessDelay,
			processDelay: settings.processDelay,
			batchSize: settings.batchSize,
			maxQueueSize: settings.maxQueueSize
		}, this.loadUsersByName.bind(this), errorHandler);

		this.usersByIdBatchProcessor = new BatchItemProcessor({
			minProcessDelay: settings.minProcessDelay,
			processDelay: settings.processDelay,
			batchSize: settings.batchSize,
			maxQueueSize: settings.maxQueueSize
		}, this.loadUsersById.bind(this), errorHandler);
	}

	getUserNameById(userId) {
		if (this.userNamesByIdCache.hasOwnProperty(userId)) {
			// I suppose there _could_ be a race condition here...
			return Promise.resolve(this.userNamesByIdCache[userId]);
		}

		return new Promise((resolve, reject) => {
			this.usersByIdBatchProcessor.push(userId).then(user => {
				if (this.settings.cacheExpiry > 0 && user && user.name && user.id) {
					const usernameCacheKey = user.name.toLowerCase();
					this.userNamesByIdCache[user.id] = user.name;
					this.userIdsByNameCache[usernameCacheKey] = user.id;

					setTimeout(() => {
						delete this.userNamesByIdCache[user.id];
						delete this.userIdsByNameCache[usernameCacheKey];
					}, this.settings.cacheExpiry);
				}

				resolve(user ? user.name : null);
			}).catch(reject);
		});
	}

	getUserIdByName(userName) {
		const cacheKey = userName.toLowerCase();
		if (this.userIdsByNameCache.hasOwnProperty(cacheKey)) {
			// I suppose there _could_ be a race condition here...
			return Promise.resolve(this.userIdsByNameCache[cacheKey]);
		}

		return new Promise((resolve, reject) => {
			this.usersByNameBatchProcessor.push(userName).then(user => {
				if (this.settings.cacheExpiry > 0 && user && user.name && user.id) {
					const usernameCacheKey = user.name.toLowerCase();
					this.userNamesByIdCache[user.id] = user.name;
					this.userIdsByNameCache[cacheKey] = user.id;
					this.userIdsByNameCache[usernameCacheKey] = user.id;

					setTimeout(() => {
						delete this.userNamesByIdCache[user.id];
						delete this.userIdsByNameCache[cacheKey];
						delete this.userIdsByNameCache[usernameCacheKey];
					}, this.settings.cacheExpiry);
				}

				resolve(user ? user.id : null);
			}).catch(reject);
		});

	}

	loadUsersByName(userNames) {
		return new Promise(async (resolve, reject) => {
			const httpRequest = new HttpRequest(httpMethods.post, new URL(`https://users.roblox.com/v1/usernames/users`));
			httpRequest.addOrUpdateHeader("Content-Type", "application/json");
			httpRequest.addOrUpdateHeader("Content-Encoding", "gzip");
			httpRequest.body = Buffer.from(JSON.stringify({
				usernames: userNames.map(u => u.toLowerCase()),
				excludeBannedUsers: false
			}));

			this.httpClient.send(httpRequest).then(httpResponse => {
				if (httpResponse.statusCode !== 200) {
					reject(new HttpRequestError(httpRequest, httpResponse));
					return;
				}

				const responseBody = JSON.parse(httpResponse.body.toString());
				const usersByNames = Object.fromEntries(responseBody.data.map(u => [u.requestedUsername.toLowerCase(), u]));
				
				resolve(userNames.map(u => {
					return {
						item: u,
						value: usersByNames[u.toLowerCase()],
						success: true
					};
				}));
			}).catch(reject);
		});
	}

	loadUsersById(userIds) {
		return new Promise(async (resolve, reject) => {
			const httpRequest = new HttpRequest(httpMethods.post, new URL(`https://users.roblox.com/v1/users`));
			httpRequest.addOrUpdateHeader("Content-Type", "application/json");
			httpRequest.addOrUpdateHeader("Content-Encoding", "gzip");
			httpRequest.body = Buffer.from(JSON.stringify({
				userIds: userIds,
				excludeBannedUsers: false
			}));

			this.httpClient.send(httpRequest).then(httpResponse => {
				if (httpResponse.statusCode !== 200) {
					reject(new HttpRequestError(httpRequest, httpResponse));
					return;
				}

				const responseBody = JSON.parse(httpResponse.body.toString());
				const usersByIds = Object.fromEntries(responseBody.data.map(u => [u.id, u]));
				
				resolve(userIds.map(id => {
					return {
						item: id,
						value: usersByIds[id],
						success: true
					};
				}));
			}).catch(reject);
		});
	}
}