# Captions

Files should appear in the "catalog" of an episode's mediapackage, with a type
of "caption/timedtext" (the default for the "include caption" matterhorn
workflow). See the `_extractCaptions` and `_findSupportedCaptions` methods of
the `simpleCaptionsPlugin` class.

The `simpleCaptionsPlugin` will then extract captions named "*.vtt" from the
catalog and add them to the `<video>` tag used for the presenter video.

To encode the language, name the file `somerootname<underscore or hyphen><2 digit language code>.vtt`. So:

* class-en.vtt
* class_en.vtt
* class.vtt

will all resolve to english captions, as the default is 'en'.

There's a mini language map built into the simpleCaptionsPlugin, be sure to
update it if you support additional languages beyond what's configured.
