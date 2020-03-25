let cities = [];
let city_count = 30;
let minimum_city_distance = 25;
let minimum_city_pop = 20;
let maximum_city_pop = 120;
let r0 = 0.1;
let travel_prob = 0.001;
let infection_duration = 500;

function setup() {
	createCanvas(window.innerWidth, window.innerHeight);
	for(var i=0;i<city_count;i++) {
		cities.push(new city(i, random(minimum_city_pop, maximum_city_pop)));
	}
	for(let city of cities) {
		city.initialize_partner_cities();
	}
	cities[0].populace[0].infected = 1;
}

function draw() {
	background(220, 220, 220);
	for(let city of cities) {
		city.display();
	}
	for(let city of cities) {
		city.display_populace();
	}
}

function city(id, pop) {
	this.pop = pop;
	this.id = id;
	this.populace = [];
	this.radius = Math.sqrt(this.pop * 40);
	this.city_pairs = [];
	this.city_weights = [];

	var reposition = true;
	while(reposition) {
		reposition = false;
		this.pos = createVector(random(this.radius, width - this.radius), random(this.radius, height - this.radius));
		for(let city of cities) {
			if (city.id != this.id) {
				if (p5.Vector.sub(this.pos, city.pos).mag() < this.radius + city.radius + minimum_city_distance) {
					reposition = true;
					break;
				}
			}
		}
	}

	for(var i=0; i<this.pop; i++) {
		this.populace.push(new person(i, this));
	}

	this.initialize_partner_cities = function() {
		for(var i=0;i<city_count;i++) {
			if (i != this.id) {
				this.city_pairs.push(i);
				this.city_weights.push(1 / p5.Vector.sub(this.pos, cities[i].pos).magSq());
			}
		}
	}

	this.display = function() {
		this.radius = Math.sqrt(this.pop * 40);
		stroke(255);
		fill(255);
		ellipse(this.pos.x, this.pos.y, this.radius, this.radius);
	};

	this.display_populace = function() {
		for (let p of this.populace) {
			p.display();
			p.update();
			p.infect();
			if (!p.in_transit) {
				travel_seed = Math.random();
				if (travel_seed < travel_prob) {
					let new_city = chance.weighted(this.city_pairs, this.city_weights);
					p.travel(new_city);
				}
			}
		}		
	}

}

function person(id, city) {
	this.city = city;
	this.infected = 0;
	this.id = id;
	let t_pos = p5.Vector.random2D().mult(city.radius / 2 * random(1));
	this.pos = p5.Vector.add(city.pos, t_pos);
	this.vel = p5.Vector.random2D().mult(.5);
	this.in_transit = false;
	this.destination = -1;

	this.display = function() {
		if (this.infected > infection_duration) {
			this.infected = -1;
		}
		if (this.infected == 0) {
			stroke(10, 100, 100);
			fill(10, 100, 100);			
		} else if (this.infected > 0) {
			stroke(255, 0, 0);
			fill(255, 0, 0);
			this.infected++;
		} else if (this.infected < 0) {
			stroke(200);
			fill(200);			
		}

		ellipse(this.pos.x, this.pos.y, 1, 1);
	};

	this.update = function() {
		this.pos.add(this.vel);
		let dist = p5.Vector.sub(this.pos, this.city.pos).mag();
		if (dist < this.city.radius / 3 && this.in_transit) {
			this.in_transit = false; 
			this.vel = p5.Vector.random2D().mult(.5);
		}
		if (!this.in_transit) {
	      	if (dist >= this.city.radius / 2) {
		        let baseDelta = p5.Vector.sub(this.city.pos, this.pos);
		        baseDelta.normalize();
		        let normal = new p5.Vector(baseDelta.x, baseDelta.y);
		        let incidence = p5.Vector.mult(this.vel, -1);
		        let dot = incidence.dot(normal);
		        this.vel.set(2*normal.x*dot - incidence.x, 2*normal.y*dot - incidence.y, 0);
		        this.pos.add(this.vel);        
	      	} 
	    }
	}

	this.travel = function(city_num) {
		this.in_transit = true;
		if (city_num != this.id) {
			cities[this.city.id].populace.splice(this.id, 1);
			cities[this.city.id].pop -= 1;
			this.city = cities[city_num];
			this.vel = p5.Vector.sub(cities[city_num].pos, this.pos).normalize().mult(2);	
			cities[city_num].populace.push(this);
			this.id = cities[city_num].populace.length - 1;
			cities[city_num].pop += 1;

		}
	}

	this.infect = function() {
		if (this.infected > 0) {
			for (let p of this.city.populace) {
				if (p.id != this.id) {
					if (p5.Vector.sub(this.pos, p.pos).mag() < 2) {
						if (Math.random() < r0) { 
							if (p.infected == 0) { p.infected = 1; }
						}
					}
				}
			}			
		}
	}

}