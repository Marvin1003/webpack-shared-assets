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
            name(file) {
              const fileName = R.compose(
                R.last,
                v => v.split("/")
              )(file);

              /* 
                Trying to dynamically find the referenced file in the output folder of the targeted extension,
                to be able to just reference the already existing file instead of rebuilding it.
              */
              const targetFile = R.compose(
                R.curryN(2, findMatch)(fileName),
                arr => R.map(obj => R.path(["path"], obj), arr),
                klawSync, // get all output files of the target extension
                getOutputPath
              )(ext2);

              if (targetFile) {
                return path.relative(__dirname, targetFile);
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

function findMatch(fileName, files) {
  return R.find(path => R.includes(fileName, path), files);
}

function getOutputPath(ext) {
  if (R.has("output")(ext) && R.equals(R.type(ext.output), "Object")) {
    if (R.has("path")(ext.output)) {
      if (R.equals(R.type(ext.output.path), "Function")) {
        let outputPath = R.tryCatch(
          () => ext.output.path(),
          err => {
            throw new Error(`Something went wrong -> ${err}`);
          }
        )();

        if (R.equals(R.type(outputPath), "String")) {
          return path.relative(__dirname, outputPath);
        }
      } else if (R.equals(R.type(ext.output.path), "String")) {
        return path.relative(__dirname, ext.output.path);
      }
    }
  }

  console.warn(
    "\nCouldn't find any customized output path. Fallbacking to '/dist'.\n"
  );
  return path.relative(__dirname, "../ext2/dist");
}
