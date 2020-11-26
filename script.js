'use strict';

// Wrap everything in an anonymous function to avoid poluting the global namespace
(function () {
  // Event handlers for filter change
  let unregisterHandlerFunctions = [];

  let worksheet, worksheet2;
  // Use the jQuery document ready signal to know when everything has been initialized
  $(document).ready(function () {
    // Initialize tableau extension
    tableau.extensions.initializeAsync().then(function () {
      // Get worksheets from tableau dashboard
      worksheet = tableau.extensions.dashboardContent.dashboard.worksheets[0];
      worksheet2 = tableau.extensions.dashboardContent.dashboard.worksheets[1];

      // event listener for filters
      let unregisterHandlerFunction = worksheet.addEventListener(tableau.TableauEventType.FilterChanged, filterChangedHandler);
      var result;
      function filterChangedHandler(event) {


        // for filter change
        // Add fieldName with (||) for other filters
        if (event.fieldName === "High Risk") {
          // reload summary data
          let dataArr = [];
          worksheet.getSummaryDataAsync().then(data => {
            let dataJson;
            data.data.map(d => {
              dataJson = {};
              dataJson[data.columns[0].fieldName] = d[0].value; //1st column
              dataJson[data.columns[1].fieldName] = d[1].value; //2nd column
              dataJson[data.columns[2].fieldName] = d[2].value; //3rd column
              dataJson[data.columns[3].fieldName] = d[3].value; //4th column
              dataJson[data.columns[4].fieldName] = d[4].value; //5th column
              dataArr.push(dataJson);
            });

            // converting data to heirarchical json
            result = _(dataArr)
              .groupBy(x => x["Inner circle"])
              .map((value1, key) => ({
                name: key, count: sum(value1), children: _(value1)
                  .groupBy(x => x["Middle circle"])
                  .map((value2, key) => ({
                    name: key, count: sum(value2), children: _(value2)
                      .groupBy(x => x["Outer circle"])
                      .map((value3, key) => ({
                        name: key, count: sum(value3), children: _(value3)
                        .groupBy(x => x["Label"])
                        .map((value4, key) => ({ name: key, count: outersum(value4) , children: [] }))
                        //worksheet.getSelectedMarksAsync().marks.data[0]
                          .value()
                  }))
                  .value()
              }))
              .value()
            }))
            .value();

            plotChart(result);




          });
        }

      }

      unregisterHandlerFunctions.push(unregisterHandlerFunction);


      // load data from worksheet
      let dataArr = [];
      worksheet.getSummaryDataAsync().then(data => {
        let dataJson;

        data.data.map(d => {
          dataJson = {};
          dataJson[data.columns[0].fieldName] = d[0].value; //1st column
          dataJson[data.columns[1].fieldName] = d[1].value; //2nd column
          dataJson[data.columns[2].fieldName] = d[2].value; //3rd column
          dataJson[data.columns[3].fieldName] = d[3].value; //4th column
          dataJson[data.columns[4].fieldName] = d[4].value; //5th column
          dataArr.push(dataJson);
        });

        // converting data to heirarchical json
        result = _(dataArr)
          .groupBy(x => x["Inner circle"])
          .map((value1, key) => ({
            name: key, count: sum(value1), children: _(value1)
              .groupBy(x => x["Middle circle"])
              .map((value2, key) => ({
                name: key, count: sum(value2), children: _(value2)
                  .groupBy(x => x["Outer circle"])
                  .map((value3, key) => ({
                    name: key, count: sum(value3), children: _(value3)
                    .groupBy(x => x["Label"])
                    .map((value4, key) => ({ name: key, count: outersum(value4), children: [] }))
                      .value()
              }))
              .value()
          }))
          .value()
        }))
        .value();

        plotChart(result);


      });


      function sum(arr) {
        let count = 0;
        arr.forEach(element => {
          count += parseInt(element["SUM(Value)"]);
        });
        return count;
      }

      function outersum(arr) {
        let count = 0;
        arr.forEach(element => {
        count = parseInt(element["SUM(Value)"]);
        });
        return count;
      }

    });
  });

  // ========================== D3 CHART ===================== //
  function plotChart(data) {

    var div = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);
    ///svg is size of container
    var width = 950,
      height = 800,
      radius = height / 2;

    var x = d3.scale.linear()
      .range([0, 2 * Math.PI]);

    var y = d3.scale.linear()
      .range([0, radius]);


var color = d3.scale.ordinal()
	.range(['#ffffff', '#ffb400','#f09020', '	#cf0101', '#8b8484','#c10303','#948b8b','#ffb400','#f09020', '#8b8484']);//d3.scale.category20c();


    function getRootmostAncestorByRecursion(node) {
        return node.depth > 1 ? getRootmostAncestorByRecursion(node.parent) : node;
    }

    var arc;




    function graph() {



      d3.select("svg").remove();
      var svg = d3.select("body").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(" + width /2 + "," + (height /2) + ")");

      var partition = d3.layout.partition()
        .value(function (d) { if (d.depth === 3){return 1;} else {return d.count;} });


      arc = d3.svg.arc()
        .startAngle(function (d) {
          return Math.PI / 2 + Math.max(0, Math.min(2 * Math.PI, x(d.x)));
        })
        .endAngle(function (d) {
          return Math.PI / 2 + Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
        })
        .innerRadius(function (d) { return Math.max(0, y(d.y)); })
        .outerRadius(function (d) { return Math.max(0, y(d.y + d.dy)); });

      var root = data[0];


      var g = svg.selectAll("g")
        .data(partition.nodes(root))
        .enter().append("g")





      var path = g.append("path")
        .attr("d", arc)
        .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(getRootmostAncestorByRecursion(d).name); })
        .style("fill", function (d) { return color(getRootmostAncestorByRecursion(d).name);})
        .attr("opacity",function(d) { if(d.count===0){ return 0.2;} else {return 0.9;}})
        .on("click", (d) => click(d));



        var text = g.append("text")
          .attr("transform", function (d) {
            return "translate(" + arc.centroid(d) + ")rotate(" + computeTextRotation(d) + ")";
            // return "rotate(" + computeTextRotation(d) + ")";
          })
          .attr("text-anchor", "middle")
          .attr("dx", "0") // margin
            .attr("opacity",function(d) { if(d.count===0){ return 0.2;} else {return 0.9;}})
          .attr("dy", function(d) {
            if (d.name.split("-").length <2){return "0.35em";}
            else if (d.name.split("-").length ===2) { return "-0.45em";}
            else {return "-0.65em";}

        });

        text.append("tspan")
        .attr("x", 0)
        .text(function(d) {
          return d.depth ? d.name.split("-")[0] || "" : "";
        });

        text.append("tspan")
          .attr("x", 0)
          .attr("dy", "1em")
          .text(function(d) {
              return d.depth ? d.name.split("-")[1] || "" : "";
          });

          text.append("tspan")
            .attr("x", 0)
            .attr("dy", "1em")
            .text(function(d) {
                return d.depth ? d.name.split("-")[2] || "" : "";
            });

$("#one").on("click",function(){
  worksheet.applyFilterAsync("High Risk", ["2"], tableau.FilterUpdateType.Replace).then(
            worksheet.clearFilterAsync("Outer circle").then(
              worksheet.clearFilterAsync("Middle circle").then(
                worksheet.clearFilterAsync("Inner circle")
              )
            )
)
worksheet2.applyFilterAsync("High Risk", ["2"], tableau.FilterUpdateType.Replace).then(
          worksheet2.clearFilterAsync("Outer circle").then(
            worksheet2.clearFilterAsync("Middle circle").then(
              worksheet2.clearFilterAsync("Inner circle")
            )
          )
);});

$("#two").on("click",function(){
  worksheet.clearFilterAsync("High Risk").then(
            worksheet.clearFilterAsync("Outer circle").then(
              worksheet.clearFilterAsync("Middle circle").then(
                worksheet.clearFilterAsync("Inner circle")
              )
            )
)
worksheet2.clearFilterAsync("High Risk").then(
          worksheet2.clearFilterAsync("Outer circle").then(
            worksheet2.clearFilterAsync("Middle circle").then(
              worksheet2.clearFilterAsync("Inner circle")
            )
          )
);});


$("#three").on("click",function(){
//  d3.selectAll("g")
path.transition().style("fill",function(d) { if((d.count===3 || d.count >4) && d.count < 160){ return "#c10303";} else if (d.count>160) {return "#f6f4f4"} else {return "#B4B8B6";}})
  //.attr("d", arc)
  .attr("opacity",function(d) { if((d.count===3 || d.count >4) && d.count < 160){ return 0.9;} else {return 0.5;}})

text.transition().attr("opacity",function(d) { if((d.count===3 || d.count >4) && d.count < 160){ return 0.9;} else {return 0.2;}})

  worksheet2.applyFilterAsync("High Risk", ["2"], tableau.FilterUpdateType.Replace).then(
            worksheet2.clearFilterAsync("Outer circle").then(
              worksheet2.clearFilterAsync("Middle circle").then(
                worksheet2.clearFilterAsync("Inner circle")
              )
            )
  );

    });
//console.log(worksheet.getSummaryDataAsync("High Risk"))


function click(d) {
  // apply filters from d3 chart to worksheet to populate respective data
  let segment = "Inner circle", family = "Middle circle", className = "Outer circle";
  switch (d.depth) {
    case 0: {
      worksheet.clearFilterAsync(family).then(
        worksheet.clearFilterAsync(className).then(
          worksheet.applyFilterAsync(segment, [d.name], tableau.FilterUpdateType.Replace)
        )
      )
      worksheet2.clearFilterAsync(family).then(
        worksheet2.clearFilterAsync(className).then(
          worksheet2.applyFilterAsync(segment, [d.name], tableau.FilterUpdateType.Replace)
        )
      )
      break;
    }
    case 1: {
      worksheet.clearFilterAsync(className).then(
        worksheet.applyFilterAsync(segment, [d.parent.name], tableau.FilterUpdateType.Replace).then(
          worksheet.applyFilterAsync(family, [d.name], tableau.FilterUpdateType.Replace)
        )
      )
      worksheet2.clearFilterAsync(className).then(
        worksheet2.applyFilterAsync(segment, [d.parent.name], tableau.FilterUpdateType.Replace).then(
          worksheet2.applyFilterAsync(family, [d.name], tableau.FilterUpdateType.Replace)
        )
      )
      break;
    }
    case 2: {
      worksheet.applyFilterAsync(segment, [d.parent.parent.name], tableau.FilterUpdateType.Replace).then(
        worksheet.applyFilterAsync(family, [d.parent.name], tableau.FilterUpdateType.Replace).then(
          worksheet.applyFilterAsync(className, [d.name], tableau.FilterUpdateType.Replace)
        )
      )
      worksheet2.applyFilterAsync(segment, [d.parent.parent.name], tableau.FilterUpdateType.Replace).then(
        worksheet2.applyFilterAsync(family, [d.parent.name], tableau.FilterUpdateType.Replace).then(
          worksheet2.applyFilterAsync(className, [d.name], tableau.FilterUpdateType.Replace)
        )
      )
      break;
    }
    default:
  }

  text.transition().attr("opacity", 0);

  path.transition()
    .attrTween("d", arcTween(d))
    .each("end", function (e, i) {
      // check if the animated element's data e lies within the visible angle span given in d
      if (e.x >= d.x && e.x < (d.x + d.dx)) {
        let startAngle = Math.PI / 2 + Math.max(0, Math.min(2 * Math.PI, x(e.x)));
        let endAngle = Math.PI / 2 + Math.max(0, Math.min(2 * Math.PI, x(e.x + e.dx)));
        // get a selection of the associated text element
        var arcText = d3.select(this.parentNode).select("text")
          .attr("opacity", 1)
          .attr("transform", function () {
            if(d.depth>0){
           return "translate(" + arc.centroid(e) + ")rotate(" + computeTextRotationClick(e) + ")";}
           else {return "translate(" + arc.centroid(e) + ")rotate(" + computeTextRotation(e) + ")";}
          })
          .attr("text-anchor", "middle")

      }
      else return ""
    });
}
}
graph();


          function arcTween(d) {
            var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
              yd = d3.interpolate(y.domain(), [d.y, 1]),
              yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
            return function (d, i) {
              return i
                ? function (t) { return arc(d); }
                : function (t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
            };
          }

          function computeTextRotation(d) {
            var ang = (Math.PI / 2 + x(d.x + d.dx / 2) - Math.PI / 2) / Math.PI *180;
            return (ang > 270 || ang < 90) ? ang : 180 + ang;
          }

          function computeTextRotationClick(d) {
            var ang = (Math.PI / 2 + x(d.x + d.dx / 2) - Math.PI / 2) / Math.PI; //*180;
            return (ang > 270 || ang < 90) ? ang : 180 + ang;
          }

        }
        })();
