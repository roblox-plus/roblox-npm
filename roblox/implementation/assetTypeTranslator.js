import assetTypesById from "./../constants/assetTypesById.js";
import assetTypesByName from "./../constants/assetTypesByName.js";

const translateAssetTypeName = (assetType) => {
	switch (assetType.toLowerCase()) {
		case "html":
			return "HTML";
		case "lua":
			return "Lua";
		case "youtubevideo":
			return "YouTube video";
		case "tshirt":
			return "T-shirt";
		default:
			return assetType.replace(/[A-Z]/g, m => {
				return " " + m.toLowerCase();
			}).trim();
	}
};

class AssetTypeTranslator {
	constructor() {
		this.assetTypeDisplayNames = {};
		this.assetTypeIdsByName = {};

		for (let assetType in assetTypesByName) {
			this.assetTypeIdsByName[assetType.toLowerCase()] = assetTypesByName[assetType];
			this.assetTypeDisplayNames[assetType.toLowerCase()] = translateAssetTypeName(assetType);
		}
	}

	getAssetTypeId(assetType) {
		return this.assetTypeIdsByName[assetType.toLowerCase()] || null;
	}

	getAssetTypeDisplayName(assetType) {
		return this.assetTypeDisplayNames[assetType.toLowerCase()] || null;
	}

	getAssetTypeById(assetTypeId) {
		return assetTypesById[assetTypeId] || null;
	}
};

export default new AssetTypeTranslator();
