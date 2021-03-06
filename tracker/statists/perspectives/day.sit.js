/**
 * sit perspective
 *
 * see how many time I sit one day or one period,like one week or one month.
 */
'use strict';

var logClassEnum = require('../../enum/logClass');

exports.focus = function (options, scanResult) {
    var logs = scanResult.logs;
    var standTime = 0,
        total = 0;
    logs.forEach(function (log) {
        total += log.len;
        if (isStandLog(log)) {
            standTime += log.len;
        }
    });
    return {
        standTime: standTime,
        sitTime: total - standTime
    };
};

function isStandLog(log) {
    var classes = log.classes,
        tags = log.tags;
    return hasLogClass(classes, logClassEnum.Sport) ||
        (hasLogClass(classes, logClassEnum.NormalThing) && hasTag(tags, ['交通', '准备食物', '洗澡']));
}


function hasLogClass(logClasses, targetCls) {
    return logClasses.filter(function (cls) {
        return cls.code === targetCls;
    }).length > 0;
}

function hasTag(tags, targetTags) {
    if (typeof targetTags === 'string') {
        targetTags = [targetTags];
    }
    return tags && tags.filter(function (tag) {
        return targetTags.indexOf(tag) >= 0;
    }).length > 0;
}
