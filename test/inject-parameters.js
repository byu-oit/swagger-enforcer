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
const expect        = require('chai').expect;
const injector      = require('../bin/inject-parameters');

describe('inject parameters', () => {

    it('string value', () => {
        const value = injector('{name} is {age} years old {when}', { name: 'Bob', age: 12, when: 'today' });
        expect(value).to.equal('Bob is 12 years old today');
    });

    it('number', () => {
        const value = injector(1234, { name: 'Bob' });
        expect(value).to.equal(1234);
    });

    it('does not replace unset parameters', () => {
        const value = injector('{name} is {age} years old {when}', { name: 'Bob', when: 'yesterday'});
        expect(value).to.equal('Bob is {age} years old yesterday');
    });

    it('colon replacement', () => {
        const value = injector(':name is :age years old :when', { name: 'Bob', age: 12, when: 'today' }, { replacement: 'colon' });
        expect(value).to.equal('Bob is 12 years old today');
    });

    it('double handlebar replacement', () => {
        const value = injector('{{name}} is {{age}} years old {{when}}', { name: 'Bob', age: 12, when: 'today' }, { replacement: 'doubleHandlebar' });
        expect(value).to.equal('Bob is 12 years old today');
    });

    it('array replacement', () => {
        const value = [
            '{name} is {age} years old {when}',
            '{age} is the age of {name} as of {when}'
        ];
        const result = injector(value, { name: 'Bob', age: 12, when: 'today' });
        expect(result).to.deep.equal(['Bob is 12 years old today', '12 is the age of Bob as of today']);
    });

    it('object replacement', () => {
        const value = {
            foo: '{name} is {age} years old {when}',
            bar: '{age} is the age of {name} as of {when}'
        };
        const result = injector(value, { name: 'Bob', age: 12, when: 'today' });
        expect(result).to.deep.equal({ foo: 'Bob is 12 years old today', bar: '12 is the age of Bob as of today' });
    });

    it('custom replace', () => {
        const options = {
            replacement: function(value, parameters) {
                return "I'm a little teapot.";
            }
        };
        const value = injector('{name} is {age} years old {when}', { name: 'Bob', age: 12, when: 'today' }, options);
        expect(value).to.equal("I'm a little teapot.");
    });

});