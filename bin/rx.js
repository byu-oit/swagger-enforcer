'use strict';

exports.base64 =    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
exports.binary =    /^(?:[01]{8})+$/;
exports.date =      /^(\d{4})-(\d{2})-(\d{2})$/;
exports.integer =   /^\d+$/;
exports.number =    /^\d+(?:\.\d+)?$/;
exports.time =      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/;