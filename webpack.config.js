const path = require('path');
const webpack = require('webpack');

// Generate timestamp in YYYYMMDDHHMMSS format
const buildTimestamp = new Date().toISOString()
  .replace(/[-:T]/g, '')
  .replace(/\..+/, '')
  .slice(0, 14);

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
