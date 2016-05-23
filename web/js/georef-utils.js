// Remove a particulare georeference
function removeGeoref(num) {
    bm2.georefMarkers[num].setMap(null);
    bm2.georefCircles[num].setMap(null);
}

// Remove other georeferences
function removeOtherGeoref(num) {
    for (i = 0; i < bm2.georefMarkers.length; i++) {
        if (i!=num) {
            bm2.georefMarkers[i].setMap(null);
            bm2.georefCircles[i].setMap(null);
        }
    }
    // Now completely empty array and reinitialize with just the one we want.
   /* bm2.georefMarkers = [bm2.georefMarkers[num]];
    bm2.georefCircles = [bm2.georefCircles[num]];
    bm2.georefMarkers[0].setMap(bm2.map);
    bm2.georefCircles[0].setMap(bm2.map);
    */
}

// Zoom into one of the georeferenced localities
function zoomToGeoref(num) {
    var bounds = new google.maps.LatLngBounds();
    var b = bm2.georefCircles[num].getBounds();
    bounds.extend(b.getNorthEast());
    bounds.extend(b.getSouthWest());
    bm2.map.fitBounds(bounds);
}

// Assign content to a particular marker
function georefMarkerAssignment(marker,content) {
    var infowindow = new google.maps.InfoWindow();
    infowindow.setContent(content);

    google.maps.event.addListener(marker, 'click', function() {
        infowindow.open(bm2.map,marker);
    });
}

// Georeference an address
function codeAddress(address) {
    googleGeoref(address, function(georefs) {
        var bounds = new google.maps.LatLngBounds();

        for (i = 0; i < georefs.length; i++) {
            var index = bm2.georefMarkers.length;
            var location = new google.maps.LatLng(georefs[i].decimalLatitude,georefs[i].decimalLongitude)
            var radius = georefs[i].coordinateUncertaintyInMeters;


            bm2.map.setCenter(location);

            var georefMarker = new google.maps.Marker ({
                position: location,
                map: bm2.map,
                title:address
            });

            var content = address + "<br>" + georefs[i].print();
            content += "<p><a href='#' id='delete' onclick='removeGeoref(" + index  + ");'>Delete This</a>";
            content += " | <a href='#' id='deleteothers' onclick='removeOtherGeoref(" + index  + ");'>Delete Others</a>";
            content += " | <a href='#' id='zoomto' onclick='zoomToGeoref(" + index  + ");'>Zoom In</a>";

             georefMarkerAssignment(georefMarker,content);

            // Add circle overlay and bind to marker
            var georefCircle = new google.maps.Circle({
                map: bm2.map,
                radius: radius,
                fillColor: "#ff00dd",
                fillOpacity: 0.05,
                strokeOpacity: 0.5,
                strokeWidth: 1,
                strokeColor: "#ff00dd",
                clickable: false
            });
            georefCircle.bindTo('center', georefMarker, 'position');

            bm2.georefCircles.push(georefCircle);
            bm2.georefMarkers.push(georefMarker);
            georefMarker.setMap(bm2.map);

        }

        // Update the bounds based on all visible markers and their radii
        for (var i = 0; i < bm2.georefMarkers.length; i++) {
            if (bm2.georefMarkers[i].getVisible()) {
                var b = bm2.georefCircles[i].getBounds();
                bounds.extend(b.getNorthEast());
                bounds.extend(b.getSouthWest());
            }

        }
        bm2.map.fitBounds(bounds);
    });

}
