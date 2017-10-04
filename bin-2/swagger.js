/**
 *  @license
 *    Copyright 2017 Brigham Young University
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 **/
'use strict';
const format        = require('./format');
const parse         = require('./parse');
const util          = require('./util');

module.exports = Swagger;

const map = new WeakMap();

/**
 * Produce a swagger instance.
 * @param {number} version The swagger version to use.
 * @param {object} definition The swagger definition object.
 * @param {object} [defaultOptions]
 * @constructor
 */
function Swagger(version, definition, defaultOptions) {
    const swagger = this;

    // use the version to determine what functions to use
    version = parseInt(version);
    let functions;
    if (version === 2) functions = require('./v2/swagger');
    if (!functions) throw Error('Unsupported version of swagger specified. Use one of the following versions: 2');

    // validate definition
    if (!definition || typeof definition !== 'object') throw Error('Invalid swagger definition. Expected an object. Received: ' + definition);
    definition = util.copy(definition);

    // normalize defaults
    const defaults = Object.assign({}, defaultOptions);
    defaults.enforce = Object.assign({}, defaults.enforce, functions.defaults.enforce);
    defaults.populate = Object.assign({}, defaults.populate, functions.defaults.populate);
    defaults.validate = Object.assign({}, defaults.validate, functions.defaults.validate);

    // build path parser functions
    const pathParsers = [];
    if (!definition.paths || typeof definition.paths !== 'object') definition.paths = {};
    Object.keys(definition.paths).forEach(path => {
        const edgedPath = util.edgeSlashes(path, true, true);
        const rx = new RegExp('^' + edgedPath.replace(/\/{[\s\S]+?}\//g, '\/([^\\/]+?)\/') + '$');
        const schema = definition.paths[path];

        const names = [];
        const namesRx = /\/{([\s\S]+?)}\//g;
        let match;
        while (match = namesRx.exec(edgedPath)) names.push(match[1]);

        pathParsers.push({
            path: path,
            parse: function(str) {
                const match = rx.exec(str);
                if (!match) return undefined;

                const params = {};
                names.forEach((name, index) => {
                    params[name] = swagger.format(match[index + 1], schema.parameters[name]);
                });

                return params;
            },
            schema: schema
        });
    });

    // store protected variables
    const store = {
        defaults: defaults,
        definition: definition || {},
        functions: functions,
        pathParsers: pathParsers
    };
    map.set(this, store);
}

/**
 * Check a value against a schema for errors.
 * @param {object} schema
 * @param {*} value
 * @param {object} [options={}]
 * @returns {string[]|undefined}
 */
Swagger.prototype.errors = function(schema, value, options) {
    const store = map.get(this);
    options = Object.assign({}, options, store.defaults);
};

/**
 * Create an object that uses JavaScript proxies to enforce that an object is built correctly. Requires NodeJS 6.x and newer.
 * @param {object} schema The schema to enforce.
 * @param {object} [options={}] Describe what should be enforced.
 * @param {*} [initialValue] The initial value to build the enforced object from.
 * @returns {object|array}
 */
Swagger.prototype.enforce = function(schema, options, initialValue) {

};

/**
 * Format a value for sending as a response.
 * @param {*} value
 * @param {object} schema
 * @returns {*}
 */
Swagger.prototype.format = formatBySchema;

/**
 * Convert input into values.
 * @param {*} value
 * @param {object} schema
 */
Swagger.prototype.parse = parseBySchema;

/**
 * Get details about the matching path.
 * @param {string} path
 * @param {string} [subPath]
 * @returns {{path: string, params: Object.<string, *>, schema: object}|undefined}
 */
Swagger.prototype.path = function(path, subPath) {
    const parsers = map.get(this).pathParsers;

    // normalize path
    if (!path) path = '';
    path = util.edgeSlashes(path, true, true);

    const length = parsers.length;
    for (let i = 0; i < length; i++) {
        const parser = parsers[i];
        const params = parser.parse(path);
        if (params) return {
            params: params,
            path: parser.path,
            schema: subPath ? this.schema(subPath, parser.schema) : util.copy(parser.schema)
        };
    }
};

/**
 * Uses the schema and variable replacement to produce a valid value.
 * @param {object} schema
 * @param {object} map
 * @param {*} [initialValue]
 */
Swagger.prototype.populate = function(schema, map, initialValue) {

};

/**
 * Get a copy of the schema at the specified path.
 * @param {string} [path=''] The path in the schema to get a sub-schema from. Supports variable substitution for path parameters.
 * @param {object} [schema] The schema to traverse. Defaults to the entire swagger document.
 * @returns {object|undefined} Will return undefined if the specified path is invalid.
 */
Swagger.prototype.schema = function(path, schema) {
    let result = schema || map.get(this).definition;

    // normalize path
    if (!path) path = '';
    path = path.replace(/^\/(?!\/)/, '').replace(/(?!\/)\/$/, '');

    // determine path keys
    const keys = [];
    let index = 0;
    let join = false;
    path.split('/').forEach(key => {
        if (!key && keys[index - 1]) {
            join = true;
        } else if (join) {
            keys[index - 1] += '/' + key;
        } else {
            index = keys.push(key);
        }
    });

    // loop through path parts to find object of interest
    let key;
    while (key = keys.shift()) {
        if (result && typeof result === 'object') {
            result = result[key];
        } else {
            return;
        }
    }

    return util.copy(result);
};

/**
 * Check a value against a schema for errors and throw any errors encountered.
 * @param {object} schema
 * @param {*} value
 * @param {object} [options={}]
 * @throws {Error}
 */
Swagger.prototype.validate = function(schema, value, options) {
    const errors = this.errors(schema, value, options);
    if (errors) {
        if (errors.length === 1) throw Error(errors[0]);
        throw Error('One or more errors found during swagger validation: \n  ' + errors.map(e => e.message).join('\n  '));
    }
};

Swagger.is = require('./is');

Swagger.format = formatBySchema;

Swagger.from = parse;

Swagger.parse = parseBySchema;

Swagger.to = format;

/**
 * Take an enforced array or object and create an unenforced copy.
 * @param {object|array} enforcedValue
 * @returns {object|array}
 */
Swagger.unenforce = function(enforcedValue) {

};


/**
 * Format a value for sending as a response.
 * @param {*} value
 * @param {object} schema
 * @returns {*}
 */
function formatBySchema(value, schema) {
    const type = util.schemaType(schema);
    switch (type) {
        case 'array':
            if (Array.isArray(value)) return value.map(v => this.format(v, schema.items));
            break;
        case 'boolean':
        case 'integer':
        case 'number':
            return format[type](value);
            break;
        case 'string':
            switch (schema.format) {
                case 'binary':
                case 'byte':
                case 'date':
                case 'date-time':
                    return format[schema.format](value);
                    break;
                default:
                    return format.string(value);
            }
        case 'object':
            if (value && typeof value === 'object') {
                const result = {};
                const additionalProperties = schema.additionalProperties;
                const properties = schema.properties || {};
                Object.keys(value).forEach(key => {
                    if (properties.hasOwnProperty(key)) {
                        result[key] = this.format(value[key], properties[key]);
                    } else if (additionalProperties) {
                        result[key] = this.format(value[key], additionalProperties);
                    }
                });
                return result;
            }
            break;
    }
}

function parseBySchema(value, schema) {
    const type = util.schemaType(schema);
    switch (type) {
        case 'array':

            break;
        case 'boolean':
        case 'integer':
        case 'number':
            return parse[type](value);
            break;
        case 'string':
            switch (schema.format) {
                case 'binary':
                case 'byte':
                case 'date':
                case 'date-time':
                    return parse[schema.format](value);
                    break;
                default:
                    return parse.string(value);
            }
        case 'object':

            break;
    }
}