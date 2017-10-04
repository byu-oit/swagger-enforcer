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

exports.defaults = {

    enforce: {
        // numbers
        multipleOf: true,
        maximum: true,
        minimum: true,

        // strings
        maxLength: true,
        minLength: true,
        pattern: true,

        // arrays
        maxItems: true,
        minItems: false,        // defaults to false because you're likely building the array and the initial number of items may be too low
        uniqueItems: true,

        // objects
        additionalProperties: true,
        maxProperties: true,
        minProperties: false,   // defaults to false because you're likely building the object and the initial number of properties may be too low
        required: false,        // defaults to false because as you're building you may not have added all properties

        // general
        enum: true
    },

    populate: {
        defaults: true,
        format: false,          // setting this value may hide some errors as values are auto formatted to their correct type
        templates: true,
        variables: true
    },

    validate: {
        // numbers
        multipleOf: true,
        maximum: true,
        minimum: true,

        // strings
        maxLength: true,
        minLength: true,
        pattern: true,

        // arrays
        maxItems: true,
        minItems: true,
        uniqueItems: true,

        // objects
        additionalProperties: true,
        maxProperties: true,
        minProperties: true,
        required: true,

        // general
        enum: true
    }

};