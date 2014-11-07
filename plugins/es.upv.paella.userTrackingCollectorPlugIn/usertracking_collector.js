Class ("paella.plugins.UserTrackingCollectorPlugIn",paella.EventDrivenPlugin,{
	heartbeatTimer:null,
	// #DCE MATT-462 GL: limit the number of resize events
	//Send resize event after this long in milliseconds
	resizeTimeoutInterval:200,
	//The resize timeout object
	resizeTimeout:false,

	getName:function() { return "es.upv.paella.userTrackingCollectorPlugIn"; },

	setup:function() {
		var thisClass = this;
		
		if ( this.config.heartBeatTime > 0) {		
			this.heartbeatTimer = new base.Timer(function(timer) {thisClass.registerEvent('HEARTBEAT'); }, this.config.heartBeatTime);
			this.heartbeatTimer.repeat = true;
		}
		//--------------------------------------------------
		// #DCE MATT-462 GL
		var thisClass = this;
		$(window).resize(function(event) { thisClass.onResize(thisClass); });
	},
	
	getEvents:function() {
		return [paella.events.play,
				paella.events.pause,
				paella.events.seekTo,
				paella.events.seekToTime,
				paella.events.loadComplete
		];
	},
	
	onEvent:function(eventType, params) {
		this.registerEvent(eventType);		
	},

	// #DCE MATT-462 GL, modified to limit resize events
	onResize:function(thisClass) {
	  if (this.resizeTimeout !== false) {
	    clearTimeout(this.resizeTimeout);
	  }
	  this.resizeTimeout = setTimeout(function(event) { thisClass.onResizeTimeout(thisClass); }, this.resizeTimeoutInterval);
	},

	onResizeTimeout:function(thisClass) {
		var w = $(window);
		var label = w.width()+"x"+w.height();
		this.registerEvent("RESIZE-TO", label);
  },

	registerEvent: function(event, label) {
		var videoCurrentTime = parseInt(paella.player.videoContainer.currentTime() + paella.player.videoContainer.trimStart());			
		var playing = !paella.player.videoContainer.paused();
		
		var eventInfo = {
			time: videoCurrentTime,
			playing: playing,
			event: event,
			label: label
		};
		paella.events.trigger(paella.events.userTracking, eventInfo);
	}
});

paella.plugins.userTrackingCollectorPlugIn = new paella.plugins.UserTrackingCollectorPlugIn();
