let peeps = [];        // people array
let quarantines = [];

// not really using these vars anymore...
var infected_count = [];
var immune_count = [];
var healthy_count = [];

// keep track of time
var cycle = 0;

// boundaries the peeps will bounce off of
var boundary_height;
var boundary_width;

var population = 200;
var testing_rate = 0.3;
var infection_duration = 500; // peeps remain infected for 500 cycles
var immune_duration = 500000000; // peeps remain immune basically forever

var score = [];

let quarantine_radius = 100; // default size for quarantines

// gdp currently calculated via collisions.
// when two healthy peeps collide outside quarantine, that adds to gdp
// if peeps are inside quarantine or not healthy, they don't count towards gdp
// (also if they're "recovered" they don't count towards gdp... probably need to
// refigure that...
var gdp = 0;
var healthy_gdp;

function setup() {
  createCanvas(900, 600);
  boundary_width = width;
  boundary_height = height - 100;
  // instantiate new peeps
  for(var i=0;i<population;i++) {
    peeps.push(new peep(i));
  } 
}


function draw() {
  background('white');
  let infected = 0;
  let immune = 0;
  let healthy = 0;
  for (let peep of peeps) {
    peep.check_quarantine_collision();
    peep.update();
    peep.display();
    peep.check_boundary_collision();
    
    // update status counts
    if (peep.infected > 0) { infected += 1; }
    if (peep.infected < 0) { immune += 1; }
    if (peep.infected == 0) { healthy += 1; }
  }

  for (let i = 0; i < population; i++) {
    for (let j = i + 1; j < population; j++) {
      peeps[i].check_collision(peeps[j]);
    }
  }
  
  for (let quarantine of quarantines) {
    quarantine.display();
  }
  
  
  // this code is all for displaying scores at bottom
  // very tentative
  let sc = gdp / (cycle + 1);
  if (cycle % 9 == 0) {
    fill(0);
    stroke(0);
    score.push(sc);       
    while (score.length > 200) { score.shift(); }      
    infected_count.push(infected);
    while (infected_count.length > 200) { infected_count.shift(); }
    
  }
  
  for(var i = 0; i < score.length; i++) {
    stroke(100, 255, 100);
    fill(100, 255, 100);
    let scaled_score = score[i] * 10;
    rect(i, height - scaled_score, 1, scaled_score);
  } 
  fill(0);
  stroke(0);
  text(round(sc * 1000), 220, boundary_height + 50);

  for(i = 0; i < infected_count.length; i++) {
    stroke(200, 0, 0);
    fill(200, 0, 0);    
    let scaled_infected = infected_count[i] / population * 100;
    rect(i + 300, height - scaled_infected, 1, scaled_infected);
  }    

  // infect patient 0 when we hit 100 cycles.
  // store healthy GDP so we can measure decline
  if (cycle == 100) {
    healthy_gdp = sc;
    peeps[0].infected = 1;
  }
  
  if (cycle > 100) {
    fill(0);
    stroke(0);    
    text(round(100 * (sc / healthy_gdp - 1)) + "%", 220, boundary_height + 75);    
  }

  if (infected == 0 && cycle > 100) {
    noLoop();
  }
  
// earlier code for displaying other information about population health...

//  if (cycle % 3 == 0) {
//    infected_count.push(infected);
//    immune_count.push(immune);
//    healthy_count.push(healthy);
//    while (infected_count.length >= width) {
//      infected_count.pop(0);      
//      healthy_count.pop(0);
//      immune_count.pop(0);
//    }
//  }

//  for(let i = 0; i < infected_count.length; i++) {
//    let scale = 100.0 / population;
//    let inf_count = infected_count[i] * scale;
//    let imm_count = immune_count[i] * scale;
//    let health_count = healthy_count[i] * scale;
//    stroke(255, 0, 0);
//    fill(255, 0, 0);
//    rect(i, height - inf_count, 1, inf_count);
//    stroke(204, 204, 204);
//    rect(i, height - inf_count - health_count, 1, health_count);
//    stroke(100, 200, 255);
//    rect(i, height - inf_count - health_count - imm_count, 1, imm_count);
//  }
  
  stroke(125, 125, 125);
  noFill();
  
  // need to turn this off when quarantine can't be drawn
  ellipse(mouseX, mouseY, quarantine_radius * 2, quarantine_radius * 2);
  
  cycle++;
}


// person object
function peep(my_id) {
  this.id = my_id;
  this.radius = 8.0;
  this.m = this.radius * 0.1;
  this.infected = 0;
  this.gdp_value = 1; // how much they contribute to the economy when healthy
  
  this.vel = p5.Vector.random2D();
  this.vel.mult(1);

  // position the peeps and make sure their starting position doesn't overlap
  let retry = true;  
  while (retry) {
    retry = false;
    this.pos = createVector(random(10, boundary_width - 10), random(10, boundary_height - 10));
    for (let other of peeps) {
      if (other.id != this.id) {
        let distance = p5.Vector.sub(this.pos, other.pos).mag();
        let min_distance = this.radius + other.radius + 2.0;
        if (distance < min_distance) {
          retry = true;
          break;
        }
      }        
    }
  }
  
  
  this.display = function() {
    noStroke();
    fill(204);
    if (this.infected < 0) { fill(0, 100, 255); }
    if (this.infected > 0) {
      let r = 204 + testing_rate * this.infected/(255.0/(255-204));
      let g = 204 - testing_rate * this.infected/(255.0/204);
      let b = 204 - testing_rate * this.infected/(255.0/204);
      if (r > 255) { r = 255; }
      if (g < 0) { g = 0; }
      if (b < 0) { b = 0; }
      fill(r, g, b);
    }
    
    ellipse(this.pos.x, this.pos.y, this.radius * 2, this.radius * 2);
  };
  
  this.update = function() {
    if (this.vel.mag() > 1.5) { this.vel.mult(0.9); }
    if (this.vel.mag() < 0.1) { this.vel.mult(1.1); }
    this.pos.add(this.vel);    
    
    if (this.infected > 0) {
      this.gdp_value = 0;
    }
    if (this.infected != 0) {
      this.infected++;
    }
    if (this.infected > infection_duration) {
      this.infected = -immune_duration;
    }
    
    
  };

  this.check_boundary_collision = function() {
    // check the walls:
    if (this.pos.x > boundary_width-this.radius) {
      this.pos.x = boundary_width-this.radius;
      this.vel.x *= -1;
    } else if (this.pos.x < this.radius) {
      this.pos.x = this.radius;
      this.vel.x *= -1;
    } else if (this.pos.y > boundary_height-this.radius) {
      this.pos.y = boundary_height-this.radius;
      this.vel.y *= -1;
    } else if (this.pos.y < this.radius) {
      this.pos.y = this.radius;
      this.vel.y *= -1;
    }    
  };
  
  this.check_quarantine_collision = function() {
    // check the user-drawn boundaries:
    for (let q of quarantines) {      
      let d = p5.Vector.sub(this.pos, q.center).mag();
      if (d < q.radius) {
        this.gdp_value = 0;
      }
      if (d >= q.radius - this.radius - 4 && d <= q.radius + this.radius + 4) {
        let baseDelta = p5.Vector.sub(q.center, this.pos);
        baseDelta.normalize();
        let normal = new p5.Vector(baseDelta.x, baseDelta.y);
        let incidence = p5.Vector.mult(this.vel, -1);
        let dot = incidence.dot(normal);
        this.vel.set(2*normal.x*dot - incidence.x, 2*normal.y*dot - incidence.y, 0);
        this.pos.add(this.vel);        
      } 
      
      // another way to handle this -- or maybe another feature (lockdown?):
      // if the peep is inside the quarantine, freeze 'em
      //if (d < q.radius - this.radius) {
      //  this.vel.mult(0);
      //} else if (d >= q.radius && d <= q.radius + this.radius + 4) {
      //  let baseDelta = p5.Vector.sub(q.center, this.pos);
      //  baseDelta.normalize();
      //  let normal = new p5.Vector(baseDelta.x, baseDelta.y);
      //  let incidence = p5.Vector.mult(this.vel, -1);
      //  let dot = incidence.dot(normal);
      //  this.vel.set(2*normal.x*dot - incidence.x, 2*normal.y*dot - incidence.y, 0);
      //  this.pos.add(this.vel);        
      //} 
    }      
  };

  this.check_collision = function(other) {
    
    // Get distances between the balls components
    let distance = p5.Vector.sub(other.pos, this.pos).mag();

    // Minimum distance before they are touching
    let min_distance = this.radius + other.radius;

    if (distance < min_distance) {
      let dx = other.pos.x - this.pos.x;
      let dy = other.pos.y - this.pos.y;
      let angle = atan2(dy, dx);
      let targetX = this.pos.x + cos(angle) * min_distance;
      let targetY = this.pos.y + sin(angle) * min_distance;
      let ax = (targetX - other.pos.x);
      let ay = (targetY - other.pos.y);
      this.vel.x -= ax;
      this.vel.y -= ay;
      other.vel.x += ax;
      other.vel.y += ay;
      gdp = gdp + this.gdp_value + other.gdp_value;      
      this.infect(other);
    }    
  };
  
  this.infect = function(other) {
    if (this.infected > 0 && other.infected == 0) {
      other.infected = 1;
    } else if (other.infected > 0 && this.infected == 0) {
      other.infect(this);
    }    
    
  };

}


function quarantine(cx, cy, r) { 
  
  this.center = new p5.Vector(cx, cy);
  this.radius = r;

  this.display = function() {
    noFill();
    stroke(204, 204, 0);
    strokeWeight(10);
    ellipse(this.center.x, this.center.y, this.radius * 2, this.radius * 2);
    strokeWeight(1);    
  };
  
}

function mouseWheel(event) {
  quarantine_radius += event.delta;
  if (quarantine_radius < 10) { quarantine_radius = 10; }
  if (quarantine_radius > 400) { quarantine_radius = 400; }
  console.log(event.delta);
}

function mouseClicked() {
  for (let q of quarantines) {
    let max_radius = q.radius + quarantine_radius;
    if (p5.Vector.sub(new p5.Vector(mouseX, mouseY), q.center).mag() <= max_radius + 5) {
      return false;
    }    
  }
  let q = new quarantine(mouseX, mouseY, quarantine_radius);
  quarantines.push(q); 
  for (let peep of peeps) {
    let d = p5.Vector.sub(peep.pos, q.center).mag();
    if ((d > q.radius - peep.radius - 4) && (d < q.radius + peep.radius + 4)) {
      let base = p5.Vector.sub(peep.pos, q.center).mult(0.3);
      peep.pos.sub(base);
      
      //base.normalize().mult(12);
      //peep.pos.sub(base);
    }
  }
}
