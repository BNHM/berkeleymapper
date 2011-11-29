var map;

function init() {
    //Creation of a custom panel with a ZoomBox control with the alwaysZoom option sets to true				
    OpenLayers.Control.CustomNavToolbar = OpenLayers.Class(OpenLayers.Control.Panel, {
	
        /**
				     * Constructor: OpenLayers.Control.NavToolbar 
				     * Add our two mousedefaults controls.
				     *
				     * Parameters:
				     * options - {Object} An optional object whose properties will be used
				     *     to extend the control.
				     */
        initialize: function(options) {
            OpenLayers.Control.Panel.prototype.initialize.apply(this, [options]);
            this.addControls([
                new OpenLayers.Control.Navigation(),
                //Here it come
                new OpenLayers.Control.ZoomBox({
                    alwaysZoom:true
                })
                ]);
            // To make the custom navtoolbar use the regular navtoolbar style
            this.displayClass = 'olControlNavToolbar'
        },
					
        /**
				     * Method: draw 
				     * calls the default draw, and then activates mouse defaults.
				     */
        draw: function() {
            var div = OpenLayers.Control.Panel.prototype.draw.apply(this, arguments);
            this.defaultControl = this.controls[0];
            return div;
        }
    });
				


    map = new OpenLayers.Map('map');
    map.addControl(new OpenLayers.Control.LayerSwitcher());
    
    var panel = new OpenLayers.Control.CustomNavToolbar();
    map.addControl(panel);

    var gphy = new OpenLayers.Layer.Google(
        "Google Physical",
        {
            type: google.maps.MapTypeId.TERRAIN
            }
        );
    var gmap = new OpenLayers.Layer.Google(
        "Google Streets", // the default
        {
            numZoomLevels: 20
        }
        );
    var ghyb = new OpenLayers.Layer.Google(
        "Google Hybrid",
        {
            type: google.maps.MapTypeId.HYBRID, 
            numZoomLevels: 20
        }
        );
    var gsat = new OpenLayers.Layer.Google(
        "Google Satellite",
        {
            type: google.maps.MapTypeId.SATELLITE, 
            numZoomLevels: 22
        }
        );


    var kml = new OpenLayers.Layer.Vector("Point Layer", {
        strategies: [new OpenLayers.Strategy.Fixed()],
        protocol: new OpenLayers.Protocol.HTTP({
            url: "kml/kmltest.kml",
            format: new OpenLayers.Format.KML({
                extractStyles: true, 
                extractAttributes: true,
                maxDepth: 2
            })
        })
    });

    kml.events.register("loadend", kml , function (e) {
        map.zoomToExtent(kml.getDataExtent());
    });

    var drg = new OpenLayers.Layer.WMS("Topo Maps",
        "http://msrmaps.com/ogcmap.ashx?",
        {
            layers: "DRG"
        });
    //var drg =  new OpenLayers.Layer.WMS("Topo", "http://msrmaps.com/ogcmap.ashx?", {layers: "DRG", format: "image/png"}, {isBaseLayer: true}, {"buffer": 1}); 

    map.addLayers([gphy, gmap, ghyb, gsat, drg, kml]);

    // Google.v3 uses EPSG:900913 as projection, so we have to
    // transform our coordinates
    //    map.setCenter(new OpenLayers.LonLat(10.2, 48.9).transform(
    //       new OpenLayers.Projection("EPSG:4326"),
    //      map.getProjectionObject()
    // ), 5);

    select = new OpenLayers.Control.SelectFeature(kml);
    kml.events.on({
        "featureselected": onFeatureSelect,
        "featureunselected": onFeatureUnselect
    });
    map.addControl(select);
    select.activate();    
}

function onPopupClose(evt) {
    select.unselectAll();
}
function onFeatureSelect(event) {
    var feature = event.feature;
    var selectedFeature = feature;
    var popup = new OpenLayers.Popup.FramedCloud("chicken", 
        feature.geometry.getBounds().getCenterLonLat(),
        new OpenLayers.Size(100,100),
        "<h2>"+feature.attributes.name + "</h2>" + feature.attributes.description,
        null, true, onPopupClose
        );
    feature.popup = popup;
    map.addPopup(popup);
}
function onFeatureUnselect(event) {
    var feature = event.feature;
    if(feature.popup) {
        map.removePopup(feature.popup);
        feature.popup.destroy();
        delete feature.popup;
    }
}
