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
const util      = require('./util');

// this file is used to validate data prior to transport via http

exports.array = function(errors, prefix, schema, value) {
    const length = value.length;
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
};

exports.binary = function(errors, prefix, schema, value) {
    if (typeof value !== 'string') errors.push(prefix + ': Expected a string. Received: ' + util.smart(value));
    if (!/^(?:[01]{8})+$/.test(value)) errors.push(prefix + ': Expected a binary string. Received: ' + util.smart(value));
    exports.enum(errors, prefix, schema, value);
};

exports.byte = function(errors, prefix, schema, value) {
    if (typeof value !== 'string') errors.push(prefix + ': Expected a string. Received: ' + util.smart(value));
    if (/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
        errors.push(prefix + ': Expected a base64 string. Received: ' + util.smart(value));
    }
    exports.enum(errors, prefix, schema, value);
};

exports.date = function(errors, prefix, schema, value) {
    if (typeof value !== 'string') errors.push(prefix + ': Expected a string. Received: ' + util.smart(value));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        errors.push(prefix + ': Expected a full-date string as described by RFC3339 at https://xml2rfc.tools.ietf.org/public/rfc/html/rfc3339.html#anchor14. Received: ' + util.smart(value));
    }
    exports.enum(errors, prefix, schema, value);
};

exports.dateTime = function(errors, prefix, schema, value) {
    if (typeof value !== 'string') errors.push(prefix + ': Expected a string. Received: ' + util.smart(value));
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
        errors.push(prefix + ': Expected a date-time as described by RFC3339 at https://xml2rfc.tools.ietf.org/public/rfc/html/rfc3339.html#anchor14. Received: ' + util.smart(value));
    }
};

exports.enum = function(errors, prefix, schema, value) {
    if (schema.enum) {
        const length = schema.enum.length;
        let found;
        for (let i = 0; i < length; i++) {
            if (util.same(value, schema.enum[i])) {
                found = true;
                break;
            }
        }
        if (!found) errors.push(prefix + ': Value did not meet enum requirements: ' + util.smart(value));
    }
};

exports.integer = function(errors, prefix, schema, value) {
    if (isNaN(value) || Math.round(value) !== value || typeof value !== 'number') {
        errors.push(prefix + ': Expected an integer. Received: ' + util.smart(value));
    }
    numerics(errors, prefix, schema, value);
};

exports.number = function(errors, prefix, schema, value) {
    if (isNaN(value) || typeof value !== 'number') errors.push(prefix + ': Expected a number. Received: ' + util.smart(value));
    numerics(errors, prefix, schema, value);
};

exports.string = function(errors, prefix, schema, value) {
    const length = value.length;
    if (schema.hasOwnProperty('maxLength') && length > schema.maxLength) {
        errors.push(prefix + ': String length above maximum length of ' + schema.maxLength + ' with length of ' + length + ': ' + util.smart(value));
    }
    if (schema.hasOwnProperty('minLength') && length < schema.minLength) {
        errors.push(prefix + ': String length below minimum length of ' + schema.minLength + ' with length of ' + length + ': ' + util.smart(value));
    }
    if (schema.hasOwnProperty('pattern') && !(new RegExp(schema.pattern).test(value))) {
        errors.push(prefix + ': String does not match required pattern ' + schema.pattern + ' with value: ' + util.smart(value));
    }
    exports.enum(errors, prefix, schema, value);
};

function numerics(errors, prefix, schema, value) {
    if (schema.hasOwnProperty('maximum')) {
        if (schema.exclusiveMaximum && value >= schema.maximum) {
            errors.push(prefix + ': Expected a number to be less than ' + schema.maximum + '. Received: ' + util.smart(value));
        } else if (value > schema.maximum) {
            errors.push(prefix + ': Expected a number to be less than or equal to ' + schema.maximum + '. Received: ' + util.smart(value));
        }
    }
    if (schema.hasOwnProperty('minimum')) {
        if (schema.exclusiveMinimum && value <= schema.minimum) {
            errors.push(prefix + ': Expected a number to be greater than ' + schema.minimum + '. Received: ' + util.smart(value));
        } else if (value < schema.minimum) {
            errors.push(prefix + ': Expected a number to be greater than or equal to ' + schema.minimum + '. Received: ' + util.smart(value));
        }
    }
    if (schema.multipleOf && value % schema.multipleOf !== 0) errors.push(prefix + ': Expected a multiple of ' + schema.multipleOf + '. Received: ' + util.smart(value));

    exports.enum(errors, prefix, schema, value);
}