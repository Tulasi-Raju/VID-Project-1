Promise.all([
  d3.json('data/counties-10m.json'),
  d3.csv('data/national_health_data_2024.csv')
]).then(data => {
  let geoData = data[0];
  let countyData = data[1];

  const tooltip = d3.select("body").append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "#fff")
    .style("padding", "10px")
    .style("border-radius", "5px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("opacity", 0)  
    .style("visibility", "hidden");  

  const attributes = Object.keys(countyData[0])
    .filter(attr => !["cnty_fips", "county_name", "display_name", "park_access", "urban_rural_status"].includes(attr));
  const dropdown3 = d3.select("#attribute3");
  attributes.forEach(attr => dropdown3.append("option").text(attr).attr("value", attr));

  let selectedAttribute = attributes[0]; // Default selection

  function updateColorScale(attribute) {
    let values = countyData.map(d => +d[attribute]).filter(d => !isNaN(d));
    return d3.scaleSequential(d3.interpolateBlues).domain([d3.min(values), d3.max(values)]);
  }

  function updateMap(attribute) {
    let colorScale = updateColorScale(attribute);

    geoData.objects.counties.geometries.forEach(d => {
      let county = countyData.find(c => c.cnty_fips === d.id);
      if (county) {
        d.properties = { ...county }; // Store all county properties
      }
    });

    renderMap(colorScale, attribute);
  }

  function renderMap(colorScale, attribute) {
    d3.select(".viz").html(""); 
    const width = 960, height = 600;

    const projection = d3.geoAlbersUsa()
      .scale(1000)  
      .translate([width / 2, height / 2 + 50]); 

    const path = d3.geoPath().projection(projection);

    const svg = d3.select(".viz").append("svg")
      .attr("width", width)
      .attr("height", height)
      .style("display", "block")  
      .style("margin", "auto");   

    const g = svg.append("g");

    const zoom = d3.zoom()
      .scaleExtent([1, 8]) 
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const counties = topojson.feature(geoData, geoData.objects.counties);

    g.selectAll("path")
      .data(counties.features)
      .enter().append("path")
      .attr("d", path)
      .attr("fill", d => d.properties[attribute] ? colorScale(d.properties[attribute]) : "#ccc")
      .attr("stroke", "#333")
      .attr("stroke-width", 0.5)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("stroke-width", 2); 

        let tooltipContent = `<strong>${d.properties.display_name || "Unknown County"}</strong><br>`;
        Object.entries(d.properties).forEach(([key, value]) => {
          if (key !== "cnty_fips" && key !== "county_name") {
            tooltipContent += `<strong>${key}:</strong> ${value}<br>`;
          }
        });

        tooltip.style("visibility", "visible")  
          .style("opacity", 1)  
          .html(tooltipContent)
          .style("left", (event.pageX + 10) + "px")  
          .style("top", (event.pageY - tooltip.node().getBoundingClientRect().height - 10) + "px"); 
      })
      .on("mousemove", function (event) {
        tooltip.style("left", (event.pageX + 10) + "px") 
               .style("top", (event.pageY - tooltip.node().getBoundingClientRect().height - 10) + "px"); 
      })
      .on("mouseout", function () {
        d3.select(this).attr("stroke-width", 0.5);
        tooltip.style("opacity", 0)  
               .style("visibility", "hidden"); 
      })
      .on("click", function (event, d) {
        const [[x0, y0], [x1, y1]] = path.bounds(d);
        const dx = x1 - x0, dy = y1 - y0;
        const x = (x0 + x1) / 2, y = (y0 + y1) / 2;
        const scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height)));
        const translate = [width / 2 - scale * x, height / 2 - scale * y];

        svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity.translate(...translate).scale(scale));
      });

    svg.on("dblclick", function () {
      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity);
    });

    renderLegend(colorScale);
  }

  function renderLegend(colorScale) {
    d3.select("#legend").remove();
  
    const legendWidth = 300, legendHeight = 40;
    const legendSvg = d3.select(".viz")
      .append("svg")
      .attr("id", "legend")
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .style("display", "block")
      .style("margin", "auto")
      .style("margin-top", "20px");
  
    const defs = legendSvg.append("defs");
    const linearGradient = defs.append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "0%");
  
    const colorRange = d3.range(0, 1.1, 0.1).map(d => 
      colorScale(d3.min(colorScale.domain()) + d * (d3.max(colorScale.domain()) - d3.min(colorScale.domain())))
    );
  
    linearGradient.selectAll("stop")
      .data(colorRange)
      .enter().append("stop")
      .attr("offset", (d, i) => `${(i / (colorRange.length - 1)) * 100}%`)
      .attr("stop-color", d => d);
  
    legendSvg.append("rect")
      .attr("width", legendWidth)
      .attr("height", 8)  
      .style("fill", "url(#legend-gradient)");
  
    const legendScale = d3.scaleLinear()
      .domain(colorScale.domain())
      .range([0, legendWidth]);
  
    const legendAxis = d3.axisBottom(legendScale)
      .ticks(4)  
      .tickFormat(d3.format(".2s"));  
  
    legendSvg.append("g")
      .attr("transform", `translate(0, 12)`)
      .call(legendAxis);
  }  

  updateMap(selectedAttribute);

  d3.select("#attribute3").on("change", function () {
    selectedAttribute = this.value;
    updateMap(selectedAttribute);
  });

}).catch(error => console.error(error));
