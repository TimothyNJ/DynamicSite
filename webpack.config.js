const path = require('path');
const webpack = require('webpack');

// Generate timestamp in YYYYMMDDHHMMSS format using local time
const now = new Date();
const buildTimestamp = 
  now.getFullYear().toString() +
  (now.getMonth() + 1).toString().padStart(2, '0') +
  now.getDate().toString().padStart(2, '0') +
  now.getHours().toString().padStart(2, '0') +
  now.getMinutes().toString().padStart(2, '0') +
  now.getSeconds().toString().padStart(2, '0');

module.exports = {
  entry: './js/main.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  plugins: [
    new webpack.DefinePlugin({
      BUILD_TIMESTAMP: JSON.stringify(buildTimestamp)
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      }
    ]
  },
  devServer: {
    static: {
      directory: path.join(__dirname, './'),
    },
    compress: true,
    port: 8080,
    hot: true,
    open: true
  },
  mode: 'development'
};
