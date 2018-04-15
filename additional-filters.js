// ==UserScript==
// @name          WaniKani Open Framework Additional Filters
// @namespace     https://www.wanikani.com
// @description   Additional filters for the WaniKani Open Framework
// @author        seanblue
// @version       1.0.0
// @include       *://www.wanikani.com/*
// @grant         none
// ==/UserScript==

(function() {
	'use strict';

	var settingsDialog;
	var settingsScriptId = 'additionalFilters';
	var settingsTitle = 'Additional Filters';

	var filterNamePrefix = 'additionalFilters_';
	var recentLessonsFilterName = filterNamePrefix + 'recentLessons';
	var leechTrainingFilterName = filterNamePrefix + 'leechTraining';

	var defaultSettings = {};
	defaultSettings[recentLessonsFilterName] = true;
	defaultSettings[leechTrainingFilterName] = true;

	var recentLessonsHoverTip = 'Filter items to show lessons taken in the last X hours.';
	var leechesSummaryHoverTip = 'Only include leeches. Formula: incorrect / currentStreak^1.5.';
	var leechesHoverTip = leechesSummaryHoverTip + '\n * Setting the value to 1 will include items that have just been answered incorrectly for the first time.\n * Setting the value to 1.01 will exclude items that have just been answered incorrectly for the first time.\n * The higher the value, the fewer items will be included as leeches.';

	var msToHoursDivisor = 3600000;

	if (!window.wkof) {
		alert('WaniKani Open Framework Additional Filters requires WaniKani Open Framework.\nYou will now be forwarded to installation instructions.');
		window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
		return;
	}

	wkof.include('Menu, Settings, ItemData');

	wkof.ready('Menu').then(installMenu);
	wkof.ready('Settings').then(installSettings);

	function installMenu() {
		wkof.Menu.insert_script_link({
			script_id: settingsScriptId,
			submenu: 'Settings',
			title: settingsTitle,
			on_click: openSettings
		});
	}

	function openSettings() {
		settingsDialog.open();
	}

	function installSettings() {
		var settings = {};
		settings[recentLessonsFilterName] = { type: 'checkbox', label: 'Recent Lessons', hover_tip: recentLessonsHoverTip };
		settings[leechTrainingFilterName] = { type: 'checkbox', label: 'Leech Training', hover_tip: leechesSummaryHoverTip };

		settingsDialog = new wkof.Settings({
			script_id: settingsScriptId,
			title: settingsTitle,
			on_save: saveSettings,
			settings: settings
		});

		settingsDialog.load().then(function() {
			wkof.settings[settingsScriptId] = $.extend(true, {}, defaultSettings, wkof.settings[settingsScriptId]);
			saveSettings();
		});
	}

	function saveSettings(){
		settingsDialog.save().then(function() {
			wkof.ready('ItemData').then(registerFilters);
		});
	}

	function registerFilters() {
		if (wkof.settings[settingsScriptId][recentLessonsFilterName])
			registerRecentLessonsFilter();
		else
			deleteRecentLessonsFilter();

		if (wkof.settings[settingsScriptId][leechTrainingFilterName])
			registerLeechTrainingFilter();
		else
			deleteLeechTrainingFilter();
	}

	// BEGIN Recent Lessons
	function registerRecentLessonsFilter() {
		wkof.ItemData.registry.sources.wk_items.filters[recentLessonsFilterName] = {
			type: 'number',
			label: 'Recent Lessons',
			default: 24,
			filter_func: recentLessonsFilter,
			set_options: function(options) { options.assignments = true; },
			hover_tip: recentLessonsHoverTip
		};
	}

	function deleteRecentLessonsFilter() {
		delete wkof.ItemData.registry.sources.wk_items.filters[recentLessonsFilterName];
	}

	function recentLessonsFilter(filterValue, item) {
		if (item.assignments === undefined)
			return false;

		var startedAt = item.assignments.started_at;
		if (startedAt === null || startedAt === undefined)
			return false;

		var startedAtDate = new Date(startedAt);
		var timeSinceStart = Date.now() - startedAtDate;

		return (timeSinceStart / msToHoursDivisor) < filterValue;
	}
	// END Recent Lessons

	// BEGIN Leeches
	function registerLeechTrainingFilter() {
		wkof.ItemData.registry.sources.wk_items.filters[leechTrainingFilterName] = {
			type: 'number',
			label: 'Leech Training',
			default: 1,
			placeholder: 'Leech Ratio',
			filter_func: leechesFilter,
			set_options: function(options) { options.review_statistics = true; },
			hover_tip: leechesHoverTip
		};
	}

	function deleteLeechTrainingFilter() {
		delete wkof.ItemData.registry.sources.wk_items.filters[leechTrainingFilterName];
	}

	function leechesFilter(filterValue, item) {
		if (item.review_statistics === undefined)
			return false;

		var reviewStats = item.review_statistics;
		var meaningScore = getLeechScore(reviewStats.meaning_incorrect, reviewStats.meaning_current_streak);
		var readingScore = getLeechScore(reviewStats.reading_incorrect, reviewStats.reading_current_streak);

		return meaningScore >= filterValue || readingScore >= filterValue;
	}

	function getLeechScore(incorrect, currentStreak) {
		return incorrect / Math.pow((currentStreak || 0.5), 1.5);
	}
	// END Leeches
})();