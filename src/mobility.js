
function drawBar(data, dataType, state) {
  //SETUP
  const bar = d3.select("#bar");

  const padding = {
    top: 30,
    right: 30,
    bottom: 30,
    left: 110
  };

  const width = +bar.attr("width");
  const height = +bar.attr("height");

  var stateData = data
    .filter(d => d.state === state)
    .map(d => {
      return {
        ...d,
        date: d3.timeParse("%Y-%m-%d")(d.date)
      };
    });

  var xScale = d3
    .scaleTime()
    .domain(d3.extent(stateData, d => d.date))
    .range([padding.left, width - padding.right]);

  var yScale = d3
    .scaleLinear()
    .domain([
      -d3.max(stateData, d => Math.abs(d[dataType]) * 1.1),
      d3.max(stateData, d => Math.abs(d[dataType]) * 1.1)
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
    .attr("fill", d => {
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

  geoData.forEach(d => {
    var states = data.filter(row => row.state == d.properties.state);
    var state = "";
    if (states.length > 0) state = states[0].state;
    d.properties = states.find(s => s.date == date) || { state };
  });

  const mapColorScale =
  d3.scaleSequential(d3.interpolateSpectral)
    .domain([-50,50]);

  //UPDATE DATA
  var update = map.selectAll(".state").data(geoData);

  update
    .enter()
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
    .duration(300)
    .attr("stroke", "#777")
    .attr("fill", d => {
      var val = d.properties[dataType];
      return val ? mapColorScale(val) : "#ccc";
    });

    d3.select(".map-title").text(`${capitalize(dataType)} Change at ${date}`);
  }



d3.queue()
  .defer(d3.json, "/_dist_/data/states-10m.json")
  .defer(d3.csv, "/_dist_/data/mobility-state-data.csv", row => {
    return {
      date: row.date,
      state: row.sub_region_1,
      residential: +row.residential_percent_change_from_baseline,
      workplaces: +row.workplaces_percent_change_from_baseline,
      transit_stations: +row.transit_stations_percent_change_from_baseline,
      parks: +row.parks_percent_change_from_baseline,
      grocery_and_pharmacy: +row.grocery_and_pharmacy_percent_change_from_baseline,
      retail_and_recreation: +row.retail_and_recreation_percent_change_from_baseline
    };
  })
  .await((err, mapData, data) => {
    if (err) throw err;

    var dateArr = [...new Set(data.map(d => d.date))];
    var min = 0;
    var max = dateArr.length - 1;
    var currentDate = dateArr[max];
    var currentDataType = d3.select("select").property("value");
    const jsonState = topojson.feature(mapData, mapData.objects.states).features;

    // Draw map
    d3.select("#map")
      .attr("width", 900)
      .attr("height", 450)
      .append("text")
      .attr("x", 450)
      .attr("y", 16)
      .attr("font-size", "18px")
      .style("text-anchor", "middle")
      .attr("class","map-title");

    drawMap(jsonState, data, currentDate, currentDataType);

    // Draw Bar
    var bar = d3
      .select("#bar")
      .attr("width",600)
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
      .attr("x", - 175)
      .attr("y", "30")
      .attr("dy", "12px")
      .style("text-anchor", "middle")
      .attr("class","y-axis-label");

    bar
      .append("text")
      .attr("x", 350)
      .attr("y", 15)
      .style("text-anchor", "middle")
      .attr("class","bar-title");

    bar
      .append("g")
      .append("circle")
      .style("fill", "steelblue")
      .attr("r", 8.5)
      .style("opacity", 0);


    d3.selectAll(".textDate, .textVal")
      .attr("text-anchor", "middle")
      .attr("aligment-baseline", "middle")
      .style("opacity", 0);

    bar
      .append("rect")
      .style("fill", "none")
      .style("pointer-events", "all")
      .attr("width", 700)
      .attr("height", 350);

    drawBar(data, currentDataType, "Georgia");

    d3.select("#date")
      .attr("min", min)
      .attr("max", max)
      .attr("value", max)
      .on("input", () => {
        currentDate = dateArr[+d3.event.target.value];
        drawMap(jsonState, data, currentDate, currentDataType);
      });

    d3.select("select").on("change", () => {
      currentDataType = d3.event.target.value;
      var state = "";
      if (d3.select(".active").data()[0] === undefined) {
        state = "Georgia";
      } else {
        var active = d3.select(".active").data()[0].properties.state;
        state = active || "";
      }
      drawMap(jsonState, data, currentDate, currentDataType);
      drawBar(data, currentDataType, state);
    });

    // Update Tooltip
    d3.selectAll("#map").on("mousemove touchmove", updateTooltip);
    function updateTooltip() {
      const tooltip = d3.select(".tooltip");
      const dataType = d3.select("select").property("value");

      var target = d3.select(d3.event.target);

      var isState = target.classed("state");

      var data;
      //Map
      if (isState) data = target.data()[0].properties;

      tooltip
        .style("opacity", +isState)
        .style("left", `${d3.event.pageX - tooltip.node().offsetWidth / 2}px`)
        .style("top", `${d3.event.pageY - tooltip.node().offsetHeight - 10}px`);

      if (data) {
        tooltip.html(`
          <p>State: ${data.state}</p>
        <p>Mobility Change: ${data[dataType]}%</p>
      `);
      }
    }
  });

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
