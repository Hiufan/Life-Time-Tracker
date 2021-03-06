/**
 * stat helper
 * define the common function that use by the statists here.
 */
'use strict';

var moment = require('moment'),
    util = require('./util');
var LogClass = require('./model/fundament/logClass'),
    Project = require('./model/fundament/Project');
var logClassName = require('./conf/logClassName');
var msg = require('./message');
var extend = require('node.extend');
var dateFormat = 'YYYY-MM-DD HH:mm';
var timeSplitter = ':';

var tagReplaceRegexp = /[\[\]]/ig,
    projectReplaceRegexp = /[<>]/g,
    timeSpanRegexp = /\d{1,2}\s*[:]\s*\d{1,2}\s*(\s*[~～-]\s*\d{1,2}\s*[:]\s*\d{1,2})*/ig,
    logClassReplaceRegexp = /[\{\}]/g;

function getLogs(data, date) {
    var logStrArr = data.split('\n').filter(isEmpty);
    var lastIndex = logStrArr.length - 1;
    var logs = [];
    var periodsArr = [];
    logStrArr.forEach(function(logStr, index) {
        var hour = getHourFromLog(logStr);
        //if has no hour Object, than this log is not valid
        if (!hour) {
            msg.error('[' + date + '] log "' + logStr + '" is not valid');
            return;
        }
        var startPeriod, endPeriod, startNextDay, endNextDay;
        var startHour = hour.start,
            endHour = hour.end,
            hourSpan = startHour - endHour;
        if (startHour > 12 && endHour < 12 && hourSpan >= 8 && hourSpan <= 18) {
            msg.warn('[' + date + '] log "' + logStr + '" maybe is not right');
        }
        if (startHour >= 0 && startHour < 12) {
            startPeriod = 'am';
            if (periodsArr.filter(function (p) {
                return p === 'pm';
            }).length > 0) {
                startNextDay = true;
            }
        } else if(startHour > 12 && startHour < 24){
            startPeriod = 'pm';
        }
        if (endHour >= 0 && endHour < 12) {
            if (periodsArr.filter(function (p) {
                return p === 'pm';
            }).length > 0) {
                endNextDay = true;
            }
            endPeriod = 'am';
        } else if(endHour > 12 && endHour < 24){
            endPeriod = 'pm';
        }
        periodsArr.push(startPeriod);
        periodsArr.push(endPeriod);
        var logInfo = getLogInfo({
            logStr: logStr,
            date: date,
            startPeriod: startPeriod,
            endPeriod: endPeriod,
            startNextDay: startNextDay,
            endNextDay: endNextDay,
            index: index,
            isFirst: index === 0,
            isLast: index === lastIndex
        });
        if (logInfo) {
            if (isGetUpLog(logInfo)) {
                logInfo.wake = true;
                logInfo.end = logInfo.start;
                logInfo.time = logInfo.start;
            } else if (isSleepTime(logInfo, lastIndex)){
                logInfo.sleep = true;
                logInfo.end = logInfo.start;
                //需要校准，有可能凌晨之后睡觉
                logInfo.time = logInfo.start;
            } else if (logInfo.sign.indexOf('off') >= 0) {
                logInfo.offDuty = true;
                logInfo.end = logInfo.start;
                //需要校准，是有可能存在加班到凌晨之后
                logInfo.time = logInfo.start;
            }
            if (logInfo.len < 0) {
                msg.error(date + '\'s ' + logStr + '\'s time length is less then 0');
            }
            if (logInfo.len === undefined || logInfo.len < 0) {
                logInfo.len = 0;
            }
            logs.push(logInfo);
        }
    });
    function isGetUpLog(log) {
        return log.start && !log.end && log.index === 0;
    }

    function isSleepTime(log, lastIndex) {
        return log.start && !log.end && log.index === lastIndex;
    }
    return logs;
}


function alignTime(date, time, config) {
    var newDate;
    //var hour = parseInt(getHourFromDateStr(time), 10);
    //if ((config.period === 'pm' && hour > 0 && hour < 12) ||
            //(hour > 0 && hour < 12 && config.moment && config.isLast)) {
    if (config.nextDay) {
        newDate = nextDay(date) + ' ' + time;
    } else {
        newDate = date + ' ' + time;
    }
    return newDate;
}

function getWakeTime(logData, date) {
    var wakeTime = null;
    var getUpLog = getLogs(logData, date).filter(function (log) {
        return log.wake === true;
    })[0];
    if (getUpLog) {
        wakeTime = getUpLog.time;
    }
    return wakeTime;
}

function getSimpleClasses(data) {
    var result = data.match(/\{.*?\}/g);
    var classes = [];
    if (!result) {
        return null;
    }
    result.forEach(function(classStr) {
        var classArr;
        classStr = classStr.trim().replace(/[\{\}]/g, '');
        if (classStr) {
            classArr = classStr.split(',').map(function(val) {
                return val.trim();
            });
        }
        classes = classes.concat(classArr);
    });
    //unique the classes array
    return classes.filter(onlyUnique);
}

function getLogClasses(data, unique) {
    var result = getItem(data, /\{.*?\}/g, logClassReplaceRegexp, LogClass,
        null, /*no processor*/
        function (value) {
            var name = logClassName[value];
            if (!name) {
                name = 'UNKNOW LOGCLASS NAME';
                throw new Error(name + ': "' + data + '" className is not right');
            }
            return new LogClass(name, value);
        });

    if (unique === true) {
        result = util.frequence(result, function (val, target) {
            return val.name === target.name;
        });
    }
    return result;
}

function getTags(data) {
    var result = data.match(/\[.*?\](?!\()/ig);
    var tags = [];
    if (!result) {
        return null;
    }
    result.forEach(function(tagStr) {
        var tagArr;
        tagStr = tagStr.trim().replace(tagReplaceRegexp, '');
        if (tagStr) {
            tagArr = tagStr.split(',').map(function(val) {
                //tag不区分大小写
                return val.trim().toLowerCase();
            });
        }
        tags = tags.concat(tagArr);
    });
    return tags.reduce(function(pv, cv) {
        var target = pv.filter(function(val) {
            return val.name === cv;
        });
        if (target && target.length > 0) {
            target[0].frequence++;
        } else {
            pv.push({
                name: cv,
                frequence: 1
            });
        }
        return pv;
    }, []);
}

function getSimpleTags(data) {
    var result = data.match(/\[.*?\](?!\()/ig);
    var tags = [];
    if (!result) {
        return null;
    }
    result.forEach(function(tagStr) {
        var tagArr;
        tagStr = tagStr.trim().replace(/[\[\]]/ig, '');
        if (tagStr) {
            tagArr = tagStr.split(',').map(function(val) {
                //tag不区分大小写
                return val.trim().toLowerCase();
            });
        }
        tags = tags.concat(tagArr);
    });
    //unique the tags array
    return tags.filter(onlyUnique);
}


function getSigns(data) {
    var result = data.match(/`.*?`/g);
    var signs = [];
    if (!result) {
        return signs;
    } else {
        result.forEach(function(signStr) {
            var signArr;
            signStr = signStr.trim().replace(/`/g, '');
            if (signStr) {
                signArr = signStr.split(',').map(function(val) {
                    return val.trim();
                });
            }
            signs = signs.concat(signArr);
        });
    }
    return signs;
}



function getTimeSpanFromLog(log, config) {
    var date = config.date;
    var timeSpan = null;
    var result = log.match(timeSpanRegexp);
    if (result && result.length === 1) {
        timeSpan = {};
        var timeStr = result[0];
        var timeArr = timeStr.split(/[~-]/).map(function(val) {
            return val.trim();
        });
        var startTime, endTime,
            startHour, endHour, start, end,
            alignedStart, alignedEnd, alignConfig;
        start = timeArr[0];
        end = timeArr[1];
        if (start) {
            alignConfig = extend({}, config, {
                moment: !end,
                nextDay: config.startNextDay
            });
            alignedStart = alignTime(date, start, alignConfig);
            startTime = new moment(alignedStart, dateFormat);
            startHour = parseInt(start.split(timeSplitter)[0], 10);
            timeSpan.start = startTime.format(dateFormat);
        }
        if (end) {
            endHour = parseInt(end.split(timeSplitter)[0], 10);
            alignConfig = extend({}, config, {
                moment: !end,
                nextDay: config.endNextDay
            });
            alignedEnd = alignTime(date, end, alignConfig);
            endTime = new moment(alignedEnd, dateFormat);
            timeSpan.end = endTime.format(dateFormat);
        }
        if (end && start) {
            timeSpan.len = endTime.diff(startTime, 'minutes');
        }
    } else {
        //console.log(result);
        msg.warn('make sure the time is right of ' + date +'\'s log: ' + log);
    }
    return timeSpan;
}


function getHourFromLog (log) {
    var result = log.match(timeSpanRegexp);
    if (result && result.length === 1) {
        var timeStr = result[0];
        var timeArr = timeStr.split(/[~-]/).map(function(val) {
            return val.trim();
        });
        var startHour, endHour, start, end;
        start = timeArr[0];
        end = timeArr[1];
        if (start) {
            startHour = parseInt(start.split(timeSplitter)[0], 10);
        }
        if (end) {
            endHour = parseInt(end.split(timeSplitter)[0], 10);
        }
        return {
            start: startHour,
            end: endHour
        };
    }
}


/**
 * get the detail log info
 * @param log
 * @param date
 * @param index
 */
function getLogInfo(config) {
    try {
        var log = config.logStr;
        var logInfo = {
            content: getLogContent(log),
            classes: getLogClasses(log),
            tags: getSimpleTags(log),
            projects: getProjects(log),
            sign: getSigns(log),
            index: config.index,
            origin: log
        };
        var timeSpan = getTimeSpanFromLog(log, config);
        return extend(logInfo, timeSpan);
    } catch (e) {
        e.message = config.date + ' ' + e.message;
        throw e;
    }
}

function getLogContent(logStr) {
    var tagReplaceRegexp = /\[.*?\](?!\()/ig,
        projectReplaceRegexp = /<.*?>/g,
        logClassReplaceRegexp = /\{.*?\}/g;
    return logStr.replace(tagReplaceRegexp, '')
          .replace(timeSpanRegexp, '')
          .replace(projectReplaceRegexp, '')
          .replace(logClassReplaceRegexp, '').trim();
}

function getTimeSpan(start, end) {
    var diff = -1;
    if (end && start) {
        var dateFomate = 'YYYY-MM-DD HH:mm';
        var startTime = new moment(start, dateFomate),
            endTime = new moment(end, dateFomate);
        diff = endTime.diff(startTime, 'minutes');
    }
    return diff;
}

function getHourFromDateStr(dateStr) {
    var timeRegxp = /\d{1,2}\s*:\s*\d{1,2}/ig;
    var timeStr = dateStr.match(timeRegxp)[0];
    var timeArr = timeStr.split(timeSplitter).map(trim);
    return timeArr[0];
}

function isEmpty(val) {
    return !!val.trim();
}

function trim (val) {
    return val.trim();
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function nextDay(date) {
    var dateArr = date.split('-'),
        year = parseInt(dateArr[0], 10),
        month = parseInt(dateArr[1], 10),
        day = parseInt(dateArr[2], 10),
        nextDateStr = [year, month, day + 1].join('-');
    return nextDateStr;
}

function groupTimeByTag (logs) {
    var result = [];
    logs.forEach(function (log) {
        var tags = log.tags;
        if (tags && tags.length) {
            tags.forEach(function (tag) {
                var target = result.filter(function (tagTime) {
                    return tagTime.label === tag;
                });
                if (target && target.length) {
                    target[0].count += log.len;
                } else {
                    result.push({
                        label: tag,
                        count: log.len
                    });
                }
            });
        }
    });
    return result;
}


function groupTimeByLogClass(logs, classes) {
    var classesTime = [];
    function calculateClassesTimeConsume(logs, cls) {
        var totalTime = 0;
        logs.forEach(function(log) {
            var classes = log.classes;
            if (classes && hasClass(cls)) {
                totalTime += log.len;
            }
            function hasClass(targetCls) {
                var clsCode = targetCls.code;
                return classes.filter(function (cls) {
                    return cls.code === clsCode;
                }).length > 0;
            }
        });
        return totalTime;
    }
    classes.forEach(function(cls) {
        var consumeTime = calculateClassesTimeConsume(logs, cls);
        classesTime.push({
            label: cls.name,
            code: cls.code,
            count: consumeTime
        });
    });
    return classesTime;
}


function groupTimeByProject(logs) {
    return groupTimeBy(logs, 'projects', function (project) {
        return project.name;
    }, function (project, groupItem) {
        return groupItem.label === project.name;
    });
}

function groupTimeBy (logs, condition, process, filter) {
    var result = [];
    filter = filter || function (item, groupItem) {
        return groupItem.label === item;
    };
    logs.forEach(function (log) {
        var items = log[condition];
        if (items && items.length) {
            items.forEach(function (item) {
                var target = result.filter(filter.bind(null, item));
                if (target && target.length) {
                    target[0].count += log.len;
                } else {
                    if (typeof process === 'function') {
                        item = process(item);
                    }
                    result.push({
                        label: item,
                        count: log.len
                    });
                }
            });
        }
    });
    return result;
}


function getProjects(log) {
    return getItem(log, /<.*?>/g, projectReplaceRegexp, Project, function (projStr) {
        var nameRegexp = /^(.*?):/,
            name;
        projStr = projStr.trim();
        if (!projStr) {
            return;
        }
        var attrs = projStr.replace(nameRegexp, '');
        if (attrs === projStr) {
            name = projStr;
            attrs = null;
        } else {
            name = projStr.match(nameRegexp)[1].trim();
        }
        //delete the project name string and the rest is attrs;
        if (attrs) {
            attrs = attrs.trim().split(/\s+/g).map(function (val) {
                var result = val.match(/(.+)\s*=\s*"(.+)"|(.+)\s*=\s*(.+)/);
                if (result) {
                    var key = result[1] || result[3];
                    var value = result[2] || result[4];
                    return {
                        key: key,
                        value: value
                    };
                }
            });
        }
        if (!name) { msg.error('project has no name. origin:' + projStr); }
        return {
            name: name,
            attributes: attrs,
            origin: projStr
        };
    }, function (value) {
        var proj = new Project(value.name, value.attributes);
        proj.origin = value.origin;
        return proj;
    });
}

function getSimpleProjects(log) {
    return getItem(log, /<.*?>/g, /[<>]/g, String);
}


function getItem(data, regexp, replace, type, processor, creator){

    var result = data.match(regexp);
    if (!result) {
        return [];
    }
    result = result.map(function(itemStr) {
        var str = itemStr.trim().replace(replace, '').trim();
        if (typeof processor === 'function') {
            return processor(str);
        }
        return str;
    });
    if (type === String) {
        result = result.filter(onlyUnique);
    } else {
        result = result.filter(function (item) {
            return !!item;
        }).reduce(function(items, item) {
            items.push(creator(item));
            return items;
        }, []);
    }

    return result;
}



/**
 * checkLogSequence
 * 检查日志的时序是否正确
 * 确保不会出现类似下面的日志
 *
 *    9:00 ~ 11: 00
 *   10:49 ~ 12:00
 *
 * @param logs
 * @return
 */
function checkLogSequence(logs) {
    var checkResult = true;
    if (logs && logs.length === 0) {
        return true;
    }
    logs.reduce(function (pv, cv) {
        var pvEnd = new moment(pv.end, dateFormat),
            cvStart = new moment(cv.start, dateFormat);
        if (cvStart.diff(pvEnd, 'minute') < 0) {
            checkResult = false;
            msg.warn('The sequence of "' + pv.origin + '" and "' + cv.origin + '" of  ' +  pvEnd.format('YYYY-MM-DD') + ' is not right.');
        }
        return cv;
    });
    return checkResult;
}

exports.getLogClasses = getLogClasses;
exports.getSimpleClasses = getSimpleClasses;
exports.getTags = getTags;
exports.getSimpleTags = getSimpleTags;
exports.getTimeSpan = getTimeSpanFromLog;
exports.getLogInfo = getLogInfo;
exports.timeSpan = getTimeSpan;
exports.getHour = getHourFromDateStr;
exports.nextDay = nextDay;
exports.getLogs = getLogs;
exports.getWakeTime = getWakeTime;
exports.groupTimeByTag = groupTimeByTag;
exports.groupTimeByLogClass = groupTimeByLogClass;
exports.groupTimeByProject = groupTimeByProject;
exports.getSigns = getSigns;
exports.getProjects = getProjects;
exports.getSimpleProjects = getSimpleProjects;
exports.checkLogSequence = checkLogSequence;
