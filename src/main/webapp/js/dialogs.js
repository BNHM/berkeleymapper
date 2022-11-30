// About Dialog
$(function () {
    $("#aboutDiv")
        .dialog({
            "title": "About",
        }).attr('id', 'AboutDialog');
    $("#AboutDialog").dialog("close");
});

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

// Legend Dialog
$(function () {
    $("#legendDiv")
        .dialog({
            "title": "Legend",
            position: {my: 'right bottom', at: 'right bottom', of: "#map"},
        }).attr('id', 'LegendDialog');
    $("#LegendDialog").dialog("close");
});

/**
 * Creates a control contains all BerkeleyMapper Options.
 */
function createCenterControl(map) {
    var array = ["BerkeleyMapper Options", "About", "Legend", "Results"];

    //Create and append select list
    var selectList = document.createElement("select");
    selectList.className = "selector-control";
    selectList.id = "selectList";
    selectList.title = "Choose an Option"

    //Create and append the options
    for (var i = 0; i < array.length; i++) {
        var option = document.createElement("option");
        option.value = array[i];
        option.text = array[i];
        selectList.appendChild(option);
    }
    // TODO: need to fix this to be more natural blur?
    selectList.addEventListener('change', function () {
        $("#" + this.value + "Dialog").dialog("open");
    });

    return selectList;
}

/*
initialize custom buttons
 */
function initializeControls(map) {
// Create the DIV to hold the control.
    const mapperControlsDiv = document.createElement("div");
    mapperControlsDiv.className = "map-control";
    // Create the control.
    const selectControl = createCenterControl(map);
    // Append the control to the DIV.
    mapperControlsDiv.appendChild(selectControl);

    map.controls[google.maps.ControlPosition.TOP_LEFT].push(mapperControlsDiv);
}