function initialize() {
    var map = getMap();
    //setKML(getKMLFileName(jQuery.url),map);
    setKML('http://darwin.berkeley.edu/kmltest2.kml', map);
    setMapTypes(map);
    setControl("Services",map);
    //setControl("Points",map);
    //setControl("Layers",map);
    //setControl("Download",map);
    //setControl("Map",map);

}

// Set a Control, must be defined as a div tag on page
function setControl(name, map) {
    var customMapControls = document.createElement('div');
    var customControlDiv = document.getElementById(name).innerHTML;
    customMapControls.innerHTML = customControlDiv;
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(customMapControls);
    google.maps.event.addDomListener(customMapControls, 'click', function() {
        $('div.showhide,#'+name+'Box').toggle();
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
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    return new google.maps.Map(document.getElementById('map_canvas'), myOptions);
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
