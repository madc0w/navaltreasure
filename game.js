var moveIncrement = 4;
var opponentSpeed = 2.8;
var opponentSpeedVariation = 1.0;
var gameEndDelay = 2000;

var playerNumberDuration = 20;
var healthCreationProb = 0.001;
var mathPillCreationProb = 0.0030;
var mathPillLifespan = 12;
var superspeedCreationProb = 0.0004;
var superspeedLifespan = 8;
var superspeedPillRadius = 8;
var superspeedDuration = 6;
var opponentCreationProb = 0.0018;
var opponentLifespan = 10;
var opponentLifespanVariation = 4;
var teleporterDeactivationProb = 0.004;
var teleporterActivationProb = 0.01;
var opponentRadius = 14;
var mainInterval = 20;

var sounds = {
	attack : new Audio("chomp.mp3"),
	scorePoints : new Audio("point_score.mp3"),
	health : new Audio("health.mp3"),
	gameOver : new Audio("game_over.mp3"),
	superspeed : new Audio("superspeed.mp3"),
	mathCorrect : new Audio("correct.mp3"),
	mathIncorrect : new Audio("incorrect.mp3"),
};

var pointPillTypes = {
	20 : {
		radius : 20,
		radiusVariation : 8,
		radiusFreq : 20,
		probability : 0.002,
		baseVel : 3,
		lifespan : 30,
		color : "#fec",
	},
	50 : {
		radius : 15,
		radiusVariation : 5,
		radiusFreq : 30,
		probability : 0.0008,
		baseVel : 5,
		lifespan : 20,
		color : "#fea",
	},
	200 : {
		radius : 12,
		radiusVariation : 5,
		radiusFreq : 40,
		probability : 0.0002,
		baseVel : 8,
		lifespan : 16,
		color : "#fe8",
	},
	500 : {
		radius : 10,
		radiusVariation : 3,
		radiusFreq : 60,
		probability : 0.00004,
		baseVel : 10,
		lifespan : 12,
		color : "#ff4",
	},
	1000 : {
		radius : 8,
		radiusVariation : 3,
		radiusFreq : 80,
		probability : 0.00002,
		baseVel : 15,
		lifespan : 10,
		color : "#ff0",
	},
};

var superspeedTime;
var score;
var itNum;
var canvas;
var canvasCtx;
var mainIntervalId;
var player;
var opponents;
var mathPills;
var superspeedPills;
var healthPills;
var pointPills;
var keysDown = {};
var health;
var gameEndTime;
var teleporter;
var isRendering = false;

function onLoad() {
	canvas = $("#game-canvas")[0];
	canvasCtx = canvas.getContext("2d");
	init();
}

function mainLoop() {
	if (isRendering) {
		return;
	}
	if (itNum % 1000 == 0 && mainInterval > 10) {
		mainInterval--;
		clearInterval(mainIntervalId);
		mainIntervalId = setInterval(mainLoop, mainInterval);
	}

	isRendering = true;
	canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
	var now = new Date();

	if (superspeedTime && now - superspeedTime > superspeedDuration * 1000) {
		moveIncrement = 4;
		superspeedTime = null;
	}
	if (now - player.numberSetTime > playerNumberDuration * 1000) {
		setPlayerNumber();
	}

	if (teleporter) {
		if (Math.random() < teleporterDeactivationProb) {
			teleporter = null;
		}
	} else {
		if (Math.random() < teleporterActivationProb) {
			setupTeleporter();
		}
	}

	if (Math.random() < mathPillCreationProb) {
		mathPills.push({
			pos : randomPosition(16),
			vel : {
				x : 1.2 * (Math.random() - 0.5),
				y : 1.2 * (Math.random() - 0.5),
			},
			number : 2 + Math.floor(Math.random() * 8),
			radius : 16,
			created : new Date(),
		});
	}

	if (Math.random() < superspeedCreationProb) {
		superspeedPills.push({
			pos : randomPosition(12),
			vel : {
				x : 1.2 * (Math.random() - 0.5),
				y : 1.2 * (Math.random() - 0.5),
			},
			radius : 12,
			created : new Date(),
		});
	}

	if (Math.random() < opponentCreationProb) {
		opponents.push({
			pos : {
				x : (canvas.width / 2) + (Math.random() - 0.5) * canvas.width * 0.2,
				y : opponentRadius
			},
			speed : opponentSpeed + (Math.random() - 0.5) * opponentSpeedVariation,
			lifespan : opponentLifespan + (Math.random() - 0.5) * opponentLifespanVariation,
			radius : opponentRadius,
			created : new Date(),
		});
	}

	if (Math.random() < healthCreationProb) {
		healthPills.push({
			pos : randomPosition(12),
			vel : {
				x : 0.6 * (Math.random() - 0.5),
				y : 0.6 * (Math.random() - 0.5),
			},
			radius : 12,
		});
	}

	for (var pointValue in pointPillTypes) {
		if (Math.random() < pointPillTypes[pointValue].probability) {
			pointPills.push({
				type : pointValue,
				pos : randomPosition(20),
				vel : {
					x : (Math.random() - 0.5) * pointPillTypes[pointValue].baseVel,
					y : (Math.random() - 0.5) * pointPillTypes[pointValue].baseVel,
				},
				created : new Date(),
			});
		}
	}

	canvasCtx.beginPath();
	canvasCtx.rect(canvas.width * 0.4, 0, canvas.width * 0.2, 25);
	canvasCtx.strokeStyle = "white";
	canvasCtx.stroke();

	if (teleporter) {
		for (p in teleporter) {
			canvasCtx.beginPath();
			canvasCtx.arc(teleporter[p].x, teleporter[p].y, 60, 0, 2 * Math.PI, false);
			canvasCtx.strokeStyle = "white";
			canvasCtx.stroke();
		}
	}

	// draw player
	canvasCtx.beginPath();
	canvasCtx.arc(player.pos.x, player.pos.y, player.radius, 0, 2 * Math.PI, false);
	canvasCtx.fillStyle = superspeedTime ? "#a44" : "#08a";
	canvasCtx.fill();

	var grd = canvasCtx.createRadialGradient(player.pos.x, player.pos.y, 0, player.pos.x, player.pos.y, player.radius);
	grd.addColorStop(0, "rgba(255, 255, 255, 1)");
	grd.addColorStop(1, "rgba(255, 255, 255, 0)");
	canvasCtx.beginPath();
	canvasCtx.save();
	canvasCtx.arc(player.pos.x, player.pos.y, player.radius, 0, 2 * Math.PI, false);
	canvasCtx.fillStyle = grd;
	canvasCtx.fill();
	canvasCtx.restore();

	for (var i = 0; i < 4; i++) {
		canvasCtx.beginPath();
		canvasCtx.strokeStyle = superspeedTime ? "#442" : "#082";
		canvasCtx.arc(player.pos.x + Math.cos(itNum / ((i + 1) * 10)) * 4, player.pos.y + Math.sin(itNum / ((i + 1) * 10)) * 4, 4 + player.radius * (i + 1) * (Math.sin(itNum / 30) + 1) / 12, 0, 2 * Math.PI, false);
		canvasCtx.stroke();
	}

	canvasCtx.fillStyle = "black";
	canvasCtx.font = "bold 16px Arial";
	var size = canvasCtx.measureText(player.number).width;
	canvasCtx.fillText(player.number, player.pos.x - size / 2, player.pos.y + 8);

	var toRemove = [];
	for (var i in opponents) {
		var opponent = opponents[i];

		var remainigLife = opponent.lifespan - Math.max(0, (now - opponent.created) / 1000);
		canvasCtx.beginPath();
		canvasCtx.arc(opponent.pos.x, opponent.pos.y, opponent.radius, 0, 2 * Math.PI, false);
		canvasCtx.fillStyle = "rgba(255, 0, 0, 0.6)";
		canvasCtx.fill();
		canvasCtx.beginPath();
		var innerRadius = Math.max(0, opponent.radius * (1 - remainigLife / opponent.lifespan));
		if (innerRadius < 0) {
			console.error("innerRadius ", innerRadius);
		} else {
			canvasCtx.arc(opponent.pos.x, opponent.pos.y, innerRadius, 0, 2 * Math.PI, false);
		}
		canvasCtx.fillStyle = "black";
		canvasCtx.fill();

		var dx = opponent.pos.x - player.pos.x;
		var dy = opponent.pos.y - player.pos.y;
		var dist = Math.sqrt(dx * dx + dy * dy);
		dx = opponent.speed * dx / dist;
		dy = opponent.speed * dy / dist;
		if (dist < player.radius + 2) {
			if (!opponent.didPlayAttackSound) {
				opponent.didPlayAttackSound = true;
				stopSounds();
				sounds.attack.play();
			}
			addHealth(-0.2);
			if (dist < player.radius - 2) {
				opponent.pos.x += dx;
				opponent.pos.y += dy;
			}
		} else {
			if (dist > player.radius + opponent.radius) {
				opponent.didPlayAttackSound = false;
			}
			//	wobble += (Math.random() - 0.5) * 0.1;
			opponent.pos.x -= dx;
			opponent.pos.y -= dy;
		}

		if (remainigLife <= 0) {
			toRemove.push(i);
		}
	}
	opponents = remove(opponents, toRemove);

	var toRemove = [];
	for (var i in healthPills) {
		var pill = healthPills[i];
		canvasCtx.beginPath();
		canvasCtx.arc(pill.pos.x, pill.pos.y, pill.radius, 0, 2 * Math.PI, false);
		canvasCtx.fillStyle = "rgba(80, 255, 0, 0.8)";
		canvasCtx.fill();

		canvasCtx.fillStyle = "white";
		canvasCtx.font = "bold 32px Arial";
		canvasCtx.save();
		var size = canvasCtx.measureText("+").width;
		var tx = pill.pos.x - pill.radius + size / 2 + 2;
		var ty = pill.pos.y + pill.radius - 11;
		canvasCtx.translate(tx, ty);
		canvasCtx.rotate(Math.PI * Math.sin(itNum / 20));
		canvasCtx.translate(-tx, -ty);
		canvasCtx.fillText("+", tx - size / 2, ty + 11);
		canvasCtx.restore();

		if (distance(pill) < pill.radius + player.radius) {
			addHealth(15);
			// "animate" fails with background, for unknown reasons
			$("#health-bar").css("background-color", "#fff");
			setTimeout(() => {
				$("#health-bar").css("background-color", "#082");
			}, 100);

			toRemove.push(i);
			stopSounds();
			sounds.health.play();
		}

		move(pill);
		pill.vel.x += (Math.random() - 0.5) * 0.02;
		pill.vel.y += (Math.random() - 0.5) * 0.02;
	}
	healthPills = remove(healthPills, toRemove);

	var toRemove = [];
	for (var i in superspeedPills) {
		var pill = superspeedPills[i];

		var grd = canvasCtx.createRadialGradient(pill.pos.x, pill.pos.y, 0, pill.pos.x, pill.pos.y, pill.radius);
		grd.addColorStop(0.2, "red");
		grd.addColorStop(0.8, "blue");
		canvasCtx.beginPath();
		canvasCtx.save();
		canvasCtx.arc(pill.pos.x, pill.pos.y, pill.radius, 0, 2 * Math.PI, false);
		canvasCtx.fillStyle = grd;
		canvasCtx.fill();
		canvasCtx.restore();
		if (distance(pill) < pill.radius + player.radius) {
			moveIncrement = 8;
			superspeedTime = now;
			stopSounds();
			sounds.superspeed.play();
			toRemove.push(i);
		}
		if (now - pill.created >= superspeedLifespan * 1000) {
			toRemove.push(i);
		}
		move(pill);
	}
	superspeedPills = remove(superspeedPills, toRemove);

	var toRemove = [];
	for (var i in mathPills) {
		var pill = mathPills[i];

		var grd = canvasCtx.createRadialGradient(pill.pos.x, pill.pos.y, 0, pill.pos.x, pill.pos.y, pill.radius);
		grd.addColorStop(0.2, "white");
		grd.addColorStop(0.8, "blue");
		canvasCtx.beginPath();
		canvasCtx.save();
		canvasCtx.arc(pill.pos.x, pill.pos.y, pill.radius, 0, 2 * Math.PI, false);
		canvasCtx.fillStyle = grd;
		canvasCtx.fill();
		canvasCtx.restore();

		canvasCtx.beginPath();
		canvasCtx.moveTo(pill.pos.x, pill.pos.y);
		canvasCtx.arc(pill.pos.x, pill.pos.y, pill.radius, 0, 2 * Math.PI * (now - pill.created) / (mathPillLifespan * 1000));
		canvasCtx.lineTo(pill.pos.x, pill.pos.y);
		canvasCtx.fillStyle = "rgba(0, 100, 0, 0.75)";
		canvasCtx.fill();

		canvasCtx.fillStyle = "black";
		canvasCtx.font = "bold 16px Arial";
		var size = canvasCtx.measureText(pill.number).width;
		canvasCtx.fillText(pill.number, pill.pos.x - size / 2, pill.pos.y + 8);

		if (distance(pill) < pill.radius + player.radius) {
			stopSounds();
			if (player.number % pill.number == 0) {
				addPoints(200);
				sounds.mathCorrect.play();
			} else {
				addPoints(-120);
				sounds.mathIncorrect.play();
			}
			toRemove.push(i);
		}
		if (now - pill.created >= mathPillLifespan * 1000) {
			toRemove.push(i);
		}

		move(pill);
	}
	mathPills = remove(mathPills, toRemove);

	var toRemove = [];
	for (var i in pointPills) {
		var pill = pointPills[i];

		var type = pointPillTypes[pill.type];
		var radius = type.radius + Math.sin(itNum * type.radiusFreq / 100) * type.radiusVariation;
		var grd = canvasCtx.createRadialGradient(pill.pos.x, pill.pos.y, 0, pill.pos.x, pill.pos.y, radius);
		grd.addColorStop(0.4, type.color);
		grd.addColorStop(0.9, "green");
		canvasCtx.beginPath();
		canvasCtx.save();
		canvasCtx.arc(pill.pos.x, pill.pos.y, radius, 0, 2 * Math.PI, false);
		canvasCtx.fillStyle = grd;
		canvasCtx.fill();
		canvasCtx.restore();

		canvasCtx.fillStyle = "green";
		canvasCtx.font = "bold 18px Arial";
		var size = canvasCtx.measureText(pill.type).width;
		canvasCtx.fillText(pill.type, pill.pos.x - size / 2, pill.pos.y + 8);

		if (distance(pill) < radius + player.radius) {
			addPoints(pill.type);
			stopSounds();
			sounds.scorePoints.play();
			toRemove.push(i);
		}
		if (now - pill.created >= type.lifespan * 1000) {
			toRemove.push(i);
		}
		move(pill, radius);
	}
	pointPills = remove(pointPills, toRemove);

	var numKeysDown = 0;
	for (var key in keysDown) {
		if ([ "ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp" ].includes(key)) {
			numKeysDown++;
		}
	}
	var inc = moveIncrement;
	if (numKeysDown == 2) {
		inc /= Math.sqrt(2);
	}
	if (keysDown["ArrowLeft"]) {
		player.pos.x -= inc;
		if (player.pos.x < player.radius) {
			player.pos.x = player.radius;
		}
	}
	if (keysDown["ArrowRight"]) {
		player.pos.x += inc;
		if (player.pos.x > canvas.width - player.radius) {
			player.pos.x = canvas.width - player.radius;
		}
	}
	if (keysDown["ArrowUp"]) {
		player.pos.y -= inc;
		if (player.pos.y < player.radius) {
			player.pos.y = player.radius;
		}
	}
	if (keysDown["ArrowDown"]) {
		player.pos.y += inc;
		if (player.pos.y > canvas.height - player.radius) {
			player.pos.y = canvas.height - player.radius;
		}
	}

	// teleportation
	if (teleporter) {
		outer:
		for (p in teleporter) {
			var point = teleporter[p];
			var dx = point.x - player.pos.x;
			var dy = point.y - player.pos.y;
			var dist = Math.sqrt(dx * dx + dy * dy);
			//			console.log("player.pos", player.pos);
			//			console.log("point ", point);
			//			console.log("dist ", dist);
			if (dist <= player.radius * Math.sqrt(2)) {
				for (p2 in teleporter) {
					if (point.id != teleporter[p2].id) {
						var destination = {
							x : teleporter[p2].x,
							y : teleporter[p2].y,
						};
						if (destination.x == 0) {
							destination.x += player.radius + 1;
						} else {
							destination.x -= player.radius + 1;
						}
						if (destination.y == 0) {
							destination.y += player.radius + 1;
						} else {
							destination.y -= player.radius + 1;
						}
						player.pos = destination;
						break outer;
					}
				}
			}
		}
	}

	itNum++;
	isRendering = false;
}

function onKeyUp(e) {
	delete keysDown[e.key];
}

function onKeyDown(e) {
	if (gameEndTime && new Date() - gameEndTime > gameEndDelay) {
		init();
	} else {
		keysDown[e.key] = true;
	}
}

function init() {
	superspeedTime = null;
	gameEndTime = null;
	moveIncrement = 4;
	mainInterval = 20;
	itNum = 0;
	score = 0;
	health = 100;
	keysDown = {};

	player = {
		radius : 30,
		pos : {
			x : canvas.width * 0.5,
			y : canvas.height - 30
		},
	};
	setPlayerNumber();

	mathPills = [];
	superspeedPills = [];
	healthPills = [];
	pointPills = [];
	opponents = [];

	setupTeleporter();

	$("#hi-score").html(parseInt(localStorage.getItem("hiscore") || 0));
	$("#score").html(score);

	mainIntervalId = setInterval(mainLoop, mainInterval);
}

function addHealth(inc) {
	health += inc;
	if (health > 100) {
		health = 100;
	} else if (health <= 0) {
		health = 0;
		lose();
	}

	$("#health-bar").css("width", health + "%");
}

function setupTeleporter() {
	var p1 = {
		x : Math.random() < 0.5 ? 0 : canvas.width,
		y : Math.random() < 0.5 ? 0 : canvas.height,
		id : 1,
	};
	var p2;
	do {
		p2 = {
			x : Math.random() < 0.5 ? 0 : canvas.width,
			y : Math.random() < 0.5 ? 0 : canvas.height,
			id : 2,
		};
	} while (p2.x == p1.x && p2.y == p1.y);

	teleporter = {
		p1 : p1,
		p2 : p2
	};
}

function addPoints(inc) {
	score += parseInt(inc);
	if (score < 0) {
		score = 0;
	}
	$("#score").html(score);
	if (score > (parseInt(localStorage.getItem("hiscore") || 0))) {
		localStorage.setItem("hiscore", score);
		$("#hi-score").html(score);
	}
}

function lose() {
	clearInterval(mainIntervalId);
	canvasCtx.fillStyle = "#19aa5d";
	canvasCtx.font = "bold 48px Arial";
	canvasCtx.fillText("GAME OVER", 140, canvas.height / 2);
	stopSounds();
	sounds.gameOver.play();
	gameEndTime = new Date();
	setTimeout(function() {
		canvasCtx.fillStyle = "#19aa5d";
		canvasCtx.font = "bold 28px Arial";
		canvasCtx.fillText("Hit any key to play again", 120, 60 + canvas.height / 2);
	}, gameEndDelay);
}

function stopSounds() {
	for (var sound in sounds) {
		sounds[sound].pause();
		sounds[sound].currentTime = 0;
	}
}

function remove(arr, toRemove) {
	if (toRemove.length > 0) {
		var arrTmp = arr;
		arr = [];
		for (var i in arrTmp) {
			if (!toRemove.includes(i)) {
				arr.push(arrTmp[i]);
			}
		}
	}
	return arr;
}

function distance(pill) {
	var dx = pill.pos.x - player.pos.x;
	var dy = pill.pos.y - player.pos.y;
	var dist = Math.sqrt(dx * dx + dy * dy);
	return dist;

}

function move(pill, radius) {
	radius = radius || pill.radius;
	pill.pos.x += pill.vel.x;
	pill.pos.y += pill.vel.y;
	if (pill.pos.x < radius || pill.pos.x > canvas.width - radius) {
		pill.vel.x *= -1;
	}
	if (pill.pos.y < radius || pill.pos.y > canvas.height - radius) {
		pill.vel.y *= -1;
	}
}

function randomPosition(radius) {
	return {
		x : radius + (canvas.width - 2 * radius) * Math.random(),
		y : radius + (canvas.width - 2 * radius) * Math.random(),
	};
}

function setPlayerNumber() {
	player.number = (1 + Math.ceil(Math.random() * 11)) * (1 + Math.ceil(Math.random() * 11));
	player.numberSetTime = new Date();
}
