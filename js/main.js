//Final Project for UW-Madison's GEOG 575 Interactive Cartography & Visualiztion
// Nathalia Roberts, Spring 2018.

$(document).ready(createMap);

//function to instantiate the Leaflet map
function createMap(){

  var mbAttr = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
  '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' + '<a href="https://www.oaklandca.gov/departments/transportation">Oakland Department of Transportation</a>, ' +
  'Imagery © <a href="http://mapbox.com">Mapbox</a>';
  //mbUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

      //mapbox streets and Imagery layer
    var streets = L.tileLayer('https://api.mapbox.com/styles/v1/njroberts/cje9kcruv1hkq2rlmm35m56xx/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoibmpyb2JlcnRzIiwiYSI6ImNqNzExcWxsZDAwZWYyd213cWtibGN2cTkifQ.HjVFYKPHguKbs5nZCqL_dg', {
        id: 'mapbox.streets', attribution: mbAttr }), //'&copy; <a href="http://www.mapbox.com">Mapbox</a>'
        imagery = L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v9/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoibmpyb2JlcnRzIiwiYSI6ImNqNzExcWxsZDAwZWYyd213cWtibGN2cTkifQ.HjVFYKPHguKbs5nZCqL_dg', {
        id: 'mapbox.imagery', attribution: mbAttr});

    //create the map, set map focus and default layer when loading
    var map = L.map('mapid', {
        center: [37.805, -122.27], // center on city of Oakland
        zoom: 17,
        minZoom: 13,
        layers: [streets]
    });

    var meters = new L.geoJson().addTo(map);
    var pOccupancy = new L.geoJson().addTo(map);

    //call Data functions
    getOccupancy(map, meters, pOccupancy);
    getMeters(map, meters, pOccupancy);

    // Text for Layer toggle
    var baseLayers = {
      "Imagery": imagery,
      "Streets": streets
    };

    var overlays = {
      'Parking Meters' : meters,
      'Parking Occupancy': pOccupancy
    };

    $('#showSplash').hide();
    $('#splash').click(function() {
      $('#showSplash').show();
      $('#splash').hide();
    });
    $('#showSplash').click(function(){
      $('#splash').show();
      $('#showSplash').hide();
    });

    L.control.layers(baseLayers, overlays).addTo(map);
    return map;
};


//Import GeoJSON data using ajax and JQuery. Symbolize Block faces
function getOccupancy(map, meters, pOccupancy){
    //load the data
    $.ajax("data/parkingOccupancy.geojson", {
        dataType: "json",
        success: function(response){
          //create an attributes array
          //var attributes = processData(response);

          L.geoJson (response, {
              style: function(features){
                switch (features.properties.COLOR){
                  case '#6cab45': return {color : '#6cab45'};
                  case '#face1d': return {color : '#face1d'};
                  case '#e3282e': return {color : '#e3282e'};
                  case '#000000': return {color : '#000'};
                }
              }
          }).addTo(pOccupancy);

        }
    });
};

//Import GeoJSON data using ajax and JQuery
function getMeters(map, meters, pOccupancy){
    //load the data
    $.ajax("data/Meters.geojson", {
        dataType: "json",
        success: function(response){
          //create an attributes array
    var attributes = processData(response);

    //call function to create proportional symbols
    createPropSymbols(response, meters, attributes);
    createSequenceControls(meters, map, attributes);

        }
    });
};

function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("Q") > -1){
            attributes.push(attribute);
        };
    };

    //check result
    //console.log(attributes);
    //console.log(properties);
    return attributes;
};

//Add circle markers for point features to the map
function createPropSymbols(data, meters, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
      pointToLayer: function(feature, latlng){
          return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(meters);
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];
    //console.log(attribute);

    //create marker options
    var options = {
        radius: 2.5,
        fillColor: "#ff7800",
        color: "#FFF",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

     //event listeners to open popup on hover
     layer.on({
         mouseover: function(){
             this.openPopup();
         },
         mouseout: function(){
             this.closePopup();
         }
     });

     createPopup(feature.properties, attribute, layer, options.radius);

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = .25;
    //area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);
    return radius;
};

//Step 1: Create new sequence controls
function createSequenceControls(map, meters, attributes){
    var SequenceControl = L.Control.extend({
      options: {
        position: 'bottomleft'
      },
      onAdd: function (map){
        // create the control container div with a
        var container = L.DomUtil.create('div', 'sequence-control-container');

        //create range input element (slider)
        $(container).append('<input class="range-slider" type="range">');
        //skip buttons
        $(container).append('<button class="skip" id="reverse">Reverse</button>');
        $(container).append('<button class="skip" id="forward">Skip</button>');

        //kill any mouse even listeners on the map
        $(container).on('mousedown dblclick', function(e){
          L.DomEvent.stopPropagation(e);
        });
        return container;
      }
    });
    createTemporalLegend(meters, map, attributes[0]);
    meters.addControl(new SequenceControl());

        //Below Example 3.5...replace button content with images
    $('#reverse').html('<img src="img/reverse.png">');
    $('#forward').html('<img src="img/forward.png">');

    //set slider attributes
    $('.range-slider').attr({
    max: 7,
    min: 0,
    value: 0,
    step: 1
    });

    //click listener for buttons
    $('.skip').click(function(){
      //get the old index value
     var index = $('.range-slider').val();

     // increment or decrement depending on button clicked
     if ($(this).attr('id') == 'forward'){
         index++;
         // if past the last attribute, wrap around to first attribute
         index = index > 7 ? 0 : index;
     } else if ($(this).attr('id') == 'reverse'){
         index--;
         //if past the first attribute, wrap around to last attribute
         index = index < 0 ? 7 : index;
     };

     // update slider
     $('.range-slider').val(index);
     updatePropSymbols(meters, map, attributes[index]);

    });

    //input listener for slider
    $('.range-slider').on('input', function(){
      // get new index value
      var index = $(this).val();
      updatePropSymbols(meters, map, attributes[index]);

    });
};

//Resize proportional symbols according to new attribute values
function updatePropSymbols(meters, map, attribute){
    meters.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //update the layer style and popup
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //call createPopup
            createPopup(props, attribute, layer, radius);
            updateLegend(meters, map, attribute);

        };
    });
};

function createPopup(properties, attribute, layer, radius){
      //add city to popup content string
      var popupContent = "<p><b>Pole:</b> " + properties.Pole + "</p>" +"<p><b>Meter Type:</b> " + properties.Meter_Type + "</p>";

      //add formatted attribute to panel content string
      var year = attribute.split("F")[1];
      popupContent += "<p><b>Revenue for " + year + ": $</b>" + properties[attribute] + "</p>";


      //replace the layer popup
      layer.bindPopup(popupContent, {
          offset: new L.Point(0,-radius)
      });
};

function createTemporalLegend(meters, map, attributes){
    var LegendControl = L.Control.extend({
        options:{
            position: 'bottomright'
        },

        onAdd: function (meters) {
            // create the control container with a particular class name
            var timestamp = L.DomUtil.create('div', 'timestamp-container');
            $(timestamp).append('<div id="timestamp-container">');
            return timestamp;
        }
    });
    meters.addControl(new LegendControl());
    updateLegend(meters, map, attributes);
};

function updateLegend(meters, map, attribute){
    var period = attribute.split("F")[1];
    var content = "Period: " + period;
    $(".timestamp-container").text(content);
};
