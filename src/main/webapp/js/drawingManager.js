bm2.drawingManager;

// hide drawingManager Tool
function drawingManagerHide(){
    bm2.drawingManager.setOptions({
        drawingControl: false
    });
}

// show drawingManager Tool
function drawingManagerShow() {
    bm2.drawingManager.setOptions({
        drawingControl: true
    });
}

function initializeDrawingManager() {
    // Drawing Manager/ Lines / Error Radii / Polygons
     bm2.drawingManager = new google.maps.drawing.DrawingManager({
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
    bm2.drawingManager.setMap(bm2.map);
    
    google.maps.event.addDomListener(bm2.drawingManager, 'polylinecomplete', function(l) {
        bm2.overlays.push(l);
        index = bm2.overlays.length - 1;
        
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
            icon: bm2.drawnMarkerImage,
            position: l.getBounds().getCenter(), 
            map: bm2.map,
            title:"User Polyline"
        }); 
        var infowindow = new google.maps.InfoWindow({            
            content: contentString
        });
            
        infowindow.open(bm2.map,marker);
        google.maps.event.addListener(marker, 'click', function() {            
            infowindow.open(bm2.map,marker);
        });
        
        bm2.drawingManager.setDrawingMode(null); // revert to normal map mode
        
        bm2.overlayMarkers.push(marker);
    });

    // Generate RDFa content for defining a coordinate
    google.maps.event.addDomListener(bm2.drawingManager, 'circlecomplete', function(c) {
        bm2.overlays.push(c);
        index = bm2.overlays.length - 1;
        // use 5 decimal places for approx 1 meter accuracy
        var lat = c.getCenter().lat().toFixed(5);
        var lng = c.getCenter().lng().toFixed(5);
        var radius = Math.round(c.getRadius());
        var locality = $("#address").val();
        var aboutID = "geo:"+lat+","+lng+";u="+radius+";crs=WGS84";
        var contentString = "<div " +
            "id=\"content\" about=\"" + aboutID + "\" typeof=\"http://purl.org/dc/terms/Location\">";
        //contentString += "<li>Locality: <span property=\"http://rs.tdwg.org/dwc/terms/locality\">" + locality+ "</span></li>";
        contentString += "<li>Coordinate: " +
                "<span property=\"http://rs.tdwg.org/dwc/terms/decimalLatitude\">" + lat +  "</span>" +
                " / " +
                "<span property=\"http://rs.tdwg.org/dwc/terms/decimalLongitude\">" + lng + "</span>" +
                " (<span property=\"http://rs.tdwg.org/dwc/terms/coordinateUncertaintyInMeters\">" + radius + "</span> meters radius)</li>" +
            "<li>Datum: <span property=\"http://rs.tdwg.org/dwc/terms/geodeticDatum\">WGS84</span></li>" +
            "<li>Protocol: <span property=\"http://rs.tdwg.org/dwc/terms/georeferenceProtocol\">Generated Visually in BerkeleyMapper</span></li>" +
        "</div>" +
        "<a href='#' id='delete' onclick='removeOverlay(" + index  + ");'>Delete Shape</a>";

        var marker = new google.maps.Marker({
            icon: bm2.drawnMarkerImage,
            position: c.getBounds().getCenter(), 
            map: bm2.map,
            title:"User Point & Error Radius"
        }); 
        var infowindow = new google.maps.InfoWindow({            
            content: contentString
        });
            
        infowindow.open(bm2.map,marker);
        google.maps.event.addListener(marker, 'click', function() {            
            infowindow.open(bm2.map,marker);
        });
        
        bm2.drawingManager.setDrawingMode(null); // revert to normal map mode
        
        bm2.overlayMarkers.push(marker);
    });
        
    google.maps.event.addDomListener(bm2.drawingManager, 'polygoncomplete', function(p) {
        bm2.overlays.push(p);
        index = bm2.overlays.length - 1;
        
        var areaInSqMeters = Math.round(google.maps.geometry.spherical.computeArea(p.getPath()));
        var areaInAcres = (areaInSqMeters/4046.85642).toFixed(2);
        var areaInSqMiles = (areaInSqMeters*0.000000386102159).toFixed(5);
                
        var contentString = "<div id='content'>Polygon statistics:" + 
        "<br>Sq Meters = " +areaInSqMeters  +
        "<br>Acres = " + areaInAcres +
        "<br>Sq Miles = " + areaInSqMiles +
        "<br>---------------";
        
        if (bm2.pointMode) {
            contentString += "<br><a href='#' id='query' onclick='queryOverlay(" + index  + ");'>Query Points Inside</a>";
        }
        
        contentString += "<br><a href='#' id='delete' onclick='removeOverlay(" + index  + ");'>Delete Shape</a>" +
        "</div>";        

        var marker = new google.maps.Marker({
            icon: bm2.drawnMarkerImage,
            position: p.getBounds().getCenter(), 
            map: bm2.map,
            title:"User Polygon"
        }); 
        var infowindow = new google.maps.InfoWindow({            
            content: contentString
        });
            
        infowindow.open(bm2.map,marker);
        google.maps.event.addListener(marker, 'click', function() {            
            infowindow.open(bm2.map,marker);
        });
        
        bm2.drawingManager.setDrawingMode(null); // revert to normal map mode
        
        bm2.overlayMarkers.push(marker);
    });

}
