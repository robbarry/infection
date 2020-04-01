let cities = [];
let city_count = 15;
let minimum_city_spacing = 40; // minimum distance between cities
let minimum_city_pop = 50;
let maximum_city_pop = 200;
let cycle = 0;
let cycles_per_day = 40;
let total_pop = 0;
let infection_display_count = [];
let intervention_display = [];
let city_scale = 80;
let person_scale = 6;

// infection parameters
let infection_distance = 8; // how far apart can dots infect each other
let r0 = 2; // how many dots will each dot infect?
let lockdown_r0 = 1.5;
let infection_duration = cycles_per_day * 14; // how many cycles do dots stay infected
let initial_infection_count = 1;
let interactions = 0;
let interactions_per_turn;
let odds_of_infection;
let immunity_duration = cycles_per_day * 28;

// movement parameters
let travel_prob = 0.0003; // what is the rate of travel
let travel_speed = 4;
let non_travel_speed = 0.2;
let max_non_travel_speed = 0.2; // how fast do dots move inside cities
let travel_prefer_local = 5; // higher number means more local travel
let quarantine_capture_rate = 1; // the probability that an infected person will be quarantined
let lockdown_adjustment = 0.25; // reduce travel to this % during lockdown

// panic parameters
let overwhelmed = 20;
let flee_threshold = overwhelmed / 100; // citizens flee city with infection rate greater than this
let flee_rate = 4; // how much more likely they are to flee

let current_city = -1; // is mouse over a city?

let lockdown_button, quarantine_button;
let displayed_buttons = false;
let nationwide_lockdown = false;
let nationwide_quarantine = false;

let display_graph_x = 450;
let display_graph_width = 300;
let display_graph_scale_factor = 100;

let economic_output = 0;
let economic_output_display = [];

function setup() {	
	frameRate(120);
	createCanvas(window.innerWidth, window.innerHeight);
	let max_cities = round(sqrt(width*height) / (2 * minimum_city_spacing));
	if (city_count > max_cities) { city_count = max_cities; }
	for(var i=0;i<city_count;i++) {
		let my_pop = random(minimum_city_pop, maximum_city_pop);
		total_pop += my_pop;
		cities.push(new city(i, my_pop));
	}
	for(let city of cities) {
		city.initialize_partner_cities();
	}

	for(let i=0;i<initial_infection_count;i++) { cities[0].populace[i].infected = 1; } // patient zeros
	
}

function draw() {	
	cycle++;
	background(220, 220, 220);
	stroke(0, 0, 0, 0);
	fill(0);		
	text("A virus is spreading throughout the cities of a hypothetical country...", 20, 20);
	flee_city_rates = [];
	current_city = -1;
	let total_infected = 0;
	for(let city of cities) {
		mouse_distance = p5.Vector.sub(createVector(mouseX, mouseY), city.pos).mag();
		let selected = false;
		if (mouse_distance < city.radius / 2) {
			selected = true;
			current_city = city.id;
		}
		city.display(selected);
	}
	for(let city of cities) {
		city.display_populace();
		total_infected += city.infected_count;
	}
	if (cycle % 10 == 0) {
		infection_display_count.push(total_infected);
		if (nationwide_lockdown) {
			intervention_display.push(25);
		} else if (nationwide_quarantine) {
			intervention_display.push(50);
		} else {
			intervention_display.push(0);
		}		
		if (infection_display_count.length > display_graph_width) { infection_display_count.shift(); }
	}

	// display graph
	if (total_infected == 0 && cycle > 20) { noLoop(); }
	if (total_infected > 50 || cycle > 200) {
		stroke(50, 50, 50);
		fill(230, 230, 230);
		rect(display_graph_x, 101, display_graph_width, -101);
		for(let i=0; i<infection_display_count.length;i++) {
			stroke("red");
			fill("red");
			line(i + display_graph_x, 100, i + display_graph_x, 100 - infection_display_count[i] / total_pop * display_graph_scale_factor);
			stroke(0, 0, 0, intervention_display[i]);
			fill(0, 0, 0, intervention_display[i]);
			line(i + display_graph_x, 100, i + display_graph_x, -100);
		}
		stroke("blue");
		line(display_graph_x, 100 - overwhelmed, display_graph_x + display_graph_width, 100 - overwhelmed);
		stroke(0, 0, 0, 0);
		fill(0);	
		text("You have three choices: do you issue a nationwide shelter in place order,", 20, 34);
		text("freezing movement (and most economic activity) inside cities?", 20, 46);
		text("Do you implement a massive program of biometric surveillance,", 20, 60);
		text("forcing every infected person into a quarantine city?", 20, 72);
		text("Or do you do nothing?", 20, 86);

		if (!displayed_buttons) {
			displayed_buttons = true;
			lockdown_button = createButton('Nationwide Shelter In Place');
			lockdown_button.position(20, 84 + 14);
			lockdown_button.mousePressed(lockdown_nation);

			quarantine_button = createButton('Forced Quarantine');
			quarantine_button.position(200, 84 + 14);
			quarantine_button.mousePressed(quarantine_nation);			
		}
	}
	daynum = floor(cycle / cycles_per_day);
	stroke(0, 0, 0, 0);
	fill(0);
	text("Day #" + daynum, display_graph_x + 10, 20);
	interactions_per_turn = interactions / (cycle * total_infected);
	let my_r0 = r0;
	if (nationwide_lockdown) my_r0 = lockdown_r0;	
	odds_of_infection = (interactions_per_turn * my_r0) / (infection_duration);							
	
	// economic calculations
	if (cycle % 5 == 0) {
		economic_output_display.push(economic_output);
		while (economic_output_display.length > 300) { economic_output_display.shift(); }
		economic_output = 0;
	}
	stroke("green");
	fill("green");
	for (i = 0; i < economic_output_display.length; i++) {
		let econ_output = economic_output_display[i];
		line(i + display_graph_x + 325, 100, i + display_graph_x + 325, 100 - econ_output);
	}
		
	
}

// class for city

function city(id, pop) {
	this.pop = pop;
	this.id = id;
	this.populace = []; // filled with people
	this.radius = Math.sqrt(this.pop * city_scale);
	this.city_pairs = [];
	this.city_weights = [];
	this.flee_city_weights = [];
	this.infected_count = 0;
	this.infected_rate = 0;
	this.travel_prob = travel_prob;
	this.travel_speed = travel_speed;
	this.non_travel_speed = non_travel_speed;
	this.max_non_travel_speed = max_non_travel_speed;
	this.travel_prefer_local = travel_prefer_local;
	this.lockdown = false;
	this.quarantine = false;

	var reposition = true;
	let efforts = 0;
	while(reposition) {
		reposition = false;
		this.pos = createVector(random(this.radius, width - this.radius), random(this.radius + 110, height - this.radius));
		for(let city of cities) {
			if (city.id != this.id) {
				if (p5.Vector.sub(this.pos, city.pos).mag() < this.radius + city.radius + minimum_city_spacing) {
					reposition = true;
					efforts++;
					if (efforts > 20) {
						minimum_city_spacing = minimum_city_spacing - 1;
					}
					break;
				}
			}
		}
	}

	for(let i=0; i<this.pop; i++) { this.populace.push(new person(i, this)); } // populate our city

	// establish travel patterns in normal times
	this.initialize_partner_cities = function() {
		for(let i=0;i<city_count;i++) {
			if (i != this.id) {
				this.city_pairs.push(i);
				let denominator = pow(p5.Vector.sub(this.pos, cities[i].pos).mag(), this.travel_prefer_local);
				this.city_weights.push(1 / denominator);
			}
		}
	}

	// establish travel patterns during pandemic
	// (more people flee to uninfected cities)
	this.calculate_flee_cities = function() {
		this.flee_city_weights = [];
		for(let i=0;i<city_count;i++) {
			if (i != this.id) {
				let denominator = pow(p5.Vector.sub(this.pos, cities[i].pos).mag(), this.travel_prefer_local);
				let their_infected_rate = cities[i].infected_rate;
				this.flee_city_weights.push(1 / ((their_infected_rate + .001) * denominator));
			}
		}		
	}

	this.display = function(selected) {
		this.radius = Math.sqrt(this.pop * city_scale);
		let my_radius = this.radius;	
		if (this.infected_rate > overwhelmed / 100) {
			strokeWeight(6);
			stroke(255, 0, 0);
			my_radius += 6;
		} else if (this.infected_rate > 0) {
			stroke(200, 0, 0);
			my_radius += 1;
		} else {
			stroke(255, 255 - 100 * this.infected_rate, 255 - 125 * this.infected_rate);	
		}		
		fill(255, 255 - 100 * this.infected_rate, 255 - 125 * this.infected_rate);		
		ellipse(this.pos.x, this.pos.y, my_radius, my_radius);
		strokeWeight(1);
		if (selected) {
			fill(0, 0, 0, 0);
			stroke(0, 255, 0, 200);
			strokeWeight(5);
			ellipse(this.pos.x, this.pos.y, this.radius + 5, this.radius + 5);
			strokeWeight(1);
		}
		if (this.lockdown) {
			fill(0, 0, 0, 0);
			stroke(255, 255, 0, 220);
			strokeWeight(2);
			ellipse(this.pos.x, this.pos.y, this.radius + 3, this.radius + 3);
			strokeWeight(1);			
		}
		if (nationwide_quarantine && this.id == cities[0].id) {
			fill(0, 0, 0, 0);
			stroke(0, 0, 255);
			strokeWeight(3);
			ellipse(this.pos.x, this.pos.y, this.radius + 5, this.radius + 5);
			strokeWeight(1);			
		}
	};

	this.display_populace = function() {
		this.infected_count = 0;
		for (let p of this.populace) {
			p.display();
			p.update();
			p.infect();
			if (p.infected > 0) { this.infected_count += 1; }
			if (!p.in_transit) {
				travel_seed = Math.random();
				let my_travel_prob = this.travel_prob;
				if (nationwide_lockdown) my_travel_prob = my_travel_prob * lockdown_adjustment;
				let fleeing = false;
				if (this.infected_rate > flee_threshold) {
					my_travel_prob = my_travel_prob * flee_rate;
					fleeing = true;					
				}
				let new_city = -1;
				if (nationwide_quarantine && p.infected > 0) {
					if (this.id > 0) {
						if (Math.random() < quarantine_capture_rate / infection_duration) {
							my_travel_prob = 1;												
							new_city = 0;
						}										
					} else {
						my_travel_prob = 0;
					}
				}
				if (travel_seed < my_travel_prob) {
					if (new_city == -1) {
						if (!fleeing) {
							new_city = chance.weighted(this.city_pairs, this.city_weights);	
						} else {
							new_city = chance.weighted(this.city_pairs, this.flee_city_weights);							
						}						
					}					
					p.travel(new_city);
				}
			}
		}
		this.infected_rate = this.infected_count / this.pop;	
		if (this.infected_rate > flee_threshold) { this.calculate_flee_cities(); }	
	}

}

// class for person

function person(id, city) {
	this.city = city;
	this.infected = 0;
	this.id = id;
	let t_pos = p5.Vector.random2D().mult((city.radius - person_scale) / 2 * random(1));
	this.pos = p5.Vector.add(city.pos, t_pos);
	this.vel = p5.Vector.random2D().mult(this.city.non_travel_speed);
	this.in_transit = false;
	this.destination = -1;

	this.display = function() {
		if (this.infected > infection_duration) {
			this.infected = -immunity_duration;
		}
		if (this.infected == 0) {
			stroke(10, 150, 100, 150);
			fill(10, 150, 100, 150);			
		} else if (this.infected > 0) {
			stroke(255, 0, 0, 255);
			fill(255, 0, 0, 255);
			this.infected++;
		} else if (this.infected < 0) {
			stroke(100, 100, 100, 100);
			fill(100, 100, 100, 100);			
			this.infected++;
		}

		ellipse(this.pos.x, this.pos.y, person_scale, person_scale);
	};

	this.update = function() {
		let lockdown_factor = 1;
		if (this.city.lockdown && !this.in_transit) { lockdown_factor = .1; }
		this.move(p5.Vector.mult(this.vel, lockdown_factor));
		let dist = p5.Vector.sub(this.pos, this.city.pos).mag();
		if (dist < this.city.radius / 3 && this.in_transit) {
			this.in_transit = false; 
			this.vel = p5.Vector.random2D().mult(this.city.non_travel_speed);
		}
		if (!this.in_transit) {
			if (this.vel.mag() > this.city.max_non_travel_speed) { this.vel.mult(.9); }
	      	if (dist >= this.city.radius / 2 - (person_scale / 2)) {
	      		if (dist >= this.city.radius / 2 + 1.5) {
	      			this.pos.sub(this.city.pos);
	      		}
		        let baseDelta = p5.Vector.sub(this.city.pos, this.pos);
		        baseDelta.normalize();
		        let normal = new p5.Vector(baseDelta.x, baseDelta.y);
		        let incidence = p5.Vector.mult(this.vel, -1);
		        let dot = incidence.dot(normal);
		        this.vel.set(2*normal.x*dot - incidence.x, 2*normal.y*dot - incidence.y, 0);
		        this.move(this.vel);  
	      	} 
	    }
	}

	this.move = function(velocity) {
		this.pos.add(velocity);
		advance_economic_activity(this, velocity);
	}

	this.travel = function(city_num) {		
		if (city_num != this.id) {
			this.in_transit = true;
			cities[this.city.id].populace.splice(this.id, 1);
			cities[this.city.id].pop -= 1;
			this.city = cities[city_num];
			let my_travel_speed = this.city.travel_speed;
			if (nationwide_lockdown) my_travel_speed = my_travel_speed * lockdown_adjustment;
			this.vel = p5.Vector.sub(cities[city_num].pos, this.pos).normalize().mult(my_travel_speed);	
			cities[city_num].populace.push(this);
			this.id = cities[city_num].populace.length - 1;
			cities[city_num].pop += 1;
		}
	}

	this.infect = function() {
		if (this.infected > 0) {
			for (let p of this.city.populace) {
				if (p.id != this.id) {
					if (p5.Vector.sub(this.pos, p.pos).mag() < infection_distance) {
						if (p.infected == 0) { interactions++; }
						if (cycle >= 5) {														
							if (Math.random() < odds_of_infection) { 
								if (p.infected == 0) { p.infected = 1; }
							}						
						}
					}
				}
			}			
		}
	}
}

function mouseClicked() {
	if (current_city > -1) {
		city = cities[current_city];
		city.lockdown = !city.lockdown;
	}
}	

function lockdown_nation() {
	nationwide_lockdown = !nationwide_lockdown;
	if (nationwide_lockdown) {
		if (nationwide_quarantine) { quarantine_nation(); }
		lockdown_button.style("background-color", "yellow");
		for (let city of cities) { city.lockdown = true; }
	} else {
		lockdown_button.style("background-color", "white");
		for (let city of cities) { city.lockdown = false; }
	}
}

function quarantine_nation() {
	nationwide_quarantine = !nationwide_quarantine;
	if (nationwide_quarantine) {
		if (nationwide_lockdown) { lockdown_nation(); }
		quarantine_button.style("background-color", "lightblue");
	} else {
		quarantine_button.style("background-color", "white");
	}
}

function advance_economic_activity(p, velocity) {	
	if (p.infected <= 0) {
		economic_output += velocity.mag() / 35;	
	} else {
		economic_output -= velocity.mag() / 35;	
	}
}