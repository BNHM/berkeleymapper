
var map;
//var poly, map;
//var polyPath = new google.maps.MVCArray;
//var polyMarkers = [];
var overlays = []; // array of user-defined overlays
var overlayMarkers = []; // array of markers for user-defined overlays

function initialize() {
    
    // Initial State
    $("#leftnav").hide();

    map = getMap();
    
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
    // This is the KML Point file
    setKML('http://darwin.berkeley.edu/kmltest2.kml', map);

    // Setup Map type Options (add KML overlays to this??)
    setMapTypes(map);   
    
    // Control Panel pops over from left side
    var attControl = new PanelControl(document.createElement('DIV'), map);
    google.maps.event.addDomListener(attControl, 'click', function() {
        $("#leftnav").toggle("slide", {
            direction: "left"
        }, 1000, function() {
            google.maps.event.trigger(map, "resize");                        
        });                     
    });                   
    
    // Darwing Manager for Polygons and Circles
    var drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: true,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [
            google.maps.drawing.OverlayType.CIRCLE,
            google.maps.drawing.OverlayType.POLYLINE,
            google.maps.drawing.OverlayType.POLYGON
            ]
        },       
        polygonOptions: {
            fillColor: '#5555FF',
            fillOpacity: 0.5,
            strokeWeight: 3,
            clickable: true,
            editable: false,
            zIndex: 1
        }
    });
    drawingManager.setMap(map);
    
    google.maps.event.addDomListener(drawingManager, 'polylinecomplete', function(l) {
        overlays.push(l);
        index = overlays.length - 1;
        
        var lengthInMeters = Math.round(google.maps.geometry.spherical.computeLength(l.getPath()));
        var lengthInFeet = Math.round(lengthInMeters*3.2808399);
        var lengthInMiles = (lengthInFeet/5280).toFixed(4);

        var contentString = "<div id='content'>User Defined Polyline:" +
        "<br>Length in Meters: <i> " + lengthInMeters + " </i>" +
        "<br>Length in Feet: <i> " + lengthInFeet + " </i>" +
        "<br>Length in Miles: <i> " + lengthInMiles + " </i>" +
        "<br>---------------" +
        "<br><a href='#' id='delete' onclick='removeOverlay(" + index  + ");'>Delete Shape</a>" +
        "</div>";
    
        var marker = new google.maps.Marker({
            position: l.getBounds().getCenter(), 
            map: map,
            title:"User Polyline"
        }); 
        var infowindow = new google.maps.InfoWindow({            
            content: contentString
        });
            
        infowindow.open(map,marker);
        google.maps.event.addListener(marker, 'click', function() {            
            infowindow.open(map,marker);
        });
        
        drawingManager.setDrawingMode(null); // revert to normal map mode
        
        overlayMarkers.push(marker); 
    });
    
    google.maps.event.addDomListener(drawingManager, 'circlecomplete', function(c) {
        overlays.push(c);
        index = overlays.length - 1;
        var lat = c.getCenter().lat().toFixed(4);
        var lng = c.getCenter().lng().toFixed(4);
        var radius = Math.round(c.getRadius());
        var contentString = "<div id='content'>User Defined Point & Error Radius:" +
        "<br>Center: <i>" +lat +", " + lng + "</i>" +
        "<br>Error Radius In Meters: <i>" + radius + "</i>" +
        "<br>Text: <i>Generated visually in BerkeleyMapper</i>" + 
        "<br>---------------" +
        "<br><a href='#' id='callback' onclick='callbackPoint(" + index + ");'>Callback</a>" +
        "<br><a href='#' id='delete' onclick='removeOverlay(" + index  + ");'>Delete Shape</a>" +
        "</div>";
    
        var marker = new google.maps.Marker({
            position: c.getBounds().getCenter(), 
            map: map,
            title:"User Point & Error Radius"
        }); 
        var infowindow = new google.maps.InfoWindow({            
            content: contentString
        });
            
        infowindow.open(map,marker);
        google.maps.event.addListener(marker, 'click', function() {            
            infowindow.open(map,marker);
        });
        
        drawingManager.setDrawingMode(null); // revert to normal map mode
        
        overlayMarkers.push(marker); 
    });
        
    google.maps.event.addDomListener(drawingManager, 'polygoncomplete', function(p) {        
        overlays.push(p);        
        index = overlays.length - 1;
        
        var areaInSqMeters = Math.round(google.maps.geometry.spherical.computeArea(p.getPath()));
        var areaInAcres = Math.round(areaInSqMeters/4046.85642);
        var areaInSqMiles = (areaInSqMeters*0.000000386102159).toFixed(4);
                
        var contentString = "<div id='content'>Polygon statistics:" + 
        "<br>Sq Meters = " +areaInSqMeters  +
        "<br>Acres = " + areaInAcres +
        "<br>Sq Miles = " + areaInSqMiles +
        "<br>---------------" +
        "<br><a href='#' id='query' onclick='queryOverlay(" + index  + ");'>Query Points Inside</a>" +
        "<br><a href='#' id='delete' onclick='removeOverlay(" + index  + ");'>Delete Shape</a>" +
        "</div>";        

        var marker = new google.maps.Marker({
            position: p.getBounds().getCenter(), 
            map: map,
            title:"User Polygon"
        }); 
        var infowindow = new google.maps.InfoWindow({            
            content: contentString
        });
            
        infowindow.open(map,marker);
        google.maps.event.addListener(marker, 'click', function() {            
            infowindow.open(map,marker);
        });
        
        drawingManager.setDrawingMode(null); // revert to normal map mode
        
        overlayMarkers.push(marker);        
    });

}

// Construct the KMLFileName by calling the berkeleymapper service
function getKMLFileName(url) {
    tabfile = url.param("tabfile");
    protocol = url.attr('protocol');
    host = url.attr('host');
    port = url.attr('port');
    urlString = protocol + '://' + host + ':' + port + '/berkeleymapper/rest/v2/map';
    kmlfile = urlString + '?tabfile=' + tabfile;
    return kmlfile;
}


// set the KML file
function setKML(kmlfile, map) {
    var ptLayer = new google.maps.KmlLayer(kmlfile);
    ptLayer.setMap(map);
}

// Set the initial Map
function getMap(map) {
    var myOptions = {
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
    return new google.maps.Map(document.getElementById('map'), myOptions);
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
    //controlDiv.style.padding = '5px';
    
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