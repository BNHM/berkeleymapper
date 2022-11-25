// About Dialog
$(function () {
    $("#aboutButton").click(function () {
        $("<div>Welcome to <b>BerkeleyMapper</b></div>")
            .dialog({
                "title": "About",
                "buttons": {
                    "OK": function () {
                        $(this).dialog("close");
                    }
                }
            }).attr('id', 'aboutDialog');
    });
});



$(function () {
     $("#resultsButton").click(function () {
        document.getElementById("resultsDiv").style.visibility = "visible";
    });
});

$(document).on('keydown', function (e) {
    //user presses escape
    if (e.keyCode === 27) {
        document.getElementById("resultsDiv").style.visibility = "hidden";
                }
    });
// Results Dialog



    //.attr('id', 'resultsContainer');)
    /*$("<div>Click on markercluster or perform spatial query to see results</div>")
        .dialog({
            "title": "Results",
            width: w,
            maxHeight: 200,
            position: {my: 'bottom', at: 'bottom', of: "#map"},
            autoOpen: false,
        }).attr('id', 'resultsContainer');
        */



// Legend Dialog
$(function () {
    $("#legendButton").click(function () {
        $("#legendDiv")
            .dialog({
                "title": "Legend",
            }).attr('id', 'legendDialog');
        $("#legendDialog").dialog("open")
    });
});