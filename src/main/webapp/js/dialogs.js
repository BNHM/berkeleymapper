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



