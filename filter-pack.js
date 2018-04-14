// ==UserScript==
// @name          WaniKani Open Framework Filter Pack
// @namespace     https://www.wanikani.com
// @description   Additional filters for the WaniKani Open Framework
// @author        seanblue
// @version       0.9.0
// @include       *://www.wanikani.com/*
// @grant         none
// ==/UserScript==

(function() {
	'use strict';

	var msToHoursDivisor = 3600000;

	if (!window.wkof) {
		alert('WaniKani Open Framework Filter Pack requires WaniKani Open Framework.\nYou will now be forwarded to installation instructions.');
		window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
		return;
	}

	wkof.include('ItemData');
	wkof.ready('ItemData').then(registerFilters);

	function registerFilters() {
		registerRecentLessonsFilter();
		registerLeechesFilter();
	}

	// BEGIN Recent Lessons
	function registerRecentLessonsFilter() {
		wkof.ItemData.registry.sources.wk_items.filters.seanblue_recentLessons = {
			type: 'number',
			label: 'Recen Lessons',
			default: 24,
			filter_func: recentLessonsFilter,
			set_options: function(options) { options.assignments = true; },
			hover_tip: 'Filter items to show lessons taken in the last X hours.'
		};
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
	function registerLeechesFilter() {
		wkof.ItemData.registry.sources.wk_items.filters.seanblue_leeches = {
			type: 'number',
			label: 'Leech Training',
			default: 1,
			placeholder: 'Leech Ratio',
			filter_func: leechesFilter,
			set_options: function(options) { options.review_statistics = true; },
			hover_tip: 'Only include leeches. Formula: incorrect / currentStreak^1.5.\n * Setting the value to 1 will include items that have just been answered incorrectly for the first time.\n * Setting the value to 1.01 will exclude items that have just been answered incorrectly for the first time.\n * The higher the value, the fewer items will be included as leeches.'
		};
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