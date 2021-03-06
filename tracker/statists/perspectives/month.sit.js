/**
 * sit perspective
 *
 * see how many time I sit one day or one period,like one week or one month.
 */
'use strict';

var daySitPerspective = require('./day.sit');

exports.focus = function (options, scanResult) {
    var days = scanResult.days;
    var standTime = 0,
        sitTime = 0;
    days.forEach(function (day) {
        var result = daySitPerspective.focus({
            dateStr: day.date
        }, day);
        sitTime += result.sitTime;
        standTime += result.standTime;
    });
    return {
        standTime: standTime,
        sitTime: sitTime
    };
};
