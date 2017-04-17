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

module.exports = function(schema, options, value) {
    return applyDefaults.apply(null, arguments).value;
};

function applyDefaults(schema, options, value) {
    if (options.useDefaults) {
        const valueNotProvided = arguments.length < 3;

        if (valueNotProvided && schema.hasOwnProperty('default')) {
            return {
                applied: true,
                value: schema.default
            };

        } else if (schema.type === 'array') {
            if (!Array.isArray(value) || !schema.items) return {
                applied: false,
                value: value
            };
            let setDefault = false;
            const result = value.map(item => {
                const data = applyDefaults(schema.items, options, item);
                if (data.applied) setDefault = true;
                return data.value;
            });
            return {
                applied: setDefault,
                value: setDefault ? result : value
            };

        } else if (schema.type === 'object') {

            // if the value was provided but is not an object then return the value as provided
            if (!valueNotProvided && (!value || typeof value !== 'object')) return {
                applied: false,
                value: value
            };

            // build a new object based on the provided object
            const result = valueNotProvided ? {} : Object.assign({}, value);
            const properties = schema.properties || {};
            const requires = [];
            let setDefault = false;

            Object.keys(properties)
                .forEach(property => {
                    const subSchema = schema.properties[property];
                    if (subSchema.required) requires.push(property);
                    if ((subSchema.hasOwnProperty('default') || subSchema.type === 'object') && !result.hasOwnProperty(property)) {
                        const data = applyDefaults(subSchema, options);
                        if (data.applied) {
                            result[property] = data.value;
                            setDefault = true;
                        }
                    }
                });

            // apply additional properties defaults
            if (schema.additionalProperties) {
                Object.keys(result)
                    .forEach(property => {
                        if (!properties.hasOwnProperty(property)) {
                            const data = applyDefaults(property, options, result[property]);
                            if (data.applied) {
                                result[property] = data.value;
                                setDefault = true;
                            }
                        }
                    });
            }

            // if missing a required then don't send back defaults (which may have caused the required error)
            const requiresLength = requires.length;
            for (let i = 0; i < requiresLength; i++) {
                if (!result.hasOwnProperty(requires[i])) {
                    setDefault = false;
                    break;
                }
            }

            return {
                applied: setDefault,
                value: setDefault ? result : value
            };
        }
    }

    return {
        applied: false,
        value: value
    };
}