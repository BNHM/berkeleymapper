function initializeDrawingManager() {
    // Drawing Manager/ Lines / Error Radii / Polygons
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
        // use 5 decimal places for approx 1 meter accuracy
        var lat = c.getCenter().lat().toFixed(5);
        var lng = c.getCenter().lng().toFixed(5);
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
        var areaInSqMiles = (areaInSqMeters*0.000000386102159).toFixed(5);
                
        var contentString = "<div id='content'>Polygon statistics:" + 
        "<br>Sq Meters = " +areaInSqMeters  +
        "<br>Acres = " + areaInAcres +
        "<br>Sq Miles = " + areaInSqMiles +
        "<br>---------------";
        
        if (pointMode) {
            contentString += "<br><a href='#' id='query' onclick='queryOverlay(" + index  + ");'>Query Points Inside</a>";
        }
        
        contentString += "<br><a href='#' id='delete' onclick='removeOverlay(" + index  + ");'>Delete Shape</a>" +
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