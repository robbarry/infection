let peeps = []; // people array
let quarantines = [];

// not really using these vars anymore...
let infected_count = [];
let immune_count = [];
let healthy_count = [];

// keep track of time
var cycle = 0;
var cycles_per_day = 37;

// boundaries the peeps will bounce off of
var boundary_height;
var boundary_width;

var population;
var testing_speed;
var infection_duration; // peeps remain infected for this many cycles
let immune_duration; // peeps remain immune for this many cycles
let initial_infections;

var score = [];

let quarantine_radius = 100; // default size for quarantines

let r0;

let interactions = 0;
let interactions_per_turn = 0;
let odds_of_infection = 0;

let box_x = 25;
let box_y;
let box_width = 550;
let box_height = 95;

function rand(n = 1) {
    return 2 * (Math.random() - 0.5) * n;
}

function virus(parent = null) {
    if (parent == null) {
        this.infection_duration = get_parameter("infection_duration", 14, true) * (500 / 14) * 1
            // this.immune_duration = round(get_parameter("immune_duration", 40, true) * (500 / 14)) * 1
        this.immune_duration = this.infection_duration * 10;
        this.r0 = get_parameter("r0", 2.7, true) * 1;
        this.mutation_rate = 0.5;
        this.generation = 0;
        this.severity = 1
        this.radius = 1
    } else {
        this.infection_duration = parent.infection_duration
        this.immune_duration = parent.immune_duration
        this.r0 = parent.r0
        this.mutation_rate = parent.mutation_rate
        this.severity = parent.severity
        this.generation = parent.generation + 1;
        this.radius = parent.radius
    }
    this.strain = function() {
        return round(sqrt(this.infection_duration * this.immune_duration * this.r0 * this.mutation_rate * this.severity * this.radius))
    }

    this.mutate = function() {
        r = Math.random()
        if (r < this.mutation_rate) {
            drastic = 1
            if (r < this.mutation_rate / 100) {
                drastic = 100;
            }

            this.infection_duration += rand(10 * drastic);
            if (this.infection_duration <= 1) this.infection_duration = 1;
            if (this.infection_duration > 30 * 500 / 14) this.infection_duration = 30 * 500 / 14;

            // this.immune_duration += rand(10 * drastic);
            // if (this.immune_duration <= 10) this.immune_duration = 10;
            // if (this.immune_duration > 10000) this.immune_duration = 10000;
            this.immune_duration = this.infection_duration * 10;

            this.r0 += rand(0.1 * drastic)
            if (this.r0 <= 0) this.r0 = 0
            if (this.r0 >= 100) this.r0 = 100

            this.mutation_rate += rand(0.01 * drastic)
            if (this.mutation_rate < 0.001) this.mutation_rate = 0.001
            if (this.mutation_rate > 1) this.mutation_rate = 1

            this.severity += rand(0.1 * drastic)
            if (this.severity < 1) this.severity = 1
            if (this.severity > 10) this.severity = 10

            this.radius += rand(0.1 * drastic)
            if (this.radius < 1) this.radius = 1
            if (this.radius > 2) this.radius = 2
        }
    }

}

function setup() {
    // let params = getURLParams();
    population = get_parameter("population", 500, true);
    infection_duration = get_parameter("infection_duration", 14, true) * (500 / 14);
    immune_duration = round(get_parameter("immune_duration", 40, true) * (500 / 14));
    r0 = get_parameter("r0", 2.7, true);
    testing_speed = get_parameter("testing_speed", 10, true);
    peep_speed = get_parameter("peep_speed", 0.35, true);
    initial_infections = get_parameter("initial_infections", 1, true);
    mutation_rate = 0.0001;
    travel_rate = 0.0001;
    createCanvas(1600, 800);
    box_y = height;
    boundary_width = width;
    boundary_height = height - (box_height + 5); // space on the bottom for scores and graphs
    // instantiate new peeps
    for (var i = 0; i < population; i++) {
        peeps.push(new peep(i));
    }
}

function get_parameter(parameter_name, default_value, set_input) {
    let params = getURLParams();
    value = params[parameter_name];
    if (isNaN(value)) { value = default_value; }
    if (set_input) {
        document.getElementById(parameter_name).value = value;
    }
    return value;
}


function draw() {
    background('white');
    let infected = 0;
    let immune = 0;
    let healthy = 0;
    let population_out_of_quarantine = 0;
    r0 = 0;
    infection_duration = 0
    immune_duration = 0
    mutation_rate = 0
    counts = {}
    max_generation = -1;
    min_generation = 999999999999;
    severity = 0
    radius = 0
    for (let peep of peeps) {
        peep.check_quarantine_collision();
        peep.update();
        peep.display();
        peep.check_boundary_collision();
        if (!peep.in_quarantine) population_out_of_quarantine++;
        // update status counts
        if (peep.infected > 0) {
            infected += 1;
            r0 += peep.virus.r0
            infection_duration += peep.virus.infection_duration
            immune_duration += peep.virus.immune_duration
            mutation_rate += peep.virus.mutation_rate
            severity += peep.virus.severity
            radius += peep.virus.radius
            if (peep.virus.generation > max_generation) max_generation = peep.virus.generation
            if (peep.virus.generation < min_generation) min_generation = peep.virus.generation
        }
        if (peep.infected < 0) { immune += 1; }
        if (peep.infected == 0) { healthy += 1; }

    }
    if (infected > 0) {
        r0_d = round(10 * r0 / infected) / 10
        severity_d = round(100 * severity / infected) / 100
        radius_d = round(100 * radius / infected) / 100
        mutation_rate_d = round(mutation_rate / infected * 100) / 100
        infection_duration_d = round(5 * infection_duration / infected * (14 / 500)) / 5
        console.log(min_generation, max_generation, r0_d, severity_d, radius_d, mutation_rate_d, infection_duration_d)
    }


    for (let i = 0; i < population; i++) {
        for (let j = i + 1; j < population; j++) {
            peeps[i].check_collision(peeps[j]);
        }
    }

    for (let quarantine of quarantines) {
        quarantine.display();
    }

    if (cycle % 9 == 0) {
        infected_count.push(infected);
        immune_count.push(immune);
        healthy_count.push(healthy);
        while (infected_count.length > box_width) {
            infected_count.shift();
            immune_count.shift();
            healthy_count.shift();
        }
    }
    stroke(100);
    fill(250, 250, 250);
    rect(box_x - 1, box_y, box_width + 1, -(box_height + 1));
    for (i = 0; i < infected_count.length; i++) {
        let scaled_infected = infected_count[i] / population * box_height;
        let scaled_immune = immune_count[i] / population * box_height;
        let scaled_healthy = healthy_count[i] / population * box_height;
        stroke(200, 0, 0);
        fill(200, 0, 0);
        line(i + box_x, box_y - scaled_infected, i + box_x, box_y);
        stroke(10, 150, 100, 150);
        fill(10, 150, 100, 150);
        line(i + box_x, (box_y - scaled_infected) - scaled_healthy, i + box_x, box_y - scaled_infected);
        stroke(204);
        fill(204);
        line(i + box_x, (box_y - scaled_infected - scaled_healthy) - scaled_immune, i + box_x, (box_y - scaled_infected - scaled_healthy));
    }

    // infect patient 0 when we hit 100 cycles.
    if (cycle == cycles_per_day) {
        for (let i = 0; i < initial_infections; i++) { peeps[i].init_infection() }

    }

    document.getElementById("results").innerHTML = "Day #" + round(cycle / cycles_per_day);

    if (cycle > cycles_per_day) {
        for (var i = 0; i < score.length; i++) {
            stroke(100, 255, 100);
            fill(100, 255, 100);
            let scaled_score = score[i] * 90 / healthy_gdp;
            rect(i, height - scaled_score, 1, scaled_score);
        }
        fill(0);
        stroke(0);
    }

    if (infected == 0 && cycle > cycles_per_day) {
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

    if (mouseY >= 0) {
        stroke(125, 125, 125);
        noFill();
        let no_preview = false;
        // need to turn this off when quarantine can't be drawn
        for (let q of quarantines) {
            distance = p5.Vector.sub(new p5.Vector(mouseX, mouseY), q.center).mag();
            if (distance <= quarantine_radius + q.radius + 5) {
                no_preview = true;
            }
        }
        if (!no_preview) {
            stroke(204, 204, 0);
            strokeWeight(5);
        } else {
            stroke(200, 200, 200);
            strokeWeight(2);
        }
        ellipse(mouseX, mouseY, quarantine_radius * 2, quarantine_radius * 2);
        if (!no_preview) {
            stroke(0);
            strokeWeight(1);
        } else {
            stroke(255, 0, 0);
            strokeWeight(1);
        }
        ellipse(mouseX, mouseY, quarantine_radius * 2, quarantine_radius * 2);
    }

    cycle++;
    interactions_per_turn = interactions / (cycle * population_out_of_quarantine);
}


// person object
function peep(my_id) {
    this.id = my_id;
    this.radius = 8.0;
    this.m = this.radius * 0.1;
    this.infected = 0;
    this.gdp_value = 1; // how much they contribute to the economy when healthy
    this.infected_others = 0;
    this.in_quarantine = false;
    this.last_strain = -100;
    this.immunities = []

    this.vel = p5.Vector.random2D();
    this.vel.mult(peep_speed);
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
        if (this.in_quarantine) {
            stroke(100);
        }
        fill(10, 150, 100, 150);

        if (this.infected < 0) {
            r = this.last_strain % 255;
            if (r > 255) r = 255
            g = 0;
            b = 255 - r;
            a = 50;
            fill(r, g, b, a);
            // fill(204); 
        }

        if (this.infected > 0) {
            if (this.infected >= testing_speed * cycles_per_day) {
                r = this.virus.strain() % 255;
                g = 0;
                b = 255 - r;
                a = 150 + 100 / (255.0 / (255 - 150));
            } else {
                r = 10 + 0 * this.infected / (255.0 / (255 - 10));
                g = 150 - 0 * this.infected / (255.0 / 150);
                b = 100 - 0 * this.infected / (255.0 / 100);
                a = 150 + 0 * this.infected / (255.0 / (255 - 150));
            }
            if (r > 255) { r = 255; }
            if (g < 0) { g = 0; }
            if (b < 0) { b = 0; }
            if (a > 255) { a = 255; }
            fill(r, g, b, a);
        }

        ellipse(this.pos.x, this.pos.y, this.radius * 2, this.radius * 2);
    };

    this.update = function() {
        if (this.vel.mag() > peep_speed * 1.5) { this.vel.mult(0.8); }
        if (this.vel.mag() < peep_speed * 0.1) { this.vel.mult(1.1); }
        if (Math.random() < travel_rate) {
            this.vel.mult(1000 * Math.pow(Math.random(), 10));
        }
        add_vel = this.vel.copy()
        if (this.infected > 0) add_vel.mult(1 / this.virus.severity);
        this.pos.add(add_vel);

        if (this.infected != 0) {
            this.infected++;
        }
        if (this.infected > 0 && this.infected > this.virus.infection_duration) {
            this.infected = round(-this.virus.immune_duration);
            this.last_strain = this.virus.strain();
            this.immunities.push(this.virus.strain());
        }


    };

    this.check_boundary_collision = function() {
        // check the walls:
        if (this.pos.x > boundary_width - this.radius) {
            this.pos.x = boundary_width - this.radius;
            this.vel.x *= -1;
        } else if (this.pos.x < this.radius) {
            this.pos.x = this.radius;
            this.vel.x *= -1;
        } else if (this.pos.y > boundary_height - this.radius) {
            this.pos.y = boundary_height - this.radius;
            this.vel.y *= -1;
        } else if (this.pos.y < this.radius) {
            this.pos.y = this.radius;
            this.vel.y *= -1;
        }
    };

    this.check_quarantine_collision = function() {
        // check the user-drawn boundaries:
        this.in_quarantine = false;
        for (let q of quarantines) {
            let d = p5.Vector.sub(this.pos, q.center).mag();
            if (d <= q.radius) { this.in_quarantine = true; }
            if (d >= q.radius - this.radius - 4 && d <= q.radius + this.radius + 4) {
                let baseDelta = p5.Vector.sub(q.center, this.pos);
                baseDelta.normalize();
                let normal = new p5.Vector(baseDelta.x, baseDelta.y);
                let incidence = p5.Vector.mult(this.vel, -1);
                let dot = incidence.dot(normal);
                this.vel.set(2 * normal.x * dot - incidence.x, 2 * normal.y * dot - incidence.y, 0);
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
        min_distance = this.radius + other.radius;
        infect_distance = min_distance
        if (this.infected > 1) {
            infect_distance = infect_distance * this.virus.radius
        }

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
            if (!this.in_quarantine) { interactions++; }
        }
        if (distance < infect_distance) {
            this.infect(other);
        }
    };

    this.init_infection = function() {
        this.infected = 1;
        this.virus = new virus()
    }

    this.infect = function(other) {
        if (this.infected > 0 && other.infected <= 0) {
            // if (this.infected_others < this.will_infect) {
            odds_of_infection = (this.virus.r0 * this.virus.severity) / (this.virus.infection_duration * interactions_per_turn);
            if (Math.random() < odds_of_infection) {
                infect_other = true;
                if (other.infected < 0) {
                    for (strain in other.immunities) {
                        if (abs(strain - this.virus.strain()) < 20) infect_other = false
                    }
                }
                if (infect_other) {
                    other.infected = 1;
                    other.virus = new virus(parent = this.virus);
                    other.virus.mutate()
                    this.infected_others++;
                }
            }
            // }      
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
    if (quarantine_radius < 50) { quarantine_radius = 50; }
    if (quarantine_radius > 400) { quarantine_radius = 400; }
    // console.log(event.delta);
}

function mouseClicked(evt) {
    if (mouseY < 0) { return; }
    if (evt.shiftKey) {
        for (let i = 0; i < quarantines.length; i++) {
            q = quarantines[i];
            let max_radius = q.radius + quarantine_radius;
            if (p5.Vector.sub(new p5.Vector(mouseX, mouseY), q.center).mag() <= max_radius / 2) {
                quarantines.splice(i, 1);
            }
        }

    } else {
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
}

function rpois(mean) {

    var L = Math.exp(-mean);
    var p = 1.0;
    var k = 0;

    do {
        k++;
        p *= Math.random();
    } while (p > L);

    return (k - 1);
}