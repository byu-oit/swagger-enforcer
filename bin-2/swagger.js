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
const multipart     = require('./multipart-parser');
const populate      = require('./populate');
const util          = require('./util');
const validate      = require('./validate');

module.exports = SwaggerEnforcer;

const store = new WeakMap();
const rxPathParam = /{([\s\S]+?)}/;

/**
 * Produce a swagger instance.
 * @param {object, string} definition The swagger definition object or a string representing the version to use.
 * @param {object} [defaultOptions]
 * @constructor
 */
function SwaggerEnforcer(definition, defaultOptions) {

    // make sure that this is called as a new instance
    if (!(this instanceof SwaggerEnforcer)) return new SwaggerEnforcer(definition, defaultOptions);

    // if the definition was passed in as a version number then rebuild the definition object
    if (definition === '2.0') {
        definition = { swagger: '2.0' };
    } else if (/^3\.\d+\.\d+$/.test(definition)) {
        definition = { openapi: definition };
    }

    // get the version number from the definition
    const v = definition.openapi || definition.swagger;
    const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(v);
    if (!match) throw Error('Unsupported swagger version specified: ' + v);

    // attempt to load the version specific settings and functions
    const major = match[1];
    const Version = util.tryRequire('./versions/v' + major);
    if (!Version) throw Error('The swagger definition version is either invalid or not supported: ' + v);
    const version = new Version(definition);

    // normalize defaults
    const defaults = Object.assign({}, defaultOptions);
    Object.keys(Version.defaults)
        .forEach(category => {
            defaults[category] = Object.assign({}, Version.defaults[category], defaults[category]);
        });

    // build path parser functions
    const pathParsers = [];
    if (!definition.paths || typeof definition.paths !== 'object') definition.paths = {};
    Object.keys(definition.paths)
        .forEach(path => {
            const names = [];
            const rx = new RegExp('^/' +
                util.edgeSlashes(path, false, false)
                    .split('/')
                    .map(partial => {
                        const match = rxPathParam.exec(partial);
                        if (match) {
                            names.push(match[1]);
                            return '([^\\/]+?)'
                        } else {
                            return partial;
                        }
                    })
                    .join('/') +
                '$');

            pathParsers.push({
                definition: definition.paths[path],
                path: path,
                parse: function(str) {
                    str = util.edgeSlashes(str, true, false);

                    const match = rx.exec(str);
                    if (!match) return undefined;

                    const params = {};
                    names.forEach((name, index) => params[name] = match[index + 1]);
                    return params;
                }
            });
        });

    // store protected properties
    store.set(this, {
        defaults: defaults,
        definition: definition,
        pathParsers: pathParsers,
        version: version
    });
}

/**
 * Check a value against a schema for errors.
 * @param {object} schema
 * @param {*} value
 * @returns {string[]|undefined}
 */
SwaggerEnforcer.prototype.errors = function(schema, value) {
    const data = store.get(this);
    const version = data.version;
    const v = {
        definition: data.definition,
        errors: [],
        options: data.defaults.validate,
        version: version
    };
    validate(v, '<root>', 0, schema, value);
    return v.errors.length > 0 ? v.errors : null;
};

/**
 * Format a value for sending as a response.
 * @param {*} value
 * @param {object} schema
 * @returns {*}
 */
SwaggerEnforcer.prototype.format = function(value, schema) {
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
};

/**
 * Get details about the matching path.
 * @param {string} path
 * @param {string} [subPath]
 * @returns {{path: string, params: Object.<string, *>, schema: object}|undefined}
 */
SwaggerEnforcer.prototype.path = function(path, subPath) {
    const parsers = store.get(this).pathParsers;

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
            schema: subPath ? this.schema(subPath, parser.definition) : util.copy(parser.definition)
        };
    }
};

/**
 * Populate an object or an array using default, x-template, x-variable, and a parameter map.
 * @param {object} schema
 * @param {object} [map]
 * @param {*} [initialValue]
 */
SwaggerEnforcer.prototype.populate = function(schema, map, initialValue) {
    const data = store.get(this);
    const options = data.defaults.populate;

    // initialize variables
    const initialValueProvided = arguments.length > 3;
    const version = data.version;
    const v = {
        injector: populate.injector[options.replacement],
        map: map || {},
        options: data.defaults.populate,
        schemas: version.schemas,
        version: version
    };

    // produce start value
    const value = v.options.copy && initialValueProvided
        ? util.copy(initialValue)
        : initialValue;

    // begin population
    const root = { root: value };
    populate.populate(v, '<root>', schema, root, 'root');

    return root.root;
};

/**
 * Convert input into values.
 * @param {object|string} request A request object or the path to use with GET method.
 * @param {string|object} [request.body=''] The body of the request.
 * @param {string|Object.<string,string>} [request.header={}] The request header as a string or object
 * @param {string} [request.method=GET] The request method.
 * @param {string} [request.path=''] The request path. The path can contain the query parameters.
 * @param {string|Object.<string,string|undefined|Array.<string|undefined>>} [request.query={}] The request query. If the path also has the query defined then this query will overwrite the path query parameters.
 */
SwaggerEnforcer.prototype.request = function(request) {
    let type;
    let hasError;

    // process and validate input parameter
    if (arguments.length === 0) request = '';
    if (typeof request === 'string') request = { path: request };
    if (!request || typeof request !== 'object') throw Error('Expected an object or a string. Received: ' + util.smart(request));
    const req = Object.assign({ body: '', header: {}, method: 'GET', path: '', query: {} }, request);

    // validate path
    if (typeof req.path !== 'string') throw Error('Invalid request path specified. Expected a string. Received: ' + util.smart(req.path));
    const pathComponents = req.path.split('?');
    req.path = '/' + pathComponents[0].replace(/^\//, '').replace(/\/$/, '');

    this.path(req.path);

    // normalize and validate header
    type = typeof req.header;
    if (type === 'string') {
        req.header = req.header.split('\n')
            .reduce((p, c) => {
                const match = /^([^:]+): ([\s\S]*?)\r?$/.exec(c);
                p[match[1].toLowerCase()] = match[2] || '';
                return p;
            }, {});
    } else if (req.header && type === 'object') {
        const header = {};
        const keys = Object.keys(req.header);
        const length = keys.length;
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            const value = req.header[key];
            if (typeof value !== 'string') {
                hasError = true;
                break;
            }
            header[key.toLowerCase()] = value;
        }
        req.header = header;
    } else {
        hasError = true;
    }
    if (hasError) throw Error('Invalid request header specified. Expected a string or an object. Received: ' + util.smart(req.header));

    // normalize and validate body
    type = typeof req.body;
    if (type !== 'string' && type !== 'object') throw Error('Invalid request body. Expected a string or an object. Received: ' + util.smart(req.body));
    if (type === 'string' && req.body && req.header['content-type']) {
        const contentType = req.header['content-type'];
        const index = contentType.indexOf(';');
        switch (index !== -1 ? contentType.substr(0, index) : contentType) {
            case 'application/json':
                req.body = JSON.parse(req.body);
                break;
            case 'application/x-www-form-urlencoded':
                req.body = parseQueryString(req.body);
                break;
            case 'multipart/form-data':
                req.body = multipart(req.header, req.body);
        }
    }

    // normalize and validate method
    req.method = req.method.toLowerCase();
    if (['get', 'post', 'put', 'delete', 'options', 'head', 'patch'].indexOf(req.method) === -1) {
        throw Error('Invalid request method specified. Expected on of: GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH. Received: ' + util.smart(req.method));
    }

    // normalize and validate query
    type = typeof req.query;
    if (type === 'string') {
        req.query = parseQueryString(req.query);
    } else if (type === 'object') {
        const query = {};
        const keys = Object.keys(req.query);
        const length = keys.length;
        for (let i = 0; i < length; i++) {
            const value = req.query[keys[i]];
            const type = typeof value;
            if (type === 'string' || value === undefined) {
                query[key] = [ value ];
            } else if (Array.isArray(value)) {
                const length = value.length;
                for (let j = 0; j < length; j++) {
                    const type = typeof value[j];
                    if (type !== 'string' && type !== 'undefined') {
                        hasError = true;
                        break;
                    }
                }
            } else {
                hasError = true;
                break;
            }
        }
    } else {
        hasError = true;
    }
    if (hasError) throw Error('Invalid request query. Expected a string or an object with values that are string or arrays of strings/undefined. Received: ' + util.smart(req.query));

    // merge path component of query with query
    if (pathComponents[1]) {
        const query = parseQueryString(pathComponents[1]);
        Object.keys(query).forEach(key => {
            if (!req.query[key]) req.query[key] = [];
            req.query[key].push.apply(req.query[key], query[key]);
        });
    }

    //return store.get(this).version.request(req);

    return req;
};

/**
 * Get a copy of the schema at the specified path.
 * @param {string} [path=''] The path in the schema to get a sub-schema from. Supports variable substitution for path parameters.
 * @param {object} [schema] The schema to traverse. Defaults to the entire SwaggerEnforcer document.
 * @returns {object|undefined} Will return undefined if the specified path is invalid.
 */
SwaggerEnforcer.prototype.schema = function(path, schema) {
    let result = schema || store.get(this).definition;

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
 * @throws {Error}
 */
SwaggerEnforcer.prototype.validate = function(schema, value) {
    const errors = this.errors(schema, value);
    if (errors) {
        if (errors.length === 1) throw Error(errors[0]);
        throw Error('One or more errors found during schema validation: \n  ' + errors.join('\n  '));
    }
};


SwaggerEnforcer.is = require('./is');

/**
 * Parse query string into object mapped to array of values.
 * @param {string} string
 * @returns {Object.<string, string[]>}
 */
function parseQueryString(string) {
    const result = {};
    string
        .split('&')
        .forEach(v => {
            const ar = v.split('=');
            const name = ar[0];
            const value = ar[1];
            if (!result[name]) result[name] = [];
            result[name].push(value);
        });
    return result;
}