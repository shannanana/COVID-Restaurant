import * as d3 from 'd3';
import * as simpleSlider from 'd3-simple-slider';

var x = 5;

var sectionDiv = d3.select('#lineGraphSection');

const chartWidth = 1400;
const chartHeight = 500;
const chartXPadding = 300;
const chartYPadding = 50;

var svg = sectionDiv.append('svg')
	.attr('width', chartWidth)
	.attr('height', chartHeight)

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
	selectedScope = 'state';
	selectedRegionList = getListForScope(selectedScope);
	selectedRegion = 'Georgia';
	// updateRegionSelector(selectedRegionList);
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

			selectedCovidDataKey = covidDataToInclude[2];
			updateChart();
			scopeChanged();
			updateRegionSelector(selectedRegionList);
			regionSelector.node().selectedIndex = 10

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
	.attr('transform', 'translate('+[chartWidth-chartXPadding+2*axisLabelOffset, chartHeight/2]+') rotate(-90)')

const detailBoxOffset = 10;
const lineHeight = 20;
const boxWidth = 150;
const boxHeight = lineHeight * 4;

const detailBoxDateFormatter = d3.timeFormat('%b %d');

var detailBox = svg.append('g')
	.classed('detailBox', true)
	.attr('transform', 'translate('+[chartXPadding + detailBoxOffset, chartYPadding + detailBoxOffset]+')')
	.attr('opacity', 0)

var detailBoxFrameRect = detailBox.append('rect')
	.classed('detailOverlayRect', true)
	.attr('width', boxWidth)
	.attr('height', boxHeight)

var dateText = detailBox.append('text')
	.attr('transform', 'translate('+[10, lineHeight]+')')
	.attr('font-weight', 'bold')

var	dinerTextLabel = detailBox.append('text')
	.attr('transform', 'translate('+[10, lineHeight * 2]+')')
	.text('Seated Diner')

var	dinerText = detailBox.append('text')
	.attr('transform', 'translate('+[10, lineHeight * 3]+')')

var	covidTextLabel = detailBox.append('text')
	.attr('transform', 'translate('+[10, lineHeight * 4]+')')

var	covidText = detailBox.append('text')
	.attr('transform', 'translate('+[10, lineHeight * 5]+')')

function updateDetailBox(date, region=selectedRegionList[selectedRegion]) {	
	let dateIndex = indexOfDate(date);

	dateText.text(detailBoxDateFormatter(date));
	dinerText.text(region.data[dateIndex] + '%');

	let switchPositionDate = (selectedDateIndexRange[1] - selectedDateIndexRange[0]) * (boxWidth + detailBoxOffset) / (chartWidth - 2 * chartXPadding)

	if (dateIndex < switchPositionDate ) {
		detailBox.attr('transform', 'translate('+[chartWidth - chartXPadding - boxWidth - detailBoxOffset, chartHeight - 2*chartYPadding - boxHeight]+')');
	} else {
		detailBox.attr('transform', 'translate('+[chartXPadding + detailBoxOffset, chartYPadding + detailBoxOffset]+')');
	}

	if (region.covidData !== undefined && region.covidData[selectedCovidDataKey] !== undefined) {	
		covidText.text(region.covidData[selectedCovidDataKey][dateIndex])
		covidText.attr('opacity', 1)
		covidTextLabel.text('Covid ' + covidDataKeyToDescription(selectedCovidDataKey))
		covidTextLabel.attr('opacity', 1)
		detailBoxFrameRect.attr('height', boxHeight + 2 * lineHeight);
	} else {
		covidText.attr('opacity', 0)
		covidTextLabel.attr('opacity', 0)
		detailBoxFrameRect.attr('height', boxHeight);
	}
}

function covidDataKeyToDescription(key) {
	switch(key) {
		case 'death':
			return 'Deaths'
		case 'hospitalized':
			return 'Hospitalized'
		case 'positive':
			return 'Positive'
		case 'totalTestResults':
			return "Tests Given"
		default:
			return
	}
}

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

var lg = svg.append("defs").append("linearGradient")
	.attr("id", "mygrad")//id of the gradient
	.attr("x1", "0%")
	.attr("x2", "0%")
	.attr("y1", "0%")
	.attr("y2", "100%")//since its a vertical linear gradient 
		
lg.append("stop")
	.attr("offset", "0%")
	.style("stop-color", "#fdffc2")//top
	.style("stop-opacity", 0.1)

lg.append("stop")
	.attr("offset", "100%")
	.style("stop-color", "#f06e00")//bottom
	.style("stop-opacity", 0.9)

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
		.attr('pointer-events', 'none')
		.style('fill', 'url(#mygrad)');

// Draw overlay markers
	let markersG = svg.selectAll('.dinerDataPoint')
		.data(dates, function(d, i) {
			return d;
		})

	markersG.exit().remove();
	    
	let markersGEnter = markersG.enter()
		.append('g')
		.classed('dinerDataPoint', true)
		.attr('opacity', 0)
		.on('mouseover', function(i, d){ // WTF d and i are reversed ...
    		d3.select(this).attr('opacity', 1);
    		d3.select(this).raise();		
   			detailBox.attr('opacity', 1);
   			detailBox.raise();
    		updateDetailBox(d);
	    })
	    .on('mouseleave', function() {
	    	d3.select(this).attr('opacity', 0);
	    	svg.select('.detailBox').attr('opacity', 0);
	    });

	markersGEnter.append('circle')
		.classed('annotationCircle', true);

	markersGEnter.append("line")
		.classed('annotationLine', true);

	markersGEnter.append("line")
		.classed('annotationLineHandle', true)
		.attr('stroke', 'white')
		.attr('opacity', 0.01);


	let allMarkersG = markersG.merge(markersGEnter);

	allMarkersG.attr('transform', function(d, i) {
            return 'translate('+[dateScale(d), 0]+')';
        });

	allMarkersG.selectAll('line')
		.data(dates, function(d, i) {
			return d;
		})
		.attr('x1', 0)
	    .attr('y1', chartYPadding)
	    .attr('x2', 0)
	    .attr('y2', function(d, i) {
	    	return valueScale(region.data[dateIndexStart + i]);
	    });

	allMarkersG.selectAll('.annotationLineHandle')
		.data(dates, function(d, i) {
			return d;
		})
		.attr('x1', 0)
	    .attr('y1', chartYPadding)
	    .attr('x2', 0)
	    .attr('y2', chartHeight - chartYPadding)
	    	// function(d, i) {
	    // 	return
	    // 	return valueScale(region.data[dateIndexStart + i]);
	    // })
	    .attr('stroke-width', function(d){
	    	return (chartWidth - 2 * chartXPadding) / (dateIndexEnd - dateIndexStart + 1);
	    });

	allMarkersG.selectAll('circle')
		.data(dates, function(d, i) {
			return d;
		})
		.attr('cx', 0)
		.attr('cy', function(d, i) {
			return valueScale(region.data[dateIndexStart + i])
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
// var selectorDiv = sectionDiv
// 	.insert('div', ':first-child')
// 	.attr('id', 'selectorDiv');

var scopeSelectorDiv = d3.select('div#scopeSelectorDiv');
var regionSelectorDiv = d3.select('div#regionSelectorDiv');
var covidSelectorDiv = d3.select('div#covidSelectorDiv');

var scopeLabel = scopeSelectorDiv.append('label')
	.classed('selector label', true)
	.attr('id', 'scopeLabel')
	.text('Region Scope: ');

// scopeSelectorDiv.append('br')

var scopeSelector = scopeSelectorDiv.append('select')
	.classed('custom-select', true)
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
	.attr('selected', function(d){
		if (d=='state') {
			return 'selected';
		}
	})

var regionLabel = regionSelectorDiv.append('label')
	.classed('selector label', true)
	.attr('id', 'regionLabel')
	.text('Country: ');

// regionSelectorDiv.append('br')

var regionSelector = regionSelectorDiv.append('select')
	.classed('custom-select', true)
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

var covidDataKeyLabel = covidSelectorDiv.append('label')
	.classed('selector label', true)
	.attr('id', 'covidDataKeyLabel')
	.text('Covid Data: ');

// covidSelectorDiv.append('br')

var covidDataKeySelector = covidSelectorDiv.append('select')
	.classed('custom-select', true)
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
		.width(chartWidth-2*chartXPadding)
		.tickFormat(dateFormat)
		.default([dateList[0], dateList[dateList.length-1]])
		.fill('#2196f3')
		.on('onchange', val => {
			selectedDateIndexRange = [indexOfTime(val[0]), indexOfTime(val[1])];
			updateChart()
		  // d3.select('p#value-range').text(val.map(dateFormatter).join('-'));
		});

	sectionDiv.append('svg')
		.attr('width', chartWidth)
		.attr('height', 100)
		.append('g')
		.attr('transform', 'translate('+[chartXPadding, 30]+')')
		.call(timeSlider);
}


let legend = svg.append('g')
	.attr('transform', 'translate('+[chartXPadding/6, chartYPadding]+')')

legend.append('text')
	.attr('transform', 'translate('+[-5, 5]+')')
	.attr('font-weight', 'bold')
	.text('Legend')

let dinerLegend = legend.append('g')
	.attr('transform', 'translate('+[0, 50]+')')
	
dinerLegend.append('rect')
	.attr('cx', 0)
    .attr('cy', 0)
    .attr('width', chartXPadding/3)
    .attr('height', 20)
    .attr('stroke', 'none')
    .attr('fill', 'url(#mygrad)')

dinerLegend.append('line')
	.attr('x1', 0)
    .attr('y1', 20)
    .attr('x2', chartXPadding/3)
    .attr('y2', 20)
    .attr('stroke', '#c4c4c4')
    .attr('stroke-width', 2)

dinerLegend.append('text')
	.attr('transform', 'translate('+[-5, -10]+')')
	.text('Diner (Left Axis):')


let covidLegend = legend.append('g')
	.attr('transform', 'translate('+[0, 110]+')')
		
covidLegend.append('line')
	.attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', chartXPadding/3)
    .attr('y2', 0)
    .attr('stroke', '#f22c5a')
    .attr('stroke-width', 3)

covidLegend.append('text')
	.attr('transform', 'translate('+[-5, -15]+')')
	.text('Covid (Right Axis):')






