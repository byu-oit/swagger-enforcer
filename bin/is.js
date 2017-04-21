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
const rx        = require('./rx');

exports.byte = v => rx.byte.test(v) && v.length % 4 === 0;

exports.binary = v => rx.binary.test(v);

exports.boolean = v => rx.boolean.test(v);

exports.date = v => rx.date.test(v);

exports.dateTime = v => rx.dateTime.test(v);

exports.integer = v => rx.integer.test(v);

exports.number = v => rx.number.test(v);