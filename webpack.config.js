const path = require('path');

module.exports = {
  entry: './build/Javascript/savecard.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
