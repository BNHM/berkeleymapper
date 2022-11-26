// About Dialog
$(function () {
    $("#aboutButton").click(function () {
        $("#aboutDiv")
            .dialog({
                "title": "About",
                "buttons": {
                    "OK": function () {
                        $(this).dialog("close");
                    }
                }
            }).attr('id', 'aboutDialog');
        $("#aboutDialog").dialog("open")
    });
});

// Legend Dialog
$(function () {
    $("#resultsDiv")
        .dialog({
            "title": "Results",
            width: screen.width,
            height: 220,
            position: {my: 'bottom', at: 'bottom', of: "#map"},
            autoOpen: false
        }).attr('id', 'resultsDialog');
    $("#resultsButton").click(function () {
        $("#resultsDialog").dialog("open")
    });
});


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