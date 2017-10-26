'use strict';
const parser        = require('swagger-parser');
const Swagger       = require('./bin-2/swagger');

module.exports = function(definition, options) {
    return parser.validate(definition)
        .then(definition => {
            const v = definition.swagger || definition.openapi;
            const match = /^(\d+)/.exec(v);
            const major = match[1];
            const version = tryRequire('./bin-2/versions/v' + major);
            if (!version) throw Error('The swagger definition version is either invalid or not supported: ' + v);
            return new Swagger(version, definition, options);
        });
};

function tryRequire(path) {
    try {
        return require(path);
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') return null;
        throw err;
    }
}