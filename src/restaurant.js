        import * as d3 from 'd3';
 
        var states = ["Global", "United States", "California", "Florida"], dateLeft = [], dateRight = [];
        var stas = [];
        var csv11 = [], csv22 = [];
        d3.csv("./_dist_/data/left_new.csv").then(function (csv) {
            csv11 = csv;
            csv.forEach(function (item) {
                if (stas.indexOf(item.State) == -1) {
                    if (item.State != "" && item.State != "Global" && item.State != "United States") {
                        stas.push(item.State);
                        document.getElementById("state1").innerHTML += "<option Value='" + item.State + "'>" + item.State + "</option>";
                        if (item.State == "Florida") {
                            document.getElementById("state2").innerHTML += "<option selected Value='" + item.State + "'>" + item.State + "</option>";
                        } else {
                            document.getElementById("state2").innerHTML += "<option Value='" + item.State + "'>" + item.State + "</option>";
                        }
                    }
                }

                if (dateLeft.indexOf(item.Date) == -1) {
                    dateLeft.push(item.Date);
                }
            });

            loadHeat("left", csv, dateLeft);

            d3.csv("./_dist_/data/right_new.csv").then(function (csv2) {
                csv22 = csv2;
                csv2.forEach(function (item) {
                    if (dateRight.indexOf(item.Date) == -1) {
                        dateRight.push(item.Date);
                    }
                });
                loadHeat("right", csv2, dateRight);
            });
        });

        function change() {
            var state1 = document.getElementById("state1").value;
            var state2 = document.getElementById("state2").value;
            states = ["Global", "United States", state1, state2];
            loadHeat("left", csv11, dateLeft);
            loadHeat("right", csv22, dateRight);
        }



        function loadHeat(id, data, dates) {
            data = data.filter(o=>o.State!="");
            document.getElementById(id).innerHTML = "";
            var margin = { top: 30, right: 10, bottom: 30, left: 80 },
                width = 580 - margin.left - margin.right,
                height = 3200 - margin.top - margin.bottom;

            // append the svg object to the body of the page
            var svg = d3.select("#" + id)
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform",
                    "translate(" + margin.left + "," + margin.top + ")");

            // Labels of row and columns
            var myGroups = states;
            var myVars = dates;

            // Build X scales and axis:
            var x = d3.scaleBand()
                .range([0, width])
                .domain(myGroups)
                .padding(0.01);
            svg.append("g")
                .call(d3.axisTop(x))

            // Build y scales and axis:
            var y = d3.scaleBand()
                .range([height, 0])
                .domain(myVars)
                .padding(0.01);
            svg.append("g")
                .call(d3.axisLeft(y));

            // Build color scale
            var myColor1 = d3.scaleLinear()
                .range(["white", "red"])
                .domain([0, -100])

            var myColor2 = d3.scaleLinear()
                .range(["white", "blue"])
                .domain([0, 100])

            // create a tooltip
            var tooltip = d3.select("#left")
                .append("div")
                .style("opacity", 0)
                .attr("class", "tooltip")
                .style("background-color", "black")
                .style("border", "solid")
                .style("border-width", "2px")
                .style("border-radius", "5px")
                .style("padding", "5px")

            var mouseover = function (d) {
                tooltip.style("opacity", 1)
            }
            var mousemove = function (d) {
                tooltip
                    .html (d.Value + "%")
                    .style("left", (d3.mouse(this)[0] + 70) + "px")
                    .style("top", (d3.mouse(this)[1]) + "px")
            }
            var mouseleave = function (d) {
                tooltip.style("opacity", 0)
            }

            var rect = svg.selectAll()
                .data(data, function (d) { return d.group + ':' + d.variable; })
                .enter()
                .on("mouseover", mouseover)
                .on("mousemove", mousemove)
                .on("mouseleave", mouseleave);
                
            rect.append("rect")
                .attr("x", function (d) { return x(d.State) })
                .attr("y", function (d) { return y(d.Date) })
                .attr("width", x.bandwidth())
                .attr("height", y.bandwidth())
                .style("fill", function (d) {
                    if (d.Value < 0) {
                        return myColor1(d.Value);
                    } else {
                        return myColor2(d.Value);
                    }
                });

            // rect.append("text")
            //     .style("fill","black")
            //     .style("font-size","14px")
            //     .attr("dy",".35em")
            //     .attr("x",function(d){ return x(d.State) })
            //     .attr("y",function(d){ return y(d.Date)+10 })
            //     .style("style","label")
            //     .text(function(d){ return d.Value});

        };


