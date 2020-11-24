module.exports = {
  "env": {
    "es6": true,
    "node": true
  },
  "settings": {
    "import/resolver": {
      "node": {
        "extensions": [".ts"]
      }
    }
  },
  "extends": [
    "airbnb-base",
    "plugin:@typescript-eslint/eslint-recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": [
    "@typescript-eslint"
  ],
  "rules": {
    "class-methods-use-this": 0,
    "no-param-reassign": 0,
    "dot-notation": 0,
    "no-restricted-syntax": 0,
    "no-await-in-loop": 0,
    "import/no-extraneous-dependencies": 0,
    "no-unused-vars": 0,
    "no-throw-literal": 0,
    "import/extensions": [
      "error",
      "ignorePackages",
      {
        "ts": "never"
      }
   ]
  }
};
