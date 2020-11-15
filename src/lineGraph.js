import * as d3 from 'd3';
import * as simpleSlider from 'd3-simple-slider';

var x = 5;

var sectionDiv = d3.select('#lineGraphSection');

const chartWidth = 700;
const chartHeight = 700;
const chartXPadding = 100;
const chartYPadding = 100;

var svg = sectionDiv.append('svg')
	.attr('width', chartWidth)
	.attr('height', chartHeight)
	.style('border', '1px solid #777');

var dateList = [];
var cityList = {};
var stateList = {};
var countryList = {};

var selectedDateIndexRange
var selectedScope;
var selectedRegion;
var selectedRegionList;
var selectedCovidDataKey;

function getListForScope(scope) {
	switch (scope) {
		case 'country':
			return countryList;
		case 'state':
			return stateList;
		case 'city':
			return cityList;
		default:
			return;
	}
}

function Region(name, type, data) {
	this.name = name;
	this.type = type;
	this.data = data;
}

let dateParser = d3.timeParse('%_m/%_d/%Y');
let dateFormatter = d3.timeFormat('%_m/%_d');

let covidDataToInclude = ['death', 'hospitalized', 'positive', 'totalTestResults']

d3.text('./_dist_/data/Seated_Diner_Data.csv').then(function(text) {
	d3.csvParseRows(text).map(function(row, i) {
		if (i == 0) {
			// Header row with time information
			for (var col = 2; col < row.length; col ++) {
				dateList.push(dateParser(row[col]+'/2020'));
			}
		} else { 
			// Data for each region
			let data = [];
			for (var col = 2; col < row.length; col ++) {
				data.push(+row[col]);
			}
			let region = new Region(row[1], row[0], data);
			switch (region.type) {
				case 'country':
					countryList[region.name] = region;
					break;
				case 'state':
					stateList[region.name] = region;
					break;
				case 'city':
					cityList[region.name] = region;
					break;
				default:
					break;
			}
		}
	});

	selectedDateIndexRange = [0, dateList.length-1];
	selectedScope = 'country';
	selectedRegionList = getListForScope(selectedScope);
	selectedRegion = 'Global';
	updateRegionSelector(selectedRegionList);
	createSlider();

	// Load Covid data
	d3.csv('./_dist_/data/US_Covid_Data.csv').then(function(dataset) {
		d3.csv('./_dist_/data/US_State_Names.csv').then(function(stateNameMapping) {
			let stateNameDict = {};

			stateNameMapping.map(function(row) {
				stateNameDict[row['Abbreviation']] = row['StateName'];
			});

			let dateParser = d3.timeParse('%_m/%_d/%_y');

			dataset.map(function(row) {
				let date = dateParser(row['date']);
				let dateIndex = indexOfDate(date);
				let stateName = stateNameDict[row['state']];
				if (stateName == undefined) { return; }

				if (dateIndex >= 0 && dateIndex < dateList.length) {
					let region = stateList[stateName];
					if (region == undefined) { return; }

					covidDataToInclude.map(function(key) {
						if (row[key] !== undefined) {
							if (region.covidData == undefined) {
								region.covidData = {};
							} 
							if (region.covidData[key] == undefined) {
								region.covidData[key] = new Array(dateList.length);
							}
							region.covidData[key][dateIndex] = +row[key];
						}
					});
				}
			});

			selectedCovidDataKey = covidDataToInclude[0];
			updateChart();

			// console.log(stateList);
		});
	});

	

});



// ===== Axis =====
var xAxisTop = svg.append('g')
	.classed('x axis', 'true')
	.attr('transform', 'translate('+[0, chartYPadding]+')');

var xAxisBottom = svg.append('g')
	.classed('x axis', 'true')
	.attr('transform', 'translate('+[0, chartHeight - chartYPadding]+')');

var yAxisLeft = svg.append('g')
	.classed('y axis', 'true')
	.attr('transform', 'translate('+[chartXPadding, 0]+')');

var yAxisRight = svg.append('g')
	.classed('y axis', 'true')
	.attr('transform', 'translate('+[chartWidth-chartXPadding, 0]+')');

var axisLabelOffset = 50;

var bottomAxisLabel = svg.append('text')
	.classed('axis label', true)
	.attr("text-anchor", "middle")
    .attr("x", chartWidth/2)
    .attr("y", chartHeight - chartYPadding + axisLabelOffset)
    .text("Date in Year of 2020");
var leftAxisLabel = svg.append('text')
	.classed('axis label', true)
	.attr("text-anchor", "middle")
	.attr('transform', 'translate('+[chartXPadding-axisLabelOffset, chartHeight/2]+') rotate(-90)')
    .text("YoY Seated Diner Percentage Change");
var rightAxisLabel = svg.append('text')
	.classed('axis label', true)
	.attr("text-anchor", "middle")
	.attr('transform', 'translate('+[chartWidth-chartXPadding+axisLabelOffset, chartHeight/2]+') rotate(-90)')

function getDateScale(dateExtent, chartExtent = [chartXPadding, chartWidth - chartXPadding]) {	
	let dateScale = d3.scaleTime()
		.domain(dateExtent)
		.range(chartExtent)
		// .nice();
	return dateScale;
}

function getValueScale(valueExtent, chartExtent = [chartHeight - chartYPadding, chartYPadding]) {
	let valueScale = d3.scaleLinear()
		.domain(valueExtent)
		.range(chartExtent);
	return valueScale;
}

function updateChart(dateIndexRange=selectedDateIndexRange, region=selectedRegionList[selectedRegion]) {	
	updateDinerChart()
	updateCovidChart()
}

function updateDinerChart(dateIndexRange=selectedDateIndexRange, region=selectedRegionList[selectedRegion]) {
	let dateIndexStart = selectedDateIndexRange[0];
	let dateIndexEnd = selectedDateIndexRange[1];

	let dateScale = getDateScale([dateList[dateIndexStart], dateList[dateIndexEnd]]);	
	// FIXME: Low - could create a light weight updateChart without recreating region extent
	let valueExtent = d3.extent(region.data);
	let valueScale = getValueScale(valueExtent);

	let dates = dateList.slice(dateIndexStart, dateIndexEnd+1);

// Draw line
	var valueline = d3.line()
	    .x(function(d) { 
	    	return dateScale(d); 
	    })
	    .y(function(d, i) { 
	    	return valueScale(region.data[dateIndexStart + i]); 
	    });

	let line = svg.selectAll('.dinerDataLine')
	  	.data([dates], function(d) {
	  		return d;
	  	});

	line.exit().remove();

	let lineEnter = line.enter()
	  	.append('path')
	  	.classed('dinerDataLine', true);

	line.merge(lineEnter)
		.attr('d', valueline)
		.attr('pointer-events', 'none');

// Fill above line area
	let valueArea = d3.area()
	    .x(function(d) { 
	    	return dateScale(d); 
	    })
	    .y0(chartYPadding)
	    .y1(function(d, i) { 
	    	return valueScale(region.data[dateIndexStart + i])
	    });

	let area = svg.selectAll('.dinerDataArea')
	  	.data([dates], function(d) {
	  		return d;
	  	});

	area.exit()
	  	.remove();

	let areaEnter = area.enter()
	  	.append('path')
	  	.classed('dinerDataArea', true)

	area.merge(areaEnter)
		.attr('d', valueArea)
		.attr('pointer-events', 'none');

// Draw circle marks within g
	let markersG = svg.selectAll('.dinerDataPoint')
		.data(dates, function(d, i) {
			return d;
		})
		.on('mouseover', function(d,i){
    		d3.select(this).attr('opacity', 1);
    		// d3.select(this).moveToFront();
	    })
	    .on('mouseleave', function(d,i){
	    	d3.select(this).attr('opacity', 0);
	    })

	markersG.exit().remove();

	let annotationLine = d3.line()
	    
	let markersGEnter = markersG.enter()
		.append('g')
		.classed('dinerDataPoint', true)	

	// FIXME - low: pass mouse event to all items rather than redrawing
	markersGEnter.append('circle')
		.classed('annotationCircle', true)
		.attr('cx', 0)
		.attr('cy', function(d, i) {
			return valueScale(region.data[dateIndexStart + i])
		})

	markersGEnter.append("line")
		.classed('annotationLine', true)
  		.attr('x1', 0)
	    .attr('y1', chartYPadding)
	    .attr('x2', 0)
	    .attr('y2', function(d, i) {
	    	return valueScale(region.data[dateIndexStart + i]);
	    });

	markersGEnter.append("line")
		.classed('annotationLineHandle', true)
  		.attr('x1', 0)
	    .attr('y1', chartYPadding)
	    .attr('x2', 0)
	    .attr('y2', function(d, i) {
	    	return valueScale(region.data[dateIndexStart + i]);
	    })
	    .attr('stroke', 'black')
	    .attr('opacity', 0.01);

// FIXME: 

	markersG.merge(markersGEnter)
		.attr('transform', function(d, i) {
            return 'translate('+[dateScale(d), 0]+')';
        });
	markersG.merge(markersGEnter).selectAll('.annotationLineHandle')
		.attr('stroke-width', function(d){
	    	return (chartWidth - 2 * chartXPadding) / (dateIndexEnd - dateIndexStart + 1);
	    });

	// axis
	xAxisTop.call(d3.axisTop(dateScale));
	xAxisBottom.call(d3.axisBottom(dateScale));
	yAxisLeft.call(d3.axisLeft(valueScale));

}

function updateCovidChart(valueKey=selectedCovidDataKey, dateIndexRange=selectedDateIndexRange, region=selectedRegionList[selectedRegion]) {
	if (region.covidData == undefined) { 
		svg.selectAll('.covidDataPoint').remove();
		svg.selectAll('.covidDataLine').remove();
		svg.selectAll('.covidDataArea').remove();
		yAxisRight.attr('opacity', 0)		
		rightAxisLabel.text('');
		return; 
	}

	let dateIndexStart = selectedDateIndexRange[0];
	let dateIndexEnd = selectedDateIndexRange[1];

	let dateScale = getDateScale([dateList[dateIndexStart], dateList[dateIndexEnd]]);

	let valueExtent = d3.extent(region.covidData[valueKey]);
	let valueScale = getValueScale(valueExtent);

	let dates = dateList.slice(dateIndexStart, dateIndexEnd+1);

	// Draw circle marks within g
	// let circlesGExit = svg.selectAll('.covidDataPoint')
	// 	.data(dates, function(d, i) {
	// 		return d;
	// 	})
	// 	.exit()
	// 	.remove()

	// let circlesG = svg.selectAll('.covidDataPoint')
	// 	.data(dates, function(d, i) {
	// 		return d;
	// 	})

	// let circlesGEnter = svg.selectAll('.covidDataPoint')
	// 	.data(dates, function(d, i) {
	// 		return d;
	// 	})
	// 	.enter()
	// 	.append('g')
	// 	.classed('covidDataPoint', true);

	// circlesG.merge(circlesGEnter)
	// 	.attr('transform', function(d, i) {
 //            return 'translate('+[dateScale(d), valueScale(region.covidData[valueKey][dateIndexStart + i])]+')';
 //        })
	// 	.append('circle')
	// 	.attr('r', 5)
	// 	.attr('fill', '#c4c4c4');

// FIXME - high: null data gaps https://bocoup.com/blog/showing-missing-data-in-line-charts
	// Draw line
	var valueline = d3.line()
	    .x(function(d) { 
	    	return dateScale(d); 
	    })
	    .y(function(d, i) { 
	    	return valueScale(region.covidData[valueKey][dateIndexStart + i]); 
	    })
	    .defined(function(d, i) { 
	    	return region.covidData[valueKey][dateIndexStart + i] !== undefined; 
	    });

	let line = svg.selectAll('.covidDataLine')
	  	.data([dates], function(d) {
	  		return d;
	  	});

	let lineExit = line.exit()
	  	.remove();

	let lineEnter = line.enter()
	  	.append('path')
	  	.classed('covidDataLine', true)

	line.merge(lineEnter)
		.attr('d', valueline);

	yAxisRight.call(d3.axisRight(valueScale));
	yAxisRight.attr('opacity', 1)
	rightAxisLabel.text(getCovidAxisLabel());
}

function getCovidAxisLabel(key=selectedCovidDataKey) {
	switch (key) {
		case 'death':
			return 'Total Number of Deaths'
		case 'hospitalized':
			return 'Total Number of Hospitalized'
		case 'positive':
			return 'Total Number fo Positive Cases'
		case 'totalTestResults':
			return 'Total Number of Tests Given'
	}
}



// ====== Selector ======
var selectorDiv = sectionDiv
	.insert('div', ':first-child')
	.attr('id', 'selectorDiv');

var scopeLabel = selectorDiv.append('label')
	.classed('selector label', true)
	.attr('id', 'scopeLabel')
	.text('Region Scope: ');

var scopeSelector = selectorDiv.append('select')
	.attr('id', 'scopeSelector')
	.on('change', scopeChanged);

var scopeSelectorOptions = scopeSelector.selectAll('option')
	.data(['country', 'state', 'city'])
	.enter()
	.append('option')
	.attr('value', function(d){
		return d;
	})
	.text(function(d){
		return d;
	})

selectorDiv.append('br');

var regionLabel = selectorDiv.append('label')
	.classed('selector label', true)
	.attr('id', 'regionLabel')
	.text('Country: ');

var regionSelector = selectorDiv.append('select')
	.attr('id', 'regionSelector')
	.on('change', regionChanged);

var regionSelectorOptions = regionSelector.selectAll('option')
	.data(Object.keys(countryList), function(d){
		return d;
	})
	.enter()
	.append('option')
	.attr('value', function(d){
		return d;
	})
	.text(function(d){
		return d;
	})

function scopeChanged() {
    let scopeSelector = d3.select('#scopeSelector').node();
    selectedScope = scopeSelector.options[scopeSelector.selectedIndex].value;
    selectedRegionList = getListForScope(selectedScope);

    switch (selectedScope) {
    	case 'country':
    		regionLabel.text('Country: ');
    		break;
    	case 'state':
    		regionLabel.text('State: ');
    		break;
    	case 'city':
    		regionLabel.text('City: ');
    		break;
    	default:
    		break;
    }

    updateRegionSelector();
    regionChanged()
}

function updateRegionSelector(data) {
	regionSelector.selectAll('option').remove();
	regionSelectorOptions
		.data(Object.keys(selectedRegionList), function(d){
			return d;
		})
		.enter()
		.append('option')
		.attr('value', function(d) {
			return d;
		})
		.text(function(d) {
			return d;
		});	
}

function regionChanged() {
    selectedRegion = regionSelector.node()
    	.options[regionSelector.node().selectedIndex].value;
    selectedScope = scopeSelector.node()
    	.options[scopeSelector.node().selectedIndex].value;

    updateChart();
}

var covidDataKeyLabel = selectorDiv.append('label')
	.classed('selector label', true)
	.attr('id', 'covidDataKeyLabel')
	.text('Covid Data');

var covidDataKeySelector = selectorDiv.append('select')
	.attr('id', 'covidDataKeySelector')
	.on('change', covidDataKeyChanged);

var covidDataKeySelectorOptions = covidDataKeySelector.selectAll('option')
	.data(covidDataToInclude)
	.enter()
	.append('option')
	.attr('value', function(d){
		return d;
	})
	.text(function(d){
		return d;
	})

selectorDiv.append('br');

function covidDataKeyChanged() {
	selectedCovidDataKey = covidDataKeySelector.node()
    	.options[covidDataKeySelector.node().selectedIndex].value;

    updateCovidChart();
}


// ====== Time Slider ======

const millisecondsInADay = (1000 * 3600 * 24);

function indexOfDate(date) {
	return numberOfDaysBetween(dateList[0], date);
}

function indexOfTime(time) {
	return Math.floor((time - dateList[0].getTime()) / millisecondsInADay);
}

function numberOfDaysBetween(date1, date2) {
	var differenceInTime = date2.getTime() - date1.getTime(); 
 	var differenceInDays = Math.floor(differenceInTime / millisecondsInADay);
 	return differenceInDays;
}

function createSlider() {
	let numberOfDays = numberOfDaysBetween(dateList[0], dateList[dateList.length-1]);
	let timeSliderScale = d3.scaleTime().domain([dateList[0], dateList[dateList.length-1]]).range(numberOfDays);
	let tickValues = dateList.map(function(date){
		return dateFormatter(date);
	})
	let dateFormat = d3.timeFormat('%_m/%_d')


	var timeSlider = simpleSlider.sliderBottom()
		.min(dateList[0])
		.max(dateList[dateList.length-1])
		.width(300)
		.tickFormat(dateFormat)
		.default([dateList[0], dateList[dateList.length-1]])
		.fill('#2196f3')
		.on('onchange', val => {
			selectedDateIndexRange = [indexOfTime(val[0]), indexOfTime(val[1])];
			updateChart()
		  // d3.select('p#value-range').text(val.map(dateFormatter).join('-'));
		});

	sectionDiv.append('svg')
		.attr('width', 500)
		.attr('height', 100)
		.append('g')
		.attr('transform', 'translate(30,30)')
		.call(timeSlider);
}


