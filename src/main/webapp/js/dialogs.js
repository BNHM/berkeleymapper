// Results Dialog
$(function () {
    w = window.innerWidth;

    $("#resultsDiv").dialog({
        "title": "Results",
        height: 220,
        width: w,
        position: {my: 'right', at: 'bottom', of: "#map"},
        autoOpen: false,
    }).attr('id', 'ResultsDialog');
    $("#ResultsDialog").dialog("close");
});


// Statistics Dialog
$(function () {
    w = window.innerWidth;

    $("#statisticsDiv").dialog({
        "title": "Statistics",
        height: 220,
        width: w,
        position: {my: 'right', at: 'bottom', of: "#map"},
        autoOpen: false,
    }).attr('id', 'StatisticsDialog');
    $("#StatisticsDialog").dialog("close");
});

// Statistics Dialog
$(function () {
    w = window.innerWidth;

    $("#spatialIntersectionDiv").dialog({
        "title": "Spatial Intersection",
        height: 220,
        width: w,
        position: {my: 'right', at: 'bottom', of: "#map"},
        autoOpen: false,
    }).attr('id', 'SpatialIntersectionDialog');
    $("#SpatialIntersectionDialog").dialog("close");
});



