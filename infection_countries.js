let countries = [];
let country_count = 12;
let minimum_country_spacing = 50;
let minimum_country_pop = 50;
let maximum_country_pop = 200;
let cycle = 0;
let cycles_per_day = 40;
let total_pop = 0;
let infection_display_count = [];
let intervention_display = [];
let country_scale = 80;
let person_scale = 6;

// Country names
const COUNTRY_NAMES = [
	"Alphaland", "Betaland", "Catalonia", "Deltania",
	"Epsilon", "Florentia", "Gammaria", "Helios",
	"Ionia", "Jovian", "Kappa", "Lumina",
	"Meridia", "Nova", "Omega"
];

// Policy archetypes
const POLICY_ARCHETYPES = {
	open: {
		name: "Open",
		description: "Minimal restrictions, prioritize economy",
		internalMovement: "none",
		borderPolicy: "open",
		sickTravelerPolicy: "allow",
		color: [76, 175, 80] // Green
	},
	moderate: {
		name: "Moderate",
		description: "Balanced approach",
		internalMovement: "partial",
		borderPolicy: "screening",
		sickTravelerPolicy: "quarantine",
		color: [255, 202, 40] // Amber
	},
	strict: {
		name: "Strict",
		description: "Strong restrictions to minimize spread",
		internalMovement: "partial",
		borderPolicy: "screening",
		sickTravelerPolicy: "deny",
		color: [255, 112, 67] // Deep Orange
	},
	zeroCovid: {
		name: "Zero-COVID",
		description: "Eliminate transmission at all costs",
		internalMovement: "full",
		borderPolicy: "closed",
		sickTravelerPolicy: "deny",
		color: [239, 83, 80] // Red
	}
};

// Movement multipliers based on internal policy
const MOVEMENT_MULTIPLIERS = {
	none: 1.0,
	partial: 0.4,
	full: 0.1
};

// Economic penalties
const LOCKDOWN_PENALTY = {
	none: 1.0,
	partial: 0.6,
	full: 0.2
};

const BORDER_PENALTY = {
	open: 1.0,
	screening: 0.85,
	closed: 0.5
};

// Screening detection parameters
let screening_detection_start = 3; // days before screening can detect
let screening_detection_rate = 0.85; // detection rate after start period

// infection parameters
let infection_distance = 8;
let r0 = 2;
let infection_duration = cycles_per_day * 14;
let initial_infection_count = 1;
let interactions = 0;
let interactions_per_turn;
let odds_of_infection;
let immunity_duration = cycles_per_day * 28;
let quarantine_duration = cycles_per_day * 14;

// movement parameters
let travel_prob = 0.0003;
let travel_speed = 4;
let non_travel_speed = 0.2;
let max_non_travel_speed = 0.2;
let travel_prefer_local = 5;

// panic parameters
let overwhelmed = 20;
let flee_threshold = overwhelmed / 100;
let flee_rate = 4;

let current_country = -1;
let selected_country = null;

let display_graph_x = 20; // Will be relative to width
let display_graph_width = 300;
let display_graph_scale_factor = 100;

// Economic tracking
let global_gdp_history = [];

// CountryPolicy class
function CountryPolicy(archetype = "moderate") {
	const base = POLICY_ARCHETYPES[archetype];
	this.archetype = archetype;
	this.internalMovement = base.internalMovement;
	this.borderPolicy = base.borderPolicy;
	this.sickTravelerPolicy = base.sickTravelerPolicy;

	this.getColor = function() {
		if (this.archetype === "custom") {
			return [150, 150, 150];
		}
		return POLICY_ARCHETYPES[this.archetype].color;
	};
}

function setup() {
	frameRate(60); // 120 might be too aggressive for some browsers, smooth enough at 60

	// Dynamic Canvas Sizing
	let container = document.getElementById('canvas-container');
	let c = createCanvas(container.offsetWidth, container.offsetHeight);
	c.parent('canvas-container');

	window.addEventListener('resize', () => {
		resizeCanvas(container.offsetWidth, container.offsetHeight);
	});

	let max_countries = round(sqrt(width * height) / (2 * minimum_country_spacing));
	if (country_count > max_countries) { country_count = max_countries; }

	// Assign random archetypes to countries
	let archetypes = Object.keys(POLICY_ARCHETYPES);

	for (var i = 0; i < country_count; i++) {
		let my_pop = random(minimum_country_pop, maximum_country_pop);
		total_pop += my_pop;
		let archetype = random(archetypes);
		countries.push(new Country(i, my_pop, COUNTRY_NAMES[i], archetype));
	}

	for (let country of countries) {
		country.initialize_partner_countries();
	}

	// Patient zero in first country
	countries[0].populace[0].infected = 1;

	// Initialize UI
	initGlobalControls();
	initPolicyPanelListeners();
}

function draw() {
	cycle++;
	background(26, 26, 26); // Dark background #1a1a1a

	current_country = -1;
	let total_infected = 0;

	// Check mouse hover
	for (let country of countries) {
		let mouse_distance = p5.Vector.sub(createVector(mouseX, mouseY), country.pos).mag();
		let selected = (selected_country && selected_country.id === country.id);
		if (mouse_distance < country.radius / 2) {
			current_country = country.id;
			cursor(HAND);
		}
		country.display(selected || current_country === country.id);
	}
	if (current_country === -1) cursor(ARROW);

	for (let country of countries) {
		country.display_populace();
		country.processQuarantine();
		total_infected += country.infected_count;
	}

	// Track infection over time
	if (cycle % 10 == 0) {
		infection_display_count.push(total_infected);
		if (infection_display_count.length > display_graph_width) {
			infection_display_count.shift();
		}

		// Track GDP
		let global_gdp = 0;
		for (let country of countries) {
			let gdp_tick = country.calculateGDP();
			country.gdp += gdp_tick;
			country.gdpHistory.push(gdp_tick);
			if (country.gdpHistory.length > 300) country.gdpHistory.shift();
			global_gdp += gdp_tick;
		}
		global_gdp_history.push(global_gdp);
		if (global_gdp_history.length > 300) global_gdp_history.shift();

		// Update HTML Leaderboard less frequently to save DOM overhead
		renderLeaderboardHTML();
	}
	
	// Always update panel if open
	if (selected_country && cycle % 10 == 0) {
		updatePanelStats(selected_country);
	}

	// Stop if infection dies out
	if (total_infected == 0 && cycle > 20) { noLoop(); }

	// Display infection graph (Bottom Right)
	renderInfectionGraph(total_infected);

	// Render GDP graph (Bottom Left)
	renderGDPGraph();

	// Update Day Counter
	let daynum = floor(cycle / cycles_per_day);
	document.getElementById('day-counter').innerText = "Day #" + daynum;

	// Calculate infection odds
	interactions_per_turn = interactions / (cycle * Math.max(1, total_infected));
	odds_of_infection = (interactions_per_turn * r0) / infection_duration;
}

function renderInfectionGraph(total_infected) {
	if (total_infected > 50 || cycle > 200) {
		let graphX = width - display_graph_width - 20;
		let graphY = height - 120;
		
		fill(40, 40, 40, 200);
		stroke(80);
		rect(graphX, graphY, display_graph_width, 100, 4);

		noStroke();
		fill(200);
		textSize(10);
		textAlign(LEFT);
		text("Active Cases", graphX + 5, graphY + 15);

		// Draw limit line
		stroke(100, 100, 255);
		let limitY = graphY + 100 - overwhelmed;
		line(graphX, limitY, graphX + display_graph_width, limitY);

		for (let i = 0; i < infection_display_count.length; i++) {
			stroke(255, 80, 80);
			let h = infection_display_count[i] / total_pop * display_graph_scale_factor;
			line(i + graphX, graphY + 100, i + graphX, graphY + 100 - h);
		}
	}
}

function renderGDPGraph() {
	let graphX = 20;
	let graphY = height - 120; // Bottom left
	let graphWidth = 300;
	let graphHeight = 100;

	// Background
	fill(40, 40, 40, 200);
	stroke(80);
	rect(graphX, graphY, graphWidth, graphHeight, 4);

	// Find max for scaling
	let maxGdp = 1;
	for (let c of countries) {
		if (c.gdpHistory.length > 0) {
			let cMax = Math.max(...c.gdpHistory);
			if (cMax > maxGdp) maxGdp = cMax;
		}
	}

	// Draw each country's GDP line
	strokeWeight(1.5);
	for (let c of countries) {
		let policyColor = c.policy.getColor();
		stroke(policyColor[0], policyColor[1], policyColor[2], 200);
		noFill();
		beginShape();
		for (let i = 0; i < c.gdpHistory.length; i++) {
			let x = graphX + (i / 300) * graphWidth;
			let y = graphY + graphHeight - (c.gdpHistory[i] / maxGdp * (graphHeight - 10));
			vertex(x, y);
		}
		endShape();
	}
	strokeWeight(1);

	// Label
	noStroke();
	fill(200);
	textAlign(LEFT);
	textSize(10);
	text("Economic Activity (GDP)", graphX + 5, graphY + 15);
}

// Country class
function Country(id, pop, name, archetype = "moderate") {
	this.pop = pop;
	this.id = id;
	this.name = name || COUNTRY_NAMES[id] || `Country ${id + 1}`;
	this.populace = [];
	this.radius = Math.sqrt(this.pop * country_scale);
	this.country_pairs = [];
	this.country_weights = [];
	this.flee_country_weights = [];
	this.infected_count = 0;
	this.infected_rate = 0;
	this.travel_prob = travel_prob;
	this.travel_speed = travel_speed;
	this.non_travel_speed = non_travel_speed;
	this.max_non_travel_speed = max_non_travel_speed;
	this.travel_prefer_local = travel_prefer_local;

	// Policy system
	this.policy = new CountryPolicy(archetype);

	// Economic tracking
	this.gdp = 0;
	this.gdpHistory = [];

	// Quarantine zone
	this.quarantineZone = [];

	// Position country (avoid overlaps)
	var reposition = true;
	let efforts = 0;
	while (reposition) {
		reposition = false;
		// Keep within safer bounds considering graphs
		let marginX = 20;
		let marginY = 20;
		this.pos = createVector(
			random(this.radius + marginX, width - this.radius - marginX), 
			random(this.radius + marginY, height - this.radius - 150)
		);
		for (let country of countries) {
			if (country.id != this.id) {
				if (p5.Vector.sub(this.pos, country.pos).mag() < this.radius + country.radius + minimum_country_spacing) {
					reposition = true;
					efforts++;
					if (efforts > 20) {
						minimum_country_spacing = minimum_country_spacing - 1;
					}
					break;
				}
			}
		}
	}

	// Populate country
	for (let i = 0; i < this.pop; i++) {
		this.populace.push(new Person(i, this));
	}

	this.initialize_partner_countries = function() {
		for (let i = 0; i < country_count; i++) {
			if (i != this.id) {
				this.country_pairs.push(i);
				let denominator = pow(p5.Vector.sub(this.pos, countries[i].pos).mag(), this.travel_prefer_local);
				this.country_weights.push(1 / denominator);
			}
		}
	};

	this.calculate_flee_countries = function() {
		this.flee_country_weights = [];
		for (let i = 0; i < country_count; i++) {
			if (i != this.id) {
				let denominator = pow(p5.Vector.sub(this.pos, countries[i].pos).mag(), this.travel_prefer_local);
				let their_infected_rate = countries[i].infected_rate;
				this.flee_country_weights.push(1 / ((their_infected_rate + .001) * denominator));
			}
		}
	};

	// Check if a traveler can enter this country
	this.canAcceptTraveler = function(traveler, origin_country) {
		// Check border policy
		if (this.policy.borderPolicy === "closed") {
			return { allowed: false, reason: "borders_closed" };
		}

		if (this.policy.borderPolicy === "screening") {
			// Check if traveler is infected and detectable
			if (traveler.infected > 0) {
				let days_infected = traveler.infected / cycles_per_day;
				// Early infections can slip through
				if (days_infected >= screening_detection_start) {
					if (Math.random() < screening_detection_rate) {
						return this.handleSickTraveler(traveler);
					}
				}
				// Slipped through screening
				return { allowed: true, reason: "undetected" };
			}
			return { allowed: true, reason: "screened_clear" };
		}

		// Open borders
		if (traveler.infected > 0) {
			return this.handleSickTraveler(traveler);
		}
		return { allowed: true, reason: "open_borders" };
	};

	this.handleSickTraveler = function(traveler) {
		switch (this.policy.sickTravelerPolicy) {
			case "allow":
				return { allowed: true, reason: "sick_allowed" };
			case "deny":
				return { allowed: false, reason: "sick_denied" };
			case "quarantine":
				return { allowed: true, quarantine: true, reason: "quarantine_required" };
		}
	};

	this.addToQuarantine = function(person) {
		person.in_quarantine = true;
		person.quarantine_timer = quarantine_duration;
		this.quarantineZone.push(person);
	};

	this.processQuarantine = function() {
		for (let i = this.quarantineZone.length - 1; i >= 0; i--) {
			let p = this.quarantineZone[i];
			p.quarantine_timer--;

			if (p.quarantine_timer <= 0) {
				p.in_quarantine = false;
				p.quarantine_timer = 0;
				this.quarantineZone.splice(i, 1);
			}
		}
	};

	this.calculateGDP = function() {
		let base_output = 0;

		for (let p of this.populace) {
			if (p.in_quarantine) continue;

			if (p.infected > 0) {
				base_output -= 0.3;
			} else if (p.infected === 0) {
				base_output += p.vel.mag() * 0.5;
			}
		}

		let policy_penalty = LOCKDOWN_PENALTY[this.policy.internalMovement];
		let trade_penalty = BORDER_PENALTY[this.policy.borderPolicy];

		return base_output * policy_penalty * trade_penalty;
	};

	this.display = function(selected) {
		this.radius = Math.sqrt(this.pop * country_scale);
		let my_radius = this.radius;

		// Policy color ring
		let policy_color = this.policy.getColor();
		strokeWeight(4);
		stroke(policy_color[0], policy_color[1], policy_color[2]);
		noFill();
		ellipse(this.pos.x, this.pos.y, my_radius + 10, my_radius + 10);

		// Country fill based on infection rate
		strokeWeight(1);
		if (this.infected_rate > overwhelmed / 100) {
			stroke(255, 80, 80); // Red highlight
			strokeWeight(3);
		} else {
			stroke(80);
		}
		// Darker fill logic for dark mode
		let inf = this.infected_rate;
		fill(
			40 + (215 * inf), 
			40, 
			40 + (215 * (1-inf) * 0.2)
		);
		ellipse(this.pos.x, this.pos.y, my_radius, my_radius);

		// Country name
		noStroke();
		fill(220);
		textAlign(CENTER);
		textSize(12);
		text(this.name, this.pos.x, this.pos.y - my_radius / 2 - 20);

		// Policy label
		textSize(10);
		fill(150);
		text(POLICY_ARCHETYPES[this.policy.archetype]?.name || "Custom", this.pos.x, this.pos.y - my_radius / 2 - 8);

		// Selection highlight
		if (selected) {
			noFill();
			stroke(100, 181, 246); // Light Blue
			strokeWeight(3);
			ellipse(this.pos.x, this.pos.y, my_radius + 18, my_radius + 18);
		}

		// Quarantine indicator
		if (this.quarantineZone.length > 0) {
			fill(33, 150, 243, 200);
			noStroke();
			let qx = this.pos.x + this.radius / 2 + 5;
			let qy = this.pos.y + this.radius / 2;
			ellipse(qx, qy, 20, 20);
			fill(255);
			textSize(10);
			textAlign(CENTER, CENTER);
			text(this.quarantineZone.length, qx, qy);
		}

		strokeWeight(1);
	};

	this.display_populace = function() {
		this.infected_count = 0;
		let movement_factor = MOVEMENT_MULTIPLIERS[this.policy.internalMovement];

		for (let p of this.populace) {
			p.display();
			p.update(movement_factor);
			p.infect();
			if (p.infected > 0) { this.infected_count += 1; }

			if (!p.in_transit && !p.in_quarantine) {
				let travel_seed = Math.random();
				let my_travel_prob = this.travel_prob;
				let fleeing = false;

				if (this.infected_rate > flee_threshold) {
					my_travel_prob = my_travel_prob * flee_rate;
					fleeing = true;
				}

				if (travel_seed < my_travel_prob) {
					let new_country;
					if (!fleeing) {
						new_country = chance.weighted(this.country_pairs, this.country_weights);
					} else {
						new_country = chance.weighted(this.country_pairs, this.flee_country_weights);
					}
					p.travel(new_country);
				}
			}
		}

		this.infected_rate = this.infected_count / this.pop;
		if (this.infected_rate > flee_threshold) {
			this.calculate_flee_countries();
		}
	};
}

// Person class
function Person(id, country) {
	this.country = country;
	this.infected = 0;
	this.id = id;
	let t_pos = p5.Vector.random2D().mult((country.radius - person_scale) / 2 * random(1));
	this.pos = p5.Vector.add(country.pos, t_pos);
	this.vel = p5.Vector.random2D().mult(this.country.non_travel_speed);
	this.in_transit = false;
	this.destination = -1;
	this.in_quarantine = false;
	this.quarantine_timer = 0;

	this.display = function() {
		if (this.infected > infection_duration) {
			this.infected = -immunity_duration;
		}

		if (this.in_quarantine) {
			stroke(33, 150, 243, 150); // Blue
			fill(33, 150, 243, 150);
		} else if (this.infected == 0) {
			stroke(255, 255, 255, 150); // White-ish dots
			fill(255, 255, 255, 150);
		} else if (this.infected > 0) {
			stroke(244, 67, 54, 255); // Red dots
			fill(244, 67, 54, 255);
			this.infected++;
		} else if (this.infected < 0) {
			stroke(100, 100, 100, 100); // Grey (immune)
			fill(100, 100, 100, 100);
			this.infected++;
		}

		ellipse(this.pos.x, this.pos.y, person_scale, person_scale);
	};

	this.update = function(movement_factor) {
		if (this.in_quarantine) {
			return;
		}

		this.move(p5.Vector.mult(this.vel, movement_factor));
		let dist = p5.Vector.sub(this.pos, this.country.pos).mag();

		if (dist < this.country.radius / 3 && this.in_transit) {
			this.in_transit = false;
			this.vel = p5.Vector.random2D().mult(this.country.non_travel_speed);
		}

		if (!this.in_transit) {
			if (this.vel.mag() > this.country.max_non_travel_speed) {
				this.vel.mult(.9);
			}
			if (dist >= this.country.radius / 2 - (person_scale / 2)) {
				if (dist >= this.country.radius / 2 + 1.5) {
					this.pos.sub(this.country.pos);
				}
				let baseDelta = p5.Vector.sub(this.country.pos, this.pos);
				baseDelta.normalize();
				let normal = new p5.Vector(baseDelta.x, baseDelta.y);
				let incidence = p5.Vector.mult(this.vel, -1);
				let dot = incidence.dot(normal);
				this.vel.set(2 * normal.x * dot - incidence.x, 2 * normal.y * dot - incidence.y, 0);
				this.move(this.vel);
			}
		}
	};

	this.move = function(velocity) {
		this.pos.add(velocity);
	};

	this.travel = function(target_country_id) {
		if (target_country_id == this.country.id) return false;

		let target = countries[target_country_id];
		let origin = this.country;

		let entry_result = target.canAcceptTraveler(this, origin);

		if (!entry_result.allowed) {
			return false;
		}

		this.in_transit = true;
		origin.populace.splice(this.id, 1);
		origin.pop -= 1;

		for (let i = this.id; i < origin.populace.length; i++) {
			origin.populace[i].id = i;
		}

		this.country = target;
		this.vel = p5.Vector.sub(target.pos, this.pos).normalize().mult(travel_speed);

		target.populace.push(this);
		this.id = target.populace.length - 1;
		target.pop += 1;

		if (entry_result.quarantine) {
			target.addToQuarantine(this);
		}

		return true;
	};

	this.infect = function() {
		if (this.in_quarantine) return;

		if (this.infected > 0) {
			for (let p of this.country.populace) {
				if (p.id != this.id && !p.in_quarantine) {
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
	};
}

function mouseClicked() {
	// Only interact if click is on canvas (not on overlay)
	// Actually, the overlay elements have pointer-events, so if they caught the click, this wouldn't fire?
	// p5's mouseClicked fires on global canvas clicks.
	
	// Helper to check if we are clicking on the policy panel or other UI
	if (document.getElementById('policy-panel').contains(event.target) || 
		document.getElementById('sidebar').contains(event.target)) {
		return;
	}

	for (let country of countries) {
		let dist = p5.Vector.sub(createVector(mouseX, mouseY), country.pos).mag();
		if (dist < country.radius / 2) {
			selected_country = country;
			showPolicyPanel(country);
			return;
		}
	}

	// Clicked empty space
	hidePolicyPanel();
	selected_country = null;
}

// --- UI / DOM Interaction ---

function initGlobalControls() {
	let container = document.getElementById('global-controls-buttons');
	container.innerHTML = '';
	for (let [key, val] of Object.entries(POLICY_ARCHETYPES)) {
		let btn = document.createElement('button');
		btn.className = 'policy-btn';
		btn.innerText = val.name;
		btn.style.borderLeft = `4px solid rgb(${val.color.join(',')})`;
		btn.onclick = () => setAllPolicies(key);
		container.appendChild(btn);
	}
}

function setAllPolicies(archetype) {
	for (let country of countries) {
		country.policy = new CountryPolicy(archetype);
	}
	if (selected_country) {
		showPolicyPanel(selected_country);
	}
}

function initPolicyPanelListeners() {
	// Archetype Select
	document.getElementById('panel-archetype-select').innerHTML = 
		Object.entries(POLICY_ARCHETYPES).map(([key, val]) =>
			`<option value="${key}">${val.name}</option>`
		).join('') + `<option value="custom">Custom</option>`;

	document.getElementById('panel-archetype-select').addEventListener('change', (e) => {
		if (selected_country && e.target.value !== 'custom') {
			selected_country.policy = new CountryPolicy(e.target.value);
			showPolicyPanel(selected_country); // Refresh UI to match new policy
		}
	});

	// Radios
	const inputs = document.querySelectorAll('#policy-panel input[type=radio]');
	inputs.forEach(input => {
		input.addEventListener('change', (e) => {
			if (!selected_country) return;
			let name = e.target.name;
			let val = e.target.value;

			if (name === 'movement') selected_country.policy.internalMovement = val;
			if (name === 'border') selected_country.policy.borderPolicy = val;
			if (name === 'sick') selected_country.policy.sickTravelerPolicy = val;

			selected_country.policy.archetype = "custom";
			document.getElementById('panel-archetype-select').value = 'custom';
		});
	});
}

function showPolicyPanel(country) {
	let panel = document.getElementById('policy-panel');
	panel.classList.add('visible');
	updatePanelStats(country);

	// Set inputs
	document.getElementById('panel-archetype-select').value = country.policy.archetype;
	
	setRadio('movement', country.policy.internalMovement);
	setRadio('border', country.policy.borderPolicy);
	setRadio('sick', country.policy.sickTravelerPolicy);
}

function updatePanelStats(country) {
	document.getElementById('panel-country-name').innerText = country.name;
	document.getElementById('panel-pop').innerText = country.pop;
	document.getElementById('panel-infected').innerText = (country.infected_rate * 100).toFixed(1) + "%";
	document.getElementById('panel-gdp').innerText = "$" + country.gdp.toFixed(0);
	document.getElementById('panel-quarantined').innerText = country.quarantineZone.length;
}

function setRadio(name, value) {
	let el = document.querySelector(`input[name="${name}"][value="${value}"]`);
	if (el) el.checked = true;
}

function hidePolicyPanel() {
	document.getElementById('policy-panel').classList.remove('visible');
	selected_country = null;
}

function renderLeaderboardHTML() {
	let ranked = [...countries].sort((a, b) => b.gdp - a.gdp);
	let html = '';
	for (let i = 0; i < Math.min(12, ranked.length); i++) {
		let c = ranked[i];
		let color = c.policy.getColor();
		let colorStr = `rgb(${color.join(',')})`;
		html += `
			<li class="leaderboard-item">
				<span style="display:flex; align-items:center;">
					<span class="country-dot" style="background-color:${colorStr}"></span>
					${i + 1}. ${c.name}
				</span>
				<span>$${c.gdp.toFixed(0)}</span>
			</li>
		`;
	}
	document.getElementById('leaderboard-list').innerHTML = html;
}