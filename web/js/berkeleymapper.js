var bm2 = {};
bm2.map;
bm2.overlays = [];          // overlays that the User has drawn
bm2.overlayMarkers = [];    // markers to click on for the overlays that user has drawn
bm2.markers = [];           // Point markers
bm2.circles = [];           // Error radius circles for point markers
bm2.kmlLayers = [];         // KML Layers (defined by config file)
bm2.pointMode = false;      // pointMode = true draws special features for pointMapping
bm2.session = "";           // Session string for communicating w/ server
bm2.urlRoot = "v2/";        // URL Root to use for all calls
bm2.mc = null;                     // markerCluster control variable
bm2.iw = null;
bm2.drawnMarkerImage = new google.maps.MarkerImage('img/marker-green.png');
bm2.bottomContainerText = "<center>Click on MarkerClusters or draw a polygon to query points</center>";

// Control the look and behaviour or the table grid
bm2.jqGridAttributes = {
    multiboxonly: true,
    emptyrecords: "No records to view",
    rowNum: 1000,
    altRows: true,
    scroll: true,
    height: "100%" ,
    onSelectRow: function(id){
        var lat = $('#flexme1').getCell(id, 'Latitude');
        var lng = $('#flexme1').getCell(id, 'Longitude');

        var latlng = new google.maps.LatLng(lat,lng);
        if (bm2.iw) {
            bm2.iw.close();
        }
        var columnNames = $("#flexme1").jqGrid('getGridParam','colNames');
        var rowData = "<div id='content'>";
        for (i=0; i < columnNames.length; i++) {
            cell = $("#flexme1").getCell(id, i);
            rowData += columnNames[i] + ":" + cell + "<br>";
        }
        rowData += "</div>";
        bm2.iw = new google.maps.InfoWindow();
        bm2.iw.setContent(rowData);
        bm2.iw.setPosition(latlng);
        bm2.iw.open(bm2.map);
   }
 };

$().ready(function() {
    $("#bigContainer").splitter({
        splitHorizontal: true,
        outline: true,
        resizeToWidth: true,
        cookie: "vsplitter"
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

// Initialize the Array of Available KML Layers
function  setKMLLayers() {
    if (!bm2.pointMode) {
        return false;
    }
     
    
    // Populate kmlLayers Array (loop json
    $.ajax({
        url: bm2.urlRoot + "kmllayers?session=" + bm2.session,
        async: false,
        success: function(data){
            count = 0;
            $.each(data, function() {
                var url, mode, title;

                var kmlObj = new Object();
                $.each(this, function(k, v) {
                    if (k == "url") kmlObj.key = v;
                    if (k == "visibility") kmlObj.visibility = v;   // visibile|hidden
                    if (k == "zoom") kmlObj.zoom = v;               // expand|ignore
                    if (k == "title") kmlObj.title = v;
                });
                // Set the google object
                kmlObj.google = new google.maps.KmlLayer(kmlObj.key, {preserveViewport:true});
                bm2.kmlLayers[count] = kmlObj;
                count++;
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

    // Loop through KML Layers Array and perform functions
    for ( i =0; i < bm2.kmlLayers.length; i++) {
        // default checbox state
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
        jQuery('<input />').change(function() {
            toggleLayer(this);
        }).attr({
            id: 'layerinput'+i,
            type: 'checkbox',
            style: 'float: left;',
            value: i,
            checked: checked
        }).appendTo('#container'+i);

        // Create Text
        jQuery('<div/>', {
            id: 'layertext'+i,
            style: 'float: left;',
            html: bm2.kmlLayers[i]['title'],
            onclick: 'kmlZoom('+i+');'
        }).appendTo('#container'+i);
        
          // Create Zoom Option
        jQuery('<div/>', {
            id: 'zoomlayertext'+i,
            style: 'float: left;',
            html: '&nbsp;(zoom)'
        }).appendTo('#container'+i);
        $('#zoomlayertext' + i).bind("click", {param1: i}, function(event) {
           kmlZoom(event.data.param1);
        });
        
        // set initial visibility
        if (bm2.kmlLayers[i]['visibility'] == 'visible') {
            bm2.kmlLayers[i]['google'].setMap(bm2.map);
        }
    }
}

// toggle visibility
function toggleLayer(cb) {
    if (cb.checked) {
        bm2.kmlLayers[cb.value]['google'].setMap(bm2.map);
    } else {
        bm2.kmlLayers[cb.value]['google'].setMap(null);
    }
}



// Control display of points
function pointDisplay(value) {   
    if (value == "markers") {
        setMarkersAndCirclesOn(false);
        $("#myColors").html("");
        setColors();
    } else if (value == "markersandcircles") {
        $("#myColors").html("");
        setColors();
        setMarkersAndCirclesOn(true); 
    } else if (value == "staticdots") {
        alert('not yet implemented');
    } else {
        $("#myColors").html("");
        setMarkerClustererOn(); 
    }                 
}

function initialize() {

    // pre-load cursor image so cursor doesn't appear on Mac Chrome
    imageObj = new Image();
    imageObj.src='http://maps.gstatic.com/mapfiles/openhand_8_8.cur';

    // Set pointMode
    if (jQuery.url.param('tabfile')) {
        bm2.pointMode = true;

        var configFile = "";
        if (jQuery.url.param('configfile')) {
            configFile += "&configfile=" + jQuery.url.param('configfile');
        }
        // Initialize Session
        $.ajax({
            url: bm2.urlRoot + "session?tabfile=" + jQuery.url.param('tabfile') + configFile,
            async: false,
            success: function(data) {
                bm2.session = data;
            },
            statusCode: {
                204: function() {
                    alert(url);
                    alert('Unable to set session on server.  Ensure tabfile & configfile locations are accessible and that the tmp directory on server is writeable.');
                    bm2.pointMode = false;
                }
            }
        });
    }
    // Initialize Map
    bm2.map = getMap();
    // Setup Map type Options (add KML overlays to this??)
    setMapTypes(bm2.map);
    if (bm2.pointMode) {
        // Draw KML Layers (lookup via service)
        if (configFile != "") {
            setKMLLayers();
        }
        // Draw the Points
        setJSONPoints();
        zoomPoints();
    }                     
    
    // Drawing Options
    initializeDrawingManager();
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
        success: function(data, success){
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
                $("#myColors").append("<div class='markerText'>" + label +"</div>");
                $("#myColors").append("<div style='clear:left;'>");

            });
        }
    });
}


function setJSONPoints() {
    var url = bm2.urlRoot + "allpoints?session=" + bm2.session;
    var bound = new google.maps.LatLngBounds();
    $.ajax({
        type: "GET",
        url: url,
        async: true,
        dataType: "json",
        success: function(data, success){
            count = 0;
            $.each(data, function() {
                var lat, lng, line, radius, markercolor = "";

                $.each(this, function(k, v) {
                    if (k == "lat") lat = v;
                    if (k == "lng") lng = v;
                    if (k == "line") line = v;
                    if (k == "radius") radius = v;
                    if (k == "color") markercolor = v;
                });

                var latlng = new google.maps.LatLng(lat,lng);

                if (markercolor == "") markercolor = "#FF0000";

                var marker = new StyledMarker({
                    styleIcon:  new StyledIcon(StyledIconTypes.MARKER,{color:markercolor}),
                    position: latlng,
                    map: bm2.map,
                    title:"point"
                });
                marker.line = line;
                marker.radius = radius;
                marker.color =  markercolor;

                google.maps.event.addListener(marker, 'click', (function(marker,count) {
                    return function() {
                        var infowindow = new google.maps.InfoWindow();
                        infowindow.setContent(fetchRecord(line));
                        infowindow.open(bm2.map,marker);
                    }
                })(marker,count));

                bm2.markers[count++]= marker;
                bound.extend(marker.getPosition());
            });

            bm2.map.fitBounds(bound);

            setMarkerClustererOn();
        }
    });
}

// Zoom to KML Layer
function kmlZoom(i) {
    bm2.map.fitBounds(bm2.kmlLayers[i]['google'].getDefaultViewport());
}

// Zoom to this set of points
function zoomPoints() {
    var bound = new google.maps.LatLngBounds();
    for (i in bm2.markers) {
        bound.extend(bm2.markers[i].getPosition());
    }            
    bm2.map.fitBounds(bound);
}

function fetchRecord(line) {
    var retStr = "";
    // Initialize Session
    $.ajax({
        url: bm2.urlRoot +  "records?session=" + bm2.session + "&line=" + line,
        async: false,
        success: function(data) {
            // Loop through JSON elements to construct response
            $.each(data, function() {
                retStr += "<div id='content'>";
                $.each(this, function(k, v) {
                    retStr +=  k + ": " + v + "<br>";
                });
                retStr += "</div>";
            });
        },
        statusCode: {
            204: function() {
                return "unable to fetch results for line "+ line;
            }
        }
    }); 
    return retStr;
}

function fetchRecords(polygon) {
    var retStr = "";
    // Initialize Session
    $.ajax({
        type: "POST",
        data: "session=" +bm2.session + "&polygon=" + polygon,
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
                        retStr += "<th width=80>" + k +  "</th>";
                        row++;
                    });
                }
            });
            retStr += "</tr></thead>";

            // Body elements
            retStr += "<tbody>";
            // Loop through JSON elements to construct response
            $.each(data, function() {
                //retStr += "<ul>";
                retStr += "<tr>";
                $.each(this, function(k, v) {
                    //retStr += "<li>" + k + ": " + v + "</li>";
                    retStr += "<td width=80>"  + htmlEntities(v) + "</td>";
                });
                //retStr += "</ul>";
                retStr += "</tr>";
            });
            retStr += "</tbody></table>";


        },
        statusCode: {
            204: function() {
                return "unable to fetch results for polygon";
            }
        }
    });

    $("#bottomContainer").html(retStr);
    setHorizontalPane();
    $(function () {
        tableToGrid("#flexme1", bm2.jqGridAttributes );
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
    }catch(err) {
        
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

function setMarkersAndCirclesOn(drawRadius) {
    clearAllMarkers();
    if (bm2.markers) {
        for (i in bm2.markers) {
            bm2.markers[i].setMap(bm2.map);
            // Add circle overlay and bind to marker
            if (drawRadius && bm2.markers[i].radius > 0) {
                var circle = new google.maps.Circle({
                    map: bm2.map,
                    radius: bm2.markers[i].radius,
                    fillColor: bm2.markers[i].color,
                    fillOpacity: 0.05,
                    strokeOpacity: 0.5,
                    strokeWidth: 1,
                    strokeColor: bm2.markers[i].color,
                    clickable: false
                });
                bm2.circles[count++] = circle;
                circle.bindTo('center', bm2.markers[i], 'position');
            }
        }
    }
}

function setMarkerClustererOn() {
    clearAllMarkers();
    //  mode = CLUSTERING;
    var mcOptions = {
        gridSize:25, 
        averageCenter:true, 
        title:"multiple markers",
        minimumClusterSize:1,
        zoomOnClick:false
    };
    bm2.mc = new MarkerClusterer(bm2.map,bm2.markers,mcOptions);
            
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
        polygon = "POLYGON ((" + lat2 + " " + lng2 + "," + lat1 + " " + lng2 + "," + lat1 + " " + lng1 + "," + lat2 + " " + lng1 + "," + lat2 + " " + lng2 + "))";

        fetchRecords(polygon);
    });
} 


// Set the initial Map
function getMap() {
    var myOptions;
    // Don't zoom/center if pointMode is true
    if (bm2.pointMode) {
        myOptions = {            
            mapTypeId: google.maps.MapTypeId.ROADMAP,        
            panControl: true,
            panControlOptions: {
                position: google.maps.ControlPosition.LEFT_TOP
            },
            zoomControl: true,
            zoomControlOptions: {
                position: google.maps.ControlPosition.LEFT_TOP
            }
        };
    } else {
        myOptions = {
            zoom: 2,
            center: new google.maps.LatLng(0,0),
            mapTypeId: google.maps.MapTypeId.ROADMAP,        
            panControl: true,
            panControlOptions: {
                position: google.maps.ControlPosition.LEFT_TOP
            },
            zoomControl: true,
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
function setMapTypes(pmap) {

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

    pmap.mapTypes.set('topo', topo);

    pmap.setOptions({
        mapTypeControl: true,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
            mapTypeIds: [google.maps.MapTypeId.ROADMAP,
            google.maps.MapTypeId.SATELLITE,
            google.maps.MapTypeId.HYBRID,
            google.maps.MapTypeId.TERRAIN,
            'topo']
        }
    });
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

    fetchRecords(polygon);
}

function callbackPoint(num) {
    alert("possible to send this data back to some calling application??");      
}

function setHorizontalPane() {
    var curr_height= $("#bottomContainer").height();
    if (curr_height < 200) {
        $("#bottomContainer").css("height", "200px");
        //$("#mapContainer").css("height", "80%");
    }
}

function htmlEntities(str) {
    //return escape(str);
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}