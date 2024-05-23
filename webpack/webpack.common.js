const path = require("path");
const srcDir = path.join(__dirname, "..", "src");
const Crx = require("crx-webpack-plugin");

module.exports = {
	entry: {
		popup: path.join(srcDir, 'popup.ts'),
		options: path.join(srcDir, 'options.ts'),
		background: path.join(srcDir, 'background.ts'),
		content_script: path.join(srcDir, 'content.ts'),
	},
	output: {
		path: path.join(__dirname, "../dist/js"),
		filename: "[name].js",
	},
	optimization: {
		splitChunks: {
			name: "vendor",
			chunks(chunk) {
				return chunk.name !== 'background';
			}
		},
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: "ts-loader",
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: [".ts", ".tsx", ".js"],
	},
	plugins: [
		new Crx({
			keyFile: 'key.pem',
			contentPath: 'build',
			outputPath: 'dist',
			name: 'chrome-ext'
		})
	]
};