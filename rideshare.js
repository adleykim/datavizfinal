let boroURL = 'https://data.cityofnewyork.us/api/geospatial/tqmj-j8zm?method=export&format=GeoJSON',
    pathURL = '/data/vehicle_paths_small.csv';

Promise.all([d3.json(boroURL), d3.csv(pathURL)])
      .then(createViz);

let cars, carData;
let times;
let path;
let geoCarData = [];

function createViz(allData) {

  let viz = document.getElementById('viz'),
      width = window.innerWidth,
      height = window.innerHeight,
      size = d3.min([width, height]);

  let boroData = allData[0]; //basemap

      carData = d3.nest() //nest data by vehicle
                  .key(d => { return d.Vehicle_ID; })
                  .entries(allData[1])
                  .sort(d3.ascending);

  carData.forEach(d => {
    dGeo = makeGeo(d);
    geoCarData.push(dGeo);
  });

  console.log("geoCarData", geoCarData);

  times = d3.map(allData[1], d => { return d.Timestamp ; }) //times in seconds
                .keys()
                .sort(d3.ascending);

  let svg = d3.select("svg") //initialize svg element
              .attr("width", "100%")
              .attr("height", "100%"),
      projection = d3.geoMercator() //project to Mercator
                      .scale(200 * size) //scale to window size
                      .center([-73.9654, 40.7829]) //center on Manhattan
                      .translate([width/2, height/2]); //translate to viz element center
      path = d3.geoPath()
                .projection(projection)
                .pointRadius(2); //set radius of point markers
    let  basemap = svg.append("g")  //basemap of NYC boroughs
                .selectAll("path")
                .data(boroData.features)
                .join("path")
                  .attr("class", "boro")
                  .attr("id", d => { return d.properties.boro_name; })
                  .attr("d", path);

  cars = svg.append("g") //initialize cars group
            .attr("class", "cars");

  //timestamp label
  infoLab = svg.append("text")
                    .attr("class", "info-label")
                    .attr("transform", "translate(100,100)");

  cars.selectAll(".car")
      .data(geoCarData[0].features)
      .join("path")
      .attr("d", path)
      .attr("class", d => { return "car " + d.properties.status; })
      .attr("id", d => { return d.properties.id; });

 loopCars();

}; //end of createViz function

function transition(path) {
  paths.transition()
      .duration(3000)
      .attrTween("stroke-dasharray", tweenDash)
      .each("end", function() {
        d3.select(this).call(transition);
        cars.style("opacity", 0)
      });
}

function tweenDash() {

    return function(t) {
        //total length of path (single value)
        var l = paths.node().getTotalLength();
        interpolate = d3.interpolateString("0," + l, l + "," + l);

        //t is fraction of time 0-1 since transition began
        var marker = d3.select("#marker");

        // p is the point on the line (coordinates) at a given length
        // along the line. In this case if l=50 and we're midway through
        // the time then this would 25.
        var p = paths.node().getPointAtLength(t * l);

        //Move the marker to that point
        marker.attr("transform", "translate(" + p.x + "," + p.y + ")"); //move marker
        return interpolate(t);
    }
}

let carIndex = 0;
let featureIndex = 0;
let carsTotal;
let featureInc = 7;
function loopCars(){

  carsTotal = geoCarData[carIndex].features.length;

  // update vehicle label
  infoLab.join("text")
          .merge(infoLab)
          .text("Vehicle ID: " + carIndex + " , Time: " + new Date(parseInt(geoCarData[carIndex].features[featureIndex].properties.time)));

  // // update cars
  cars.selectAll(".car")
      .data(geoCarData[carIndex].features)
      .join("path")
      .attr("d", path)
      .attr("class", d => { return "car " + d.properties.status; })
      .attr("id", d => { return d.properties.id; });


  for(let i = 0; i < featureInc; i++){
    if(featureIndex + i < carsTotal){
      cars.selectAll('.car')._groups[0][featureIndex + i].setAttribute('style', 'visibility: visible');
    }
  }
  //
  setTimeout(function(){

    //console.log(featureIndex);

    if(featureIndex + featureInc < carsTotal){
      featureIndex += featureInc;
      loopCars();
    }else{
      featureIndex = 0;
      cars.selectAll('.car').attr("style", "visibility: hidden");

      if(carIndex < 470){
        carIndex++;
        loopCars();
      }else{
        carIndex = 0;
      }
    }

    // if(carIndex < 470){
    //   carIndex++;
    //   loopCars();
    // }else{
    //   carIndex = 0;
    // }

  }, 2);
}


function makeGeo(carData) {      //converts array to geojson
  // initialize geojson object
  let geoCarData = {
    type: "FeatureCollection",
    crs: {
      properties: {
        code: 4326,
        coordinate_order: [1, 0]
      },
      type: "EPSG"
    },
    features: []
  }

  let values = carData.values;

  for(let v = 0; v < values.length; v++){

    if(v > 0){
        if (values[v].Latitude == values[v-1].Latitude && values[v].Longitude == values[v-1].Longitude) {
            var vStatus = "idle";
        } else {
            var vStatus = "moving";
        }
      } else {
        var vStatus = "moving";
      };

        let feature = {
          geometry: {
            coordinates: [values[v].Longitude, values[v].Latitude],
            type: "Point"
          },
          id: values[v].Vehicle_ID,
          properties: {
            id: values[v].Vehicle_ID,
            time: values[v].Timestamp,
            passengers: values[v].Num_Passengers,
            status: vStatus
          },
          type: "Feature"
        };

        geoCarData.features.push(feature)
  }
    return geoCarData;
};
