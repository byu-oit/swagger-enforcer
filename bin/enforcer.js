/**
 *  @license
 *    Copyright 2016 Brigham Young University
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
const applyDefaults     = require('./apply-defaults');
const canProxy          = require('./can-proxy');
const copy              = require('./copy');
const PreppedSchema     = require('./prepped-schema');
const rx                = require('./rx');
const same              = require('./same');
const schemas           = require('./schemas');
const to                = require('./convert-to');
const Validator         = require('./validator');

module.exports = Enforcer;

/**
 * Create an enforcer instance.
 * @param {object} [options={}]
 * @param {object} [definitions={}] Only required if discriminators are used
 * @returns {Enforcer}
 * @constructor
 */
function Enforcer(options, definitions) {
    const factory = Object.create(Enforcer.prototype);

    Object.defineProperties(factory, {

        /**
         * @name Enforcer#definitions
         * @type {Object}
         */
        definitions: {
            value: definitions
        },

        /**
         * @name Enforcer#options
         * @type {Object}
         */
        options: {
            get: function() {
                return options;
            },
            set: function(value) {
                options = schemas.enforcer.normalize(value);
            }
        }
    });

    factory.options = options || {};

    return factory;
}

Enforcer.prototype.enforce = function (schema, initial) {
    const validator = new Validator(this.definitions, true);
    if (!canProxy.proxiable) validator.error('', 'Your version of JavaScript does not support proxying.', 'PROX');

    // get prepped schma
    const options = this.options;
    schema = new PreppedSchema(schema, options);

    // determine initial value if not provided
    if (arguments.length < 2) {
        if (options.useDefaults && schema.hasOwnProperty('default')) {
            initial = copy(schema.default);
        } else if (schema.type === 'array') {
            initial = applyDefaults(schema, options, []);
        } else if (schema.type === 'object') {
            initial = applyDefaults(schema, options, {});
        }
    }
    initial = autoFormat(schema, options, initial);

    // validate initial value
    validator.validate(schema, '/', initial);

    // return proxy
    return getProxy(validator, schema, options, initial);
};

Enforcer.prototype.errors = function (schema, value) {
    const options = enforceAll(this.options);
    const prepped = new PreppedSchema(schema, options);
    return new Validator(this.definitions, false).validate(prepped, '/', value).errors;
};

Enforcer.prototype.validate = function (schema, value) {
    const options = enforceAll(this.options);
    const prepped = new PreppedSchema(schema, options);
    new Validator(this.definitions, false).validate(prepped, '/', value).throw();
};

/**
 * Create an array with schema enforcement.
 * @param {Validator} validator
 * @param {object} schema The schema definition.
 * @param {object} options The options configuration.
 * @param {array} initial The array to initialize from.
 * @returns {*[]}
 */
function arrayProxy(validator, schema, options, initial) {

    const proxy = new Proxy(initial, {
        get: function(target, property) {
            switch (property) {
                case '__swaggerResponseType__': return 'array';
                case '__swaggerResponseProxyTarget__': return target;

                case 'concat': return function(value) {
                    applyMultipleValueInitializations(schema.items, options, arguments);
                    const ar = target.concat.apply(target, arguments);
                    validator.arrayItems(schema, at, ar, arguments);
                    validator.arrayLength(schema, '', ar.length);
                    arraySetProxies(validator, schema, options, ar);
                    return arrayProxy(validator, schema, options, ar);
                };

                case 'copyWithin': return function(index, start, end) {
                    target.copyWithin.apply(target, arguments);
                    return proxy;
                };

                case 'fill': return function(value, start, end) {
                    if (schema.items) {
                        value = autoFormat(schema, options, value);
                        validator.arrayItem(schema, '', target, value);
                        arguments[0] = getProxy(validator, schema.items, options, value);
                    }
                    target.fill.apply(target, arguments);
                    return proxy;
                };

                case 'filter': return function(callback, thisArg) {
                    const ar = target.filter.apply(target, arguments);
                    validate(schema, ar);
                    return arrayProxy(validator, schema, options, ar);
                };

                case 'map': return function(callback, thisArg) {
                    const ar = target.map.apply(target, arguments);
                    applyMultipleValueInitializations(schema.items, options, ar);
                    validate(schema, ar);
                    return arrayProxy(validator, schema, options, ar);
                };

                case 'pop': return function() {
                    validator.arrayLength(schema, '', target.length - 1);
                    return target.pop();
                };

                case 'push': return function(value) {
                    applyMultipleValueInitializations(schema.items, options, arguments);
                    validator.arrayItems(schema, '', target, arguments);
                    validator.arrayLength(schema, '', target.length + arguments.length);
                    arraySetProxies(validator, schema, options, arguments);
                    return target.push.apply(target, arguments);
                };

                case 'shift': return function() {
                    validator.arrayLength(schema, '', target.length - 1);
                    return target.shift();
                };

                case 'slice': return function(begin, end) {
                    const ar = target.slice.apply(target, arguments);
                    applyMultipleValueInitializations(schema.items, options, ar);
                    validate(schema, ar);
                    return arrayProxy(validator, schema, options, ar);
                };

                case 'splice': return function(start, deleteCount, item) {
                    const args = someArguments(arguments, 2);
                    applyMultipleValueInitializations(schema.items, options, args);
                    validator.arrayItems(schema, '', target, args);
                    validator.arrayLength(schema, '', target.length + args.length - (deleteCount || 0));
                    arraySetProxies(validator, schema, options, args);
                    const ar = target.splice.apply(target, arguments);
                    return arrayProxy(validator, schema, options, ar);
                };

                case 'unshift': return function() {
                    applyMultipleValueInitializations(schema.items, options, arguments);
                    validator.arrayItems(schema, '', target, arguments);
                    validator.arrayLength(schema, '', target.length + arguments.length);
                    arraySetProxies(validator, schema, options, arguments);
                    return target.unshift.apply(target, arguments);
                };

                default: return target[property];
            }
        },
        set: function(target, property, value) {
            if (rx.integer.test(property)) {
                const index = parseInt(property);
                if (index > target.length) validator.arrayLength(schema, '', index + 1);
                value = autoFormat(schema, options, value);
                validator.arrayItem(schema, property, target, value);
                target[property] = schema.items ? getProxy(validator, schema.items, options, value) : value;
            } else {
                target[property] = value;
            }
            return true;
        }
    });

    return proxy;
}

/**
 * Create an object with schema enforcement.
 * @param {Validator} validator
 * @param {object} schema The schema definition.
 * @param {object} options The options configuration.
 * @param {object} initial The initial value.
 * @returns {object}
 */
function objectProxy(validator, schema, options, initial) {
    return new Proxy(initial, {
        deleteProperty: function(target, property) {
            validator.objectPropertyLength(schema, '', target, property, false);
            validator.objectPropertyRequired(schema, '', property);
            delete target[property];
            return true;
        },
        get: function(target, property) {
            switch (property) {
                case '__swaggerResponseType__': return 'object';
                case '__swaggerResponseProxyTarget__': return target;
                default: return target[property];
            }
        },
        set: function(target, property, value) {
            value = applyDefaults(schema, options, value);
            value = autoFormat(schema, options, value);
            validator.serializable('', value);
            validator.objectPropertyLength(schema, '', target, property, true);
            validator.objectProperty(schema, '', value, property);
            const subSchema = schema.properties && schema.properties[property]
                ? schema.properties[property]
                : schema.additionalProperties;
            target[property] = subSchema ? getProxy(validator, subSchema, options, value) : value;
            validator.objectHasRequiredProperties(schema, '', target);
            return true;
        }
    });
}



function arraySetProxies(validator, schema, options, values) {
    if (schema.items) {
        const length = values.length;
        for (let i = 0; i < length; i++) {
            const value = autoFormat(schema, options, values[i]);
            values[i] = getProxy(validator, schema.items, options, value);
        }
    }
}

/**
 * Apply defaults to and auto format all values in an array-like object.
 * @param {Object} schema
 * @param {Object} options
 * @param {Object} values
 */
function applyMultipleValueInitializations(schema, options, values) {
    if (schema) {
        const length = args.length;
        for (let i = 0; i < length; i++) {
            values[i] = autoFormat(schema, options, applyDefaults(schema, options, values[i]));
        }
    }
}

/**
 * Automatically format a value into it's valid format.
 * @param {Object} schema
 * @param {Object} options
 * @param {*} value
 * @returns {*}
 */
function autoFormat(schema, options, value) {
    if (schema && options.autoFormat) {
        switch (schema.type) {
            case 'boolean': return to.boolean(value);
            case 'integer': return to.integer(value);
            case 'number':  return to.number(value);
            case 'string':
                switch (schema.format) {
                    case 'binary':      return to.binary(value);
                    case 'byte':        return to.byte(value);
                    case 'date':        return to.date(value);
                    case 'date-time':   return to.dateTime(value);
                }
        }
    }
    return value;
}

/**
 * Get a deep proxy for a value.
 * @param {Validator} validator
 * @param {Object} schema
 * @param {Object} options
 * @param {*} value
 * @returns {*}
 */
function getProxy(validator, schema, options, value) {
    if (schema.type === 'array') {
        if (schema.items) {
            const length = value.length;
            for (let i = 0; i < length; i++) {
                value[i] = getProxy(validator, schema.items, options, autoFormat(schema, options, value[i]));
            }
        }
        return arrayProxy(validator, schema, options, value);

    } else if (schema.type === 'object') {
        const specifics = schema.properties || {};
        Object.keys(value)
            .forEach(key => {
                const useSchema = specifics[key] || schema.additionalProperties || null;
                if (useSchema) value[key] = getProxy(validator, useSchema, options, autoFormat(schema, options, value[key]));
            });
        return objectProxy(validator, schema, options, value);
    }

    return value;
}

function enforceAll(options) {
    if (options.validateAll) {
        options = Object.assign({}, this.options);
        options.enforce = Object.assign({}, options.enforce);
        Object.keys(options.enforce).forEach(key => options.enforce[key] = true);
    }
    return options;
}

/**
 * Convert a full array-like object into a subset array-like object.
 * @param {Object} args The full array-like object.
 * @param {number} start The index to start building the partial array-like object from.
 * @returns {Object} The subset array-like object.
 */
function someArguments(args, start) {
    const result = {};
    const length = args.length;
    let j = 0;
    for (let i = start; i < length; i++) result[j++] = args[i];
    result.length = j;
    return result;
}