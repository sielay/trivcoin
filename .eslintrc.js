module.exports = {
    "extends": "airbnb-base",
    "env": {
        "node": true,
        "jasmine": true
    },
    "rules": {
        "max-len": ["error", { "code": 200 }],
        // enable additional rules
        "indent": ["error", 4],
        "linebreak-style": ["error", "unix"],
        "quotes": ["error", "double"],
        "semi": ["error", "always"],

        // override default options for rules from base configurations
        // "comma-dangle": ["error", "always"],
        "no-cond-assign": ["error", "always"],

        // disable rules from base configurations
        "no-console": "off",
    },
};
