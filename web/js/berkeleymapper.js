


function initialize() {
    
    // Initial State
$("#leftnav").hide();

    var map = getMap();
    //setKML(getKMLFileName(jQuery.url),map);
    setKML('http://darwin.berkeley.edu/kmltest2.kml', map);
    setMapTypes(map);   
    
    // Attributes Control
    var attControl = new NewControl(document.createElement('DIV'), map,'Attributes','Click to Toggle Attributes Visibility');
    google.maps.event.addDomListener(attControl, 'click', function() {
        $("#leftnav").toggle("slide", {
            direction: "left"
        }, 1000, function() {
            google.maps.event.trigger(map, "resize");

        });
              
    });
  
    // Options Control
    //var resControl = new NewControl(document.createElement('DIV'), map,'Resize','Click to Manually Resize Map');
   // google.maps.event.addDomListener(resControl, 'click', function() {
   //     google.maps.event.trigger(map, "resize");
   // });

  
//setControl("Services",map);
//setControl("Points",map);
//setControl("Layers",map);
//setControl("Download",map);
//setControl("Map",map);

}

// Set a Control, must be defined as a div tag on page
/*
function setControl(name, map) {
    var customMapControls = document.createElement('div');
    var customControlDiv = document.getElementById(name).innerHTML;
    customMapControls.innerHTML = customControlDiv;
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(customMapControls);
    google.maps.event.addDomListener(customMapControls, 'click', function() {        
        //$('div.showhide,#'+name+'Box').show();
        $('div.showhide,#slider').hide();
    }); 
 */
    
/*var customMapControls2 = document.createElement('div');
    var customControlDiv2 = document.getElementById('button').innerHTML;
    customMapControls2.innerHTML = customControlDiv2;
     google.maps.event.addDomListener(document.getElementById('button'), 'click', function() {
alert('foodad');
  });
}
*/

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


function NewControl(controlDiv, map, title, alt) {

    // Set CSS styles for the DIV containing the control
    // Setting padding to 5 px will offset the control
    // from the edge of the map
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
