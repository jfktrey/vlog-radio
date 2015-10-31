"use strict";

// IIFEs are nifty.
(function () {

// Shorthands. Recall that bind is required to maintain execution context, otherwise calls to these functions won't work.
var $id = document.getElementById.bind(document);
var $class = document.getElementsByClassName.bind(document);


// On these devices, audio contexts aren't allowed to play until a touch event synchronously triggers a call to a function of the context that plays audio.
// This user agent deteciton solution isn't perfect but it's simple and works for most cases.
var audioLocked = (window.navigator.userAgent.match(/iPad/i) || window.navigator.userAgent.match(/iPhone/i) || window.navigator.userAgent.match(/Android/i) || window.navigator.userAgent.match(/iPod/i)) !== null;


// Global containing constants and variables for the player widget
var player = {
	playlist:  100392942,	// https://soundcloud.com/kenivkie/sets/casey-neistat-vlog-music
	handle:    null,
	songCount: 0,
	state:     null,

	STATES: {
		TOUCH_NEEDED:  -1,
		UNINITIALIZED: 0,
		PLAYING:       1,
		PAUSING:       2,
		PAUSED:        3
	}
};
player.state = (audioLocked) ? player.STATES.TOUCH_NEEDED : player.STATES.UNINITIALIZED;


// Elements that we interact with. Initialized with the ID of the node. Replaced with reference to node when DOMContentLoaded fires for document.
var nodes = {
	bang:     "bang",
	casey:    "casey",
	center:   "center",
	explain:  "explanation",
	loading:  "loading",
	mouth:    "mouth",
	controls: "controls",
	player:   null,		// This element is dynamically initialized, so no reference can be generated on DOMContentLoaded.
	touch:    "touch-to-begin"
};


// Elements in the SVG that we interact with.
var svgNodes = {
	hitbox: "hitbox",
	pause:  "pause",
	play:   "play"
};


// Conditions that must be met for the page to be fully loaded
// Pass loaded.callback.bind(loaded) as the callback to the window and player load events
var loaded = {
	windowLoaded: false,
	playerLoaded: false,
	callback: function (e) {
		if (e && e.target === document) {
			this.windowLoaded = true;
		} else {
			this.playerLoaded = true;
		}

		if (this.windowLoaded && this.playerLoaded) {
			viewHandler("loaded");
		}
	}
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Check for an outside action that caused the player to pause or start without us knowing.
// TODO: Doesn't actually work, currently, since the Soundcloud widget doesn't properly update the isPaused return value.
function checkForOutsideAction () {
	player.handle.isPaused(function (paused) {
		if (paused && player.state === player.STATES.PLAYING) {
			player.state = player.STATES.PLAYING;
			setControls(player.STATES.PLAYING);
			setCasey("open");
		} else if (!paused && player.state !== player.STATES.PLAYING) {
			player.state = player.STATES.PAUSED;
			setControls(player.STATES.PAUSING);
			setCasey("open");
		}
	});
}


// Function to handle the displaying of the loading screens.
function viewHandler (event) {
	switch (event) {

		// Once both the player and window have been fully loaded
		case "loaded":
			// If the audio is locked and touch required, we pull a trick to unlock the audio context.
			if (audioLocked) {
				nodes.player.className = "takeover";	// Make the player button cover the screen (and make it fully transparent)
				nodes.touch.style.display = "inline";	// Show the "touch to begin" text
				
				var toHide = $class("wait-please");
				for (var i = 0, current; current = toHide.item(i); i++) {
					current.style.display = "none";		// Hide the loading texts
				}
			// Otherwise, just show Casey's head (for non-mobile devices)
			} else {
				nodes.loading.style.display = "none";
			}
			break;

		// For mobile devices ONLY - when the touch event that unlocks the audio context has been triggered.
		case "touched":
			nodes.player.className = "passive";
			nodes.loading.style.display = "none";
			break;

		default:
			console.error("Invalid event passed to viewHandler: " + event);
	}
}


// Dispatch a dummy event to a target node
function triggerEvent (eventName, target) {
	var fakeEvent = document.createEvent("Event");
	fakeEvent.initEvent(eventName, true, true);
	target.dispatchEvent(fakeEvent);
}


// Update whether it visually seems like there should be controls playing.
function setControls (state) {
	if (state === player.STATES.PLAYING) {
		nodes.bang.className = "on";

		svgNodes.pause.style.visibility = "visible";
		svgNodes.play.style.visibility  = "hidden";
	} else if (state === player.STATES.PAUSING) {
		var stopBanging = function (e) {
			e.target.removeEventListener("animationiteration", stopBanging);		// Make sure this handler only triggers once.
			e.target.removeEventListener("webkitAnimationIteration", stopBanging);	// ^ Remove both event listeners, since only one needs to trigger.
			if (e.target.className === "on") e.target.className = "";				// Stop the animation if it's still going.
			player.state = player.STATES.PAUSED;									// Transition from PAUSING to PAUSED
		};

		nodes.bang.addEventListener("animationiteration", stopBanging);
		nodes.bang.addEventListener("webkitAnimationIteration", stopBanging);

		svgNodes.pause.style.visibility = "hidden";
		svgNodes.play.style.visibility  = "visible";
	} else {
		console.error("Invalid state for controls: " + state);
	}
}


// Update Casey's mouth to be open or closed.
function setCasey (state) {
	if (state === "open") {
		nodes.casey.src = "./images/open.png";
	} else if (state === "closed") {
		nodes.casey.src = "./images/closed.png";
	} else {
		console.error("Invalid state for Casey: " + state);
	}
}


// Start up the soundcloud widget iframe and attach what events we need.
function createPlayer (playlistNumber) {
	var frame = document.createElement("iframe");
	frame.className = "passive";
	frame.src = "https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/" + playlistNumber + "&auto_play=false&buying=false&liking=false&download=false&sharing=false&show_artwork=false&show_comments=false&show_playcount=false&show_user=false&hide_related=false&visual=false&start_track=0&callback=true";

	// Don't change these. Necessary for proper positioning. A dirty hack was my only option to get mobile to work well.
	frame.width		= 60;
	frame.height	= 90;
	
	var appended = document.body.appendChild(frame);

	appended.addEventListener("load", function () {
		player.handle = SC.Widget(appended);

		// When the player is initialized, get the number of songs in the playlist.
		player.handle.bind(SC.Widget.Events.READY, function () {
			player.handle.getSounds(function (sounds) {
				player.songCount = sounds.length;
				loaded.callback();		// Finally, make a callback to let the loading handler know that the player is fully initialized.
			});
		});

		// When a song finishes, load a random new one.
		player.handle.bind(SC.Widget.Events.FINISH, function () {
			var newTrack = Math.floor(Math.random() * player.songCount);
			console.log("Now playing track #" + newTrack);
			player.handle.skip(newTrack);
		});

		// When a song starts playing, check to see if it was from the mobile hack. If so, immediately pause and hide the touch overlay.
		player.handle.bind(SC.Widget.Events.PLAY, function () {
			if (player.state === player.STATES.TOUCH_NEEDED) {
				player.handle.pause();
				player.state = player.STATES.PAUSED;
				setInterval(checkForOutsideAction, 2500);
				viewHandler("touched");
			}
		});
	});

	return appended;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Make a callback to let the loading handler know that the window is fully initialized.
window.addEventListener("load", function (e) {
	loaded.callback(e);
});


// Once the DOM has been fully loaded, we can start doing things.
document.addEventListener("DOMContentLoaded", function () {
	// :)
	console.info("%cGreetings, curious internet citizen! This is an open source project.\n\nYou can find out more about this website on GitHub at https://github.com/jfktrey/vlog-radio", "color: blue; font-size: large");

	// Set up the nodes object
	var nodeKeys = Object.keys(nodes);
	for (var i = 0, node; node = nodeKeys[i]; i++) {	// My favorite way of looping over non-sparse arrays
		nodes[node] = $id(nodes[node]);
	}
	nodes.player = createPlayer(player.playlist);

	// Set up node event handlers
	if (audioLocked) {
		document.body.style.cursor = "pointer";			// Necessary to make the body clickable for iOS.
		document.body.addEventListener("click", function () {
			setCasey("closed");
		});

		nodes.mouth.style.cursor = "pointer";					// Necessary to make the mouth clickable for iOS.
		nodes.mouth.addEventListener("click", function (e) {
			e.stopPropagation();
			setCasey("open");
		});

		nodes.explain.src = "./images/explanation-mobile.svg";
	}

	// Hover events for the mouth
	nodes.mouth.addEventListener("mouseover", function () { setCasey("open")   });
	nodes.mouth.addEventListener("mouseout",  function () { setCasey("closed") });

	// Set the ratio property of the image and resize based on that.
	nodes.casey.addEventListener("load", (function () {
		return function () {
			nodes.casey.dataset.ratio = nodes.casey.naturalWidth / nodes.casey.naturalHeight;	// Width/Height of Casey's image
			triggerEvent("resize", window);														// Initial sizing call
		};
	})());

	// Once the controls load, attach events to the SVG elements within
	nodes.controls.addEventListener("load", function () {
		var controlsDocument = nodes.controls.contentDocument;
		var $controlsId      = controlsDocument.getElementById.bind(controlsDocument);

		// Set up the svgNodes object
		var nodeKeys = Object.keys(svgNodes);
		for (var i = 0, node; node = nodeKeys[i]; i++) {	// My favorite way of looping over non-sparse arrays
			svgNodes[node] = $controlsId(svgNodes[node]);
		}

		// When the hitbox is clicked, play or pause depending on the current state.
		svgNodes.hitbox.addEventListener("click", function (e) {
			e.stopPropagation();	// Don't let this bubble up to <body>. But would it? Would it bubble through the SVG document? Not sure. TODO: test this.

			// If we're not already in the process of pausing (waiting for the head to bobble back to the center)
			if (player.state !== player.STATES.PAUSING) {

				// If we're already playing, then pause the player.
				if (player.state === player.STATES.PLAYING) {
					player.state = player.STATES.PAUSING;

					player.handle.pause();

					setControls(player.STATES.PAUSING);
					console.info("%cStopped playing track.", "color: indianred");

					if (audioLocked) setCasey("open");

				// Otherwise, start playing.
				} else {
					player.state = player.STATES.PLAYING;

					var newTrack = Math.floor(Math.random() * player.songCount);
					player.handle.skip(newTrack);

					setControls(player.STATES.PLAYING);
					console.info("Now playing track %c#" + newTrack, "color: limegreen");

					// Automatically close Casey's mouth if we're working with a touchscreen.
					if (audioLocked) {
						setTimeout(function () {
							setCasey("closed");
						}, 2000);
					}	
				}
			}
		});
	});

	// Sorry, some JS-driven sizing is necessary. I really tried to avoid this.
	window.addEventListener("resize", function () {
		nodes.center.style.width   = nodes.casey.dataset.ratio * nodes.center.clientHeight + "px";
		nodes.explain.style.bottom = (0.5 * nodes.center.clientHeight) - (0.5 * nodes.casey.clientHeight) + "px";
		nodes.mouth.style.bottom   = 0.208 * nodes.casey.clientHeight + "px";
	});

	// Make an initial call to the sizer
	triggerEvent("resize", window);
});


})();