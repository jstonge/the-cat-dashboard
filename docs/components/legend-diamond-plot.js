import * as d3 from "npm:d3";

export function myLegend(color, {
    tickSize = 6,
    max_count_log = 4,
    width = 320, 
    height = 44 + tickSize,
    marginTop = 18,
    marginRight = 0,
    marginBottom = 16 + tickSize,
    marginLeft = 0,
    ticks = width / 64,
    tickFormat,
    tickValues
  } = {}) {
  
  
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        .style("overflow", "visible")
        .style("display", "block");
  
    let tickAdjust = g => g.selectAll(".tick line").attr("y1", marginTop + marginBottom - height);
    
    // let x;
    let x = d3.scaleBand()
       .domain(color.domain())
       .rangeRound([marginLeft, width - 100]);
    
    svg.append("g")
     .selectAll("rect")
     .data(color.domain())
     .join("rect")
       .attr("x", (d) => (x(d)))
       .attr("y", marginTop)
       .attr("width", Math.max(0, x.bandwidth() - 1))
       .attr("height", height - marginTop - marginBottom)
       .attr("fill", color)
       .attr("transform", "rotate(-90) translate(-70,0)");
  
    // tickAdjust = () => {};
  
    // let x2;
    let x2 = d3.scaleBand()
       .domain(d3.range(max_count_log).map(i => 10**i).sort(d3.descending))
       .rangeRound([marginLeft-40, width-90]);
  
    svg.append("g")
        .call(d3.axisBottom(x2).tickSize(tickSize)).attr("text-anchor", "start")
        .call(g => g.select(".domain").remove())
        .call(g => g.append("text") 
          .attr("x", marginLeft - 25) // magic number moving legend title left and right 
          .attr("y", marginTop + marginBottom) // magic number moving legend title up and down
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .attr("font-size", 14)
          .attr("class", "title")
          .text("Counts per cell"))
        .attr("transform", "rotate(-90) translate(-60,5)") // magic number moving ticks and title up and down and left and right
          .selectAll('text')
          .attr("dx", 30) // magic number moving ticks left and right
          .attr("dy", -5) // magic number
          .attr('transform', 'rotate(90)') // rotating ticks and title
  
    return svg.node();
  }