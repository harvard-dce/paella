/** #DCE Overriding playbutton.js for checkEnabled override for live stream events */
paella.addPlugin(function() {
	return class PlayPauseButtonPlugin extends paella.ButtonPlugin {
		constructor() {
			super();
			this.playIconClass = 'icon-play';
			this.pauseIconClass = 'icon-pause';
			this.playSubclass = 'playButton';
			this.pauseSubclass = 'pauseButton';
		}
	
		getAlignment() { return 'left'; }
		getSubclass() { return this.playSubclass; }
		getIconClass() { return this.playIconClass; }
		getName() { return "es.upv.paella.playPauseButtonPlugin"; }
		getDefaultToolTip() { return base.dictionary.translate("Play"); }
		getIndex() { return 110; }
	
		checkEnabled(onSuccess) {
			//onSuccess(true);
			// #DCE OPC-374 disable play-pause button for live
			onSuccess(!paella.player.isLiveStream());
		}
	
		setup() {
			if (paella.player.playing()) {
				this.changeIconClass(this.playIconClass);
			}
			paella.events.bind(paella.events.play,(event) => {
				this.changeIconClass(this.pauseIconClass);
				this.changeSubclass(this.pauseSubclass);
				this.setToolTip(paella.dictionary.translate("Pause"));
			});

			paella.events.bind(paella.events.pause,(event) => {
				this.changeIconClass(this.playIconClass);
				this.changeSubclass(this.playSubclass);
				this.setToolTip(paella.dictionary.translate("Play"));
			});

			paella.events.bind(paella.events.ended,(event) => {
				this.changeIconClass(this.playIconClass);
				this.changeSubclass(this.playSubclass);
				this.setToolTip(paella.dictionary.translate("Play"));
			});
		}

		action(button) {
			paella.player.videoContainer.paused()
				.then(function(paused) {
					if (paused) {
						paella.player.play();
					}
					else {
						paella.player.pause();
					}
				});
		}
	}	
});

