;(function (exports){

var World = function(mapCanvas,mapdata){
  this.WIDTH = window.innerWidth;
  this.HEIGHT = window.innerHeight;
  this.CENTER = { x: this.WIDTH/2, y: this.HEIGHT/2};

  this.scale,this.projection,this.path,this.scale;

  this.mapdata = mapdata;

  var mapCanvas = getCanvas(mapCanvas);

  sizeCanvas(mapCanvas,this.WIDTH,this.HEIGHT);

  var c = getContext(mapCanvas);

  this.startTick(c);

};

World.prototype = {

  startTick: function(c){
    var self = this;

    this.map = new Map(this);
    this.map.init(c);

    var tick = function(){

      self.draw(c);
      requestAnimationFrame(tick);

    }

    requestAnimationFrame(tick);

  },

  draw: function(c){
    c.clearRect(0, 0, this.WIDTH, this.HEIGHT);
    this.map.update(c);
  }

};

var getCanvas = function(canvasId){
  return document.getElementById(canvasId);
};

var getContext = function(canvas){
  return canvas.getContext("2d");
};

var sizeCanvas = function(canvas,width,height){
  canvas.width = width;
  canvas.height = height;
};

var Map = function(world){
  this.world = world;
  this.rotation = 90;
  this.size = {x: world.WIDTH, y: world.HEIGHT};
  this.center = {x: 0, y: 0};
  this.data = world.mapdata;
  this.scale = 100000;
};

Map.prototype = {

  init: function(c){
    initMap(this,c);
  },

  update: function(c){

    if(this.rotation > 0){

      this.rotation -= 0.5;
    
    }

    if(this.scale < 7000000){

      this.scale += 24000;
    }

    this.world.projection.scale(this.scale);

    c.save();

    c.translate(this.world.WIDTH/2,this.world.HEIGHT/2);
    c.rotate(this.rotation*Math.PI/180);
    c.translate(-this.world.WIDTH/2,-this.world.HEIGHT/2);

    drawStreetLines(this,c);
    this.data.multipolygons.features.forEach(drawBuildings,[this,c]);
    writeStreetNames(this,c);

    c.restore();
  
    }


};


// Using d3 path generator for street lines

var drawStreetLines = function(obj,c){
  
  c.strokeStyle = 'rgba(0,0,0,0.1)';
  c.lineWidth = '1';
  c.beginPath();
  obj.world.path(obj.data.lines, obj.data.lines.features);
  c.closePath();
  c.stroke();

}

// Write street names looping through data

var writeStreetNames = function(obj,c){

  // cycle through street names

  for(var s = 0; s < obj.data.lines.features.length; s++){

    var street = obj.data.lines.features[s];
    var streetName = street.properties.name;

    // if name is not empty and it's a 'highway'
    if(streetName !== null && street.properties.highway !== null){

      // cycle through each line point of the street, start from the second point
      for(var l = 1; l < street.geometry.coordinates.length; l++){

        screenPoint1 = getP(obj,street.geometry.coordinates[l-1])
        screenPoint2 = getP(obj,street.geometry.coordinates[l]);

          // if the line is long enough, add street name to every second point
          if(getDist(screenPoint1,screenPoint2) > 100 && l%2 === 0){

            midp = getMid(screenPoint1,screenPoint2);
            delta = getDif(screenPoint2,screenPoint1);
            angle = Math.atan2(delta[1], delta[0]) * 180 / Math.PI;

            // Limit the angle for street names
            if(angle < -90){
              angle += 180;
            }
            if(angle > 90){
              angle -= 180;
            }

            cx = midp[0];
            cy = midp[1];

            c.save();
            c.translate(cx,cy);
            c.rotate(angle*Math.PI/180);
            c.translate(-cx,-cy);

            c.fillStyle = '#666';
            c.font = "10px Helvetica";
            c.textAlign = "center";
            c.textBaseline = "middle";
            
            c.fillText(streetName,midp[0],midp[1]);

            c.restore();

          }
       }
    }
  }
}

// Path generator function for buildings

var drawBuildings = function(value,index,array){

  var color = index % 2 === 0 ? '#ccc' : '#bbb';
  var obj = this[0];
  var c = this[1];

  c.beginPath();

  for(var p = 0; p < value.geometry.coordinates[0][0].length; p++){

    var point = obj.world.projection(value.geometry.coordinates[0][0][p]);

    if(p === 0){
      c.moveTo(point[0],point[1]);
    }
    else{
      c.lineTo(point[0],point[1]);
    }

  }

  c.closePath();   
  c.fillStyle = color;
  c.fill();
}

var initMap = function(obj,c){

  obj.world.projection = d3.geo.mercator().center([-74.00054,40.72051]).scale(obj.scale).translate([obj.world.WIDTH/2, obj.world.HEIGHT/2]);
  obj.world.path = d3.geo.path().projection(obj.world.projection).context(c);

  obj.data.multipolygons.features.forEach(drawBuildings,[obj,c]);
  drawStreetLines(obj,c);
  writeStreetNames(obj,c);

}

// Helper functions

// Get distance between two points on the screen 
var getDist = function(xy,xy2){
  return Math.sqrt(Math.pow(xy[0]-xy2[0],2) + Math.pow(xy[1]-xy2[1],2));
}

// Convert from geographic coordinates to screen coordinates converting with d3 projection
var getP = function(obj,coord){
  return obj.world.projection(coord);
}

// Get the middle point between two lines
var getMid = function(xy,xy2){
  return [(xy2[0] + xy[0])/2, (xy2[1] + xy[1])/2];
}

// Get difference of two points
var getDif = function(xy,xy2){
  return [xy2[0] - xy[0], xy2[1] - xy[1]];
}

// Check if both files of mapdata has loaded
var init = function(data,name){
  mapdata[name] = data;
  if(mapdata.hasOwnProperty('lines') && mapdata.hasOwnProperty('multipolygons')){
    new World("mapCanvas",mapdata);

  }

}

// Start to load data when window has loaded

window.onload = function(){

  mapdata = {};

  d3.json("lines.json", function(error, data) {
    init(data,"lines");
  });

  d3.json("multipolygons.json", function(error, data) {
    init(data,"multipolygons");
  });

};


})(this);