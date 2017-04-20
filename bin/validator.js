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
const is            = require('./is');
const rx            = require('./rx');
const same          = require('./same');

module.exports = Validator;

/**
 * Define a validator instance.
 * @param {object} definitions
 * @param {boolean} [throwErrors=false]
 * @constructor
 */
function Validator(definitions, throwErrors) {
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
    const length = array.length;

    this.arrayLength(schema, at, length);
    this.arrayUniqueItems(schema, at, [], array);

    if (schema.items) {
        for (let i = 0; i < length; i++) this.validate(schema.items, at + '/' + i, array[i]);
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
 * @param {Array, number} length
 * @returns {Validator}
 */
Validator.prototype.arrayLength = function(schema, at, length) {
    if (typeof length !== 'number') length = length.length;

    // validate max items
    if (schema.hasOwnProperty('maxItems') && length > schema.maxItems) {
        this.error(at, 'Array length is greater than allowable maximum length', 'LEN');
    }

    // validate min items
    if (schema.hasOwnProperty('minItems') && length < schema.minItems) {
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
    if (schema.uniqueItems && array.find(x => same(x, item))) {
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
    if (schema.uniqueItems) {
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
    if (schema.enum) {
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

    // validate maximum
    if (schema.hasOwnProperty('maximum')) {
        if (schema.exclusiveMaximum && number === schema.maximum) {
            this.error(at, 'Value ' + number + ' over exclusive maximum ' + schema.maximum, 'NMAX');
        }
        if (number > schema.maximum) {
            this.error(at, 'Value ' + number + ' over ' + (schema.exclusiveMaximum ? 'exclusive ' : '') + 'maximum ' + schema.maximum, 'NMAX');
        }
    }

    // validate minimum
    if (schema.hasOwnProperty('minimum')) {
        if (schema.exclusiveMinimum && number === schema.minimum) {
            this.error(at, 'Value ' + number + ' under exclusive minimum ' + schema.minimum, 'NMIN');
        }
        if (number < schema.minimum) {
            this.error(at, 'Value ' + number + ' under ' + (schema.exclusiveMinimum ? 'exclusive ' : '') + 'minimum ' + schema.minimum, 'NMIN');
        }
    }

    // validate multiple of
    if (schema.hasOwnProperty('multipleOf') && number % schema.multipleOf !== 0) {
        this.error(at, 'Value ' + number + ' not a multiple of ' + schema.multipleOf, 'NMULT');
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
    const valueProperties = Object.keys(object);
    const valuePropertiesLength = valueProperties.length;

    this.objectHasRequiredProperties(schema, at, object);
    this.objectPropertyLength(schema, at, valuePropertiesLength);

    // validate all value properties
    for (let i = 0; i < valuePropertiesLength; i++) {
        const property = valueProperties[i];
        this.objectProperty(schema, at + '/' + property, object[property], property);
    }

    return this;
};

/**
 * Validate a the number of properties
 * @param {Object} schema
 * @param {string} at
 * @param {Object, number} object
 * @param {string} [property]
 * @param {boolean} [setting]
 * @returns {Validator}
 */
Validator.prototype.objectPropertyLength = function(schema, at, object, property, setting) {
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
    allOf(this, schema, function(schema) {

        if (schema.hasOwnProperty('maxProperties') && length > schema.maxProperties) {
            this.error(at, 'The object has more properties than the allowed maximum: ' + schema.maxProperties, 'LEN');
        }

        if (schema.hasOwnProperty('minProperties') && length < schema.minProperties) {
            this.error(at, 'The object has fewer properties than the allowed minimum: ' + schema.minProperties, 'LEN');
        }
    });
    return this;
};

/**
 * Validate that an object has all required properties.
 * @param {Object} schema
 * @param {string} at
 * @param {Object} object
 * @returns {Validator}
 */
Validator.prototype.objectHasRequiredProperties = function(schema, at, object) {
    const valueProperties = Object.keys(object);
    const self = this;
    allOf(this, schema, function (schema) {
        if (schema.properties) {
            const missingProperties = Object.keys(schema.properties)
                .filter(property => valueProperties.indexOf(property) === -1);
            missingProperties.forEach(property => self.objectPropertyRequired(schema, at + '/' + property, property));
        }
    });
    return this;
};

/**
 * Validate an object property's value against its schema.
 * @param {Object} schema
 * @param {string} at
 * @param {*} value
 * @param {string} property
 * @returns {Validator}
 */
Validator.prototype.objectProperty = function(schema, at, value, property) {
    allOf(this, schema, function (schema) {
        if (schema.properties && schema.properties[property]) {
            this.validate(schema.properties[property], at, value);

        } else if (schema.additionalProperties) {
            this.validate(schema.additionalProperties, at, value);

        } else if (schema.properties) {
            this.error(at, 'Property not allowed: ' + property, 'NPER');

        } else {
            this.serializable(at, value);
        }
    });
    return this;
};

/**
 * Produce an error if the property is required.
 * @param {Object} schema
 * @param {string} at
 * @param {string} property
 * @returns {Validator}
 */
Validator.prototype.objectPropertyRequired = function(schema, at, property) {
    allOf(this, schema, function (schema) {
        if (schema.properties && schema.properties[property] && schema.properties[property].required) {
            this.error(at, 'Missing required property: ' + property, 'REQ');
        }
    });
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
    const length = string.length;

    // validate max length
    if (schema.hasOwnProperty('maxLength') && length > schema.maxLength) {
        this.error(at, 'Value ' + string + ' has length (' + length + ') above max length ' + schema.maxLength, 'SMAX');
    }

    // validate min length
    if (schema.hasOwnProperty('minLength') && length < schema.minLength) {
        this.error(at, 'Value ' + string + ' has length (' + length + ') below min length ' + schema.minLength, 'SMIN');
    }

    // validate pattern
    if (schema.hasOwnProperty('pattern') && !(new RegExp(schema.pattern)).test(string)) {
        this.error(at, 'Value ' + string + ' does not match pattern ' + schema.pattern, 'SPAT');
    }

    return this;
};

/**
 * Throw an error if errors exist.
 * @throws {Error}
 * @returns {Validator}
 */
Validator.prototype.throw = function() {
    if (this.errors.length > 0) {
        const code = this.errors.length === 1 ? this.errors[0].code.substr(3) : 'MLTI';
        throw buildError('', "Validation failed due to one or more errors:\n\t" + this.errors.join('\n\t'), code);
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
    const valueType = typeof value;
    let expected = '';

    if (schema.type === 'array' && !Array.isArray(value)) {
        expected = 'an array';

    } else if (schema.type === 'object' && (!value || valueType !== 'object' || Array.isArray(value))) {
        expected = 'a non-null object';

    } else if (schema.type === 'boolean' && valueType !== 'boolean') {
        expected = 'a boolean';

    } else if (schema.type === 'number' && ((valueType !== 'number' || isNaN(value)))) {
        expected = 'a number';

    } else if (schema.type === 'integer' && ((valueType !== 'number' || isNaN(value) || !Number.isInteger(value)))) {
        expected = 'an integer';

    } else if (schema.type === 'string') {
        if (valueType !== 'string') {
            expected = 'a string';
        } else {
            switch (schema.format) {
                case 'binary':
                    if (!is.binary(value)) expected = 'a binary octet sequence';
                    break;
                case 'byte':
                    if (!is.byte(value)) expected = 'a base64 encoded string';
                    break;
                case 'date':
                    if (!is.date(value)) {
                        expected = 'a date formatted as YYYY-MM-DD';
                    } else {
                        validateDateTime(this, at, value + 'T00:00:00.000Z');
                    }
                    break;
                case 'date-time':
                    if (!is.dateTime(value)) {
                        expected = 'a date-time formatted as YYYY-MM-DDThh:mm:ss.uuuZ';
                    } else {
                        validateDateTime(this, at, value);
                    }
                    break;
            }
        }
    }

    if (expected) this.error(at, 'Invalid type: Expected ' + expected + '. Received: ' + value, 'TYPE');

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

    // if no schema then we're done validating-
    if (!schema || (!schema.type && !schema.enum)) return;

    // validate serializable and type
    this.serializable(at, value);
    this.type(schema, at, value);

    // validate type specific
    switch (schema.type) {
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


function allOf(context, schema, callback) {
    if (schema.allOf) {
        const allOfLength = schema.allOf.length;
        for (let i = 0; i < allOfLength; i++) callback.call(context, schema.allOf[i]);
    } else {
        callback.call(context, schema);
    }
}

function buildError(at, message, code) {
    const fullCode = 'ESE' + code;
    const fullMessage = 'Error ' + fullCode + (at ? ' at ' + at : '') + ': ' + message;
    const err = Error(fullMessage);
    err.at = at;
    err.code = fullCode;
    return err;
}

function validateDateTime(context, at, value) {
    const match = rx.dateTime.exec(value);

    const year = +match[1];
    const month = +match[2] - 1;
    const day = +match[3];
    const date = new Date(year, month, day);
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        context.error(at, 'Date does not exist on the calendar.', 'DATE');
    }

    const hour = +match[4];
    const minute = +match[5];
    const second = +match[6];
    if (hour > 23) context.error(at, 'Date-time hour outside of expected range. Must be between 00 and 23. Received: ' + hour, 'DATE');
    if (minute > 59) context.error(at, 'Date-time minute outside of expected range. Must be between 00 and 59. Received: ' + minute, 'DATE');
    if (second > 59) context.error(at, 'Date-time second outside of expected range. Must be between 00 and 59. Received: ' + second, 'DATE');
}