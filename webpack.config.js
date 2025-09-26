const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    main: './src/js/app.js',
  },
  output: {
    filename: 'bundle.[contenthash].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico|webmanifest)$/i,
        type: 'asset/resource',
        generator: {
            filename: 'assets/[name][ext]'
        }
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: true, // Obfuscate variable and function names
          compress: {
            drop_console: true, // Remove console.log statements
          },
        },
      }),
      new CssMinimizerPlugin(),
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/assets', to: 'assets' },
        { from: 'src/robots.txt', to: 'robots.txt' },
        { from: 'src/contact/sitemap.xml', to: 'sitemap.xml' },
        { from: 'src/contact/admin-feedback.php', to: 'contact/admin-feedback.php' },
        { from: 'src/contact/feedback_server.py', to: 'contact/feedback_server.py' },
        { from: 'src/contact/simple_feedback_server.py', to: 'contact/simple_feedback_server.py' },
        { from: 'src/contact/start_feedback_server.sh', to: 'contact/start_feedback_server.sh' },
      ],
    }),
    new MiniCssExtractPlugin({
      filename: 'styles.[contenthash].css',
    }),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: 'index.html',
      chunks: ['main'],
    }),
    new HtmlWebpackPlugin({
      template: './src/contact.html',
      filename: 'contact.html',
      chunks: [], // No JS needed for this page
    }),
    new HtmlWebpackPlugin({
      template: './src/privacy.html',
      filename: 'privacy.html',
      chunks: [], // No JS needed for this page
    }),
    new HtmlWebpackPlugin({
      template: './src/terms.html',
      filename: 'terms.html',
      chunks: [], // No JS needed for this page
    }),
  ],
};