'use strict';
const expect        = require('chai').expect;
const to            = require('../bin/convert-to');

describe('convert-to', () => {

    describe('binary', () => {

        it('true', () => {
            expect(to.binary(true)).to.equal('00000001');
        });

        it('false', () => {
            expect(to.binary(false)).to.equal('00000000');
        });

        it('number', () => {
            expect(to.binary(1)).to.equal('00000001');
        });

        it('full byte', () => {
            expect(to.binary(255)).to.equal('11111111');
        });

        it('large number', () => {
            expect(to.binary(256)).to.equal('0000000100000000');
        });

        it('string', () => {
            expect(to.binary('\r')).to.equal('00001101');
        });

        it('buffer', () => {
            const buf = Buffer.from('\r');
            expect(to.binary(buf)).to.equal('00001101');
        });

        it('object', () => {
            expect(() => to.binary({})).to.throw(Error);
        });

    });

    describe('boolean', () => {

        it('true', () => {
            expect(to.boolean(true)).to.be.true;
        });

        it('false', () => {
            expect(to.boolean(false)).to.be.false;
        });

        it('1', () => {
            expect(to.boolean(1)).to.be.true;
        });

        it('0', () => {
            expect(to.boolean(0)).to.be.false;
        });

        it('{}', () => {
            expect(to.boolean({})).to.be.true;
        });

        it('null', () => {
            expect(to.boolean(null)).to.be.false;
        });

    });

    describe('byte', () => {

        it('true', () => {
            expect(to.byte(true)).to.equal('AQ==');
        });

        it('false', () => {
            expect(to.byte(false)).to.equal('');
        });

        it('number', () => {
            expect(to.byte(1)).to.equal('AQ==');
        });

        it('large number', () => {
            expect(to.byte(256)).to.equal('AQA=');
        });

        it('larger number', () => {
            expect(to.byte(270721)).to.equal('BCGB');
        });

        it('M', () => {
            expect(to.byte('M')).to.equal('TQ==');
        });

        it('Ma', () => {
            expect(to.byte('Ma')).to.equal('TWE=');
        });

        it('buffer', () => {
            const b = Buffer.from('M');
            expect(to.byte(b)).to.equal('TQ==')
        });

        it('invalid type', () => {
            expect(() => to.byte(function() {})).to.throw(Error);
        });

    });

    describe('date', () => {
        const iso = '2000-01-01T00:00:00.000Z';

        it('Date object', () => {
            const d = new Date(iso);
            expect(to.date(d)).to.equal('2000-01-01');
        });

        it('ISO format', () => {
            expect(to.date(iso)).to.equal('2000-01-01');
        });

        it('date format', () => {
            expect(to.date('2000-01-01')).to.equal('2000-01-01');
        });

        it('oveflow', () => {
            expect(to.date('2000-02-30')).to.equal('2000-03-01');
        });

        it('number', () => {
            const d = new Date(iso);
            expect(to.date(+d)).to.equal('2000-01-01');
        });

        it('boolean', () => {
            expect(() => to.date(true)).to.throw(Error);
        });

    });

    describe('dateTime', () => {
        const iso = '2000-01-01T01:15:22.345Z';

        it('Date object', () => {
            const d = new Date(iso);
            expect(to.dateTime(d)).to.equal(iso);
        });

        it('ISO format', () => {
            expect(to.dateTime(iso)).to.equal(iso);
        });

        it('date format', () => {
            expect(to.dateTime('2000-01-01')).to.equal('2000-01-01T00:00:00.000Z');
        });

        it('oveflow', () => {
            expect(to.dateTime('2000-02-30')).to.equal('2000-03-01T00:00:00.000Z');
        });

        it('number', () => {
            const d = new Date(iso);
            expect(to.dateTime(+d)).to.equal(iso);
        });

        it('boolean', () => {
            expect(() => to.dateTime(true)).to.throw(Error);
        });
    });

    describe('integer', () => {

        it('string', () => {
            expect(to.integer('123')).to.equal(123);
        });

        it('NaN string', () => {
            expect(() => to.integer('abc')).to.throw(Error);
        });

        it('number', () => {
            expect(to.integer(123)).to.equal(123);
        });

        it('rounds decimal', () => {
            expect(to.integer(122.5)).to.equal(123);
        });

        it('NaN number', () => {
            expect(() => to.integer(Number.NaN)).to.throw(Error);
        });

        it('true', () => {
            expect(to.integer(true)).to.equal(1);
        });

        it('false', () => {
            expect(to.integer(false)).to.equal(0);
        });

    });

    describe('number', () => {

        it('string', () => {
            expect(to.number('123.5')).to.equal(123.5);
        });

        it('NaN string', () => {
            expect(() => to.number('abc')).to.throw(Error);
        });

        it('number', () => {
            expect(to.number(123.5)).to.equal(123.5);
        });

        it('NaN number', () => {
            expect(() => to.number(Number.NaN)).to.throw(Error);
        });

        it('true', () => {
            expect(to.number(true)).to.equal(1);
        });

        it('false', () => {
            expect(to.number(false)).to.equal(0);
        });

    });

});