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
const getSchemaType = require('./schema-type');
const is            = require('./is');
const rx            = require('./rx');
const same          = require('./same');
const smart         = require('./smart-value');

module.exports = Validator;

/**
 * Define a validator instance.
 * @param {object} enforce
 * @param {object} definitions
 * @param {boolean} [throwErrors=false]
 * @constructor
 */
function Validator(enforce, definitions, throwErrors) {
    this.enforce = enforce;
    this.definitions = definitions;
    this.errors = throwErrors ? undefined : [];
}

/**
 * Validate an array.
 * @param {Object} schema
 * @param {string} at
 * @param {Array} array
 * @returns {Validator}
 */
Validator.prototype.array = function(schema, at, array) {
    if (Array.isArray(array)) {
        const length = array.length;

        this.arrayLength(schema, at, length);
        this.arrayUniqueItems(schema, at, [], array);

        if (schema.items) {
            for (let i = 0; i < length; i++) this.validate(schema.items, at + '/' + i, array[i]);
        }
    }

    return this;
};

/**
 * Validate a single array item.
 * @param {Object} schema
 * @param {string} at
 * @param {Array} target
 * @param {*} item
 * @returns {Validator}
 */
Validator.prototype.arrayItem = function(schema, at, target, item) {
    if (schema.items) this.validate(schema.items, '', item);
    this.arrayUniqueItem(schema, '', target, item);
    return this;
};

/**
 * Validate multiple array items.
 * @param {Object} schema
 * @param {string} at
 * @param {Array} target
 * @param {Object,Array} items An array like object.
 * @returns {Validator}
 */
Validator.prototype.arrayItems = function(schema, at, target, items) {
    const length = items.length;
    for (let i = 0; i < length; i++) this.arrayItem(schema, at + '/' + i, target, items[i]);
    return this;
};

/**
 * Validate that the array length falls within constraints.
 * @param {Object} schema
 * @param {string} at
 * @param {number} length
 * @returns {Validator}
 */
Validator.prototype.arrayLength = function(schema, at, length) {
    const enforce = this.enforce;

    // validate max items
    if (enforce.maxItems && schema.hasOwnProperty('maxItems') && length > schema.maxItems) {
        this.error(at, 'Array length is greater than allowable maximum length', 'LEN');
    }

    // validate min items
    if (enforce.minItems && schema.hasOwnProperty('minItems') && length < schema.minItems) {
        this.error(at, 'Array length is less than allowable minimum length', 'LEN');
    }

    return this;
};

/**
 * Validate that the item is unique to the array.
 * @param {Object} schema
 * @param {string} at
 * @param {Array} array
 * @param {*} item
 * @returns {Validator}
 */
Validator.prototype.arrayUniqueItem = function(schema, at, array, item) {
    const enforce = this.enforce;
    if (enforce.uniqueItems && schema.uniqueItems && array.find(x => same(x, item))) {
        this.error(at, 'Array requires that all items be unique. Value is a duplicate: ' + item, 'UNIQ');
    }
    return this;
};

/**
 * Validate that multiple items are unique to the array.
 * @param {Object} schema
 * @param {string} at
 * @param {Array} array
 * @param {Array} items
 * @returns {Validator}
 */
Validator.prototype.arrayUniqueItems = function(schema, at, array, items) {
    const enforce = this.enforce;
    if (enforce.uniqueItems && schema.uniqueItems) {
        const length = items.length;
        const copy = array.slice(0);
        for (let i = 0; i < length; i++) {
            this.arrayUniqueItem(schema, at, copy, items[i]);
            copy.push(items[i]);
        }
    }
    return this;
};

/**
 * Validate that the value falls within the enum.
 * @param {Object} schema
 * @param {string} at
 * @param {*} value
 * @returns {Validator}
 */
Validator.prototype.enum = function(schema, at, value) {
    const enforce = this.enforce;
    if (enforce.enum && schema.enum) {
        let found = false;
        const length = schema.enum.length;
        for (let i = 0; i < length; i++) {
            if (same(schema.enum[i], value)) {
                found = true;
                break;
            }
        }
        if (!found) this.error(at, 'Value ' + value + ' does not match any enum options.', 'ENUM');
    }
    return this;
};

/**
 * Generate an error.
 * @param {string} at
 * @param {string} message
 * @param {string} code
 * @throws {Error}
 * @returns {Validator}
 */
Validator.prototype.error = function(at, message, code) {
    const err = buildError(at, message, code);
    if (!this.errors) {
        throw err;
    } else {
        this.errors.push(err);
    }
    return this;
};

/**
 * Validate a number.
 * @param {Object} schema
 * @param {string} at
 * @param {number} number
 * @returns {Validator}
 */
Validator.prototype.number = function(schema, at, number) {
    const enforce = this.enforce;

    if (typeof number === 'number') {

        // validate maximum
        if (enforce.maximum && schema.hasOwnProperty('maximum')) {
            if (schema.exclusiveMaximum && number === schema.maximum) {
                this.error(at, 'Value ' + number + ' over exclusive maximum ' + schema.maximum, 'NMAX');
            }
            if (number > schema.maximum) {
                this.error(at, 'Value ' + number + ' over ' + (schema.exclusiveMaximum ? 'exclusive ' : '') + 'maximum ' + schema.maximum, 'NMAX');
            }
        }

        // validate minimum
        if (enforce.minimum && schema.hasOwnProperty('minimum')) {
            if (schema.exclusiveMinimum && number === schema.minimum) {
                this.error(at, 'Value ' + number + ' under exclusive minimum ' + schema.minimum, 'NMIN');
            }
            if (number < schema.minimum) {
                this.error(at, 'Value ' + number + ' under ' + (schema.exclusiveMinimum ? 'exclusive ' : '') + 'minimum ' + schema.minimum, 'NMIN');
            }
        }

        // validate multiple of
        if (enforce.multipleOf && schema.hasOwnProperty('multipleOf') && number % schema.multipleOf !== 0) {
            this.error(at, 'Value ' + number + ' not a multiple of ' + schema.multipleOf, 'NMULT');
        }

    }

    return this;
};

/**
 * Validate an object.
 * @param {Object} schema
 * @param {string} at
 * @param {Object} object
 * @returns {Validator}
 */
Validator.prototype.object = function(schema, at, object) {
    if (object && typeof object === 'object') {

        const valueProperties = Object.keys(object);
        const valuePropertiesLength = valueProperties.length;

        const schemas = this.objectSchemas(schema, at, object);

        this.objectHasRequiredProperties(schemas, at, object);
        this.objectPropertyLength(schemas, at, valuePropertiesLength);

        // validate all value properties
        for (let i = 0; i < valuePropertiesLength; i++) {
            const property = valueProperties[i];
            this.objectProperty(schemas, at + '/' + property, object[property], property);
        }
    }

    return this;
};

/**
 * Get all schema variations possible, including allOf and discriminators.
 * @param {Object} schema
 * @param {string} at
 * @param {Object} object
 * @returns {Array}
 */
Validator.prototype.objectSchemas = function(schema, at, object) {
    const context = this;
    const store = {
        definitions: context.definitions,
        error: function(message) {
            context.error(at, message, 'HTNC');
        },
        map: new Map(),
        schemas: [],
        value: object
    };

    buildObjectInheritances(store, schema, at, true);

    return store.schemas;
};

/**
 * Validate a the number of properties
 * @param {Object[]} schemas
 * @param {string} at
 * @param {Object, number} object
 * @param {string} [property]
 * @param {boolean} [setting]
 * @returns {Validator}
 */
Validator.prototype.objectPropertyLength = function(schemas, at, object, property, setting) {
    const enforce = this.enforce;
    const objectProvided = typeof object === 'object';
    let length = objectProvided ? Object.keys(object).length : object;
    if (objectProvided && arguments.length > 3) {
        const hasProperty = object.hasOwnProperty(property);
        if (setting && !hasProperty) {
            length++;
        } else if (!setting && hasProperty) {
            length--;
        }
    }
    allOf(this, schemas, function(schema) {

        if (enforce.maxProperties && schema.hasOwnProperty('maxProperties') && length > schema.maxProperties) {
            this.error(at, 'The object has more properties than the allowed maximum: ' + schema.maxProperties, 'LEN');
        }

        if (enforce.minProperties && schema.hasOwnProperty('minProperties') && length < schema.minProperties) {
            this.error(at, 'The object has fewer properties than the allowed minimum: ' + schema.minProperties, 'LEN');
        }
    });
    return this;
};

/**
 * Validate that an object has all required properties.
 * @param {Object[]} schemas
 * @param {string} at
 * @param {Object} object
 * @returns {Validator}
 */
Validator.prototype.objectHasRequiredProperties = function(schemas, at, object) {
    const enforce = this.enforce;
    const valueProperties = Object.keys(object);
    const self = this;
    if (enforce.required) {
        allOf(this, schemas, function (schema) {
            if (schema.properties) {
                const missingProperties = Object.keys(schema.properties)
                    .filter(property => valueProperties.indexOf(property) === -1);
                missingProperties.forEach(property => objectPropertyRequired(self, schema, at + '/' + property, property));
            }
        });
    }
    return this;
};

/**
 * Validate an object property's value against its schema.
 * @param {Object[]} schemas
 * @param {string} at
 * @param {*} value
 * @param {string} property
 * @returns {Validator}
 */
Validator.prototype.objectProperty = function(schemas, at, value, property) {
    const enforce = this.enforce;
    let hasPropertyEnforcement = false;
    let propertyAllowed = false;

    allOf(this, schemas, function (schema) {
        if (schema.properties) hasPropertyEnforcement = true;
        if (schema.properties && schema.properties[property]) {
            propertyAllowed = true;
            this.validate(schema.properties[property], at, value);

        } else if (enforce.additionalProperties && schema.additionalProperties) {
            propertyAllowed = true;
            this.validate(schema.additionalProperties, at, value);

        } else {
            this.serializable(at, value);
        }
    });

    if (hasPropertyEnforcement && !propertyAllowed) {
        this.error(at, 'Property not allowed: ' + property, 'NPER');
    }

    return this;
};

/**
 * Produce an error if the property is required.
 * @param {Object[]} schemas
 * @param {string} at
 * @param {string} property
 * @returns {Validator}
 */
Validator.prototype.objectPropertyRequired = function(schemas, at, property) {
    const enforce = this.enforce;
    if (enforce.required) {
        allOf(this, schemas, schema => objectPropertyRequired(this, schema, at, property));
    }
    return this;
};

/**
 * Validate that a value is serializable.
 * @param {string} at
 * @param {*} value
 * @returns {Validator}
 */
Validator.prototype.serializable = function(at, value) {
    const type = typeof value;
    switch (type) {
        case 'function':
        case 'symbol':
        case 'undefined':
            this.error(at, 'Invalid type. Value type cannot be serialized to JSON string: ' + type, 'TYPE')
    }
    return this;
};

/**
 * Validate a string.
 * @param {Object} schema
 * @param {string} at
 * @param {string} string
 * @returns {Validator}
 */
Validator.prototype.string = function(schema, at, string) {
    if (typeof string === 'string') {

        const enforce = this.enforce;
        const length = string.length;

        // validate max length
        if (enforce.maxLength && schema.hasOwnProperty('maxLength') && length > schema.maxLength) {
            this.error(at, 'Value ' + string + ' has length (' + length + ') above max length ' + schema.maxLength, 'SMAX');
        }

        // validate min length
        if (enforce.minLength && schema.hasOwnProperty('minLength') && length < schema.minLength) {
            this.error(at, 'Value ' + string + ' has length (' + length + ') below min length ' + schema.minLength, 'SMIN');
        }

        // validate pattern
        if (enforce.pattern && schema.hasOwnProperty('pattern') && !(new RegExp(schema.pattern)).test(string)) {
            this.error(at, 'Value ' + string + ' does not match pattern ' + schema.pattern, 'SPAT');
        }

    }

    return this;
};

/**
 * Throw an error if errors exist.
 * @throws {Error}
 * @returns {Validator}
 */
Validator.prototype.throw = function() {
    const length = this.errors.length;
    if (length === 1) {
        throw this.errors[0];
    } else if (length > 1) {
        throw buildError('', "Validation failed due to one or more errors:\n\t" + this.errors.join('\n\t'), 'MLTI');
    }
    return this;
};

/**
 * Validate the type and format of a value.
 * @param {Object} schema
 * @param {string} at
 * @param {*} value
 * @returns {Validator}
 */
Validator.prototype.type = function(schema, at, value) {
    const type = getSchemaType(schema);
    const valueType = typeof value;
    let code = 'TYPE';
    let expected = '';

    if (type === 'array' && !Array.isArray(value)) {
        expected = 'an array';

    } else if (type === 'object' && (!value || valueType !== 'object' || Array.isArray(value))) {
        expected = 'a non-null object';

    } else if (type === 'boolean' && valueType !== 'boolean') {
        expected = 'a boolean';

    } else if (type === 'number' && ((valueType !== 'number' || isNaN(value)))) {
        expected = 'a number';

    } else if (type === 'integer' && ((valueType !== 'number' || isNaN(value) || !Number.isInteger(value)))) {
        expected = 'an integer';

    } else if (type === 'string') {
        if (valueType !== 'string') {
            expected = 'a string';
        } else {
            switch (schema.format) {
                case 'binary':
                    if (!is.binary(value)) {
                        expected = 'a binary octet sequence';
                        code = 'FRMT';
                    }
                    break;
                case 'byte':
                    if (!is.byte(value)) {
                        expected = 'a base64 encoded string';
                        code = 'FRMT';
                    }
                    break;
                case 'date':
                    if (!is.date(value)) {
                        expected = 'a date formatted as YYYY-MM-DD';
                        code = 'FRMT';
                    } else {
                        validateDateTime(this, at, value + 'T00:00:00.000Z');
                    }
                    break;
                case 'date-time':
                    if (!is.dateTime(value)) {
                        expected = 'a date-time formatted as YYYY-MM-DDThh:mm:ss.uuuZ';
                        code = 'FRMT';
                    } else {
                        validateDateTime(this, at, value);
                    }
                    break;
            }
        }
    }

    if (expected) this.error(at, 'Invalid type: Expected ' + expected + '. Received: ' + smart(value), code);

    return this;
};

/**
 * Run full validation on a value.
 * @param {Object} schema
 * @param {string} at
 * @param {*} value
 * @returns {Validator}
 */
Validator.prototype.validate = function(schema, at, value) {
    const type = getSchemaType(schema);

    // if no schema then we're done validating-
    if (!schema || (!type && !schema.enum)) return this;

    // validate serializable and type
    this.serializable(at, value);
    this.type(schema, at, value);

    // validate type specific
    switch (type) {
        case 'array':
            this.array(schema, at, value);
            break;

        case 'integer':
        case 'number':
            this.number(schema, at, value);
            break;

        case 'object':
            this.object(schema, at, value);
            break;

        case 'string':
            this.string(schema, at, value);
            break;
    }

    // validate enum
    this.enum(schema, at, value);

    return this;
};


function allOf(context, schemas, callback) {
    const length = schemas.length;
    for (let i = 0; i < length; i++) callback.call(context, schemas[i]);
}

function buildError(at, message, code) {
    if (at) message += ' [at ' + at + ']';
    const err = Error(message);
    err.at = at;
    err.code = 'ESE' + code;
    return err;
}

function buildObjectInheritances(store, schema, at) {
    const definitions = store.definitions;

    // only process schemas that haven't been processed yet
    if (schema && !store.map.has(schema)) {

        // store schema as processed
        store.map.set(schema, true);

        // determine if it has an allOf property
        const hasAllOf = Array.isArray(schema.allOf);

        // store each schema
        if (!hasAllOf) store.schemas.push(schema);

        if (hasAllOf) {
            schema.allOf.forEach(schema => {
                buildObjectInheritances(store, schema, at)
            });

        } else if (schema.hasOwnProperty('discriminator')) {
            const value = store.value;
            const discriminator = schema.discriminator;
            const name = value[discriminator];

            if (!value.hasOwnProperty(discriminator)) {
                store.error('Missing required discriminator property: ' + discriminator);

            } else if (!definitions.hasOwnProperty(name)) {
                store.error('Could not find definition "' + name + '" for discriminator: ' + discriminator);

            } else {
                buildObjectInheritances(store, definitions[name], at);
            }
        }
    }
}

function objectPropertyRequired(context, schema, at, property) {
    if (schema.required && schema.required.indexOf(property) !== -1) {
        context.error(at, 'Missing required property: ' + property, 'REQ');
    }
}

function validateDateTime(context, at, value) {
    const match = rx.dateTime.exec(value);

    const year = +match[1];
    const month = +match[2] - 1;
    const day = +match[3];
    const date = new Date(value);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
        context.error(at, 'Date does not exist on the calendar.', 'DATE');
    }

    const hour = +match[4];
    const minute = +match[5];
    const second = +match[6];
    if (hour > 23) context.error(at, 'Date-time hour outside of expected range. Must be between 00 and 23. Received: ' + hour, 'DATE');
    if (minute > 59) context.error(at, 'Date-time minute outside of expected range. Must be between 00 and 59. Received: ' + minute, 'DATE');
    if (second > 59) context.error(at, 'Date-time second outside of expected range. Must be between 00 and 59. Received: ' + second, 'DATE');
}