
var map;
var overlays = []; // array of user-defined overlays
var overlayMarkers = []; // array of markers for user-defined overlays

var query = $.parseQuery();
var tabfile = query.tabfile;
var pointMode = new Boolean(0);

var ptLayer;

function initialize() {
    
    // Initial State
    $("#leftnav").hide();

    if (jQuery.url.param('tabfile')) {
        pointMode = new Boolean(1);
    }
    map = getMap();

    // Setup Map type Options (add KML overlays to this??)
    setMapTypes(map);
    
    // Point File Management
    kmlfileName= getKMLFileName("default");
    // uncomment this line for local testing (Enables Google to find SOME KML file)
    kmlfileName = 'http://darwin.berkeley.edu/kmltest2.kml';
    
    
    if (kmlfileName != null) {
        setKMLLayer(kmlfileName);                                                
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
}

function  setKMLLayer(a) {
    if (null != ptLayer) {
        ptLayer.setMap(null);
    }
    ptLayer = new google.maps.KmlLayer(a);
    ptLayer.setMap(map);
}

// Construct the KMLFileName by calling the berkeleymapper service
function getKMLFileName(option) {
    if (jQuery.url.param("tabfile")) {
        tabfile = jQuery.url.param("tabfile");
    } else {
        return null;
    }
    protocol = jQuery.url.attr('protocol') + '://';
    if (jQuery.url.attr('host') != null) {
        host = jQuery.url.attr('host'); 
    } else {
        return null;
    }
    if (jQuery.url.attr('port') != null) {
        port = ':' + jQuery.url.attr('port');
    } else {
        port = '';
    }
    urlString = protocol + host + port + '/berkeleymapper/rest/v2/map';
    kmlfile = urlString + '?tabfile=' + tabfile + "&option=" + option;
    return kmlfile;
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
    var encoded = google.maps.geometry.encoding.encodePath(overlays[num].getPath());
    alert("send to server following encoding and query it: " + encoded );      
}
function callbackPoint(num) {
    alert("possible to send this data back to some calling application??");      
}