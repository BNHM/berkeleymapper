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
    drawnItems = L.featureGroup().addTo(bm2.map);
    bm2.map.addControl(new L.Control.Draw({
 	edit: {
            featureGroup: drawnItems,
            poly: {
                allowIntersection: false
            }
        },
        draw: {
            polygon: {
		metric: false,
                allowIntersection: false,
                showArea: true
            },
            polyline: {
		metric: false,
                showArea: true
	    }
        }
    }));

    bm2.map.on(L.Draw.Event.CREATED, function (event) {
        var layer = event.layer;
        var layerType = event.layerType;
	var contentString

	bm2.overlays.push(layer);
	index = bm2.overlays.length - 1;

        drawnItems.addLayer(layer);

	if (layerType == "polygon") {
	    var areaInSqMeters = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
 	    var areaInAcres = (areaInSqMeters/4046.85642).toFixed(2);
            var areaInSqMiles = (areaInSqMeters*0.000000386102159).toFixed(5);

            contentString = "<div id='content'>Polygon statistics:" +
        	"<br>Sq Meters = " +areaInSqMeters  +
        	"<br>Acres = " + areaInAcres +
        	"<br>Sq Miles = " + areaInSqMiles; 

	    // Offer query option
 	    if (bm2.pointMode) {
        	"<br>---------------";
	         contentString += "<br><a href='#' id='query' onclick='queryOverlay(" + index  + ");'>Query Points Inside</a>";
	    }
	} else if (layerType == "polyline") {
	    // Calculating the distance of the polyline
    	    var tempLatLng = null;
    	    var totalDistance = 0.00000;
    	    $.each(layer._latlngs, function(i, latlng){
        	if(tempLatLng == null){
            	    tempLatLng = latlng;
            	    return;
        	}

                totalDistance += tempLatLng.distanceTo(latlng);

                tempLatLng = latlng;
    	    });

	    var lengthInMeters = Math.round(totalDistance)
            var lengthInFeet = Math.round(lengthInMeters*3.2808399);
            var lengthInMiles = (lengthInFeet/5280).toFixed(4);

            var contentString = "<div id='content'>User Defined Polyline:" +
                "<br>Length in Meters: <i> " + lengthInMeters + " </i>" +
                "<br>Length in Feet: <i> " + lengthInFeet + " </i>" +
                "<br>Length in Miles: <i> " + lengthInMiles + " </i>"; 
	} else {
		contentString = 'Unknown geometry type'
	}

	contentString += "</div>";

	layer.bindPopup(contentString)
	layer.openPopup();
    });
}
