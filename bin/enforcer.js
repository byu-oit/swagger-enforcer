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

module.exports = Enforcer;

/**
 * Create an enforcer instance.
 * @param {object} options
 * @returns {Enforcer}
 * @constructor
 */
function Enforcer(options) {
    const factory = Object.create(Enforcer.prototype);

    Object.defineProperty(factory, 'options', {
        get: function() {
            return options;
        },
        set: function(value) {
            options = schemas.enforcer.normalize(value);
        }
    });

    factory.options = options || {};

    return factory;
}

Enforcer.prototype.enforce = function (schema, initial) {
    if (!canProxy.proxiable) error ('Your version of JavaScript does not support proxying.', 'PROX');
    const options = this.options;
    schema = new PreppedSchema(schema, options);
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
    validate(schema, initial);
    return getProxy(schema, options, initial);
};

Enforcer.prototype.validate = function (schema, value) {
    let options = this.options;
    if (options.validateAll) {
        options = Object.assign({}, this.options);
        options.enforce = Object.assign({}, options.enforce);
        Object.keys(options.enforce).forEach(key => options.enforce[key] = true);
    }
    schema = new PreppedSchema(schema, options);
    validate(schema, value);
};

/**
 * Create an array with schema enforcement.
 * @param {object} schema The schema definition.
 * @param {object} options The options configuration.
 * @param {array} initial The array to initialize from.
 * @returns {*[]}
 */
function arrayProxy(schema, options, initial) {

    const proxy = new Proxy(initial, {
        get: function(target, property) {
            switch (property) {
                case '__swaggerResponseType__': return 'array';
                case '__swaggerResponseProxyTarget__': return target;

                case 'concat': return function(value) {
                    applySomeDefaults(arguments, 0);
                    applySomeAutoFormats(arguments, 0);
                    const ar = target.concat.apply(target, arguments);
                    validateItems(ar, arguments, 0);
                    validateMaxMinArrayLength(schema, ar.length);
                    setItemProxies(arguments, 0);
                    return arrayProxy(schema, options, ar);
                };

                case 'copyWithin': return function(index, start, end) {
                    target.copyWithin.apply(target, arguments);
                    return proxy;
                };

                case 'fill': return function(value, start, end) {
                    if (schema.items) {
                        value = autoFormat(schema, options, value);
                        validateItem(target, value);
                        arguments[0] = getProxy(schema.items, options, value);
                    }
                    target.fill.apply(target, arguments);
                    return proxy;
                };

                case 'filter': return function(callback, thisArg) {
                    const ar = target.filter.apply(target, arguments);
                    validate(schema, ar);
                    return arrayProxy(schema, options, ar);
                };

                case 'map': return function(callback, thisArg) {
                    const ar = target.map.apply(target, arguments);
                    applySomeDefaults(ar, 0);
                    applySomeAutoFormats(ar, 0);
                    validate(schema, ar);
                    return arrayProxy(schema, options, ar);
                };

                case 'pop': return function() {
                    validateLength(target.length - 1);
                    return target.pop();
                };

                case 'push': return function(value) {
                    applySomeDefaults(arguments, 0);
                    applySomeAutoFormats(arguments, 0);
                    validateItems(target, arguments, 0);
                    validateLength(target.length + arguments.length);
                    setItemProxies(arguments, 0);
                    return target.push.apply(target, arguments);
                };

                case 'shift': return function() {
                    validateLength(target.length - 1);
                    return target.shift();
                };

                case 'slice': return function(begin, end) {
                    const ar = target.slice.apply(target, arguments);
                    applySomeDefaults(ar, 0);
                    applySomeAutoFormats(ar, 0);
                    validate(schema, ar);
                    return arrayProxy(schema, options, ar);
                };

                case 'splice': return function(start, deleteCount, item) {
                    applySomeDefaults(arguments, 2);
                    applySomeAutoFormats(arguments, 2);
                    validateItems(target, arguments, 2);
                    validateLength(target.length + arguments.length - 2 - (deleteCount || 0));
                    setItemProxies(arguments, 2);
                    const ar = target.splice.apply(target, arguments);
                    return arrayProxy(schema, options, ar);
                };

                case 'unshift': return function() {
                    applySomeDefaults(arguments, 0);
                    applySomeAutoFormats(arguments, 0);
                    validateItems(target, arguments, 0);
                    validateLength(target.length + arguments.length);
                    setItemProxies(arguments, 0);
                    return target.unshift.apply(target, arguments);
                };

                default: return target[property];
            }
        },
        set: function(target, property, value) {
            if (rx.integer.test(property)) {
                const index = parseInt(property);
                if (index > target.length) validateLength(index + 1);
                value = autoFormat(schema, options, value);
                validateItem(target, value);
                target[property] = schema.items ? getProxy(schema.items, options, value) : value;
            } else {
                target[property] = value;
            }
            return true;
        }
    });

    return proxy;

    function applySomeDefaults(args, start) {
        if (schema.items) {
            const length = args.length;
            for (let i = start; i < length; i++) {
                args[i] = applyDefaults(schema.items, options, args[i]);
            }
        }
    }

    function applySomeAutoFormats(args, start) {
        if (options.autoFormat) {
            const length = args.length;
            for (let i = start; i < length; i++) {
                args[i] = autoFormat(schema.items, options, args[i]);
            }
        }
    }

    function setItemProxies(args, start) {
        if (schema.items) {
            const length = args.length;
            for (let i = start; i < length; i++) {
                const value = autoFormat(schema, options, args[i]);
                args[i] = getProxy(schema.items, options, value);
            }
        }
    }

    function validateLength(length) {
        validateMaxMinArrayLength(schema, length);
    }

    function validateItem(target, value) {
        if (schema.items) validate(schema.items, value);
        validateUniqueItem(schema, target, value);
    }

    function validateItems(target, args, start) {
        const length = args.length;
        for (let i = start; i < length; i++) validateItem(target, args[i]);
    }
}

/**
 * Create an object with schema enforcement.
 * @param {object} schema The schema definition.
 * @param {object} options The options configuration.
 * @param {object} initial The initial value.
 * @returns {object}
 */
function objectProxy(schema, options, initial) {
    return new Proxy(initial, {
        deleteProperty: function(target, property) {
            validateLength(target, property, false);
            validateObjectPropertyRequired(schema, property);
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
            validateSerializable(value);
            validateLength(target, property, true);
            validateObjectProperty(schema, property, value);
            const subSchema = schema.properties && schema.properties[property]
                ? schema.properties[property]
                : schema.additionalProperties;
            target[property] = subSchema ? getProxy(subSchema, options, value) : value;
            validateObjectHasRequiredProperties(schema, target);
            return true;
        }
    });

    function validateLength(target, property, adding) {
        const hasProperty = target.hasOwnProperty(property);
        const length = Object.keys(target).length;
        if (adding && !hasProperty) {
            validateMaxMinPropertiesLength(schema, length + 1);
        } else if (!adding && hasProperty) {
            validateMaxMinPropertiesLength(schema, length - 1);
        }
    }
}



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
 * @param {object} schema
 * @param {object} options
 * @param {*} value
 * @returns {*}
 */
function getProxy(schema, options, value) {
    if (schema.type === 'array') {
        if (schema.items) {
            const length = value.length;
            for (let i = 0; i < length; i++) {
                value[i] = getProxy(schema.items, options, autoFormat(schema, options, value[i]));
            }
        }
        return arrayProxy(schema, options, value);

    } else if (schema.type === 'object') {
        const specifics = schema.properties || {};
        Object.keys(value)
            .forEach(key => {
                const useSchema = specifics[key] || schema.additionalProperties || null;
                if (useSchema) value[key] = getProxy(useSchema, options, autoFormat(schema, options, value[key]));
            });
        return objectProxy(schema, options, value);
    }

    return value;
}

/**
 * Throw an error if any errors are found.
 * @param schema
 * @param value
 */
function validate(schema, value) {
    const valueType = typeof value;

    // if no schema then we're done validating-
    if (!schema || (!schema.type && !schema.enum)) return;

    // validate that the value is serializable
    validateSerializable(value);

    // array validation
    if (schema.type === 'array') {

        // validate type
        if (!Array.isArray(value)) error('Invalid type: Expected an array. Received: ' + valueType, 'TYPE');

        // validate max items and min items
        validateMaxMinArrayLength(schema, value.length);

        // validate unique items
        validateUniqueItems(schema, [], value);

        // validate each item in the value
        const length = value.length;
        for (let i = 0; i < length; i++) validate(schema.items, value[i]);

    // object validation
    } else if (schema.type === 'object') {

        const valueProperties = Object.keys(value);
        const valuePropertiesLength = valueProperties.length;

        // validate type
        if (!value || valueType !== 'object' || Array.isArray(value)) error('Invalid type: Expected a non null object. Received: ' + value, 'TYPE');

        // validate that all required properties are accounted for
        validateObjectHasRequiredProperties(schema, value);

        // validate property count is within bounds
        validateMaxMinPropertiesLength(schema, valuePropertiesLength);

        // validate all value properties
        for (let i = 0; i < valuePropertiesLength; i++) {
            const property = valueProperties[i];
            validateObjectProperty(schema, property, value[property]);
        }

    } else if (schema.type === 'number' || schema.type === 'integer') {

        // validate type
        if (valueType !== 'number' || isNaN(value)) error('Invalid type: Expected a number or an integer. Received: ' + valueType, 'TYPE');

        // validate maximum
        if (schema.hasOwnProperty('maximum')) {
            if (schema.exclusiveMaximum && value === schema.maximum) error('Value ' + value + ' over exclusive maximum ' + schema.maximum, 'NMAX');
            if (value > schema.maximum) error('Value ' + value + ' over ' + (schema.exclusiveMaximum ? 'exclusive ' : '') + 'maximum ' + schema.maximum, 'NMAX');
        }

        // validate minimum
        if (schema.hasOwnProperty('minimum')) {
            if (schema.exclusiveMinimum && value === schema.minimum) error('Value ' + value + ' under exclusive minimum ' + schema.minimum, 'NMIN');
            if (value < schema.minimum) error('Value ' + value + ' under ' + (schema.exclusiveMinimum ? 'exclusive ' : '') + 'minimum ' + schema.minimum, 'NMIN');
        }

        // validate multiple of
        if (schema.hasOwnProperty('multipleOf') && value % schema.multipleOf !== 0) {
            error('Value ' + value + ' not a multiple of ' + schema.multipleOf, 'NMULT');
        }

        // validate integer
        if (schema.type === 'integer' && !Number.isInteger(value)) error('Value ' + value + ' must be an integer.', 'NINT');

    } else if (schema.type === 'string') {

        // validate type
        if (valueType !== 'string') error('Invalid type: Expected a string. Received: ' + valueType, 'TYPE');

        // validate max length
        if (schema.hasOwnProperty('maxLength') && value.length > schema.maxLength) {
            error('Value ' + value + ' has length (' + value.length + ') above max length ' + schema.maxLength, 'SMAX');
        }

        // validate min length
        if (schema.hasOwnProperty('minLength') && value.length < schema.minLength) {
            error('Value ' + value + ' has length (' + value.length + ') below min length ' + schema.minLength, 'SMIN');
        }

        // validate pattern
        if (schema.hasOwnProperty('pattern') && !(new RegExp(schema.pattern)).test(value)) {
            error('Value ' + value + ' does not match pattern ' + schema.pattern, 'SPAT');
        }
    }

    // enum validation
    if (schema.enum) {
        let found = false;
        const length = schema.enum.length;
        for (let i = 0; i < length; i++) {
            if (same(schema.enum[i], value)) {
                found = true;
                break;
            }
        }
        if (!found) error('Value ' + value + ' does not match enum options: ' + JSON.stringify(schema.enum, null, 2), 'ENUM');
    }
}

function validateMaxMinArrayLength(schema, length) {

    // validate max items
    if (schema.hasOwnProperty('maxItems') && length > schema.maxItems) error('Array length is greater than allowable maximum length', 'LEN');

    // validate min items
    if (schema.hasOwnProperty('minItems') && length < schema.minItems) error('Array length is less than allowable minimum length', 'LEN');
}

function validateMaxMinPropertiesLength(schema, length) {
    if (schema.allOf) {
        const allOfLength = schema.allOf.length;
        for (let i = 0; i < allOfLength; i++) validateMaxMinPropertiesLength(schema.allOf[i], length);

    } else {
        if (schema.hasOwnProperty('maxProperties') && length > schema.maxProperties) {
            error('The object has more properties than the allowed maximum: ' + schema.maxProperties, 'LEN');
        }

        if (schema.hasOwnProperty('minProperties') && length < schema.minProperties) {
            error('The object has fewer properties than the allowed minimum: ' + schema.minProperties, 'LEN');
        }
    }
}

function validateObjectProperty(schema, property, value) {
    if (schema.allOf) {
        const allOfLength = schema.allOf.length;
        for (let i = 0; i < allOfLength; i++) validateObjectProperty(schema.allOf[i], property, value);

    } else {

        if (schema.properties && schema.properties[property]) {
            validate(schema.properties[property], value);

        } else if (schema.additionalProperties) {
            validate(schema.additionalProperties, value);

        } else if (schema.properties) {
            error('Property not allowed: ' + property, 'NPER');

        } else {
            validateSerializable(value);
        }
    }
}

function validateObjectPropertyRequired(schema, property) {
    if (schema.allOf) {
        const allOfLength = schema.allOf.length;
        for (let i = 0; i < allOfLength; i++) validateObjectPropertyRequired(schema.allOf[i], property);

    } else if (schema.properties && schema.properties[property] && schema.properties[property].required) {
        error('Missing required property: ' + property, 'REQ');
    }
}

function validateObjectHasRequiredProperties(schema, value) {
    if (schema.allOf) {
        const allOfLength = schema.allOf.length;
        for (let i = 0; i < allOfLength; i++) validateObjectHasRequiredProperties(schema.allOf[i], value);

    } else if (schema.properties) {
        const valueProperties = Object.keys(value);
        const missingProperties = Object.keys(schema.properties)
            .filter(property => valueProperties.indexOf(property) === -1);
        missingProperties.forEach(property => validateObjectPropertyRequired(schema, property));
    }
}

function validateSerializable(value) {
    const type = typeof value;

    // non-serializable types
    switch (type) {
        case 'function':
        case 'symbol':
        case 'undefined':
            error('Invalid type. Value type cannot be serialized to JSON string: ' + type, 'TYPE')
    }
}

function validateUniqueItem(schema, array, item) {
    if (schema.uniqueItems && array.find(x => same(x, item))) {
        error('Array requires that all items be unique. Value is a duplicate: ' + item, 'UNIQ');
    }
}

function validateUniqueItems(schema, array, items) {
    if (schema.uniqueItems) {
        const length = items.length;
        const copy = array.slice(0);
        for (let i = 0; i < length; i++) {
            validateUniqueItem(schema, copy, items[i]);
            copy.push(items[i]);
        }
    }
}




function error(message, code) {
    const err = Error('Error: ' + message);
    err.code = 'ESR' + code;
    throw err;
}

