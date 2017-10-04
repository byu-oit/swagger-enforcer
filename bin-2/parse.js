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
const smart         = require('./util').smart;
const rx            = require('./rx');

/**
 * Convert value from a binary octet string to a buffer.
 * @param {string} value
 * @returns {Buffer}
 */
exports.binary = function(value) {
    if (!/^(?:[01]{8})+$/.test(value)) throw Error('Expected a binary octet string. Received: ' + smart(value));
    return Buffer.from ? Buffer.from(value, 'binary') : new Buffer(value, 'binary');
};

/**
 * Convert a value to a boolean.
 * @param {*} value
 * @returns {boolean}
 */
exports.boolean = function(value) {
    if (value === 'false') return false;
    return !!value;
};

/**
 * Convert from base64 encoded string to a buffer.
 * @param {boolean, number, string, buffer} value
 * @returns {string}
 */
exports.byte = function(value) {
    if (value.length % 4 !== 0 || !/^[A-Za-z0-9+\/]+=*$/.test(value)) throw Error('Expected a base64 string. Received: ' + smart(value));
    return Buffer.from ? Buffer.from(value, 'base64') : new Buffer(value, 'binary');
};

/**
 * Take a number, date value, or a date string and convert to date format.
 * @param {Date, string, number} value
 * @returns {string}
 */
exports.date = function(value) {
    const date = exports.dateTime(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
};

/**
 * Take a number, date value, or a date string and convert to ISO date format.
 * @param {Date, string, number} value
 * @returns {Date}
 */
exports.dateTime = function(value) {
    const type = typeof value;
    const isString = type === 'string';

    if (isString && rx.dateTime.test(value)) {
        return new Date(value);

    } else if (isString && rx.date.test(value)) {
        return new Date(value + 'T00:00:00.000Z');

    } else if (value instanceof Date) {
        return new Date(+value);

    } else if (type === 'number') {
        return new Date(value);

    } else {
        throw Error('Cannot convert to date. The value must be a Date, a number, or a date string. Received: ' + smart(value));
    }
};
exports['date-time'] = exports.dateTime;

/**
 * Convert a value to an integer.
 * @param {*} value
 * @returns {number}
 */
exports.integer = function(value) {
    const result = +value;
    if (isNaN(result)) throw Error('Cannot convert to integer. The value must be numeric. Received: ' + smart(value));
    return Math.round(result);
};

/**
 * Convert a value to a number.
 * @param {string, number, boolean} value
 * @returns {number}
 */
exports.number = function(value) {
    const result = +value;
    if (isNaN(result)) throw Error('Cannot convert to number. The value must be numeric. Received: ' + smart(value));
    return result;
};

/**
 * Convert a value to a string.
 * @param {string, number, boolean, object, date} value
 * @returns {string}
 */
exports.string = function(value) {
    switch (typeof value) {
        case 'boolean':
        case 'number':
        case 'string':
            return String(value);
        case 'object':
            if (value instanceof Date) return value.toISOString();
            return JSON.stringify(value);
    }

    throw Error('Cannot convert to string. The value must be a string, a number, or a boolean. Received: ' + smart(value));
};

function decToBin(dec) {
    const binary = (dec >>> 0).toString(2);
    const mod = binary.length % 8;
    return mod === 0 ? binary : zeros.substr(mod) + binary;
}