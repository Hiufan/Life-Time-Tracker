/**
 * 输出月份日志
 */
'use strict';

var display = require('../dislpay_data');
var moment = require('moment');
var outputHelper = require('./helper');
var globalConfig = require('../conf/config.json');

exports.dispose = function (statResult, options) {
    if (options.perspective) {
        outputHelper.outputPerspectives(statResult, options.perspective.toLowerCase());
    } else {
        outputMain(statResult, options);
        outputHelper.outputPerspectives(statResult, globalConfig.defaultPerspectives);
    }
    return statResult;
};

function outputMain(statResult, options) {
    outputOverivew(statResult, options);
    outputSleepPeriod(statResult.sleepPeriodArr);
    console.log('平均睡眠时长:' + (statResult.meanSleepTime / 60).toFixed(2));
    outputTimeGroupByTag(statResult.tagTime);
    outputTimeGroupByClass(statResult.classTime);
    outputSumTime(statResult);
    outputTimeGroupByProject(statResult.projectTime);
    outputUnTrackedTime(statResult.unTrackedTimes);
}

function outputOverivew(statResult, options) {
    var unTrackedDays = statResult.unTrackedDays;
    var trackedDaysLen = statResult.days.length,
        unTrackedDaysLen = unTrackedDays.length,
        total = unTrackedDaysLen + trackedDaysLen,
        trackedRate = trackedDaysLen / total;
    console.log("======= " + options.dateStr + "的概括 ========");
    console.log("一共记录了" + trackedDaysLen + '天,占' + (trackedRate * 100).toFixed(2) +
            '% 但是有' + unTrackedDays.length + '天没有记录, 分别是:\n' +
        '\t' + unTrackedDays.join(', '));
    display.bar({
        '平均睡眠时间': statResult.meanSleepTime,
        '平均工作时间': statResult.meanWorkTime,
        '平均休息时间': statResult.meanBreakTime,
        '平均思考时间': statResult.meanThinkTime,
        '平均运动时间': statResult.meanSportTime,
        '平均学习时间': statResult.meanStudyTime
    });
}


function outputSleepPeriod(sleepPeriodArr) {

    var dateFormat = 'HH:mm';
    console.log("======== 睡眠周期 睡眠时长, 起床, 睡觉 =========");
    sleepPeriodArr.forEach(outputSleepMoment);

    var lastSleep = sleepPeriodArr.sort(sortBy('sleepMoment', 'desc'))[0];
    var firstWake = sleepPeriodArr.sort(sortBy('wakeMoment', 'asc'))[0];

    console.log(('这个月' + lastSleep.date.split('-')[2] + '号最晚睡觉').blue);
    console.log(('这个月' + firstWake.date.split('-')[2] + '号最早起').blue);

    function sortBy(time, order) {
        return function (a, b) {
            var aTime = a[time],
                bTime = b[time],
                aZero = new moment(a.date + ' 00:00').add(1, 'day'),
                bZero = new moment(b.date + ' 00:00').add(1, 'day');
            var aSpan = aZero.diff(aTime, 'minute');
            var bSpan = bZero.diff(bTime, 'minute');
            if (order === 'desc') {
                return aSpan - bSpan;
            } else {
                return bSpan - aSpan;
            }
        };
    }

    function outputSleepMoment (d) {
        var str = d.date.split('-')[2] + '号: ' +
                ((d.sleepTime / 60).toFixed(2) + 'h').yellow + ' , ' +
                d.wakeMoment.format(dateFormat).blue + ' , ' +
                d.sleepMoment.format(dateFormat).magenta;
        console.log(str);
    }
}

function outputTimeGroupByTag (datas) {
    outputGroup('Tag');
    display.bar(datas);
}


function outputTimeGroupByProject (datas) {
    outputGroup('Project');
    display.bar(datas);
}

function outputTimeGroupByClass(datas) {
    outputGroup('Class');
    display.bar(datas);
}


function outputSumTime(statResult) {
    outputGroup('Time Type');
    display.bar({
        '已记录时间': statResult.trackedTime,
        '未记录时间': statResult.unTrackedTime,
        '睡觉时间': statResult.sleepTime,
        '活跃时间': statResult.activeTime
    });
}

function outputGroup (groupName) {
    console.log('\n========= Group Time By ' + groupName + ' =======\n');
}


function outputUnTrackedTime(data) {
    console.log('\n========= 未记录时间 =========\n');
    display.bar(data);
}
