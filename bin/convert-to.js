'use strict';
const rx            = require('./rx');

const zeros = '00000000';

/**
 * Convert value into a binary octet string.
 * @param {boolean, number, string, buffer} value
 * @returns {string}
 */
exports.binary = function(value) {
    const type = typeof value;

    if (type === 'boolean') {
        return '0000000' + (value ? '1' : '0');

    } else if (type === 'number' && !isNaN(value)) {
        return decToBin(value);

    } else if (type === 'string' || value instanceof Buffer) {
        const buffer = Buffer.from(value);
        let binary = '';
        for (let i = 0; i < buffer.length; i++) {
            const byte = buffer[i].toString(2);
            binary += zeros.substr(byte.length) + byte;
        }
        return binary;

    } else {
        throw Error('Cannot convert to binary. The value must be a boolean, number, string, or buffer. Received: ' + value);
    }
};

/**
 * Convert a value to a boolean.
 * @param {*} value
 * @returns {boolean}
 */
exports.boolean = function(value) {
    return !!value;
};

/**
 * Convert to base64 encoded string.
 * @param {boolean, number, string, buffer} value
 * @returns {string}
 */
exports.byte = function(value) {
    const type = typeof value;

    if (type === 'boolean') {
        return value ? 'AQ==' : '';

    } else if (type === 'number' && !isNaN(value)) {
        const binary = decToBin(value);
        const bytes = [];
        for (let i = 0; i < binary.length; i += 8) bytes.push(parseInt(binary.substr(i, 8), 2));
        return Buffer.from(bytes).toString('base64');

    } else if (type === 'string') {
        return Buffer.from(value, 'utf8').toString('base64');

    } else if (value instanceof Buffer) {
        return value.toString('base64');

    } else {
        throw Error('Cannot convert to byte. The value must be a boolean, number, string, or buffer. Received: ' + value);
    }
};

/**
 * Take a number, date value, or a date string and convert to date format.
 * @param {Date, string, number} value
 * @returns {string}
 */
exports.date = function(value) {
    return exports.dateTime(value).substr(0, 10);
};

/**
 * Take a number, date value, or a date string and convert to ISO date format.
 * @param {Date, string, number} value
 * @returns {string}
 */
exports.dateTime = function(value) {
    const type = typeof value;
    const isString = type === 'string';

    if (isString && rx.time.test(value)) {
        return new Date(value).toISOString();

    } else if (isString && rx.date.test(value)) {
        return new Date(value + 'T00:00:00.000Z').toISOString();

    } else if (value instanceof Date) {
        return value.toISOString();

    } else if (type === 'number') {
        return new Date(value).toISOString();

    } else {
        throw Error('Cannot convert to date. The value must be a Date, a number, or a date string. Received: ' + value);
    }
};

/**
 * Convert a value to an integer.
 * @param {string, number, boolean} value
 * @returns {number}
 */
exports.integer = function(value) {
    const type = typeof value;

    if (!isNaN(value)) {
        if (type === 'string') {
            return parseInt(value);
        } else if (type === 'number') {
            return Math.round(value);
        } else {
            return value ? 1 : 0;
        }
    }

    throw Error('Cannot convert to integer. The value must be numeric. Received: ' + value);
};

/**
 * Convert a value to a number.
 * @param {string, number, boolean} value
 * @returns {number}
 */
exports.number = function(value) {
    const type = typeof value;

    if (!isNaN(value)) {
        if (type === 'string') {
            return parseFloat(value);
        } else if (type === 'number') {
            return value;
        } else {
            return value ? 1 : 0;
        }
    }

    throw Error('Cannot convert to number. The value must be numeric. Received: ' + value);
};

function decToBin(dec) {
    const binary = (dec >>> 0).toString(2);
    const mod = binary.length % 8;
    return mod === 0 ? binary : zeros.substr(mod) + binary;
}