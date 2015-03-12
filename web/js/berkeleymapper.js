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
bm2.bottomContainerText = "<center>Click on MarkerClusters or draw a polygon to query points</center>";
bm2.polygon = "";           // A variable to hold a polygon defined by the user
bm2.configFile = "";
bm2.isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;  // detect safari
bm2.showControls = true;
bm2.colorOption = "markers";    // value to control how to color markers

// Control the look and behaviour or the table grid
bm2.jqGridAttributes = {
    multiboxonly: true,
    emptyrecords: "No records to view",
    rowNum: 1000,
    altRows: true,
    scroll: true,
    height: "100%" ,
    onSelectRow: function(id) {
        var lat = $('#flexme1').getCell(id, 'Latitude');
        var lng = $('#flexme1').getCell(id, 'Longitude');

        var latlng = new google.maps.LatLng(lat, lng);
        if (bm2.iw) {
            bm2.iw.close();
        }
        var columnNames = $("#flexme1").jqGrid('getGridParam', 'colNames');
        var rowData = "<div id='content'>";
        for (i = 0; i < columnNames.length; i++) {
            cell = $("#flexme1").getCell(id, i);
            rowData += columnNames[i] + ":" + cell + "<br>";
        }
        rowData += "</div>";
        if (lat != 0 && lng !=0) {
            bm2.iw = new google.maps.InfoWindow();
            bm2.iw.setContent(rowData);
            bm2.iw.setPosition(latlng);
            bm2.iw.open(bm2.map);
        }
    }
};

// Set up splitter panes
$().ready(function() {
    $("#bigContainer").splitter({
        splitHorizontal: true,
        outline: true,
        resizeToWidth: true,
        sizeBottom: true
    });

    // Horizontal splitter, nested in the right pane of the vertical splitter.
    $("#topContainer").splitter({
        splitVertical: true,
        outline: true
    });
});


// Adjust bounds to drawn polygon
if (!google.maps.Polygon.prototype.getBounds) {
    google.maps.Polygon.prototype.getBounds = function(latLng) {
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
    google.maps.Polyline.prototype.getBounds = function(latLng) {
        var bounds = new google.maps.LatLngBounds();
        this.getPath().forEach(function(e) {
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
        bm2.map.setOptions({ mapTypeControl: false,overviewMapControl: false,panControl:false,streetViewControl:false,zoomControl:false});
        bm2.map.disableKeyDragZoom();

    }  else {
        bm2.showControls = true;
        drawingManagerShow();
        bm2.map.setOptions({ mapTypeControl: true,overviewMapControl: true,panControl:true,streetViewControl:true,zoomControl:true});
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
          success: function(data) {
                counter = 1;
              $.each(data, function() {
                  var url, img;
                  var logoObj = new Object();

                  $.each(this, function(k, v) {

                      if (k == "url") logoObj.url = v;
                      if (k == "img") logoObj.img = v;
                  });

                  logoId = "logo" + counter;
                  $("#logos").append("<br>");
                  $("#logos").append("<a id=\"" + logoId + "\"href=\"" + logoObj.url + "\" target=\"_blank\"></a>");
                  $("#" + logoId).append("<img src=\"" + logoObj.img + "\" width=150 \/>");
                  $("#logos").append("<br>");
                  counter++;
              });


          },
          error: function(result) {
              return false;
          },
          statusCode: {
              204: function() {
                  // fail quietly
              }
          }
      });
}


// Initialize the Array of Available KML Layers
function setKMLLayers() {
    if (!bm2.pointMode) {
        return false;
    }

    // Populate kmlLayers Array (loop json)
    $.ajax({
        url: bm2.urlRoot + "kmllayers?session=" + bm2.session,
        async: false,
        success: function(data) {
            kmlcounter = 0;
            $.each(data, function() {
                var url, mode, title;
                var kmlObj = new Object();
                $.each(this, function(k, v) {
                    if (k == "url") kmlObj.key = v.trim();
                    if (k == "visibility") kmlObj.visibility = v;   // visibile|hidden
                    if (k == "zoom") kmlObj.zoom = v;               // expand|ignore
                    if (k == "title") kmlObj.title = v;
                });

                // Set the google object
  		        var layer = new google.maps.KmlLayer(kmlObj.key);
		        layer.setMap(bm2.map);

                // Initialize this to false so it can be set to true once it is added
                layer.added = false;

                // Wait for success on layer load to add it to menu
                google.maps.event.addListener(layer, 'status_changed', function () {
                    if (layer.getStatus() == 'OK' ) {
                        if (!layer.added) {
                            kmlObj.google = layer;
                            kmlObj.url = kmlObj.key;
                            bm2.kmlLayers[kmlcounter] = kmlObj;
                            addKMLLayerToMenu(kmlcounter,layer);
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
            });
        },
        error: function(result) {
            //alert("Error fetching KML");
            return false;
        },
        statusCode: {
            204: function() {
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

function addKMLLayerToMenu(i,layer) {
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
            function() {
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
        $('#zoomlayertext' + i).bind("click", {param1: i}, function(event) {
            kmlZoom(event.data.param1);
        });

        // set initial visibility
        //if (bm2.kmlLayers[i]['visibility'] == 'visible') {
         //   bm2.kmlLayers[i].google.setMap(bm2.map);
        //}
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
    }   else {
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
        markerController(true,drawRadius,value);
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
            success: function(data) {
                bm2.session = data;
            },
            statusCode: {
                204: function() {
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
    imageObj.src = 'http://maps.gstatic.com/mapfiles/openhand_8_8.cur';

    var tabFile = false;
    // Check for valid URL (or also if the user wants to directly pass in a session)
    try {
       if(jQuery.url.param('tabfile') || jQuery.url.param('session')) {
               tabFile = true;
       }
    } catch(err) {
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
        bm2.map = getMap();
        google.maps.event.addListener(bm2.map, 'bounds_changed', function() {
 	        $('#loadingMsg').hide();
        });
        // Setup Map type Options
        setMapTypes();

        // Draw KML Layers (lookup via service)
        if (bm2.configFile != "") {
            setKMLLayers();
        }
        // Draw the Points
        setJSONPoints();
        setBigBounds();

        getLogos();

        // Special exception for amphibiaweb who doesn't want to display download links
        if (jQuery.url.param('amphibiaweb')) {
            $("#download").hide();
        }

        $("#styleOptions").hide();

    // Plain map mode, no points passed in
    } else {
        bm2.map = getMap();
        google.maps.event.addListener(bm2.map, 'bounds_changed', function() {
 	        $('#loadingMsg').hide();
        });

        $("#bottomContainer").html("<b>Welcome to BerkeleyMapper 2.0</b><ul style='margin-top: 0px;margin-bottom: 0px;'>"+
            "<li>This page provides an interface for working with Google's geocoding services " +
            "(<img border=0 src='img/geocode.jpg' height=15>), in addition to tools for finding the " +
             "latitude/longitude of a point, and measuring areas and lines (<img border=0 src='img/tools.jpg' height=15>).</li>" +
            "<li>To include point and range mapping functions on your website, visit the " +
            "<a href='http://code.google.com/p/berkeleymapper/'>BerkeleyMapper 2.0 code page</a> for detailed instructions " +
            "or to contact the development team.</li></ul>");
        // Show Geocoder tool
        $("#addressControl").show();

        // Hide bottom container
        $("#myColors").hide();
        $("#layers").hide();
        $("#download").hide();
        $("#styleOptions").hide();

        // Try HTML5 geolocation
        if(navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(function(position) {
            var pos = new google.maps.LatLng(position.coords.latitude,
                                             position.coords.longitude);

            bm2.map.setCenter(pos);
            bm2.map.setZoom(10);
          }, function() {
            handleNoGeolocation(true);
          });
        } else {
          // Browser doesn't support Geolocation
          handleNoGeolocation(false);
        }

    }

    // Drawing Options
    initializeDrawingManager();
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
    alert(content);
}

// Display a legend of colors
function setColors() {
    $("#myColors").append("<br>&nbsp;<br><b style='font-size:11px;'>Marker Colors</b><br>");

    var url = bm2.urlRoot + "colors?session=" + bm2.session;
    $.ajax({
        type: "GET",
        url: url,
        async: true,
        dataType: "json",
        success: function(data, success) {
            count = 0;
            $.each(data, function() {
                var key, label, color = "";

                $.each(this, function(k, v) {
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
    if (!bm2.session)  {
        alert ("unable to set session on server, check temporary directory?");
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
        success: function(data, success) {
            count = 0;
            if (data) {
                $.each(data, function() {
                    var lat, lng, line, radius, markercolor = "";
                    var strElements;
                    $.each(this, function(k, v) {
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
                        styleIcon:  new StyledIcon(StyledIconTypes.MARKER, {color:markercolor}),
                        position: latlng,
                        map: bm2.map,
                        title:"point"
                    });
                    // additional options
                    marker.line = line;
                    marker.radius = radius;
                    marker.color = markercolor;
                    marker.type = "marker";
                    //marker.message = fetchRecord(line);
                    marker.count = count;
                    markerInfoWindow(marker);

                    bm2.markers[count++] = marker;
                    bound.extend(marker.getPosition());
                });
                markerClustererController();
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
        error: function (e,k,v) {
            alert("Error fetching data: "+v);
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

    for ( var i=0; i< bm2.kmlLayers.length; i++) {
        if (bm2.kmlLayers[i]['visibility'] == "visible") {
            bound.extend(bm2.kmlLayers[i].google.getDefaultViewport().getNorthEast());
            bound.extend(bm2.kmlLayers[i].google.getDefaultViewport().getSouthWest());
        }
    }
    bm2.map.fitBounds(bound);

    // make sure the zoom is not too small
    var listener = google.maps.event.addListener(bm2.map, "idle", function() {
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
        success: function(data) {
            // Loop through JSON elements to construct response
            $.each(data, function() {
                retStr += "<div id='content'>";
                $.each(this, function(k, v) {
                    retStr += k + ": " + v + "<br>";
                });
                retStr += "</div>";
            });
        },
        statusCode: {
            204: function() {
                return "unable to fetch results for line " + line;
            }
        }
    });
    return retStr;
}

function fetchRecords() {
    var retStr = "";
    // Initialize Session
    $.ajax({
        type: "POST",
        data: "session=" + bm2.session + "&polygon=" + bm2.polygon,
        url: bm2.urlRoot + "records",
        async: false,
        success: function(data) {

            // Header elements
            retStr += "<table id=\"flexme1\">";
            retStr += "<thead><tr>";
            row = 1;
            $.each(data, function() {
                if (row == 1) {
                    $.each(this, function(k, v) {
                        retStr += "<th width=80>" + k + "</th>";
                    });
                    row++;
                }
            });
            retStr += "</tr></thead>";

            // Body elements
            retStr += "<tbody>";
            // Loop through JSON elements to construct response
            $.each(data, function() {
                if (row < 100) {
                    retStr += "<tr>";
                    $.each(this, function(k, v) {
                        //retStr += "<td width=80>" + htmlEntities(v) + "</td>";
                        // JBD removed the htmlEntities in this line on April 18th.. probably a good
                        // reason for htmlEntities to be there but i'm not sure what it is.  I removed
                        // this since it is breaking URL links.
                        retStr += "<td width=80>" + v + "</td>";
                    });
                    retStr += "</tr>";
                }
                row++;
            });
            retStr += "</tbody></table>";

            if (row > 100)  {
                showMsg("Response truncated to 100 records");
                //alert('result response truncated to 100 records');
            }
    	    $("#loadingMsg").hide();

        },
        statusCode: {
            204: function() {
    	    	$("#loadingMsg").hide();
                return "unable to fetch results for polygon";
            }
        }, 
	error: function() {
    	    $("#loadingMsg").hide();
	}
    });

    $("#bottomContainer").html(retStr);
    setHorizontalPane();
    $(function () {
        tableToGrid("#flexme1", bm2.jqGridAttributes);
    });

    // fixes header when scrolling
    $('#flexme1').closest(".ui-jqgrid-bdiv").css({"overflow-y" : "scroll"});


    return true;
}

// clears All markers
function clearAllMarkers() {
    //if (mode == CLUSTERING) 
    try {
        bm2.mc.clearMarkers();
    } catch(err) {

    }
    for (i in bm2.markers) {
        bm2.markers[i].setMap(null);
    }
    for (i in bm2.circles) {
        bm2.circles[i].setMap(null);
    }
    // clear Container
    $("#bottomContainer").html(bm2.bottomContainerText);
}

function markerController(drawMarkers,drawRadius,value) {
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
                        styleIcon:new StyledIcon(
                        StyledIconTypes.CLASS,
                        {icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            fillOpacity: 0.8,
                            scale: 3,
                            strokeWeight: 2,
                            fillColor: displaycolor,
                            strokeColor: displaycolor
                        }}
                        ),
                        position:position,
                        map:bm2.map
                    });
                } else {
                    bm2.markers[i] = new StyledMarker(
                        {styleIcon: new StyledIcon(StyledIconTypes.MARKER, {color:color}),
                        position:position,
                        map:bm2.map
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
                    if(bm2.markers[i].getPosition().lat() == positions[j].lat() &&
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
        gridSize:25,
        averageCenter:true,
        title:"Click to view these records on bottom of screen",
        minimumClusterSize:1,
        zoomOnClick:false
    };
    bm2.mc = new MarkerClusterer(bm2.map, bm2.markers, mcOptions);

    google.maps.event.addListener(bm2.mc, 'click', function (c) {
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
        setTimeout(fetchRecords,500);
    });
}


// Set the initial Map
function getMap() {
    var myOptions;
    // Don't zoom/center if pointMode is true
    if (bm2.pointMode) {
        myOptions = {
            zoom: 1,
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
            zoom: 1,
            center: new google.maps.LatLng(0, 0),
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
        visualPosition: google.maps.ControlPosition.LEFT,
        visualPositionOffset: new google.maps.Size(35, 0),
        visualPositionIndex: null,
        visualSprite: "http://maps.gstatic.com/mapfiles/ftr/controls/dragzoom_btn.png",
        visualSize: new google.maps.Size(20, 20),
        visualTips: {
            off: "Turn on",
            on: "Turn off"
        }
    });

    return lmap;
}

// mapTypes DropDown
function setMapTypes() {

    //TODO: call terraserver for topos and add DOQ
    var topoMapOptions = {
        getTileUrl: function(coords, zoom) {
            return 'http://server.arcgisonline.com/ArcGIS/rest/services/USA_Topo_Maps/MapServer/tile/' + zoom + '/' + coords.y + '/' + coords.x;
        },
        tileSize: new google.maps.Size(256, 256),
        isPng: false,
        name: "Topo",
        minZoom: 0,
        maxZoom: 19
    };

    var topo = new google.maps.ImageMapType(topoMapOptions);
    bm2.map.mapTypes.set('topo', topo);

    // WMS Raster Services
    var cantopo = WMSTileOverlay("http://wms.ess-ws.nrcan.gc.ca/wms/toporama_en?REQUEST=GetMap&SERVICE=wms&VERSION=1.1.1&SRS=epsg:4269&WIDTH=200&HEIGHT=200&FORMAT=image/png&LAYERS=limits,vegetation,builtup_areas,designated_areas,hydrography,hypsography,water_saturated_soils,landforms,constructions,water_features,road_network,railway,populated_places,structures,power_network,feature_names", 2, 15, 0.7, true, 'Canadian Topo');
    bm2.map.mapTypes.set('cantopo', cantopo);

    var moorea = WMSTileOverlay("http://darwin.berkeley.edu/cgi-bin/mapserv?map=/data/berkeleymapperdata/moorea/moorea.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=moorea&SRS=EPSG:4326&WIDTH=200&HEIGHT=200&FORMAT=image/png", 2, 15, 0.7, true, 'Moorea');
    bm2.map.mapTypes.set('moorea',moorea);

    var mooreabathy = WMSTileOverlay("http://darwin.berkeley.edu/cgi-bin/mapserv?map=/data/berkeleymapperdata/moorea/moorea.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=moorea_bathy&SRS=EPSG:4326&WIDTH=200&HEIGHT=200&FORMAT=image/png", 2, 15, 0.7, true, 'Moorea Bathymetry');
    bm2.map.mapTypes.set('mooreabathy',mooreabathy);

    var angelo2m = WMSTileOverlay("http://darwin.berkeley.edu/cgi-bin/mapserv?map=/data/berkeleymapperdata/angelo/angelo.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=angelo2m_dem&SRS=EPSG:4326&WIDTH=200&HEIGHT=200&FORMAT=image/png", 2, 15, 0.7, true, 'Angelo 2m DEM');
    bm2.map.mapTypes.set('angelo2m',angelo2m);

    var angelo1m = WMSTileOverlay("http://darwin.berkeley.edu/cgi-bin/mapserv?map=/data/berkeleymapperdata/angelo/angelo.map&SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=eel1mdemshd&SRS=EPSG:4326&WIDTH=200&HEIGHT=200&FORMAT=image/png", 2, 15, 0.7, true, 'Angelo 1m DEM');
    bm2.map.mapTypes.set('angelo1m',angelo1m);

    bm2.map.setOptions({
        mapTypeControl: true,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
            mapTypeIds: [google.maps.MapTypeId.ROADMAP,
                google.maps.MapTypeId.SATELLITE,
                google.maps.MapTypeId.HYBRID,
                google.maps.MapTypeId.TERRAIN,
                'topo',
                'cantopo',
                'moorea',
                'angelo2m',
                'angelo1m']
        }
    });
}

function WMSTileOverlay(urlWMS, minZ, maxZ, opacity, isPng, name) {
    var overlayOptions = {
        getTileUrl:
            function WMS_GetTileUrl(coord, zoom) {
                //var overlay = new MyOverlay(map);
                var projection = bm2.map.getProjection();
                var zpow = Math.pow(2, zoom);
                var lULP = new google.maps.Point(coord.x * 256.0 / zpow, (coord.y + 1) * 256.0 / zpow);
                var lLRP = new google.maps.Point((coord.x + 1) * 256.0 / zpow, coord.y * 256.0 / zpow);
                var lULg = projection.fromPointToLatLng(lULP);
                var lLRg = projection.fromPointToLatLng(lLRP);
                var lULg_Longitude = lULg.lng();
                var lULg_Latitude = lULg.lat();
                var lLRg_Longitude = lLRg.lng();
                var lLRg_Latitude = lLRg.lat();

                // There seems to be a bug when crossing the -180 longitude border (tile does not render) - this check seems to fix it...
                if (lLRg_Longitude < lULg_Longitude) {
                    lLRg_Longitude = Math.abs(lLRg_Longitude);
                }

                // Create the Bounding Box string
                var bbox = "&bbox=" + lULg_Longitude + "," + lULg_Latitude + "," + lLRg_Longitude + "," + lLRg_Latitude;
                var urlResult = urlWMS + bbox;

                return urlResult;
            },

        tileSize: new google.maps.Size(256, 256),
        minZoom: minZ,
        maxZoom: maxZ,
        opacity: opacity,
        name: name,
        isPng: isPng};

    return new google.maps.ImageMapType(overlayOptions);
}

function PanelControl(controlDiv, pmap) {
    controlDiv.index = -1;  // value of -1 supersedes control position of others
    pmap.controls[google.maps.ControlPosition.TOP_LEFT].push(controlDiv);
    var controlUI = document.createElement('DIV');
    controlUI.style.cursor = 'pointer';
    controlUI.style.backgroundImage = 'url(img/left-right.gif)';
    controlUI.title = 'Show/Hide Panel';
    controlUI.style.width = '29px';
    controlUI.style.height = '20px';

    controlDiv.appendChild(controlUI);

    return controlUI;
}

function NewControl(controlDiv, pmap, title, alt) {

    controlDiv.style.padding = '5px';
    controlDiv.index = 1;
    pmap.controls[google.maps.ControlPosition.TOP_RIGHT].push(controlDiv);


    // Set CSS for the control border
    var controlUI = document.createElement('DIV');
    controlUI.style.backgroundColor = 'white';
    controlUI.style.borderStyle = 'solid';
    controlUI.style.borderWidth = '1px';
    controlUI.style.cursor = 'pointer';
    controlUI.style.textAlign = 'center';
    controlUI.title = alt;
    controlDiv.appendChild(controlUI);

    // Set CSS for the control interior
    var controlText = document.createElement('DIV');
    controlText.style.fontFamily = 'Arial,sans-serif';
    controlText.style.fontSize = '14px';
    controlText.style.paddingLeft = '4px';
    controlText.style.paddingRight = '4px';
    controlText.innerHTML = '<b>' + title + '</b>';
    controlUI.appendChild(controlText);

    return controlUI;
}


function removeOverlay(num) {
    bm2.overlays[num].setMap(null);
    bm2.overlayMarkers[num].setMap(null);
}

function setHorizontalPane() {
    var curr_height = $("#bottomContainer").height();
    if (curr_height < 200) {
        $("#bottomContainer").css("height", "200px");
    }
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
    setTimeout(fetchRecords,500);
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
    google.maps.event.addListener(marker, 'click', (function(marker,count) {
        return function() {
            var infowindow = new google.maps.InfoWindow();
            infowindow.setContent(fetchRecord(line));
            infowindow.open(bm2.map, marker);
        }
    })(marker,count));
}




