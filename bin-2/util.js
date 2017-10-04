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

/**
 * Copies Dates, Buffers, Arrays, plain Objects, and Primitives
 * @param {*} value
 * @returns {*}
 */
exports.copy = function(value) {
    if (value instanceof Date) {
        return new Date(+value);
    } else if (value instanceof Buffer) {
        return value.slice(0);
    } else if (Array.isArray(value)) {
        return value.map(exports.copy);
    } else if (value && typeof value === 'object') {
        const result = {};
        Object.keys(value).forEach(key => result[key] = exports.copy(value[key]));
        return result;
    } else {
        return value;
    }
};

exports.edgeSlashes = function(value, start, end) {
    value = value.replace(/^\//, '').replace(/\/$/, '');
    if (start) value = '/' + value;
    if (end) value += '/';
    return value;
};

exports.propertyDefault = function(obj, property, value) {
    if (!obj.hasOwnProperty(property)) obj[property] = value;
};

/**
 * Do a deep equal on two values.
 * @param {*} v1
 * @param {*} v2
 * @returns {boolean}
 */
exports.same = function same(v1, v2) {
    if (v1 === v2) return true;

    const type = typeof v1;
    if (type !== typeof v2) return false;

    const isArray = Array.isArray(v1);
    if (isArray && !Array.isArray(v2)) return false;

    if (isArray) {
        const length = v1.length;
        if (length !== v2.length) return false;

        for (let i = 0; i < length; i++) {
            if (!same(v1[i], v2[i])) return false;
        }

        return true;

    } else if (v1 && type === 'object') {
        if (!v2) return false;

        const keys = Object.keys(v1);
        const length = keys.length;
        if (length !== Object.keys(v2).length) return false;

        for (let i = 0; i < length; i++) {
            const key = keys[i];
            if (!same(v1[key], v2[key])) return false;
        }

        return true;

    } else {
        return false;
    }
};

/**
 * Determine the schema type using the schema. It isn't always specified but enough
 * information is generally provided to determine it.
 * @param {object} schema
 * @returns {string}
 */
exports.schemaType = function(schema) {
    if (schema.type) return schema.type;
    if (schema.items) return 'array';
    if (schema.properties || schema.additionalProperties || schema.allOf) return 'object';
    return undefined;
};

/**
 * Wrap with quotations in the value is a string.
 * @param value
 * @returns {*}
 */
exports.smart = function(value) {
    if (typeof value === 'string') return "'" + value.replace(/'/g, "\\'") + "'";
    return value;
};