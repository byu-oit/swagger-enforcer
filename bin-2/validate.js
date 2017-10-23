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
const util      = require('./util');

const smart = util.smart;


module.exports = validate;

function validate(errors, prefix, schema, value) {
    const type = util.schemaType(schema);
    switch (type) {
        case 'array':
            if (Array.isArray(value)) validate.array(errors, prefix, schema, value);
            break;
        case 'boolean':
        case 'integer':
        case 'number':
        case 'object':
            return validate[type](value);
            break;
        case 'string':
            switch (schema.format) {
                case 'binary':
                case 'byte':
                case 'date':
                case 'date-time':
                    return validate[schema.format](errors, prefix, schema, value);
                    break;
                case '':
                    return validate.string(errors, prefix, schema, value);
                    break;
            }
            break;
    }
}


validate.array = function(errors, prefix, schema, value) {
    const length = value.length;
    if (!Array.isArray(value)) {
        errors.push(prefix + ': Expected an array. Received: ' + smart(value))
    } else {
        if (schema.maxItems < length) errors.push(prefix + ': Array length above maximum length of ' + schema.maxItems + ' with ' + length + ' items.');
        if (schema.minItems > length) errors.push(prefix + ': Array length below minimum length of ' + schema.minItems + ' with ' + length + ' items.');
        if (schema.uniqueItems) {
            const singles = [];
            value.forEach((item, index) => {
                const length = singles.length;
                let found;
                for (let i = 0; i < length; i++) {
                    if (util.same(item, singles[i])) {
                        errors.push(prefix + ': Array values must be unique. Value is not unique at index ' + index + ': ' + item);
                        found = true;
                        break;
                    }
                }
                if (!found) singles.push(item);
            });
        }
        if (schema.items) {
            value.forEach((v, index) => {
                validate(errors, prefix + '/' + index, schema.items, v);
            });
        }
    }
};

validate.binary = function(errors, prefix, schema, value) {
    if (typeof value !== 'string') {
        errors.push(prefix + ': Expected a string. Received: ' + smart(value));
    } else {
        if (!is.binary(value)) errors.push(prefix + ': Expected a binary string. Received: ' + smart(value));
        validate.enum(errors, prefix, schema, value);
    }
};

validate.boolean = function(errors, prefix, schema, value) {
    if (typeof value !== 'boolean') {
        errors.push(prefix + ': Expected a boolean. Received: ' + smart(value));
    } else {
        validate.enum(errors, prefix, schema, value);
    }
};

validate.byte = function(errors, prefix, schema, value) {
    if (typeof value !== 'string') {
        errors.push(prefix + ': Expected a string. Received: ' + smart(value));
    } else {
        if (!is.byte(value)) errors.push(prefix + ': Expected a base64 string. Received: ' + smart(value));
        validate.enum(errors, prefix, schema, value);
    }
};

validate.date = function(errors, prefix, schema, value) {
    if (typeof value !== 'string') {
        errors.push(prefix + ': Expected a string. Received: ' + smart(value));
    } else {
        if (!is.date(value)) errors.push(prefix + ': Expected a full-date string as described by RFC3339 at https://xml2rfc.tools.ietf.org/public/rfc/html/rfc3339.html#anchor14. Received: ' + smart(value));
        validate.enum(errors, prefix, schema, value);
    }
};

validate.dateTime = function(errors, prefix, schema, value) {
    if (typeof value !== 'string') {
        errors.push(prefix + ': Expected a string. Received: ' + smart(value));
    } else {
        if (is.dateTime(value)) errors.push(prefix + ': Expected a date-time as described by RFC3339 at https://xml2rfc.tools.ietf.org/public/rfc/html/rfc3339.html#anchor14. Received: ' + smart(value));
        validate.enum(errors, prefix, schema, value);
    }
};

validate.enum = function(errors, prefix, schema, value) {
    if (schema.enum) {
        const length = schema.enum.length;
        let found;
        for (let i = 0; i < length; i++) {
            if (util.same(value, schema.enum[i])) {
                found = true;
                break;
            }
        }
        if (!found) errors.push(prefix + ': Value did not meet enum requirements: ' + smart(value));
    }
};

validate.integer = function(errors, prefix, schema, value) {
    if (isNaN(value) || Math.round(value) !== value || typeof value !== 'number') {
        errors.push(prefix + ': Expected an integer. Received: ' + smart(value));
    } else {
        numerics(errors, prefix, schema, value);
    }
};

validate.number = function(errors, prefix, schema, value) {
    if (isNaN(value) || typeof value !== 'number') {
        errors.push(prefix + ': Expected a number. Received: ' + smart(value));
    } else {
        numerics(errors, prefix, schema, value);
    }
};

validate.object = function(errors, prefix, schema, value) {
    if (!value || typeof value !== 'object') {
        errors.push(prefix + ' Expected a non-null object. Received: ' + smart(value));
    } else {
        const additionalProperties = schema.additionalProperties;
        const properties = schema.properties || {};
        const required = schema.required ? schema.required.concat() : [];

        // validate each property in the value
        Object.keys(value).forEach(key => {
            if (properties.hasOwnProperty(key)) {
                validate(errors, prefix + '/' + key, properties[key], value[key]);
                const index = required.indexOf(key);
                if (index !== -1) required.split(index, 1);

            } else if (additionalProperties) {
                validate(errors, prefix + '/' + key, additionalProperties, value[key]);
            }
        });

        // validate that all required are present
        if (required.length > 0) {
            errors.push(prefix + ': One or more required properties missing: ' + required.join(', '));
        }
    }
};

validate.string = function(errors, prefix, schema, value) {
    const length = value.length;
    if (typeof value !== 'string') {
        errors.push(prefix + ': Expected a string. Received: ' + smart(value));
    } else {
        if (schema.hasOwnProperty('maxLength') && length > schema.maxLength) {
            errors.push(prefix + ': String length above maximum length of ' + schema.maxLength + ' with length of ' + length + ': ' + smart(value));
        }
        if (schema.hasOwnProperty('minLength') && length < schema.minLength) {
            errors.push(prefix + ': String length below minimum length of ' + schema.minLength + ' with length of ' + length + ': ' + smart(value));
        }
        if (schema.hasOwnProperty('pattern') && !(new RegExp(schema.pattern).test(value))) {
            errors.push(prefix + ': String does not match required pattern ' + schema.pattern + ' with value: ' + smart(value));
        }
        validate.enum(errors, prefix, schema, value);
    }
};



function numerics(errors, prefix, schema, value) {
    if (schema.hasOwnProperty('maximum')) {
        if (schema.exclusiveMaximum && value >= schema.maximum) {
            errors.push(prefix + ': Expected a number to be less than ' + schema.maximum + '. Received: ' + smart(value));
        } else if (value > schema.maximum) {
            errors.push(prefix + ': Expected a number to be less than or equal to ' + schema.maximum + '. Received: ' + smart(value));
        }
    }
    if (schema.hasOwnProperty('minimum')) {
        if (schema.exclusiveMinimum && value <= schema.minimum) {
            errors.push(prefix + ': Expected a number to be greater than ' + schema.minimum + '. Received: ' + smart(value));
        } else if (value < schema.minimum) {
            errors.push(prefix + ': Expected a number to be greater than or equal to ' + schema.minimum + '. Received: ' + smart(value));
        }
    }
    if (schema.multipleOf && value % schema.multipleOf !== 0) errors.push(prefix + ': Expected a multiple of ' + schema.multipleOf + '. Received: ' + smart(value));

    validate.enum(errors, prefix, schema, value);
}