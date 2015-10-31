// Because typing document.getElementById is hard
var $id = document.getElementById.bind(document);
var $class = document.getElementsByClassName.bind(document);

// Because initial audio events for a context have to be launched from a touch event
var mustTouch = (window.navigator.userAgent.match(/iPad/i) || window.navigator.userAgent.match(/iPhone/i) || window.navigator.userAgent.match(/Android/i) || window.navigator.userAgent.match(/iPod/i)) !== null;

// We only display the "touch to start" after both the page and widget have finished loading.
var leftToLoad = 2;

// More globals... need to fix this
var queuedPause = false;

// Globals aren't the best but we've got lots of callbacks and I was tired of making closures
var player = {
	handle: {},
	length: 0,
	started: !mustTouch
};

// Make a dummy resize event to make an inital call to our sizer
function triggerEvent (eventName, target) {
	var fakeEvent = document.createEvent("Event");
	fakeEvent.initEvent(eventName, true, true);
	target.dispatchEvent(fakeEvent);
}

// Start up the soundcloud widget iframe and attach what events we can
function setupPlayer (callbackObject, playlistNumber) {
	var frame = document.createElement("iframe");
	frame.id = "player-frame";
	frame.className = "passive";
	frame.src = "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/" + playlistNumber + "&auto_play=false&buying=false&liking=false&download=false&sharing=false&show_artwork=false&show_comments=false&show_playcount=false&show_user=false&hide_related=false&visual=false&start_track=0&callback=true";

	// Don't change these. Necessary for proper positioning. mustTouch weirdness.
	frame.width		= 60;
	frame.height	= 90;
	
	var appended = document.body.appendChild(frame);

	appended.addEventListener("load", (function () {
		return function () {
			callbackObject.handle = SC.Widget(appended);
			callbackObject.handle.bind(SC.Widget.Events.FINISH, function () {
				player.handle.pause();
				var newTrack = Math.floor(Math.random() * player.length);
				console.log(newTrack);
				player.handle.skip(newTrack);
				player.handle.play();
			});
			callbackObject.handle.bind(SC.Widget.Events.PLAY, function () {
				if (!player.started) {
					player.handle.pause();
					player.started = true;
					$id("player-frame").className = "passive";
					$id("loading").style.display = "none";
				} else if (bang.className !== "on") {
					bang.className = "on";
				}
			});
			callbackObject.handle.bind(SC.Widget.Events.PAUSE, function () {
				if (!queuedPause) bang.className = "";
			});
			callbackObject.handle.bind(SC.Widget.Events.READY, function () {
				leftToLoad--;
			})
		};
	})());

	return appended;
}

// Calls itself until it actually gets the number of sounds, then triggers the callback
function getSoundsLength (callback) {
	player.handle.getSounds(function (sounds) {
		player.length = sounds.length;
		if (player.length === 0) {
			setTimeout(getSoundsLength, 0);
		} else if (callback) {
			callback();
		}
	});
}

function waitUntil (condition, callback) {
	if (condition()) {
		callback()
	} else {
		setTimeout(waitUntil, 0, condition, callback);
	}
}

// Hide the loading screen after our massive images load
window.addEventListener("load", function () {
	leftToLoad--;
	waitUntil(function () {
		return leftToLoad === 0;
	}, function () {
		if (mustTouch) {
			$id("player-frame").className = "takeover";
			
			var toHide = $class("wait-please");
			for (var i = 0, current; current = toHide.item(i); i++) {
				current.style.display = "none";
			}

			$id("touch-to-begin").style.display = "inline";
		} else {
			$id("loading").style.display = "none";
		}
	})
});

document.addEventListener("DOMContentLoaded", function () { 
	var center	= $id("center");
	var mouth	= $id("mouth");
	var music	= $id("music");
	var casey	= $id("casey");
	var bang	= $id("bang");
	var explain	= $id("explanation");

	setupPlayer(player, 100392942);

	var ratio = 1;

	if (mustTouch) {
		document.body.style.cursor = "pointer";
		document.body.addEventListener("click", (function () {
			return function () {
				casey.src = "./images/closed.png";
			};
		})());

		mouth.style.cursor = "pointer";
		mouth.addEventListener("click", (function () {
			return function (e) {
				e.stopPropagation();
				casey.src = "./images/open.png";
			};
		})());
	}

	mouth.addEventListener("mouseout", (function () {
		return function () {
			casey.src = "./images/closed.png";
		};
	})());

	mouth.addEventListener("mouseover", (function () {
		return function () {
			casey.src = "./images/open.png";
		};
	})());

	casey.addEventListener("load", (function () {
		return function () {
			ratio = casey.naturalWidth / casey.naturalHeight;
			triggerEvent("resize", window); // Initial sizing call
		};
	})());

	music.addEventListener("load", (function () {
		return function () {
			var musicSVG	= music.contentDocument;
			var $musicId	= musicSVG.getElementById.bind(musicSVG);
			var musicHitbox	= $musicId("hitbox");
			var musicPlay	= $musicId("play");
			var musicPause	= $musicId("pause");

			musicHitbox.addEventListener("click", (function () {
				return function (e) {
					e.stopPropagation();
					if (queuedPause) return;
					if (bang.className == "on") {
						var fired = false;
						queuedPause = true;
						player.handle.pause();

						var callback = (function () {
							return function (e) {
								e.target.removeEventListener(e.type, arguments.callee);
								if (!fired) {
									fired = true;
									queuedPause = false;
									e.target.className = "";
								}
							};
						})();

						bang.addEventListener("animationiteration", callback);
						bang.addEventListener("webkitAnimationIteration", callback);
					} else {
						// Lazily get number of tracks, select a random track, and play.
						getSoundsLength(function () {
							var newTrack = Math.floor(Math.random() * player.length);
							console.log(newTrack);
							player.handle.skip(newTrack);
							player.handle.play();
							bang.className = "on";
							if (mustTouch) {
								setTimeout(function () {
									casey.src = "./images/closed.png";
								}, 2000);
							}
						});
					}
					musicPlay.style.visibility  = (musicPlay.style.visibility  == "visible") ? "hidden" : "visible";
					musicPause.style.visibility = (musicPause.style.visibility == "visible") ? "hidden" : "visible";
				};
			})());
		};
	})());

	window.addEventListener("resize", (function () {
		return function () {
			center.style.width = ratio * center.clientHeight + "px";
			explain.style.bottom = (0.5 * center.clientHeight) - (0.5 * casey.height);
			mouth.style.bottom = 0.208 * casey.height;
		};
	})());

	triggerEvent("resize", window);
});