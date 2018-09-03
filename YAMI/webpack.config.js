const webpack = require("webpack");
const path = require("path");

let config1 = {
  entry: ["./src/Standalone/viewer.js"],
  output: {
    path: path.resolve(__dirname, "./public"),
    filename: "./bundle.js"
  },
     devtool: 'source-map'
}
let config2 = {
  entry: ["babel-polyfill", "./src/Standalone/viewer.js"],
  output: {
    path: path.resolve(__dirname, "./public"),
    filename: "./bundle.js"
  },
     module: {
         rules: [
             {
                 test: /\.js$/,
                 loader: 'babel-loader',
                 query: {
                     presets: ['es2015']
                 }
             }
         ]
     },
     stats: {
         colors: true
     },
     devtool: 'source-map'
}

module.exports = config2;
