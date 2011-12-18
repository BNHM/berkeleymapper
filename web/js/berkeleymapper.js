
var map;
var overlays = []; // array of user-defined overlays
var overlayMarkers = []; // array of markers for user-defined overlays
var markers = [];   // array of markers
var circles = [];   // array of circles


var query = $.parseQuery();
var tabfile = query.tabfile;
var pointMode = false;

var kmlLayer;        // KML Layer
var session = "";
//var urlRoot = "/berkeleymapper/v2/";    // When deployment target is exposed
//var urlRoot = "/v2/";                   // When this is proxied

var urlRoot = "v2/";                        // This one may not matter
var mc;
var NONE = 0;
var CLUSTERING = 1;
var MARKERS = 2;
var mode = NONE;


// subclass of Marker
BMMarker.prototype = new google.maps.Marker();
BMMarker.prototype.remove = function() { this.setMap(null); }

function BMMarker(opts,lineNumber,radius) {
    this.setValues(opts);
    this.lineNumber = lineNumber;
    this.radius = radius;
}

function  setKMLLayer(a) {
    if (null != kmlLayer) {
        kmlLayer.setMap(null);
    }
    kmlLayer = new google.maps.KmlLayer(a);
    kmlLayer.setMap(map);
}

function initialize() {
    
    // Hide Left Panel
    $("#leftnav").hide();

    // Set pointMode
    if (jQuery.url.param('tabfile')) {
        pointMode = true;

        var configFile = "";
        if (jQuery.url.param('configfile')) {
                configFile += "&configfile=" + jQuery.url.param('configfile');
        }
        // Initialize Session
        $.ajax({
            url: urlRoot + "session?tabfile=" + jQuery.url.param('tabfile') + configFile,
            async: false,
            success: function(data) {
                session = data;
            },
            statusCode: {
                204: function() {
                    alert('Unable to set session on server.');
                    pointMode = false;
                }
            }
        });
    }
    // Initialize Map
    map = getMap();

    // Setup Map type Options (add KML overlays to this??)
    setMapTypes(map);
        
    
    if (pointMode) {
        setJSONPoints(session);
        // Control Panel pops over from left side
        
        var attControl = new PanelControl(document.createElement('DIV'), map);
        google.maps.event.addDomListener(attControl, 'click', function() {
            $("#leftnav").toggle("slide", {
                direction: "left"
            }, 1000, function() {
                google.maps.event.trigger(map, "resize");                        
            });                     
        });     
    }                     
    
    // Drawing Options
    initializeDrawingManager();

    // Draw KML Layer (if exists)
    setKMLLayer("http://kml-samples.googlecode.com/svn/trunk/kml/misc/thematic1/states.kml");
}

function setJSONPoints(session) {
    var url = urlRoot + "allpoints?session=" + session;
    var bound = new google.maps.LatLngBounds();
    $.ajax({
        type: "GET",
        url: url,        
        dataType: "json",
        success: function(data, success){
            count = 0;
            $.each(data, function() {
                var lat, lng, line, radius;
                
                $.each(this, function(k, v) {
                    if (k == "lat") lat = v;
                    if (k == "lng") lng = v;
                    if (k == "line") line = v;
                    if (k == "radius") radius = v;                                       
                });
                
                var latlng = new google.maps.LatLng(lat,lng);
                    
                var marker = new BMMarker({
                    position: latlng,
                    map: map,
                    title:"point"
                },line,radius);

                google.maps.event.addListener(marker, 'click', (function(marker,count) {
                    return function() {
                        var infowindow = new google.maps.InfoWindow();
                        infowindow.setContent(fetchRecord(line));
                        infowindow.open(map,marker);
                    }
                })(marker,count));

                markers[count++]= marker;
                bound.extend(marker.getPosition());
            }); 
            
            map.fitBounds(bound);

            setMarkerClustererOn();
        }  
    }); 
}

function fetchRecord(line) {
    var retStr = "";
    // Initialize Session
    $.ajax({
        url: urlRoot +  "records?session=" + session + "&line=" + line,
        async: false,
        success: function(data) {
            // Loop through JSON elements to construct response
            $.each(data, function() {
                retStr += "<ul>";
                $.each(this, function(k, v) {
                    retStr += "<li>" + k + ": " + v + "</li>";
                });
                retStr += "</ul>";
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

function fetchRecords(session, polygon) {
    var retStr = "";
    // Initialize Session
    $.ajax({
        type: "POST",
        data: "session=" +session + "&polygon=" + polygon,
        url: urlRoot + "records",
        async: false,
        success: function(data) {
            // Loop through JSON elements to construct response
            $.each(data, function() {
                retStr += "<ul>";
                $.each(this, function(k, v) {
                    retStr += "<li>" + k + ": " + v + "</li>";
                });
                retStr += "</ul>";
            });
        },
        statusCode: {
            204: function() {
                return "unable to fetch results for polygon";
            }
        }
    }); 
    return retStr;
}

// clears All markers
function clearAllMarkers() {
    if (mode == CLUSTERING) mc.clearMarkers();
    if (mode == MARKERS) {
        for (i in markers) {
            markers[i].setMap(null);
        }
        for (i in circles) {
            circles[i].setMap(null);
        }
    }
    // clear Left Nav
    $("#resultPoints").html("");
}

function setMarkersAndCirclesOn(drawRadius) {
    clearAllMarkers();
    mode = MARKERS;
    if (markers) {
        for (i in markers) {
            markers[i].setMap(map);
            // Add circle overlay and bind to marker
            if (drawRadius && markers[i].radius > 0) {
                var circle = new google.maps.Circle({
                    map: map,
                    radius: markers[i].radius,
                    fillColor: '#AA0000'
                });
                circles[count++] = circle;
                circle.bindTo('center', markers[i], 'position');
            }
        }
    }
}

function setMarkerClustererOn() {
    clearAllMarkers();
    mode = CLUSTERING;
    var mcOptions = {
        gridSize:25, 
        averageCenter:true, 
        title:"multiple markers",
        minimumClusterSize:1,
        zoomOnClick:false
    };
    mc = new MarkerClusterer(map,markers,mcOptions);
            
    google.maps.event.addListener(mc, 'click', function (c) {
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

        $("#leftnav").show();
        $("#resultPoints").html(fetchRecords(session, polygon));
    });
} 


// Set the initial Map
function getMap() {
    var myOptions;
    // Don't zoom/center if pointMode is true
    if (pointMode) {    
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
    
    map = new google.maps.Map(document.getElementById('map'), myOptions);
    
    map.enableKeyDragZoom({
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
    
    return map;
}

// mapTypes DropDown
function setMapTypes(map) {

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

    map.mapTypes.set('topo', topo);

    map.setOptions({
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

function PanelControl(controlDiv, map) {    
    controlDiv.index = -1;  // value of -1 supersedes control position of others
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(controlDiv);
    var controlUI = document.createElement('DIV');
    controlUI.style.cursor = 'pointer';
    controlUI.style.backgroundImage = 'url(img/left-right.gif)';
    controlUI.title = 'Show/Hide Panel';
    controlUI.style.width = '29px';
    controlUI.style.height = '20px'; 
    
    controlDiv.appendChild(controlUI);
    
    return controlUI;
}

function NewControl(controlDiv, map, title, alt) {
   
    controlDiv.style.padding = '5px';
    controlDiv.index = 1;
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(controlDiv);


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

if (!google.maps.Polyline.prototype.getBounds) {
    google.maps.Polyline.prototype.getBounds = function(latLng) {
        var bounds = new google.maps.LatLngBounds();        
        this.getPath().forEach(function(e) {
            bounds.extend(e);
        });
        return bounds;                  
    }
}

function removeOverlay(num) {
    overlays[num].setMap(null);
    overlayMarkers[num].setMap(null);
}

function queryOverlay(num) {
    var path = overlays[num].getPath();
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
    
    $("#leftnav").show();
    $("#resultPoints").html(fetchRecords(session, polygon));
}

function callbackPoint(num) {
    alert("possible to send this data back to some calling application??");      
}