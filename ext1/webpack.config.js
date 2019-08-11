const path = require("path");
const klawSync = require("klaw-sync");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const R = require("ramda");
const ext2 = R.clone(require("../ext2/webpack.config"));

const config = {
  mode: "production",
  resolve: {
    alias: {
      styles: path.resolve(__dirname, "styles"),
      fonts: path.resolve(__dirname, "fonts"),
      ext2: path.resolve(__dirname, "../ext2")
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"]
      },
      {
        test: /\.(woff|woff2|ttf|otf)$/,
        exclude: path.resolve(__dirname, "../ext2"),
        use: {
          loader: "file-loader",
          options: {
            name: "[name].[ext]"
          }
        }
      },
      {
        test: /\.(woff|woff2|ttf|otf)$/,
        include: path.resolve(__dirname, "../ext2"),
        use: {
          loader: "file-loader",
          options: {
            name(filePath) {
              const fileName = R.compose(
                R.last,
                R.split("/")
              )(filePath);

              /* 
                Trying to dynamically find the referenced file in the output folder of the targeted extension,
                to be able to just reference the already existing file instead of rebuilding it.
              */
              const targetFilePath = R.compose(
                R.find(R.includes(fileName)),
                R.map(R.path(["path"])),
                klawSync, // get all output files of the target extension
                getOutputPath
              )(ext2);

              if (R.equals(R.type(targetFilePath, "String"))) {
                return path.relative(__dirname, targetFilePath);
              } else {
                throw new Error(
                  `Couldn't find ${fileName} in ${getOutputPath(ext2)}`
                );
              }
            },
            emitFile: false
          }
        }
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[id].css"
    })
  ]
};

module.exports = config;

function getOutputPath(ext) {
  if (R.hasPath(["output", "path"])(ext)) {
    if (R.equals(R.type(ext.output.path), "Function")) {
      let outputPath = R.tryCatch(ext.output.path, err => {
        throw new Error(`Something went wrong -> ${err}`);
      })();

      if (R.equals(R.type(outputPath), "String")) {
        return path.relative(__dirname, outputPath);
      }
    } else if (R.equals(R.type(ext.output.path), "String")) {
      return path.relative(__dirname, ext.output.path);
    }
  }

  console.warn(
    "\nCouldn't find any customized output path. Fallbacking to '/dist'.\n"
  );
  return path.relative(__dirname, "../ext2/dist");
}
