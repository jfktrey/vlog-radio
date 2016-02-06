VlogRad.io
==========

Vlog Radio is a site showcasing the music used by Casey Neistat in his daily vlogs.

Why?
----

I was really tired one night. This is one of the weird ideas that happened at the time.

Also it seemed like a fun weekend project. I used it as an exercise in using good practices and building a website withouth jQuery (since I've used it in most projects recently).

How?
----

Everything is pretty simple. This website is just a page with a hidden SoundCloud Widget in an iframe, which is controlled via the [SoundCloud Widget API](https://developers.soundcloud.com/docs/api/html5-widget). This API exposes a message passing interface that allows for asynchronous communication with the widget inside its iframe. This allows for the creation of custom controls, such as the pause and play button inside Casey's mouth.

Where it gets more difficult is on mobile devices. This is because many mobile browsers don't allow pages to play audio until some sort of user interaction triggers it - for example, a touch event. This trigger has to happen synchronously as a result of the user's input. Read more about that [here](http://stackoverflow.com/questions/12517000/no-sound-on-ios-6-web-audio-api). Normally this wouldn't be an issue, since I could just hijack the touch event for the play button and the audio would play like normal.

Keep in mind, though, that the audio context that I'm trying to interact with belongs to the SoundCloud widget, which is inside a cross-domain iframe. I have no access inside this iframe (due to browser security policies) since it's cross-domain, so I can't directly access the audio context. For most use cases of the widget, this isn't an issue since play and pause commands can be asynchronously sent via the message passing interface. That will, in turn, cause the audio context to play or pause. But that doesn't work for unlocking mobile audio, since those commands are sent *asynchronously* whereas a call to unlock the audio context must occur *synchronously* as the result of user input (ex. a touch event). That leaves me with no way to unlock the audio context as a result of user interaction on my page.

To get around this, I came up with a very hackish solution. When testing out the API on SoundCloud's [Widget API Playground](https://w.soundcloud.com/player/api_playground.html) on my phone, I realized that pressing the widget's play button would unlock the audio context and allow all the API functions to work. However, I didn't want to require the user to press the play button on the widget instead of my custom play/pause controls. So I came up with a solution that involved scaling the widget so that the play button covers the entire screen, then set the iframe's opacity to 0. This is what happens when the "touch here to begin" message is shown on mobile devices. When you tap the screen, you're actually tapping the fully transparent widget's play button overlayed on top of the screen. This triggers the SC.Widget.Events.PLAY event inside the widget, which is picked up by my page (via the message passing interface) so that it can send the pause command immediately and progress past the loading screen to Casey's head.

Where can I find the full playlist?
-----------------------------------

[Right here!](https://soundcloud.com/kenickiemusic/sets/casey-neistat-vlog-music)
