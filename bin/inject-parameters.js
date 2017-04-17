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
const schemas           = require('./schemas');

module.exports = injectParameters;

/**
 * Some pre-programmed injector patterns to use for replacing placeholder values with actual values.
 * @type {{colon, doubleHandlebar, handlebar}}
 */
const injectorPatterns = {
    colon: injectorReplacement(function() { return /:([_$a-z][_$a-z0-9]*)/ig }),
    doubleHandlebar: injectorReplacement(function() { return /{{([_$a-z][_$a-z0-9]*)}}/ig }),
    handlebar: injectorReplacement(function() { return /{([_$a-z][_$a-z0-9]*)}/ig })
};

/**
 * Look for property values that are strings and perform variable value substitution. If a
 * string has a "{varName}" in it and the data object has a "varName" property then the
 * value from that property is cast to a string and injected in place of "{varName}".
 * @param {*} value The value to perform replacement on.
 * @param {object} parameters An object map for parameter replacement.
 * @param {object} [options] The replacement options.
 * @returns {*}
 */
function injectParameters(value, parameters, options) {

    // get the normalized configuration
    if (!options || typeof options !== 'object') options = {};
    if (!options.replacement) options.replacement = 'handlebar';
    const config = schemas.injector.normalize(options);

    // if replacement is a string then get associated function
    if (typeof config.replacement === 'string') config.replacement = injectorPatterns[config.replacement];

    return inject(value, parameters, config);
}

function inject(value, parameters, options) {
    const valueType = typeof value;

    if (Array.isArray(value)) {
        return value.map(item => inject(item, parameters, options));

    } else if (value && valueType === 'object') {
        const result = {};
        const keys = Object.keys(value);
        const length = keys.length;
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            result[key] = inject(value[key], parameters, options);
        }
        return result;

    } else if (valueType === 'string') {
        return options.replacement(value, parameters);

    } else {
        return value;
    }
}

function injectorReplacement(rxGenerator) {
    return function(value, data) {
        const rx = rxGenerator();
        let match;
        let result = '';
        let offset = 0;
        while (match = rx.exec(value)) {
            const property = match[1];
            result += value.substring(offset, match.index) + (data.hasOwnProperty(property) ? data[property] : match[0]);
            offset = match.index + match[0].length;
        }
        return result + value.substr(offset);
    };
}