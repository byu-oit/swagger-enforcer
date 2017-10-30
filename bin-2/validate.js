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
const is        = require('./is');
const rx        = require('./rx');
const util      = require('./util');

const smart = util.smart;
const rxPrefixSpaces = /^ */;

module.exports = validate;

function validate(v, prefix, schema, value) {
    const type = util.schemaType(schema);
    switch (type) {
        case 'array':
            validate.array(v, prefix, schema, value);
            break;
        case 'boolean':
        case 'integer':
        case 'number':
        case 'object':
            return validate[type](v, prefix, schema, value);
            break;
        case 'string':
            switch (schema.format) {
                case 'binary':
                case 'byte':
                case 'date':
                case 'date-time':
                    return validate[schema.format](v, prefix, schema, value);
                    break;
                case '':
                case undefined:
                    return validate.string(v, prefix, schema, value);
                    break;
            }
            break;
    }
}

validate.array = function(v, prefix, schema, value) {
    if (!v.options.array) return;
    if (!Array.isArray(value)) {
        v.errors.push(prefix + ': Expected an array. Received: ' + smart(value))
    } else {
        const length = value.length;
        if (v.options.maxItems && schema.hasOwnProperty('maxItems') && schema.maxItems < length) {
            v.errors.push(prefix + ': Array length above maximum length of ' + schema.maxItems + ' with ' + length + ' items.');
        }
        if (v.options.minItems && schema.hasOwnProperty('minItems') && schema.minItems > length) {
            v.errors.push(prefix + ': Array length below minimum length of ' + schema.minItems + ' with ' + length + ' items.');
        }
        if (v.options.uniqueItems && schema.uniqueItems) {
            const singles = [];
            value.forEach((item, index) => {
                const length = singles.length;
                let found;
                for (let i = 0; i < length; i++) {
                    if (util.same(item, singles[i])) {
                        v.errors.push(prefix + ': Array values must be unique. Value is not unique at index ' + index + ': ' + item);
                        found = true;
                        break;
                    }
                }
                if (!found) singles.push(item);
            });
        }
        if (v.options.items && schema.items) {
            value.forEach((val, index) => {
                validate(v, '/' + prefix + '/' + index, schema.items, val);
            });
        }
        validate.enum(v, prefix, schema, value);
    }
};

validate.binary = function(v, prefix, schema, value) {
    if (!v.options.binary) return;
    if (typeof value !== 'string') {
        v.errors.push(prefix + ': Expected a string. Received: ' + smart(value));
    } else {
        if (!is.binary(value)) v.errors.push(prefix + ': Expected a binary string. Received: ' + smart(value));
        validate.string(v, prefix, schema, value);
    }
};

validate.boolean = function(v, prefix, schema, value) {
    if (!v.options.boolean) return;
    if (typeof value !== 'boolean') {
        v.errors.push(prefix + ': Expected a boolean. Received: ' + smart(value));
    } else {
        validate.enum(v, prefix, schema, value);
    }
};

validate.byte = function(v, prefix, schema, value) {
    if (!v.options.byte) return;
    if (typeof value !== 'string') {
        v.errors.push(prefix + ': Expected a string. Received: ' + smart(value));
    } else {
        if (!is.byte(value)) v.errors.push(prefix + ': Expected a base64 string. Received: ' + smart(value));
        validate.string(v, prefix, schema, value);
    }
};

validate.date = function(v, prefix, schema, value) {
    if (!v.options.date) return;
    if (typeof value !== 'string' || !is.date(value)) {
        v.errors.push(prefix + ': Expected a full-date string as described by RFC3339 at https://xml2rfc.tools.ietf.org/public/rfc/html/rfc3339.html#anchor14. Received: ' + smart(value));
    } else {
        date('date', v, prefix, schema, value);
        validate.string(v, prefix, schema, value);
    }
};

validate.dateTime = function(v, prefix, schema, value) {
    if (!v.options.dateTime) return;
    if (typeof value !== 'string' || !is.dateTime(value)) {
        v.errors.push(prefix + ': Expected a date-time as described by RFC3339 at https://xml2rfc.tools.ietf.org/public/rfc/html/rfc3339.html#anchor14. Received: ' + smart(value));
    } else if (is.dateTime(value)) {
        date('date-time', v, prefix, schema, value);
        validate.string(v, prefix, schema, value);
    }
};
validate['date-time'] = validate.dateTime;

validate.enum = function(v, prefix, schema, value) {
    if (v.options.enum && schema.enum) {
        const length = schema.enum.length;
        let found;
        for (let i = 0; i < length; i++) {
            if (util.same(value, schema.enum[i])) {
                found = true;
                break;
            }
        }
        if (!found) v.errors.push(prefix + ': Value did not meet enum requirements: ' + smart(value));
    }
};

validate.integer = function(v, prefix, schema, value) {
    if (!v.options.integer) return;
    if (isNaN(value) || Math.round(value) !== value || typeof value !== 'number') {
        v.errors.push(prefix + ': Expected an integer. Received: ' + smart(value));
    } else {
        numerical('integer', v, prefix, schema, value);
    }
};

validate.number = function(v, prefix, schema, value) {
    if (!v.options.number) return;
    if (isNaN(value) || typeof value !== 'number') {
        v.errors.push(prefix + ': Expected a number. Received: ' + smart(value));
    } else {
        numerical('number', v, prefix, schema, value);
    }
};

// TODO: oneOf and anyOf can use discriminators too
// TODO: add error messages for missed schemas on oneOf and anyOf

validate.object = function(v, prefix, schema, value) {
    if (!v.options.object) return;
    if (!value || typeof value !== 'object') {
        v.errors.push(prefix + ': Expected a non-null object. Received: ' + smart(value));
    } else {
        const discriminator = v.options.discriminator && schema.discriminator;
        const indentLength = rxPrefixSpaces.exec(prefix)[0].length;
        const nestedPrefix = ' '.repeat(indentLength + 2);
        if (v.options.anyOf && schema.anyOf) {
            const result = anyOneOf(v, nestedPrefix, schema.anyOf, value);
            if (!result.valid) {
                v.errors.push(prefix + ': Did not match any of the schemas:\n' + result.errors.join('\n'));
            }

        } else if (v.options.oneOf && schema.oneOf) {
            const result = anyOneOf(v, nestedPrefix, schema.oneOf, value);
            if (result.valid !== 1) {
                v.errors.push(prefix + ': Did not match exactly one schema. Matched: ' + result.valid + '\n' + result.messages.join('\n'));
            }

        } else if (v.options.allOf && (schema.allOf || discriminator)) {
            discriminate(v, new Map(), [], prefix, schema, value).forEach(schema => {
                object(v, prefix, schema, value);
            });

        } else {
            object(v, prefix, schema, value);
        }
    }
};

validate.string = function(v, prefix, schema, value) {
    if (!v.options.string) return;
    const length = value.length;
    if (typeof value !== 'string') {
        v.errors.push(prefix + ': Expected a string. Received: ' + smart(value));
    } else {
        if (v.options.maxLength && schema.hasOwnProperty('maxLength') && length > schema.maxLength) {
            v.errors.push(prefix + ': String length above maximum length of ' + schema.maxLength + ' with length of ' + length + ': ' + smart(value));
        }
        if (v.options.minLength && schema.hasOwnProperty('minLength') && length < schema.minLength) {
            v.errors.push(prefix + ': String length below minimum length of ' + schema.minLength + ' with length of ' + length + ': ' + smart(value));
        }
        if (v.options.pattern && schema.hasOwnProperty('pattern') && !(new RegExp(schema.pattern).test(value))) {
            v.errors.push(prefix + ': String does not match required pattern ' + schema.pattern + ' with value: ' + smart(value));
        }
        validate.enum(v, prefix, schema, value);
    }
};





function anyOneOf(v, prefix, schemas, value) {
    // get reference to existing errors and overwrite temporarily
    const errorsRef = v.errors;
    const messages = [];
    const errors = [];

    // iterate through schemas to check validity
    const length = schemas.length;
    let valid = 0;
    for (let i = 0; i < length; i++) {
        const schema = schemas[i];
        v.errors = [];
        validate(v, prefix + '  ', schema, value);
        if (!v.errors.length) {
            valid++;
            messages.push(prefix + 'Schema #' + (i + 1) + ': Valid');
        } else {
            const logStr = prefix + 'Schema #' + (i + 1) + ': Invalid\n' + v.errors.join('\n');
            messages.push(logStr);
            errors.push(logStr);
        }
    }

    // restore errors
    v.errors = errorsRef;

    return {
        errors: errors,
        messages: messages,
        valid: valid
    };
}

function date(descriptor, v, prefix, schema, value) {
    const suffix = descriptor === 'date-time' ? '' : 'T00:00:00.000Z';
    const match = rx.dateTime.exec(value + suffix);
    const dt = new Date(value);

    const year = +match[1];
    const month = +match[2] - 1;
    const day = +match[3];
    const hour = +match[4];
    const minute = +match[5];
    const second = +match[6];

    if (v.options.timeExists && (hour >= 24 || minute >= 60 || second >= 60)) {
        v.errors.push(prefix + ': The specified time is invalid: ' + value.substr(11))
    }
    if (v.options.dateExists && (year !== dt.getUTCFullYear() || month !== dt.getUTCMonth() || day !== dt.getUTCDate())) {
        v.errors.push(prefix + ': The specified date does not exist: ' + value.substr(0, 10));
    }

    maxMin(v, prefix, schema, descriptor, 'maximum', 'minimum', false, dt, new Date(schema.maximum), new Date(schema.minimum));
}

function discriminate(v, map, allOf, prefix, schema, value) {

    // avoid endless loops
    const exists = map.get(schema);
    if (exists) return exists;
    map.set(schema, true);

    if (schema.allOf) {
        schema.allOf.forEach(schema => {
            discriminate(v, map, allOf, prefix, schema, value);
        });

    } else {
        allOf.push(schema);

        const discriminator = schema.discriminator;
        if (discriminator) {
            const schemas = v.schemas;
            const key = value[discriminator.propertyName];

            if (discriminator.mapping && discriminator.mapping[key]) {
                discriminate(v, map, allOf, prefix, discriminator.mapping[key], value);
            } else if (schemas[key]) {
                discriminate(v, map, allOf, prefix, schemas[key], value);
            } else {
                v.errors.push(prefix + ': Undefined discriminator schema: ' + key)
            }
        }
    }

    return allOf;
}

function numerical(descriptor, v, prefix, schema, value) {
    maxMin(v, prefix, schema, descriptor, 'maximum', 'minimum', true, value, schema.maximum, schema.minimum);

    if (schema.multipleOf && value % schema.multipleOf !== 0) v.errors.push(prefix + ': Expected a multiple of ' + schema.multipleOf + '. Received: ' + smart(value));

    validate.enum(v, prefix, schema, value);
}

function maxMin(v, prefix, schema, type, maxProperty, minProperty, exclusives, value, maximum, minimum) {
    if (v.options[maxProperty] && schema.hasOwnProperty(maxProperty)) {
        if (exclusives && schema.exclusiveMaximum && value >= maximum) {
            v.errors.push(prefix + ': Expected ' + type + ' to be less than ' + schema[maxProperty] + '. Received: ' + smart(value));
        } else if (value > maximum) {
            v.errors.push(prefix + ': Expected ' + type + ' to be less than or equal to ' + schema[maxProperty] + '. Received: ' + smart(value));
        }
    }

    if (v.options[minProperty] && schema.hasOwnProperty(minProperty)) {
        if (exclusives && schema.exclusiveMinimum && value <= minimum) {
            v.errors.push(prefix + ': Expected ' + type + ' to be greater than ' + schema[minProperty] + '. Received: ' + smart(value));
        } else if (value < minimum) {
            v.errors.push(prefix + ': Expected ' + type + ' to be greater than or equal to ' + schema[minProperty] + ' Received: ' + smart(value));
        }
    }
}

function object(v, prefix, schema, value) {
    const properties = schema.properties || {};
    const required = v.options.required && schema.required ? schema.required.concat() : [];
    const keys = Object.keys(value);

    // validate each property in the value
    keys.forEach(key => {
        const index = required.indexOf(key);
        if (index !== -1) required.splice(index, 1);

        if (properties.hasOwnProperty(key)) {
            if (v.options.properties) validate(v, prefix + '/' + key, properties[key], value[key]);

        } else if (v.options.additionalProperties && schema.additionalProperties) {
            validate(v, '/' + prefix + '/' + key, schema.additionalProperties, value[key]);
        }
    });

    // validate that all required are present
    if (v.options.required && required.length > 0) {
        v.errors.push(prefix + ': One or more required properties missing: ' + required.join(', '));
    }

    // validate number of properties
    maxMin(v, prefix, schema, 'object property count', 'maxProperties', 'minProperties', false, keys.length, schema.maxProperties, schema.minProperties);

    validate.enum(v, prefix, schema, value);
}