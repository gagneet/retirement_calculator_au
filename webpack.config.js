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
        comparison: './src/js/comparison.js',
    },
    output: {
        filename: '[name].[contenthash].js',
        chunkFilename: '[name].[contenthash].js',
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
    performance: {
        maxAssetSize: 300000, // 300 KiB
        maxEntrypointSize: 300000, // 300 KiB
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'src/assets', to: 'assets' },
                { from: 'src/robots.txt', to: 'robots.txt' },
                { from: 'sitemap.xml', to: 'sitemap.xml' },
                { from: 'src/contact/admin-feedback.php', to: 'contact/admin-feedback.php' },
                { from: 'src/contact/feedback_server.py', to: 'contact/feedback_server.py' },
                { from: 'src/contact/simple_feedback_server.py', to: 'contact/simple_feedback_server.py' },
                { from: 'src/contact/start_feedback_server.sh', to: 'contact/start_feedback_server.sh' },
                // HOW-TO page supporting files
                { from: 'src/js/howto-interactive.js', to: 'js/howto-interactive.js' },
                { from: 'src/js/animated-demo.js', to: 'js/animated-demo.js' },
                // Advanced Design Calculator — standalone ES6 modules (no webpack bundling needed)
                { from: 'src/js/advanced-design-engine.js', to: 'js/advanced-design-engine.js' },
                { from: 'src/js/advanced-design-ui.js', to: 'js/advanced-design-ui.js' },
            ],
        }),
        new MiniCssExtractPlugin({
            filename: 'styles.[contenthash].css',
        }),
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: 'index.html',
            chunks: ['main'], // Include CSS and app bundle for full calculator functionality
        }),
        new HtmlWebpackPlugin({
            template: './src/advanced.html',
            filename: 'advanced.html',
            chunks: ['main'], // Advanced calculator uses main app.js
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
        new HtmlWebpackPlugin({
            template: './src/comparison.html',
            filename: 'comparison.html',
            chunks: ['comparison'], // Include comparison JS
        }),
        new HtmlWebpackPlugin({
            template: './src/how-to-use.html',
            filename: 'how-to-use.html',
            chunks: [], // No webpack JS chunks needed - uses CDN and inline scripts
        }),
        new HtmlWebpackPlugin({
            template: './src/assumptions.html',
            filename: 'assumptions.html',
            chunks: [],
        }),
        new HtmlWebpackPlugin({
            template: './src/changelog.html',
            filename: 'changelog.html',
            chunks: [],
        }),
        new HtmlWebpackPlugin({
            template: './src/methodology.html',
            filename: 'methodology.html',
            chunks: [],
        }),
        new HtmlWebpackPlugin({
            template: './src/advanced-design.html',
            filename: 'advanced-design.html',
            chunks: [], // Uses standalone ES6 modules via CopyPlugin
        }),
    ],
};