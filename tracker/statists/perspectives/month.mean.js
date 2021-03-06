/**
 * mean time consume of task
 *
 * ### example
 *
 */

'use strict';

exports.focus = function (options, scanResult, statResult) {
    var dayNum = statResult.days.length,
        meanClassTime,
        meanTagTime,
        meanProjectTime;

    meanClassTime = mean(statResult.classTime, dayNum);
    meanProjectTime = mean(statResult.projectTime, dayNum);
    meanTagTime = mean(statResult.tagTime, dayNum);

    return {
        classes: meanClassTime,
        projects: meanProjectTime,
        tags: meanTagTime
    };
};

function mean(data, num) {
    var result = {};
    data.forEach(function (timeObj) {
        var meanVal = timeObj.count / num;
        result[timeObj.code || timeObj.label] = meanVal;
    });
    return result;
}

