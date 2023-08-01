var bm2 = {};
bm2.map;
bm2.overlays = [];          // overlays that the User has drawn
bm2.overlayMarkers = [];    // markers to click on for the overlays that user has drawn
bm2.markers = [];           // Point markers
bm2.circles = [];           // Error radius circles for point markers
bm2.georefMarkers = [];     // Georeferencing result markers
bm2.georefCircles = [];     // Circles associated with the georeferencing markers
bm2.kmlLayers = [];         // KML Layers (defined by config file)
bm2.pointMode = false;      // pointMode = true draws special features for pointMapping
bm2.session = "";           // Session string for communicating w/ server
bm2.urlRoot = "v2/";        // URL Root to use for all calls
bm2.mc = null;                     // markerCluster control variable
bm2.iw = null;
bm2.drawnMarkerImage = new google.maps.MarkerImage('img/marker-green.png');
//bm2.dialogText = "Click on MarkerClusters or draw a polygon to query points";
bm2.polygon = "";           // A variable to hold a polygon defined by the user
bm2.configFile = "";
bm2.isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;  // detect safari
bm2.showControls = true;
bm2.colorOption = "markers";    // value to control how to color markers
bm2.columnArray = []

String.prototype.endsWith = function (suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

function showRow(p) {
    let Cell = document.getElementById("resultsTable").rows[p.rowIndex].cells;
    var rowData = "<div id='content'>";

    var lat = 0;
    var lng = 0;
    for (i = 0; i < Cell.length; i++) {
        if (i == bm2.columnArray.indexOf('Latitude')) {
            lat = Cell[i].innerHTML;
        } else if (i == bm2.columnArray.indexOf('Longitude')) {
            lng = Cell[i].innerHTML;
        } else {
            rowData += "<b>" + bm2.columnArray[i] + "</b>:" + Cell[i].innerHTML + "<br>";
        }
        rowData += "</div>";
    }

    var latlng = new google.maps.LatLng(lat, lng);
    if (bm2.iw) {
        bm2.iw.close();
    }
    if (lat != 0 && lng != 0) {
        bm2.iw = new google.maps.InfoWindow();
        bm2.iw.setContent(rowData);
        bm2.iw.setPosition(latlng);
        bm2.iw.open(bm2.map);
    }
}

// Adjust bounds to drawn polygon
if (!google.maps.Polygon.prototype.getBounds) {
    google.maps.Polygon.prototype.getBounds = function (latLng) {
        var bounds = new google.maps.LatLngBounds();
        var paths = this.getPaths();
        var path;

        for (var p = 0; p < paths.getLength(); p++) {
            path = paths.getAt(p);
            for (var i = 0; i < path.getLength(); i++) {
                bounds.extend(path.getAt(i));
            }
        }
        return bounds;
    }
}

// Adjust bounds for drawn polyline
if (!google.maps.Polyline.prototype.getBounds) {
    google.maps.Polyline.prototype.getBounds = function (latLng) {
        var bounds = new google.maps.LatLngBounds();
        this.getPath().forEach(function (e) {
            bounds.extend(e);
        });
        return bounds;
    }
}

// Use this to turn on/off controls on map
function toggleControls() {
    if (bm2.showControls) {
        bm2.showControls = false;
        drawingManagerHide();
        bm2.map.setOptions({
            mapTypeControl: false,
            overviewMapControl: false,
            panControl: false,
            streetViewControl: false,
            zoomControl: false
        });
        bm2.map.disableKeyDragZoom();

    } else {
        bm2.showControls = true;
        drawingManagerShow();
        bm2.map.setOptions({
            mapTypeControl: true,
            overviewMapControl: true,
            panControl: true,
            streetViewControl: true,
            zoomControl: true
        });
        bm2.map.enableKeyDragZoom();
    }
}

// Get Logos from server
function getLogos() {
    if (!bm2.pointMode) {
        return false;
    }
    // Populate logos Array (loop json)
    $.ajax({
        url: bm2.urlRoot + "logos?session=" + bm2.session,
        async: true,
        success: function (data) {
            counter = 1;
            $.each(data, function () {
                var url, img;
                var logoObj = new Object();

                $.each(this, function (k, v) {

                    if (k == "url") logoObj.url = v;
                    if (k == "img") logoObj.img = v;
                });

                logoId = "logo" + counter;
                //$("#logos").append("<br>");
                if (counter == 1) {
                    $("#logos").append("<br></br>");
                    $("#logos").append("<div>Powered by</div>")
                }
                $("#logos").append("<a id=\"" + logoId + "\"href=\"" + logoObj.url + "\" target=\"_blank\"></a>");
                $("#" + logoId).append("<img src=\"" + logoObj.img + "\" width=80 \/>");
                $("#logos").append("<p>");
                counter++;
            });


        },
        error: function (result) {
            return false;
        },
        statusCode: {
            204: function () {
                // fail quietly
            }
        }
    });
}


// Initialize the Array of Available KML Layers
function setKMLLayers() {
    $("#layers").append("<b>Layers</b><br>");

    if (!bm2.pointMode) {
        return false;
    }

    // Populate kmlLayers Array (loop json)
    $.ajax({
        url: bm2.urlRoot + "kmllayers?session=" + bm2.session,
        async: false,
        success: function (data) {
            kmlcounter = 0;
            $.each(data, function () {
                var url, mode, title;
                var kmlObj = new Object();
                $.each(this, function (k, v) {
                    if (k == "url") kmlObj.key = v.trim();
                    if (k == "visibility") kmlObj.visibility = v;   // visibile|hidden
                    if (k == "zoom") kmlObj.zoom = v;               // expand|ignore
                    if (k == "title") kmlObj.title = v;
                });

                // If the "KML" ends in .json then use the JSON method
                // TEST for end in JSON
                kmlObj.url = kmlObj.key;
                if (kmlObj.url.includes('json')) {
                    var promise = $.getJSON(kmlObj.url); //same as map.data.loadGeoJson();

                    promise.then(function (data) {
                        cachedGeoJson = data; //save the geojson in case we want to update its values
                        var layer = new google.maps.Data();
                        layer.added = false;
                        layer.addGeoJson(cachedGeoJson);
                        layer.setMap(bm2.map);
                        kmlObj.google = layer;
                        kmlObj.url = kmlObj.key;
                        bm2.kmlLayers[kmlcounter] = kmlObj;
                        addKMLLayerToMenu(kmlcounter, layer);
                        layer.added = true;
                        kmlcounter++;
                    });
                }

                // ONLY Fusion Tables does not have an HTTP reference--- uses an ID
                else if (!kmlObj.url.includes('http')) {
                    // Set the google object
                    // TODO: Set geometry and styleId number in configuration file
                    var layer = new google.maps.FusionTablesLayer({
                        query: {
                            select: 'geometry',
                            from: kmlObj.key
                        },
                        styledId: 2
                    });
                    layer.setMap(bm2.map);
                    kmlObj.google = layer;
                    kmlObj.url = kmlObj.key;
                    bm2.kmlLayers[kmlcounter] = kmlObj;
                    addKMLLayerToMenu(kmlcounter, layer);
                    layer.added = true;
                    kmlcounter++;
                }
                // KML/KMZ
                else {


                    // Else proceed with KML method
                    // Set the google object
                    var layer = new google.maps.KmlLayer(kmlObj.key);
                    layer.setMap(bm2.map);

                    // Initialize this to false so it can be set to true once it is added
                    layer.added = false;

                    // Wait for success on layer load to add it to menu
                    google.maps.event.addListener(layer, 'status_changed', function () {
                        if (layer.getStatus() == 'OK') {
                            if (!layer.added) {
                                kmlObj.google = layer;
                                kmlObj.url = kmlObj.key;
                                bm2.kmlLayers[kmlcounter] = kmlObj;
                                addKMLLayerToMenu(kmlcounter, layer);
                                layer.added = true;
                                kmlcounter++;
                                //setBigBounds();
                            }
                        } else {
                            bm2.kmlLayers[kmlcounter] = kmlObj;
                            addKMLErrorMessageToMenu(kmlcounter);
                            // removed the alert here for amphibiaweb since often times species maps don't have
                            // KML layers... this way it fails silently, but this was what user requested.
                            //alert("Unable to add layer with title="+kmlObj.title + ". (Using URL="+kmlObj.key+")");
                        }

                    });

                }
            });
        },
        error: function (result) {
            //alert("Error fetching KML");
            return false;
        },
        statusCode: {
            204: function () {
                // fail quietly
            }
        }
    });

}

function addKMLErrorMessageToMenu(i) {
    // Create container
    jQuery('<div/>', {
        id: 'container' + i,
        style: 'clear:both;'
    }).appendTo('#layers');

    // Create Text
    jQuery('<div/>', {
        id: 'layertext' + i,
        style: 'float: left;',
        html: "NOTE: unable to add " + bm2.kmlLayers[i]['title'] + "<br>",
    }).appendTo('#container' + i);
}

function addKMLLayerToMenu(i, layer) {
    // default checkbox state
    var checked = false;
    if (bm2.kmlLayers[i]['visibility'] == 'visible') {
        checked = true;
    }

    // Create container
    jQuery('<div/>', {
        id: 'container' + i,
        style: 'clear:both;'
    }).appendTo('#layers');

    // Create input checkbox
    jQuery('<input />').change(
        function () {
            toggleLayer(this);
        }).attr({
        id: 'layerinput' + i,
        type: 'checkbox',
        style: 'float: left;',
        value: i,
        checked: checked
    }).appendTo('#container' + i);

    // Create Text
    jQuery('<div/>', {
        id: 'layertext' + i,
        style: 'float: left;',
        html: bm2.kmlLayers[i]['title'],
        onclick: 'kmlZoom(' + i + ');'
    }).appendTo('#container' + i);

    // Create Zoom Option
    jQuery('<div/>', {
        id: 'zoomlayertext' + i,
        style: 'float: left;',
        html: '&nbsp;(zoom)'
    }).appendTo('#container' + i);
    $('#zoomlayertext' + i).bind("click", {param1: i}, function (event) {
        kmlZoom(event.data.param1);
    });

    // set initial visibility
    if (!checked) {
        bm2.kmlLayers[i].google.setMap(null);
    }
}

// toggle visibility
function toggleLayer(cb) {
    if (cb.checked) {
        bm2.kmlLayers[cb.value].google.setMap(bm2.map);
    } else {
        bm2.kmlLayers[cb.value].google.setMap(null);
    }
}

// Set custom display options
function errorCheckBox() {
    // Turn them on
    if ($("#styleOptionErrorRadius").is(':checked')) {
        for (i in bm2.markers) {
            if (bm2.markers[i].radius > 0) {
                drawThisRadius(i);
            }
        }
        // Turn them off
    } else {
        for (i in bm2.circles) {
            bm2.circles[i].setMap(null);
        }
    }
}

// Control display of points
function pointDisplay(value) {
    var drawRadius = false;
    if ($("#styleOptionErrorRadius").is(':checked')) {
        drawRadius = true;
    }
    // Custom option
    if (value == "markers" || value == "pointMarkersBlack" || value == "pointMarkersRed" || value == "pointMarkers") {
        // Default checkbox state is set everything on
        bm2.colorOption = value;
        markerController(true, drawRadius, value);
        $("#myColors").html("");
        setColors();
        $("#styleOptions").show();
    } else if (value == "none") {
        $("#myColors").html("");
        clearAllMarkers();
        // Marker clusterer
    } else {
        $("#myColors").html("");
        $("#styleOptions").hide();
        markerClustererController();
    }
}

function showMsg(a) {
    $('#loadingMsg').html(a);
}

function setSession() {
    $.ajax({
        url: bm2.urlRoot + "session?tabfile=" + jQuery.url.param('tabfile') + bm2.configFile,
        async: false,
        success: function (data) {
            bm2.session = data;
        },
        statusCode: {
            204: function () {
                alert('Unable to set session on server.  Ensure tabfile & configfile locations are accessible and that the tmp directory on server is writeable.');
                bm2.pointMode = false;
            }
        }
    });
}

function initialize() {

    $("#loadingMsg").show();

    // pre-load cursor image so cursor doesn't appear on Mac Chrome
    imageObj = new Image();
    imageObj.src = 'https://maps.gstatic.com/mapfiles/openhand_8_8.cur';

    var tabFile = false;
    // Check for valid URL (or also if the user wants to directly pass in a session)
    try {
        if (jQuery.url.param('tabfile') || jQuery.url.param('session')) {
            tabFile = true;
        }
    } catch (err) {
        alert('Unable to map your points. invalid URL passed to BerkeleyMapper, notify calling application administrator to check their URL.');
        tabFile = false;
    }

    // Set pointMode
    if (tabFile) {
        bm2.pointMode = true;

        if (jQuery.url.param('configfile')) {
            bm2.configFile += "&configfile=" + jQuery.url.param('configfile');
        }
        // Initialize Session
        showMsg("Initializing Session");

        // If a user passes is the session, it means it was created elsewhere.  Great! lets use that
        if (jQuery.url.param('session')) {
            bm2.session = jQuery.url.param('session');
        }
        // If the session parameter is not present then we try to set it here
        else {
            setSession();
        }

        // Initialize Map
        bm2.map = getMap(0, 0);
        initializeDrawingManager();

        // Setup Map type Options
        setMapTypes();

        // Draw KML Layers (lookup via service)
        if (bm2.configFile != "") {
            setKMLLayers();
        }
        // Set the metadata elements in the legend.
        setMetadataElements();
        // Draw the Points
        setJSONPoints();
        setBigBounds();
        getLogos();
        $("#styleOptions").hide();

        // Plain map mode, no points passed in
    } else {
        // Try HTML5 geolocation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                bm2.map = getMap(position.coords.latitude, position.coords.longitude, 10);
                initializeDrawingManager();
                setMapTypes();

            }, function () {
                bm2.map = getMap(0, 0);
                handleNoGeolocation(true);
                initializeDrawingManager();
            });
        } else {
            bm2.map = getMap(0, 0);
            handleNoGeolocation(false);
            initializeDrawingManager();
        }

        if (!bm2.pointMode) {
            $("#information").hide();
        }

        // Show Geocoder tool
        $("#addressControl").show();
        // Hide bottom container
        $("#myColors").hide();
        $("#layers").hide();
        $("#download").hide();
        $("#styleOptions").hide();
        $("#displayOptions").hide()
    }

    // Drawing Options
    // Open nav drawer at end of loading places all elements nicely
    openNav()
}

<!-- JS Script -->
function mapPrint() {
    var content = window.document.getElementById("map"); // get you map details
    var newWindow = window.open(); // open a new window
    newWindow.document.write(content.innerHTML); // write the map into the new window
    newWindow.print(); // print the new window
}

function handleNoGeolocation(errorFlag) {
    var content = "";
    if (errorFlag) {
        content = 'Error: The Geolocation service failed.';
    } else {
        content = 'Error: Your browser doesn\'t support geolocation.';
    }
    //Removing this alert for now since it always fails... need to switch berkeleymapper to SSL for this to work
    //alert(content);
}

// set all of our metadata elements by calling the metadataElements service, parsing, and assigning to correspondingly named elements
function setMetadataElements() {
    var url = bm2.urlRoot + "metadataElements?session=" + bm2.session;
    $.ajax({
        type: "GET",
        url: url,
        async: true,
        dataType: "json",
        success: function (data, success) {
            // Here we loop each element that is defined in the returned JSON and assigning it to
            // an ID of the same name that is defined in our main HTML div.
            $.each(data, function (key, val) {
                if (val != "Undefined")
                    $("#" + key).append(val);
            });
        }
    });
}

// Display a legend of colors
function setColors() {
    $("#myColors").append("<b>Marker Colors</b><br>");

    var url = bm2.urlRoot + "colors?session=" + bm2.session;
    $.ajax({
        type: "GET",
        url: url,
        async: true,
        dataType: "json",
        success: function (data, success) {
            count = 0;
            $.each(data, function () {
                var key, label, color = "";

                $.each(this, function (k, v) {
                    if (k == "key") key = v;
                    if (k == "label") label = v;
                    if (k == "color") color = v;
                });

                if (color == "") color = "#FF0000";

                $("#myColors").append("<div class='markerImgDiv'><img id=\"markerImg\" src=\"img/marker-t.png\" " +
                    "style=\"background-color:" + color + ";height:20px;\"></div>");
                $("#myColors").append("<div class='markerText'>" + label + "</div>");
                $("#myColors").append("<div style='clear:left;'>");

            });
        }
    });
}


// download links from bm2 service
function downloadKML() {
    var url = bm2.urlRoot + "downloadKML?session=" + bm2.session;
    window.open(url);
}

// download links from bm2 service
function downloadAll() {
    var url = bm2.urlRoot + "download?session=" + bm2.session;
    window.open(url);
}

// download the spatial subselect
function downloadSpatial() {
    if (bm2.polygon == "") {
        alert("Must first define a polygon.  You can also just download all records.")
    } else {
        var url = bm2.urlRoot + "downloadSpatial?session=" + bm2.session + "&polygon=" + bm2.polygon;
        window.open(url);
    }
}

// Get the points as JSON text
function setJSONPoints() {
    var url = bm2.urlRoot + "allpoints?session=" + bm2.session;
    if (bm2.isSafari) {
        url += "&gzip=false";
    } else {
        url += "&gzip=true";
    }

    // Warn if temporary not set on server
    if (!bm2.session) {
        alert("unable to set session on server, check temporary directory?");
        $("#loadingMsg").hide();
        return false;
    }
    var bound = new google.maps.LatLngBounds();
    showMsg("Fetching Data ...");
    $.ajax({
        type: "GET",
        url: url,
        async: false,
        dataType: "json",
        success: function (data, success) {
            count = 0;
            if (data) {
                $.each(data, function () {
                    var lat, lng, line, radius, markercolor = "";
                    var strElements;
                    $.each(this, function (k, v) {
                        if (k == "r") {
                            elements = v.split(";");
                            line = parseInt(elements[0]);
                            lat = parseFloat(elements[1]);
                            lng = parseFloat(elements[2]);
                            radius = parseInt(elements[3]);
                            markercolor = elements[4];
                        }
                    });

                    var latlng = new google.maps.LatLng(lat, lng);

                    if (markercolor == "") markercolor = "#FF0000";

                    var marker = new StyledMarker({
                        styleIcon: new StyledIcon(StyledIconTypes.MARKER, {color: markercolor}),
                        position: latlng,
                        map: null,
                        title: "point"
                    });
                    // additional options
                    marker.line = line;
                    marker.radius = radius;
                    marker.color = markercolor;
                    marker.type = "marker";
                    marker.count = count;
                    markerInfoWindow(marker);

                    bm2.markers[count++] = marker;
                    bound.extend(marker.getPosition());
                });
                // accepts some URL parameter, if set to controll the display of points
                if (jQuery.url.param('pointDisplay')) {
                    pointDisplay(jQuery.url.param('pointDisplay'));
                    $("#pointDisplayValue").val(jQuery.url.param('pointDisplay'));
                } else {
                    clearAllMarkers();
                    markerClustererController();
                }
                showMsg("Installing Components...");
            } else {
                // set to global view if nothing to map!
                bm2.map.setZoom(1);
                bm2.map.setCenter(new google.maps.LatLng(0, 0));
                showMsg("Error ...");
                alert("nothing to map! Does the data have a latitude/longitude?");
                $("#loadingMsg").hide();
            }
        },
        error: function (e, k, v) {
            alert("Error fetching data: " + v);
        }

    });
}

// Zoom to an individual KML Layer
function kmlZoom(i) {
    bm2.map.fitBounds(bm2.kmlLayers[i].google.getDefaultViewport());
}

// Zoom just to this set of points
function setBounds() {
    var bound = new google.maps.LatLngBounds();
    for (i in bm2.markers) {
        bound.extend(bm2.markers[i].getPosition());
    }
    bm2.map.fitBounds(bound);
}

// Zoom to entire extent of Points plus all visible layers
function setBigBounds() {
    var bound = new google.maps.LatLngBounds();
    for (i in bm2.markers) {
        bound.extend(bm2.markers[i].getPosition());
    }

    for (var i = 0; i < bm2.kmlLayers.length; i++) {
        if (bm2.kmlLayers[i]['visibility'] == "visible") {
            bound.extend(bm2.kmlLayers[i].google.getDefaultViewport().getNorthEast());
            bound.extend(bm2.kmlLayers[i].google.getDefaultViewport().getSouthWest());
        }
    }
    bm2.map.fitBounds(bound);

    // make sure the zoom is not too small
    var listener = google.maps.event.addListener(bm2.map, "idle", function () {
        if (bm2.map.getZoom() > 10) bm2.map.setZoom(10);
        google.maps.event.removeListener(listener);
    });
}

function fetchRecord(line) {
    var retStr = "";
    // Initialize Session
    $.ajax({
        url: bm2.urlRoot + "records?session=" + bm2.session + "&line=" + line,
        async: false,
        success: function (data) {
            // Loop through JSON elements to construct response
            $.each(data, function () {
                retStr += "<div id='content'>";
                $.each(this, function (k, v) {
                    retStr += k + ": " + v + "<br>";
                });
                retStr += "</div>";
            });
        },
        statusCode: {
            204: function () {
                return "unable to fetch results for line " + line;
            }
        }
    });
    return retStr;
}

function fetchSpatialIntersection() {
    var retStr = "";
    var url = bm2.urlRoot + "statistics/spatialIntersection?session=" + bm2.session;
    console.log("fetching " + url)
    $.ajax({
        type: "GET",
        url: url,
        async: true,
        success: function (data, success) {

            var i = 0;
            $("#SpatialIntersectionDialog").html("<h3>Spatial Intersection - derived by intersecting points with spatial layers</h3>");
            $("#SpatialIntersectionDialog").append("<p>Results are derived by intersection the entire set of points with a course resolution grid, hence are useful for estimation purposes only.</p>");


            // headinig of buttons for each column, purpose is to show frequency table when clicked
            $.each(data, function (k, v) {
                retStr += "<input type=button value='" + v.alias + "' " +
                    "onclick='" +
                    "$(\".frequencyTable\").hide();" +
                    "$(\"#columnsi" + i + "\").css(\"display\", \"inline\");'/>";
                i++;
            });
            $("#SpatialIntersectionDialog").append(retStr);
            $("#loadingMsg").hide();


            // Create a series of hidden json tables, shown when column buttons clicked
            i = 0;
            $.each(data, function () {
                var columnIndex = 'columnsi' + i
                retStr = "";
                retStr += "<table id='" + columnIndex + "' class='table table-striped table-bordered .table-sm frequencyTable'>";
                retStr += "<thead><th width='50'>count</th><th width='250'>" + this.alias + "</th></thead>";
                retStr += "<tbody>";
                $.each(this.frequencies, function (k, v) {
                    retStr += "<tr><td width='50'>" + v.key + "</td><td width='250'>" + v.value + "</td></tr>";
                });
                retStr += "</tbody>";
                retStr += "</table>";
                $("#SpatialIntersectionDialog").append(retStr);
                $('#' + columnIndex).DataTable({
                    "paging": false,
                    "searching": false,
                    "info": false,
                    "bInfo": false,
                    "language": {
                        "info": ""
                    },
                    "order": [0, 'desc']
                });
                i++;
            });

            //$(document).ready(function () {
            //    $('#column0').show();
            //});
        },
        statusCode: {
            204: function () {
                retStr = "Server 204 error: unable to fetch results";
                $("#SpatialIntersectionDialog").html(retStr);
                $("#loadingMsg").hide();
            }
        },
        error: function (req, err) {
            retStr = "Server 500 error: an error happened fetching records from server:\n";
            retStr += JSON.stringify(err, null, 4);
            $("#SpatialIntersectionDialog").html(retStr);
            $("#loadingMsg").hide();
        }
    });

    return true;
}
function fetchStatistics() {
    var retStr = "";
    var url = bm2.urlRoot + "statistics/frequencies?session=" + bm2.session;
    console.log("fetching " + url)
    $.ajax({
        type: "GET",
        url: url,
        async: true,
        success: function (data, success) {

            var i = 0;
            $("#StatisticsDialog").html("<h3>Frequency of terms by column</h3>");
            $("#StatisticsDialog").append("<p>Results are derived counting the number of unique values for columns that were passed to BerkeleyMapper.</p>");


            // headinig of buttons for each column, purpose is to show frequency table when clicked
            $.each(data, function (k, v) {
                retStr += "<input type=button value='" + v.alias + "' " +
                    "onclick='" +
                    "$(\".frequencyTable\").hide();" +
                    "$(\"#column" + i + "\").css(\"display\", \"inline\");'/>";
                i++;
            });
            $("#StatisticsDialog").append(retStr);
            $("#loadingMsg").hide();


            // Create a series of hidden json tables, shown when column buttons clicked
            i = 0;
            $.each(data, function () {
                var columnIndex = 'column' + i
                retStr = "";
                retStr += "<table id='" + columnIndex + "' class='table table-striped table-bordered .table-sm frequencyTable'>";
                retStr += "<thead><th width='50'>count</th><th width='250'>" + this.alias + "</th></thead>";
                retStr += "<tbody>";
                $.each(this.frequencies, function (k, v) {
                    retStr += "<tr><td width='50'>" + v.count + "</td><td width='250'>" + v.column + "</td></tr>";
                });
                retStr += "</tbody>";
                retStr += "</table>";
                $("#StatisticsDialog").append(retStr);
                $('#' + columnIndex).DataTable({
                    "paging": false,
                    "searching": false,
                    "info": false,
                    "bInfo": false,
                    "language": {
                        "info": ""
                    },
                    "order": [0, 'desc']
                });
                i++;
            });

            //$(document).ready(function () {
            //    $('#column0').show();
            //});
        },
        statusCode: {
            204: function () {
                retStr = "Server 204 error: unable to fetch results";
                $("#StatisticsDialog").html(retStr);
                $("#loadingMsg").hide();
            }
        },
        error: function (req, err) {
            retStr = "Server 500 error: an error happened fetching records from server:\n";
            retStr += JSON.stringify(err, null, 4);
            $("#StatisticsDialog").html(retStr);
            $("#loadingMsg").hide();
        }
    });

    return true;
}

function fetchRecords() {
    var retStr = "";

    // Initialize Session
    $.ajax({
        type: "POST",
        data: "session=" + bm2.session + "&polygon=" + bm2.polygon,
        url: bm2.urlRoot + "records",
        async: false,
        success: function (data) {
            // Header elements
            retStr += "<table id='resultsTable' class='table table-hover .table-sm' cellspacing='0' width='100%'>";
            retStr += "<thead><tr>";
            row = 1;
            $.each(data, function () {
                if (row == 1) {
                    $.each(this, function (k, v) {
                        retStr += "<th>" + k + "</th>";
                        bm2.columnArray.push(k);
                    });
                    row++;
                }
            });
            retStr += "</tr></thead>";
            // Body elements
            retStr += "<tbody>";
            // Loop through JSON elements to construct response
            $.each(data, function () {
                if (row < 100) {
                    retStr += "<tr onclick='showRow(this)'>";
                    $.each(this, function (k, v) {
                        retStr += "<td>" + v + "</td>";
                    });
                    retStr += "</tr>";
                }
                row++;
            });
            retStr += "</tbody></table>";
            if (row > 100) {
                showMsg("Response truncated to 100 records");
            }
            $("#loadingMsg").hide();
        },
        statusCode: {
            204: function () {
                $("#loadingMsg").hide();
                return "unable to fetch results for polygon";
            }
        },
        error: function () {
            $("#loadingMsg").hide();
        }
    });

    $(function () {
        $("#ResultsDialog").dialog("open");
        $("#ResultsDialog").html(retStr);
    });

    return true;
}

// clears All markers
function clearAllMarkers() {
    //if (mode == CLUSTERING) 
    try {
        bm2.mc.clearMarkers();
    } catch (err) {

    }
    for (i in bm2.markers) {
        bm2.markers[i].setMap(null);
    }
    for (i in bm2.circles) {
        bm2.circles[i].setMap(null);
    }
    // clear Container
    //$("#dialog").html(bm2.dialogText);
}

function markerController(drawMarkers, drawRadius, value) {
    clearAllMarkers();
    positions = [];
    var count = 0;
    var circlecount = 0;

    if (bm2.markers) {
        for (i in bm2.markers) {
            var color = bm2.markers[i].color;
            var position = bm2.markers[i].get("position");
            var message = bm2.markers[i].message;
            var count = bm2.markers[i].count;
            var line = bm2.markers[i].line;
            var radius = bm2.markers[i].radius;

            if (value == "pointMarkersBlack" || value == "pointMarkersRed" || value == "pointMarkers") {
                var displaycolor = color;
                if (value == "pointMarkersBlack") displaycolor = "#000000";
                if (value == "pointMarkersRed") displaycolor = "#ff0000";

                bm2.markers[i] = new StyledMarker({
                    styleIcon: new StyledIcon(
                        StyledIconTypes.CLASS,
                        {
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                fillOpacity: 0.8,
                                scale: 3,
                                strokeWeight: 2,
                                fillColor: displaycolor,
                                strokeColor: displaycolor
                            }
                        }
                    ),
                    position: position,
                    map: bm2.map
                });
            } else {
                bm2.markers[i] = new StyledMarker(
                    {
                        styleIcon: new StyledIcon(StyledIconTypes.MARKER, {color: color}),
                        position: position,
                        map: bm2.map
                    });
            }

            bm2.markers[i].setMap(null);
            bm2.markers[i].color = color;
            bm2.markers[i].line = line;
            bm2.markers[i].type = "marker";
            bm2.markers[i].count = count;
            bm2.markers[i].radius = radius;

            // Figure out if this position exists or not.  If it does, don't display it again!
            var positionExists = false;
            for (j in positions) {
                if (bm2.markers[i].getPosition().lat() == positions[j].lat() &&
                    bm2.markers[i].getPosition().lng() == positions[j].lng()) {
                    positionExists = true;
                    break;
                }
            }

            // Only display this marker if this not a marker at this exact position
            if (!positionExists) {
                positions[count++] = bm2.markers[i].getPosition();

                if (drawMarkers) {
                    markerInfoWindow(bm2.markers[i]);
                    bm2.markers[i].setMap(bm2.map);
                }
                // Add circle overlay and bind to marker
                if (drawRadius && bm2.markers[i].radius > 0) {
                    drawThisRadius(i);
                }
            }
        }
    }
}

function drawThisRadius(i) {
    var circle = new google.maps.Circle({
        map: bm2.map,
        radius: bm2.markers[i].radius,
        fillColor: bm2.markers[i].color,
        fillOpacity: 0,
        strokeOpacity: 0.5,
        strokeWidth: 1,
        strokeColor: bm2.markers[i].color,
        clickable: false
    });
    bm2.circles[i] = circle;
    circle.bindTo('center', bm2.markers[i], 'position');
}

// Control the MarkerClusterer
function markerClustererController() {
    clearAllMarkers();
    var mcOptions = {
        gridSize: 25,
        averageCenter: true,
        title: "Click to view these records on bottom of screen",
        minimumClusterSize: 1,
        zoomOnClick: false
    };
    bm2.mc = new MarkerClusterer(bm2.map, bm2.markers, mcOptions);
    //bm2.mc = new MarkerClusterer(bm2.map);
    //bm2.mc.addMarkers(bm2.markers);

    google.maps.event.addListener(bm2.mc, 'clusterclick', function (c) {
        var cb = new google.maps.LatLngBounds();
        var m = c.getMarkers();
        for (var i = 0; i < m.length; i++) {
            ll = m[i].getPosition();
            cb.extend(m[i].getPosition());
        }
        // Create a WKT polygon from this bounding box
        lat1 = cb.getNorthEast().lat();
        lng1 = cb.getNorthEast().lng();
        lat2 = cb.getSouthWest().lat();
        lng2 = cb.getSouthWest().lng();
        bm2.polygon = "POLYGON ((" + lat2 + " " + lng2 + "," + lat1 + " " + lng2 + "," + lat1 + " " + lng1 + "," + lat2 + " " + lng1 + "," + lat2 + " " + lng2 + "))";

        $("#loadingMsg").show();
        showMsg("Loading Records ...");
        setTimeout(fetchRecords, 500);
    });
}


// Set the initial Map
function getMap(a, b, zoomVal = 1) {
    var lat = a;
    var lng = b;
    var myOptions;
    // Don't zoom/center if pointMode is true
    if (bm2.pointMode) {
        myOptions = {
            zoom: zoomVal,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            panControl: true,
            panControlOptions: {
                position: google.maps.ControlPosition.LEFT_TOP
            },
            zoomControl: true,
            scaleControl: true,
            scrollwheel: false,
            zoomControlOptions: {
                position: google.maps.ControlPosition.LEFT_TOP
            }
        };
    } else {
        myOptions = {
            zoom: zoomVal,
            center: new google.maps.LatLng(lat, lng),
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            panControl: true,
            panControlOptions: {
                position: google.maps.ControlPosition.LEFT_TOP
            },
            zoomControl: true,
            scrollwheel: false,
            scaleControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.LEFT_TOP
            }
        };
    }

    lmap = new google.maps.Map(document.getElementById('map'), myOptions);

    lmap.enableKeyDragZoom({
        visualEnabled: true,
        visualPosition: google.maps.ControlPosition.LEFT_TOP,
        visualPositionOffset: new google.maps.Size(35, 0),
        visualPositionIndex: null,
        visualSprite: "https://maps.gstatic.com/mapfiles/ftr/controls/dragzoom_btn.png",
        visualSize: new google.maps.Size(20, 20),
        visualTips: {
            off: "Turn on",
            on: "Turn off"
        }
    });
    //lmap.controls[google.maps.ControlPosition.TOP_RIGHT].push($("#aboutButton"));

    google.maps.event.addListener(lmap, 'bounds_changed', function () {
        $('#loadingMsg').hide();
    });
    return lmap;
}

// mapTypes DropDown
function setMapTypes() {
    //TODO: call terraserver for topos and add DOQ
    var topoMapOptions = {
        getTileUrl: function (coords, zoom) {
            return 'https://server.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/' + zoom + '/' + coords.y + '/' + coords.x;
        },
        tileSize: new google.maps.Size(256, 256),
        isPng: false,
        name: "Topo",
        minZoom: 0,
        maxZoom: 19
    };

    var topo = new google.maps.ImageMapType(topoMapOptions);
    bm2.map.mapTypes.set('topo', topo);

    /*

           // style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                                  mapTypeIds: [google.maps.MapTypeId.ROADMAP,
                                      google.maps.MapTypeId.SATELLITE,
                                      google.maps.MapTypeId.HYBRID,
                                      google.maps.MapTypeId.TERRAIN,
                                      "topo"
                                  ]
                                  mapTypeControlOptions: {
                           style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                           mapTypeIds: ["roadmap", "topo"]
                         },*/
    bm2.map.setOptions({
        mapTypeControl: true,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            mapTypeIds: [
                "roadmap","satellite","hybrid","terrain","topo"]
        }
    });
}

function removeOverlay(num) {
    bm2.overlays[num].setMap(null);
    bm2.overlayMarkers[num].setMap(null);
}


function queryOverlay(num) {
    var path = bm2.overlays[num].getPath();
    var polygon = "POLYGON ((";
    var firstPoint = "";
    for (var i = 0; i < path.getLength(); i++) {
        var point = path.getAt(i);
        var lat = point.lat().toFixed(5);
        var lng = point.lng().toFixed(5);
        if (i == 0) {
            firstPoint += lat + " " + lng;
        }
        polygon += lat + " " + lng;
        polygon += ",";
    }
    polygon += firstPoint + "))";
    bm2.polygon = polygon;

    $("#loadingMsg").show();
    showMsg("Loading Records ...");
    setTimeout(fetchRecords, 500);
}

function callbackPoint(num) {
    alert("possible to send this data back to some calling application??");
}

// Convert String to HTML Entities
function htmlEntities(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Add a listener to marker to open InfoWindow
function markerInfoWindow(marker) {
    var count = marker.count;
    var line = marker.line;
    google.maps.event.addListener(marker, 'click', (function (marker, count) {
        return function () {
            var infowindow = new google.maps.InfoWindow();
            infowindow.setContent(fetchRecord(line));
            infowindow.open(bm2.map, marker);
        }
    })(marker, count));
}




