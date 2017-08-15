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

module.exports = copy;

/**
 * Copied Dates, Buffers, Arrays, plain Objects, and Primitives
 * @param {*} value
 * @returns {*}
 */
function copy(value) {
    if (value instanceof Date) {
        return new Date(+value);
    } else if (value instanceof Buffer) {
        return value.slice(0);
    } else if (Array.isArray(value)) {
        return value.map(copy);
    } else if (value && typeof value === 'object') {
        const result = {};
        Object.keys(value).forEach(key => result[key] = copy(value[key]));
        return result;
    } else {
        return value;
    }
}