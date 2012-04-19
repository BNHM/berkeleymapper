var georefjs = new Object();                        // global variable for all things georef
georefjs.georefs = new Array();                     // Array to hold multiple georeferencing results

/**
 * Georef Object
 * @param decimalLatitude
 * @param decimalLongitude
 * @param coordinateUncertaintyInMeters
 * @param geodeticDatum
 * @param georeferenceProtocol
 * @param georeferenceRemarks
 */
function Georef(decimalLatitude, decimalLongitude, coordinateUncertaintyInMeters, geodeticDatum, georeferenceProtocol, georeferenceRemarks) {
    this.decimalLatitude = decimalLatitude;
    this.decimalLongitude = decimalLongitude;
    this.coordinateUncertaintyInMeters = coordinateUncertaintyInMeters;
    this.geodeticDatum = geodeticDatum;
    this.georeferenceProtocol = georeferenceProtocol;
    this.georeferenceRemarks = georeferenceRemarks;
    this.coordinatePrecision;             // not in use
    this.georeferencedBy;                 // not in use
    this.georeferencedDate;               // not in use
    this.georeferenceSources;             // not in use
    this.georeferenceVerificationStatus;  // not in use

    this.print = print;
    function print() {
        var resultsString = "";
        resultsString += "<p>" + this.decimalLatitude + "/" + this.decimalLongitude;
        resultsString += " (" + this.coordinateUncertaintyInMeters + " meter uncertainty)";
        resultsString += "<br>geodeticDatum=" + this.geodeticDatum;
        resultsString += "<br>georeferenceProtocol=" + this.georeferenceProtocol;
        resultsString += "<br>georeferenceRemarks=" + this.georeferenceRemarks;
        return resultsString;
    }
}

/**
 * Geoference using Google Services
 * @param s
 * @param callback
 */
function googleGeoref(s, callback) {
    var geocoder = new google.maps.Geocoder();
    if (geocoder) {
        geocoder.geocode({'address': s}, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                if (results[0]) {
                    // empty array before we populate it
                    georefjs.georefs.length = 0;
                    for (i = 0; i < results.length; i++) {
                        var georef = new Georef(
                            results[i].geometry.location.lat().toFixed(4),
                            results[i].geometry.location.lng().toFixed(4),
                            getRadiusFromViewPort(results[i].geometry.viewport),
                            "WGS84",
                            "Google Maps GeoCoding Service API v3",
                            "Google location_type is " + results[i].geometry.location_type
                        )
                        georefjs.georefs[i] = georef;
                    }
                    callback(georefjs.georefs);
                } else {
                    alert("No results found");
                }
            } else {
                alert("Geocoder failed due to: " + status);
            }
        });
    }
}

/**
 *  Determine coordinateUncertaintyInMeters from viewport
 * @param viewport
 */
function getRadiusFromViewPort(viewport) {
    center = viewport.getCenter();
    ne = viewport.getNorthEast();
    return Math.round(google.maps.geometry.spherical.computeDistanceBetween(center, ne));
}

/**
 * Need BG single georeference web-service to return JSONP to get around cross-domain scripting limitations here
 * @param s
 * @param callback
 */
function bgGeoref(s, callback) {
    //http://bg.berkeley.edu:8080/ws/single?locality=Santa%20Cruz,CA
     /*
        var xmlhttp;
        if (window.XMLHttpRequest) {// code for IE7+, Firefox, Chrome, Opera, Safari
            xmlhttp = new XMLHttpRequest();
        }
        else {// code for IE6, IE5
            xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        }
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
               alert(xmlhttp.responseText);
                // Insert here assignments from XML to georef object variables
            }
        }
        xmlhttp.open("GET", "http://bg.berkeley.edu:8080/ws/single?locality=" + s, true);
        xmlhttp.send();
    */
}

