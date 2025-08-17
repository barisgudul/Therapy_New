// test/__mocks__/react-native.js
module.exports = new Proxy({}, {
  get: () => () => null,
});


