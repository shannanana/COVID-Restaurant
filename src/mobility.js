function drawBar(data, dataType, state) {
  var bar = d3.select("#bar");

  const padding = {
    top: 30,
    right: 30,
    bottom: 30,
    left: 110
  };

  var width = +bar.attr("width");
  var height = +bar.attr("height");

  var stateData = data
  .filter(function(d){ return d.state == state})
  .map(function(d) {
    return {
      ...d,
      date: d3.timeParse("%Y-%m-%d")(d.date)
    };
  });

  var xScale = d3
  .scaleTime()
  .domain(d3.extent(stateData, function(d){return d.date}))
  .range([padding.left, width - padding.right]);

  var yScale = d3
  .scaleLinear()
  .domain([
    -d3.max(stateData, function(d) {return Math.abs(d[dataType]) * 1.1}),
    d3.max(stateData, function(d){return Math.abs(d[dataType]) * 1.1})
  ])
  .range([height - padding.bottom, padding.top]);

  var xAxis = d3.axisBottom(xScale).tickFormat(d3.timeFormat("%b"));
  d3.select(".x-axis")
  .attr("transform", `translate(0,${height - padding.bottom})`)
  .transition()
  .duration(500)
  .call(xAxis);

  var yAxis = d3.axisLeft(yScale);
  d3.select(".y-axis")
  .attr("transform", `translate(${padding.left},0)`)
  .transition()
  .duration(500)
  .call(yAxis);

  var mapColorScale =
  d3.scaleSequential(d3.interpolateSpectral)
  .domain([-50,50]);

  bar.selectAll("rect").remove();
  bar.selectAll(".bar")
  .data(stateData)
  .enter()
  .append("rect")
  .merge(bar)
  .attr("x", function(d) {
    return xScale(d.date);
  })
  .attr("y", function(d) {
    return yScale(Math.max(0, d[dataType]));
  })
  .attr("width", 1.5)
  .attr("height", function(d) {
    return Math.abs(yScale(d[dataType]) - yScale(0));
  })
  .attr("fill", function(d) {
    var val = d[dataType];
    return val ? mapColorScale(val) : "#eeeeee";
  });

  bar.exit().remove();
  var yLabel = `Percent change of ${capitalize(dataType)}`;
  d3.select(".y-axis-label").text(yLabel);

  var title =
  `Mobility Trends in ${state}`;
  d3.select(".bar-title").text(title);
}

function capitalize(s) {
  return (s[0].toUpperCase() + s.slice(1)).replaceAll("_", " ");
}

function drawMap(geoData, data, date, dataType) {
  var map = d3.select("#map");

  var projection = d3
  .geoMercator()
  .translate([+map.attr("width") / 0.75, +map.attr("height") / 0.8])
  .scale([500]);


  var path = d3.geoPath(projection);

  d3.select("#currentDate").text(date);

  geoData.forEach(function(d) {
    var states = data.filter(function(a) {return a.state == d.properties.state} );
    var state = "";
    if (states.length > 0) state = states[0].state;
    d.properties = states.find(function(s){return s.date == date}) || { state };
  });

  const mapColorScale =
  d3.scaleSequential(d3.interpolateSpectral)
  .domain([-50,50]);

  var update = map.selectAll(".state").data(geoData);

  update.enter()
  .append("path")
  .attr("class","state")
  .attr("d", path)
  .on("click", function() {
    var currentDataType = d3.select("select").property("value");
    var state = d3.select(this);
    var isActive = state.classed("active");
    var stateName = isActive ? "" : state.data()[0].properties.state;
    drawBar(data, currentDataType, stateName);
    d3.selectAll(".state").classed("active", false);
    state.classed("active", !isActive);
  })

  .merge(update)
  .transition()
  .duration(500)
  .attr("stroke", "#33333")
  .attr("fill", function(d) {
    var val = d.properties[dataType];
    return val ? mapColorScale(val) : "#666666";
  });

  d3.select(".map-title").text(`${capitalize(dataType)} Change at ${date}`);
}




d3.queue()
.defer(d3.json, "/_dist_/data/states-10m.json")
.defer(d3.csv, "/_dist_/data/mobility-state-data.csv", function(d) {
  return {
    date: d.date,
    state: d.sub_region_1,
    residential: d.residential_percent_change_from_baseline,
    workplaces: d.workplaces_percent_change_from_baseline,
    transit_stations: d.transit_stations_percent_change_from_baseline,
    parks: d.parks_percent_change_from_baseline,
    grocery_and_pharmacy: d.grocery_and_pharmacy_percent_change_from_baseline,
    retail_and_recreation: d.retail_and_recreation_percent_change_from_baseline
  };
})
.await(ready);
  function ready(error, mapData, data) {

  var dateArray = [...new Set(data.map(function(d) {return d.date}))];
  console.log(dateArray)
  var min = 0;
  var max = dateArray.length - 1;
  var currentDate = dateArray[max];
  var currentDataType = d3.select("select").property("value");
  const jsonState = topojson.feature(mapData, mapData.objects.states).features;

  d3.select("#map")
  .attr("width", 950)
  .attr("height", 450)
  .append("text")
  .attr("x", 370)
  .attr("y", 15)
  .style("text-anchor", "middle")
  .attr("class","map-title");

  drawMap(jsonState, data, currentDate, currentDataType);

  var bar = d3
  .select("#bar")
  .attr("width",590)
  .attr("height", 350);

  bar
  .append("g")
  .attr("class","x-axis")
  bar
  .append("g")
  .attr("class","y-axis");

  bar
  .append("text")
  .attr("transform", "rotate(-90)")
  .attr("x", -180)
  .attr("y", 50)
  .style("text-anchor", "middle")
  .attr("class","y-axis-label");

  bar
  .append("text")
  .attr("x", 350)
  .attr("y", 15)
  .style("text-anchor", "middle")
  .attr("class","bar-title");



  drawBar(data, currentDataType, "Georgia");

  d3.select("#date")
  .attr("min", min)
  .attr("max", max)
  .attr("value", max)
  .on("input", function(){
    currentDate = dateArray[+d3.event.target.value];
    drawMap(jsonState, data, currentDate, currentDataType);
  });

  d3.select("select").on("change", function() {
    currentDataType = d3.event.target.value;
    var state = "";
    if (d3.select(".active").data()[0] == undefined) {
      state = "Georgia";
    } else {
      var active = d3.select(".active").data()[0].properties.state;
      state = active;
    }
    drawMap(jsonState, data, currentDate, currentDataType);
    drawBar(data, currentDataType, state);
  });



  d3.selectAll("#map").on("mousemove", updateTooltip);
  function updateTooltip() {
    const tooltip = d3.select(".tooltip-mobility");
    const dataType = d3.select("select").property("value");

    var target = d3.select(d3.event.target);

    var isState = target.classed("state");
    var data;

    if (isState) data = target.data()[0].properties;

    tooltip
    .style("opacity", +isState)


    .style("left", `${d3.event.pageX - tooltip.node().offsetWidth / 2}px`)

    .style("top", `${d3.event.pageY - tooltip.node().offsetHeight - 10}px`);

    // console.log(d3.event.pageX);
    // console.log(d3.event.pageY);
    // console.log(tooltip.node().offsetWidth);
    // console.log(tooltip.node().offsetHeight);

    if (data) {
      tooltip.html(`
        <p>State: ${data.state}</p>
        <p>Mobility Change: ${data[dataType]}%</p>
        `);
      }
    }
  };





  // Legend
  var thresholdScale = d3.scaleSequential(d3.interpolateSpectral)
  .domain([-50.0,50])


  var svg = d3.select("svg");

  svg.append("g")
  .attr("class", "legendQuant")
  .attr("transform", "translate(50,280)");

  var legend = d3.legendColor()
  .labelFormat(d3.format(".2f"))
  .labels(d3.legendHelpers.thresholdLabels)
  .scale(thresholdScale)


  svg.select(".legendQuant")
  .call(legend);

  svg.select('.label').text("Less than -50");
