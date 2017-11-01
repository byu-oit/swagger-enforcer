'use strict';
const parser        = require('json-schema-ref-parser');
const Swagger       = require('./bin-2/swagger');
const validator     = require('swagger-parser');

/**
 * Get a promise for a swagger enforcer object.
 * @param {string,object} definition
 * @param {object} [options]
 * @returns {Promise.<Swagger>}
 */
module.exports = function(definition, options) {
    return parser.dereference(definition)
        .then(definition => {
            return definition.openapi
                ? definition                    // skip validation for 3.0.0 until supported
                : validator.validate(definition);
        })
        .then(definition => {
            const v = definition.openapi || definition.swagger;
            const match = /^(\d+)/.exec(v);
            const major = match[1];
            const version = tryRequire('./bin-2/versions/v' + major);
            if (!version) throw Error('The swagger definition version is either invalid or not supported: ' + v);
            version.initialize(definition);
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