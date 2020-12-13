const fs = require("fs");
const packageFileName = process.argv[2];
const expectedVersion = process.argv[3];
const versionRegex = /^\d+\.\d+\.\d+$/;

if (versionRegex.test(expectedVersion)) {
	fs.readFile(packageFileName, (err, data) => {
		if (err) {
			console.error("readFile", err);
			process.exit(1);
			return;
		}

		let package = JSON.parse(data);
		package.version = expectedVersion;

		for (let name in package.dependencies) {
			let version = package.dependencies[name];
			if (version.startsWith("file:")) {
				package.dependencies[name] = expectedVersion;
			}
		}

		let writtenPackage = JSON.stringify(package, null, "  ");
		fs.writeFile(packageFileName, writtenPackage, (err) => {
			if (err) {
				console.error("writeFile", err);
				process.exit(1);
				return;
			}

			console.log(writtenPackage);
		});
	});
} else {
	console.error(`version did not match regex (${expectedVersion})\n\tExpected format: #.#.#`);
	process.exit(1);
}
