/**
 * time category perspective
 *
 * time category:
 *     First Class : Creative thing like programming, writing, drawing, reading,think, study,Sport etc.
 *     Second Class: Cosuming thing like eatting, Shopping, entertainment(tv, movie, dramma)
 *     Third Class: wash, transport,etc
 */
'use strict';

var logClassEnum = require('../../enum/logClass');

exports.focus = function (options, scanResult) {
    var logs = scanResult.logs,
        time = {
            first: 0,
            second: 0,
            third: 0
        },
        total = 0;
    logs.forEach(function (log) {
        total += log.len;
        if (isFirstClass(log)) {
            time.first += log.len;
        } else if (isSecondClass(log)) {
            time.second += log.len;
        } else if (isThirdClass(log)) {
            time.third += log.len;
        }
    });
    return {
        total: total,
        categoryTime: time
    };
};


function isFirstClass(log) {
    var classes = log.classes,
        tags = log.tags;

           //sport
    return hasLogClass(classes, logClassEnum.Sport) ||
        //
        hasTag(tags, ['编程', 'programming', 'diary', 'design', '设计']) ||
        //study
        hasLogClass(classes, logClassEnum.Study);
}


function isSecondClass(log) {
    var tags = log.tags;
           //
    return hasTag(tags, ['lunch', '早餐', 'supper', '晚餐', '午餐',
            '下午茶', '购物', '聊天', '看电影', '听音乐', 'tv']);
}

function isThirdClass(log) {
    return hasTag(log.tags, ['交通', 'self_clean', '洗澡', '冲凉', '准备食物']);
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
