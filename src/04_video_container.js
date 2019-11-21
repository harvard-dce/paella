/*  
	Paella HTML 5 Multistream Player
	Copyright (C) 2017  Universitat Politècnica de València Licensed under the
	Educational Community License, Version 2.0 (the "License"); you may
	not use this file except in compliance with the License. You may
	obtain a copy of the License at

	http://www.osedu.org/licenses/ECL-2.0

	Unless required by applicable law or agreed to in writing,
	software distributed under the License is distributed on an "AS IS"
	BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
	or implied. See the License for the specific language governing
	permissions and limitations under the License.
*/

/* #DCE OPC-374, OPC-357 MATT-2502 override default video rectangle dimensions to fit extra wide live combo */

(() => {

class BackgroundContainer extends paella.DomNode {
	constructor(id,image) {
		super('img',id,{position:'relative',top:'0px',left:'0px',right:'0px',bottom:'0px',zIndex:GlobalParams.background.zIndex});
		this.domElement.setAttribute('src',image);
		this.domElement.setAttribute('alt','');
		this.domElement.setAttribute('width','100%');
		this.domElement.setAttribute('height','100%');
	}

	setImage(image) {
		this.domElement.setAttribute('src',image);
	}
}

paella.BackgroundContainer = BackgroundContainer;

class VideoOverlay extends paella.DomNode {
	get size() {
		if (!this._size) {
			this._size = {w:1280,h:720};
		}
		return this._size;
	}

	constructor() {
		var style = {position:'absolute',left:'0px',right:'0px',top:'0px',bottom:'0px',overflow:'hidden',zIndex:10};
		super('div','overlayContainer',style);
		this.domElement.setAttribute("role", "main");
	}

	_generateId() {
		return Math.ceil(Date.now() * Math.random());
	}

	enableBackgroundMode() {
		this.domElement.className = 'overlayContainer background';
	}

	disableBackgroundMode() {
		this.domElement.className = 'overlayContainer';
	}

	clear() {
		this.domElement.innerText = "";
	}

	getVideoRect(index) {
		return paella.player.videoContainer.getVideoRect(index);
	}

	addText(text,rect,isDebug) {
		var textElem = document.createElement('div');
		textElem.innerText = text;
		textElem.className = "videoOverlayText";
		if (isDebug) textElem.style.backgroundColor = "red";
		return this.addElement(textElem,rect);
	}

	addElement(element,rect) {
		this.domElement.appendChild(element);
		element.style.position = 'absolute';
		element.style.left = this.getHSize(rect.left) + '%';
		element.style.top = this.getVSize(rect.top) + '%';
		element.style.width = this.getHSize(rect.width) + '%';
		element.style.height = this.getVSize(rect.height) + '%';
		return element;
	}

	getLayer(id,zindex) {
		id = id || this._generateId();
		return $(this.domElement).find("#" + id)[0] || this.addLayer(id,zindex);
	}

	addLayer(id,zindex) {
		zindex = zindex || 10;
		var element = document.createElement('div');
		element.className = "row";
		element.id = id || this._generateId();
		return this.addElement(element,{ left:0, top: 0, width:1280, height:720 });
	}

	removeLayer(id) {
		var elem = $(this.domElement).find("#" + id)[0];
		if (elem) {
			this.domElement.removeChild(elem);
		}
	}

	removeElement(element) {
		if (element) {
			try {
				this.domElement.removeChild(element);
			}
			catch (e) {
				
			}
		}
	}

	getVSize(px) {
		return px*100/this.size.h;
	}

	getHSize(px) {
		return px*100/this.size.w;
	}
}

paella.VideoOverlay = VideoOverlay;

class VideoWrapper extends paella.DomNode {
	constructor(id, left, top, width, height) {
		var relativeSize = new paella.RelativeVideoSize();
		// #DCE give full dimensions of initial video if sizes were not passed
		var percentTop = relativeSize.percentVSize(top) || 0 + '%';
		var percentLeft = relativeSize.percentWSize(left) || 0 + '%';
		var percentWidth = relativeSize.percentWSize(width) || 100 + '%';
		var percentHeight = relativeSize.percentVSize(height) || 100 + '%';
		var style = {
			top: percentTop,
			left: percentLeft,
			width: percentWidth,
			height: percentHeight,
			position: 'absolute',
			//zIndex: GlobalParams.video.zIndex, //#DCE use from style
			overflow: 'hidden'
		};
		super('div',id,style);
		this._rect = { left:left, top:top, width:width, height:height };
		this.domElement.className = "videoWrapper";
	}

	setRect(rect,animate) {
		this._rect = JSON.parse(JSON.stringify(rect));
		var relativeSize = new paella.RelativeVideoSize();
		// #DCE MATT-2502 override the UPV default relative video container ratio
		// *ONLY* for the extra short and wide "3.55/1" ratio, 16x9+16x9 (32x9), DCE live stream.
		// The override has to be set globally for access by all instances of new paella.RelativeVideoSize().
		if (paella.dce && paella.player.videoContainer.isMonostream && rect.aspectRatio == "3.55/1") {
		  // #DCE MH-relative size old style intercept of the paella.RelativeVideoSize()
		  // #DCE OPC-357 TODO: hoping RelativeVideoSize.w and h can be overridden in newer Paella
		  // [followup] Sadly no, still needed for UPV Paella v6.2.0
		  paella.dce.relativeVideoSize = paella.dce.relativeVideoSize || {};
		  paella.dce.relativeVideoSize.h=rect.height;
		  paella.dce.relativeVideoSize.w=rect.width;
		}
		var percentTop = relativeSize.percentVSize(rect.top) + '%';
		var percentLeft = relativeSize.percentWSize(rect.left) + '%';
		var percentWidth = relativeSize.percentWSize(rect.width) + '%';
		var percentHeight = relativeSize.percentVSize(rect.height) + '%';
		var style = {top:percentTop,left:percentLeft,width:percentWidth,height:percentHeight,position:'absolute'};
		if (animate) {
			this.disableClassName();
			var thisClass = this;

			$(this.domElement).animate(style,400,function(){
				thisClass.enableClassName();
				paella.events.trigger(paella.events.setComposition, { video:thisClass });
			});
			this.enableClassNameAfter(400);
		}
		else {
			$(this.domElement).css(style);
			paella.events.trigger(paella.events.setComposition, { video:this });
		}
	}

	getRect() {
		return this._rect;
	}

	disableClassName() {
		this.classNameBackup = this.domElement.className;
		this.domElement.className = "";
	}

	enableClassName() {
		this.domElement.className = this.classNameBackup;
	}

	enableClassNameAfter(millis) {
		setTimeout("$('#" + this.domElement.id + "')[0].className = '" + this.classNameBackup + "'",millis);
	}

	setVisible(visible,animate) {
		if (typeof(visible=="string")) {
			visible = /true/i.test(visible) ? true : false;
		}
		if (visible && animate) {
			$(this.domElement).show();
			$(this.domElement).animate({opacity:1.0},300);
		}
		else if (visible && !animate) {
			$(this.domElement).show();
		}
		else if (!visible && animate) {
			$(this.domElement).animate({opacity:0.0},300);
		}
		else if (!visible && !animate) {
			$(this.domElement).hide();
		}
	}

	setLayer(layer) {
		this.domElement.style.zIndex = layer;
	}
}

paella.VideoWrapper = VideoWrapper;


class VideoContainerBase extends paella.DomNode {
	
	constructor(id) {
		var style = {position:'absolute',left:'0px',right:'0px',top:'0px',bottom:'0px',overflow:'hidden'};
		super('div',id,style);

		this._trimming = {enabled:false,start:0,end:0};
		this.timeupdateEventTimer = null;
		this.timeupdateInterval = 250;
		this.masterVideoData = null;
		this.slaveVideoData = null;
		this.currentMasterVideoData = null;
		this.currentSlaveVideoData = null;
		this._maxSyncDelay = 0.3; // #DCE OPC-401
		this._syncHits = 0;  // #DCE OPC-407
		this._videoSyncTimeMillis = 5000;
		this._force = false;
		this._playOnClickEnabled =  true;
		this._seekDisabled =  false;
		this._seekingPlayers = new Set(); //#DCE OPC-407 array of players in seeking state
		this._waitingToPlayPlayers = new Set(); //#DCE OPC-407 array of players in waiting to play state
		// #DCE OPC-401
		setTimeout(function() {
		  let repeat = true;
		  paella.player.videoContainer.syncVideos(repeat);
		}, this._videoSyncTimeMillis);

		$(this.domElement).click((evt) => {
		  // #DCE OPC-384 enable play button on screen for mobile
			// if (this.firstClick && base.userAgent.browser.IsMobileVersion) return;
			if (this.firstClick && !this._playOnClickEnabled) return;
			paella.player.videoContainer.paused()
				.then((paused) => {
					this.firstClick = true;
					if (paused) {
						paella.player.play();
					}
					else {
						paella.player.pause();
					}
				});
		});

		this.domElement.addEventListener("touchstart",(event) => {
			if (paella.player.controls) {
				paella.player.controls.restartHideTimer();
			}
		});
	}

	get seekDisabled() { return this._seekDisabled; }
	set seekDisabled(v) {
		let changed = v!=this._seekDisabled;
		this._seekDisabled = v;
		if (changed) {
			paella.events.trigger(paella.events.seekAvailabilityChanged, { disabled:this._seekDisabled, enabled:!this._seekDisabled })
		}
	}

	get seekEnabled() { return !this._seekDisabled; }
	set seekEnabled(v) {
		let changed = v==this._seekDisabled;
		this._seekDisabled = !v;
		if (changed) {
			paella.events.trigger(paella.events.seekAvailabilityChanged, { disabled:this._seekDisabled, enabled:!this._seekDisabled })
		}
	}

	// #DCE OPC-407 only play if all players are not seeking
	playIfNonAreSeeking (player) {
		let seekingCount, waitingForPlayCount;
		if (!player || !player.stream) return;
		this._seekingPlayers.delete(player);
		this._waitingToPlayPlayers.add(player);
		seekingCount = this._seekingPlayers.size;
		waitingForPlayCount = this._waitingToPlayPlayers.size;
		base.log.debug(`HTML5: PLAY? playIfNonAreSeeking '${player.stream.content}' ('${player._identifier}'), seeking players: '${seekingCount}', waiting to player players: '${waitingForPlayCount}'.`);

		// #DCE OPC-407 helpful debugging
		this._waitingToPlayPlayers.forEach(p => base.log.debug(`HTML5: PLAY? Waiting to Play '${p.stream.content}'`));
		this._seekingPlayers.forEach(p => base.log.debug(`HTML5: PLAY? Still seeking '${p.stream.content}'`));

		if (seekingCount === 0) {
			this.currentTime().then(currentTime => {
				this._waitingToPlayPlayers.forEach(p =>  {
					let timeOffset = Math.abs(p.video.currentTime - currentTime);
					if (timeOffset > 0.5) {
						base.log.debug(`HTML5: PLAY? compensating for time offset '${timeOffset}' for '${p.stream.content}' '${p._identifier}'.`);
						p.video.currentTime = currentTime;
					}
					p.play();
					base.log.debug(`HTML5: PLAY? starting play for '${p.stream.content}' at '${p.video.currentTime}'.`);
				});
				this._waitingToPlayPlayers = new Set();
			});
		} else {
			base.log.debug(`HTML5: PLAY? there are '${seekingCount}' players still seeking, '${player.stream.content}' will wait until all finish seeking.`);
		}
	}

	// #DCE OPC-354, OPC-389, OPC-401
	// https://github.com/polimediaupv/paella/issues/447

	repeatSyncVideo(repeat) {
	  repeat = repeat || true;
	  let self = this;
	  if (repeat) {
	    setTimeout(function () {
	      paella.player.videoContainer.syncVideos(true);
	    }, self._videoSyncTimeMillis);
	  }
	}

	syncVideos(repeat) {
	  repeat = repeat || false;
	  let self = this;
	  if (paella.player.videoContainer._seekingPlayers.size > 0) {
	    base.log.debug(`HTML5: Video Seek is already running, not synching Videos`);
	    this.repeatSyncVideo(repeat);
	    return;
	  }
	  if (base.userAgent.system.iPhone) { // #DCE only show one video on iPhone, for now, keep hiden one paused
	    base.log.debug(`HTML5: Video synch disabled for iPhone, not synching Videos`);
	    return;
	  }

	  if (!paella.player.videoContainer.masterVideo()) {
	    // #DCE OPC-420
	    base.log.debug(`There was an existing ERROR loading videos for this mp! At least 1 video should have been found by this point and was not.`);
	    return;
	  }

	  // #DCE OPC-407 synch videos not matching the master
	  paella.player.videoContainer.masterVideo().getVideoData().then(function (videoData) {
		  let currentTime = videoData.currentTime;
			let streams = paella.player.videoContainer.streamProvider.videoPlayers;
			let promises = [];
			let updated = [];
			let shortbuffer = 0.1;
			let seekTime = shortbuffer;
			let isPaused = videoData.paused;
			streams.forEach(v => {
			 if (paella.player.videoContainer.isMonostream || !v.video) {
			   return;
			 }
			 if (v._isSeeking) {
			   base.log.debug(`HTML5: Not synching video=${v._identifier}, content=${v._stream.content} is already seeking`);
			   return;
			 }
			 let diff = Math.abs(v.video.currentTime - currentTime);
			 base.log.debug(`HTML5-SYNC: About to check sync on '${v._stream.content}' (${v._identifier}) paused='${v.video.paused}' timediff=${diff} currentTime=${v.video.currentTime}`);
			 if (v !== paella.player.videoContainer.streamProvider.mainAudioPlayer && !v.video.paused && diff > self._maxSyncDelay) {
			   let seekTime = shortbuffer > currentTime ? shortbuffer : parseFloat(currentTime).toFixed(3);
			   if (!isPaused) {
			     seekTime += (self._maxSyncDelay - shortbuffer); // add future buffer to catch running audio
			   }
			   base.log.debug(`HTML5: About to sync '${v._stream.content}' (${v._identifier}) paused=${v.video.paused}, timediff=${diff}, settingToTime=${seekTime}`);
			    updated.push(v);
			    promises.push(v.setCurrentTime(seekTime));
			    self._syncHits++;
			  }
			});
			Promise.all(promises).then(function () {
			 if (updated.length > 0) {
			   base.log.debug(`HTML5: Synced ${updated.length} videos for ${seekTime}, number of times synched = ${self._syncHits}`);
			 }
			 if (repeat) {
			   setTimeout(function () {
			     paella.player.videoContainer.syncVideos(true);
			     }, self._videoSyncTimeMillis);
			   }
			 }).catch(error => {
			   base.log.debug(`HTML5: Unable to synch video(s) to time '${seekTime}': ${error.message}`);
			 });
		});
	}

	triggerTimeupdate() {
		var paused = 0;
		var duration = 0;
		this.paused()
			.then((p) => {
				paused = p;
				return this.duration();
			})

			.then((d) => {
				duration = d;
				return this.currentTime();
			})

			.then((currentTime) => {
				if (!paused || this._force) {
					this._force = false;
					paella.events.trigger(paella.events.timeupdate, {
						videoContainer: this,
						currentTime: currentTime,
						duration: duration
					});
				}
			});
	}

	startTimeupdate() {
		this.timeupdateEventTimer = new Timer((timer) => {
			this.triggerTimeupdate();
		}, this.timeupdateInterval);
		this.timeupdateEventTimer.repeat = true;
	}

	stopTimeupdate() {
		if (this.timeupdateEventTimer) {
			this.timeupdateEventTimer.repeat = false;
		}
		this.timeupdateEventTimer = null;
	}

	enablePlayOnClick() {
		this._playOnClickEnabled = true;
	}

	disablePlayOnClick() {
		this._playOnClickEnabled = false;
	}

	isPlayOnClickEnabled() {
		return this._playOnClickEnabled;
	}

	play() {
		this.startTimeupdate();
		setTimeout(() => paella.events.trigger(paella.events.play), 50)
	}

	pause() {
		paella.events.trigger(paella.events.pause);
		this.stopTimeupdate();
	}

	seekTo(newPositionPercent) {
		if (this._seekDisabled) {
			console.log("Warning: Seek is disabled");
			return;
		}
		var thisClass = this;
		// #DCE OPC_407 start the seek load spinner
		paella.player.loader.seekload();
		base.log.debug(`HTML5: seekTo before, percent = ${newPositionPercent}`);
		this.setCurrentPercent(newPositionPercent)
			.then((timeData) => {
				// #DCE OPC_407 end the seek load spinner
				base.log.debug(`HTML5: seekTo after, percent = ${newPositionPercent}`);
				paella.player.loader.loadComplete();
				thisClass._force = true;
				this.triggerTimeupdate();
				paella.events.trigger(paella.events.seekToTime,{ newPosition:timeData.time });
				paella.events.trigger(paella.events.seekTo,{ newPositionPercent:newPositionPercent });
			});
	}

	seekToTime(time) {
		if (this._seekDisabled) {
			console.log("Seek is disabled");
			return;
		}
		base.log.debug(`HTML5: seekToTime before, time = ${time}`); //#DCE OPC-407 seek log
		this.setCurrentTime(time)
			.then((timeData) => {
				base.log.debug(`HTML5: seekToTime after, time = ${time}`); //#DCE OPC-407 seek log
				this._force = true;
				this.triggerTimeupdate();
				let percent = timeData.time * 100 / timeData.duration;
				paella.events.trigger(paella.events.seekToTime,{ newPosition:timeData.time });
				paella.events.trigger(paella.events.seekTo,{ newPositionPercent:percent });
			});
	}

	setPlaybackRate(params) {
		paella.events.trigger(paella.events.setPlaybackRate, { rate: params });
	}

	setVolume(params) {
	}

	volume() {
		return 1;
	}

	trimStart() {
		return new Promise((resolve) => {
			resolve(this._trimming.start);
		});
	}

	trimEnd() {
		return new Promise((resolve) => {
			resolve(this._trimming.end);
		});
	}

	trimEnabled() {
		return new Promise((resolve) => {
			resolve(this._trimming.enabled);
		});
	}

	trimming() {
		return new Promise((resolve) => {
			resolve(this._trimming);
		});
	}

	enableTrimming() {
		this._trimming.enabled = true;
		let cap=paella.captions.getActiveCaptions()
		if(cap!==undefined) paella.plugins.captionsPlugin.buildBodyContent(cap._captions,"list");
		paella.events.trigger(paella.events.setTrim,{trimEnabled:this._trimming.enabled,trimStart:this._trimming.start,trimEnd:this._trimming.end});
	}

	disableTrimming() {
		this._trimming.enabled = false;
		let cap=paella.captions.getActiveCaptions()
		if(cap!==undefined) paella.plugins.captionsPlugin.buildBodyContent(cap._captions,"list");
		paella.events.trigger(paella.events.setTrim,{trimEnabled:this._trimming.enabled,trimStart:this._trimming.start,trimEnd:this._trimming.end});
	}

	setTrimming(start,end) {
		return new Promise((resolve) => {
			let currentTime = 0;

			this.currentTime(true)
				.then((c) => {
					currentTime = c;
					return this.duration();
				})

				.then((duration) => {
					this._trimming.start = Math.floor(start);
					this._trimming.end = Math.floor(end);
					if(this._trimming.enabled){
						if (currentTime<this._trimming.start) {
							this.setCurrentTime(0);
						}
						if (currentTime>this._trimming.end) {
							this.setCurrentTime(duration);
						}

						let cap=paella.captions.getActiveCaptions();
						if(cap!==undefined) paella.plugins.captionsPlugin.buildBodyContent(cap._captions,"list");
					}
					paella.events.trigger(paella.events.setTrim,{trimEnabled:this._trimming.enabled,trimStart:this._trimming.start,trimEnd:this._trimming.end});
					resolve();
				});
		});
	}

	setTrimmingStart(start) {
 		return this.setTrimming(start,this._trimming.end);
	}

	setTrimmingEnd(end) {
		return this.setTrimming(this._trimming.start,end);
	}

	setCurrentPercent(percent) {
		var duration = 0;
		return new Promise((resolve) => {
			this.duration()
				.then((d) => {
					duration = d;
					return this.trimming();
				})
				.then((trimming) => {
					var position = 0;
					if (trimming.enabled) {
						var start = trimming.start;
						var end = trimming.end;
						duration = end - start;
						var trimedPosition = percent * duration / 100;
						position = parseFloat(trimedPosition);
					}
					else {
						position = percent * duration / 100;
					}
					base.log.debug(`HTML5: in setCurrentPercent '${percent}' before call setCurrentTime to '${position}'`); //#DCE OPC-407
					return this.setCurrentTime(position);
				})
				.then(function(timeData) {
					resolve(timeData);
				});
		});
	}

	setCurrentTime(time) {
		base.log.debug("VideoContainerBase.setCurrentTime(" +  time + ")");
	}

	currentTime() {
		base.log.debug("VideoContainerBase.currentTime()");
		return 0;
	}

	duration() {
		base.log.debug("VideoContainerBase.duration()");
		return 0;
	}

	paused() {
		base.log.debug("VideoContainerBase.paused()");
		return true;
	}

	setupVideo(onSuccess) {
		base.log.debug("VideoContainerBase.setupVide()");
	}

	isReady() {
		base.log.debug("VideoContainerBase.isReady()");
		return true;
	}

	onresize() { super.onresize(onresize);
	}

	// #DCE UPV video end fix made Nov 18, 2019: https://github.com/polimediaupv/paella/blob/17aade865
	ended() {
		return new Promise((resolve) => {
			let duration = 0;
			this.duration()
				.then((d) => {
					duration = d;
					return this.currentTime();
				})
				.then((currentTime) => {
					resolve(Math.floor(duration) <= Math.ceil(currentTime));
				});
		});
	}

}

paella.VideoContainerBase = VideoContainerBase;

// Profile frame strategies

class ProfileFrameStrategy {
	static Factory() {
		var config = paella.player.config;

		try {
			var strategyClass = config.player.profileFrameStrategy;
			var ClassObject = paella.utils.objectFromString(strategyClass);
			var strategy = new ClassObject();
			if (strategy instanceof paella.ProfileFrameStrategy) {
				return strategy;
			}
		}
		catch (e) {
		}
		
		return null;
	}

	valid() { return true; }

	adaptFrame(videoDimensions,frameRect) {
		return frameRect;
	}
}

paella.ProfileFrameStrategy = ProfileFrameStrategy;

class LimitedSizeProfileFrameStrategy extends ProfileFrameStrategy {
	adaptFrame(videoDimensions,frameRect) {
		if (videoDimensions.width<frameRect.width|| videoDimensions.height<frameRect.height) {
			var frameRectCopy = JSON.parse(JSON.stringify(frameRect));
			frameRectCopy.width = videoDimensions.width;
			frameRectCopy.height = videoDimensions.height;
			var diff = { w:frameRect.width - videoDimensions.width,
						h:frameRect.height - videoDimensions.height };
			frameRectCopy.top = frameRectCopy.top + diff.h/2;
			frameRectCopy.left = frameRectCopy.left + diff.w/2;
			return frameRectCopy;
		}
		return frameRect;
	}
}

paella.LimitedSizeProfileFrameStrategy = LimitedSizeProfileFrameStrategy;

class StreamProvider {
	constructor(videoData) {
		this._mainStream = null;
		this._videoStreams = [];
		this._audioStreams = [];

		this._mainPlayer = null;
		this._audioPlayer = null;
		this._videoPlayers = [];
		this._audioPlayers = [];
		this._players = [];

		this._autoplay = base.parameters.get('autoplay')=='true' || this.isLiveStreaming;
		this._startTime = 0;
	}

	init(videoData) {
		if (videoData.length==0) throw Error("Empty video data.");
		this._videoData = videoData;

		if (!this._videoData.some((stream) => { return stream.role=="master"; })) {
			this._videoData[0].role = "master";
		}

		this._videoData.forEach((stream, index) => {
			stream.type = stream.type || 'video';
			if (stream.role=='master') {
				this._mainStream = stream;
			}

			if (stream.type=='video') {
				this._videoStreams.push(stream);
			}
			else if (stream.type=='audio') {
				this._audioStreams.push(stream);
			}
		});

		if (this._videoStreams.length==0) {
			throw new Error("No video streams found. Paella Player requires at least one video stream.");
		}

		// Create video players
		let autoplay = this.autoplay;
		this._videoStreams.forEach((videoStream,index) => {
			let rect = {x:0,y:0,w:1280,h:720};
			let player = paella.videoFactory.getVideoObject(`video_${ index }`, videoStream, rect);
			player.setVideoQualityStrategy(this._qualityStrategy);
			player.setAutoplay(autoplay);

			if (videoStream==this._mainStream) {
				this._mainPlayer = player;
				this._audioPlayer = player;
			}
			else {
				player.setVolume(0);
			}

			this._videoPlayers.push(player);
			this._players.push(player);
		});

		// Create audio player
		this._audioStreams.forEach((audioStream,index) => {
			let player = paella.audioFactory.getAudioObject(`audio_${ index }`,audioStream);
			player.setAutoplay(autoplay);
			if (player) {
				this._audioPlayers.push(player);
				this._players.push(player);
			}
		});
	}

	loadVideos() {
		let promises = [];

		this._players.forEach((player) => {
			promises.push(player.load());
		});
		
		return Promise.all(promises);
	}

	get startTime() {
		return this._startTime;
	}

	set startTime(s) {
		this._startTime = s;
	}

	get isMonostream() {
		return this._videoStreams.length==1;
	}

	get mainStream() {
		return this._mainStream;
	}

	get videoStreams() {
		//return this._videoData;
		return this._videoStreams;
	}

	
	get audioStreams() {
		return this._audioStreams;
	}
	
	get streams() {
		return this._videoStreams.concat(this._audioStreams);
	}

	get videoPlayers() {
		return this._videoPlayers;
	}

	get audioPlayers() {
		return this._audioPlayers;
	}

	get players() {
		return this._videoPlayers.concat(this._audioPlayers);
	}

	callPlayerFunction(fnName) {
		let promises = [];
		let functionArguments = [];
		for (let i=1; i<arguments.length; ++i) {
			functionArguments.push(arguments[i]);
		}

		this.players.forEach((player) => {
			promises.push(player[fnName](...functionArguments));
			base.log.debug(`HTML5: Video pushing promise '${fnName}' args '${functionArguments}' on player '${player.stream.content}' '${player._identifier}'`);
		});

		return new Promise((resolve,reject) => {
			Promise.all(promises)
				.then(() => {
				  base.log.debug(`HTML5: promises finished '${fnName}' args '${functionArguments}'`);
					if (fnName=='play' && !this._firstPlay) {
						this._firstPlay = true;
						if (this._startTime) {
							this.players.forEach((p) => p.setCurrentTime(this._startTime));
						}
					}
					resolve();
				})
				.catch((err) => {
					reject(err);
				});
		});
	}

	get mainVideoPlayer() {
		return this._mainPlayer;
	}

	get mainAudioPlayer() {
		return this._audioPlayer;
	}

	get isLiveStreaming() {
		return paella.player.isLiveStream();
	}

	set qualityStrategy(strategy) {
		this._qualityStrategy = strategy;
		this._videoPlayers.forEach((player) => {
			player.setVideoQualityStrategy(strategy);
		})
	}

	get qualityStrategy() { return this._qualityStrategy || null; }

	get autoplay() {
		return this.supportAutoplay && this._autoplay;
	}

	set autoplay(ap) {
		if (!this.supportAutoplay || this.isLiveStreaming) return;
		this._autoplay = ap;
		if (this.videoPlayers) {
			this.videoPlayers.forEach((player) => player.setAutoplay(ap));
			this.audioPlayers.forEach((player) => player.setAutoplay(ap));
		}
	}

	get supportAutoplay() {
		return this.videoPlayers.every((player) => player.supportAutoplay());
	}
}

paella.StreamProvider = StreamProvider;

function addVideoWrapper(id,videoPlayer) {
	let wrapper = new paella.VideoWrapper(id);
	wrapper.addNode(videoPlayer);
	this.videoWrappers.push(wrapper);
	this.container.addNode(wrapper);
	return wrapper;
}

class VideoContainer extends paella.VideoContainerBase {

	get streamProvider() { return this._streamProvider; }
	get ready() { return this._ready; }
	get isMonostream() { return this._streamProvider.isMonostream; }
	get trimmingHandler() { return this._trimmingHandler; }
	get videoWrappers() { return this._videoWrappers; }
	get container() { return this._container; }
	get profileFrameStrategy() { return this._profileFrameStrategy; }
	get sourceData() { return this._sourceData; }

	constructor(id) {
		super(id);

		this._streamProvider = new paella.StreamProvider();
		this._ready = false;
		this._videoWrappers = [];

		this._container = new paella.DomNode('div','playerContainer_videoContainer_container',{position:'relative',display:'block',marginLeft:'auto',marginRight:'auto',width:'1024px',height:'567px'});
		this._container.domElement.setAttribute('role','main');
		this.addNode(this._container);

		this.overlayContainer = new paella.VideoOverlay(this.domElement);
		this.container.addNode(this.overlayContainer);

		this.setProfileFrameStrategy(paella.ProfileFrameStrategy.Factory());
		this.setVideoQualityStrategy(paella.VideoQualityStrategy.Factory());

		this._audioTag = paella.player.config.player.defaultAudioTag ||
						 paella.dictionary.currentLanguage();
		this._audioPlayer = null;
		this._volume = paella.utils.cookies.get("volume") ? Number(paella.utils.cookies.get("volume")) : 1;  // #DCE from UPV Paella 6.3 commit 877805282b0
	}

	// Playback and status functions
	play() {
		return new Promise((resolve,reject) => {
			this.ended() 	// #DCE end video fix UPV-develop https://github.com/polimediaupv/paella/commit/17aade8657966b8572c921d14dcb2233294a1962
				.then((ended) => {
					if (ended) {
						this._streamProvider.startTime = 0;
						this.seekToTime(0);
					}
					else {
						this.streamProvider.startTime = this._startTime;
					}
					return this.streamProvider.callPlayerFunction('play')
				})
				.then(() => {
					super.play();
					resolve();
				})
				.catch((err) => {
					reject(err);
				});
		});
	}

	pause() {
		return new Promise((resolve,reject) => {
			this.streamProvider.callPlayerFunction('pause')
				.then(() => {
					super.pause();
					resolve();
				})
				.catch((err) => {
					reject(err);
				})
		});
	}

	setCurrentTime(time) {
		return new Promise((resolve,reject) => {
			let wasPlaying = false;
			this.trimming()
				.then((trimmingData) => {
					if (trimmingData.enabled) {
						time += trimmingData.start;

						if (time<trimmingData.start) {
							time = trimmingData.start;
						}

						if (time>trimmingData.end) {
							time = trimmingData.end;
						}
					}
					//#DCE OPC-407 pause if not already paused before setting time
					return this.paused();
				})
				.then(paused => {
					if (! paused) {
						wasPlaying = true;
						return this.pause();
					} else {
						return Promise.resolve();
					}
				})
				.then(() => {
					return this.streamProvider.callPlayerFunction('setCurrentTime', time);
				})
				.then(() => {
					//#DCE OPC-407 play if was playing before setting time
					if (wasPlaying) {
						return this.play();
					} else {
						return Promise.resolve();
					}
				})
				.then(() => {
					return this.duration(false);
				})
				.then((duration) => {
					resolve({ time:time, duration:duration });
				})
				.catch((err) => {
					reject(err);
				})
		})
	}

	currentTime(ignoreTrimming = false) {
		return new Promise((resolve) => {
			let trimmingData = null;
			let p = ignoreTrimming ? Promise.resolve({ enabled:false }) : this.trimming();

			p.then((t) => {
				trimmingData = t;
				// #DCE protection from early load plugin logging
				if (!this.masterVideo()) {
				  return 0;
				}
				return this.masterVideo().currentTime();
			})

			.then((time) => {
				if (trimmingData.enabled) {
					time = time - trimmingData.start;
				}
				if (time < 0) time = 0;
				resolve(time)
			});
		});
	}

	setPlaybackRate(rate) {
		this.streamProvider.callPlayerFunction('setPlaybackRate',rate);
		super.setPlaybackRate(rate);
	}

	setVolume(params) {
		if (typeof(params)=='object') {
			console.warn("videoContainer.setVolume(): set parameter as object is deprecated");
			return Promise.resolve();
		}
		else {
			return new Promise((resolve,reject) => {
			 paella.utils.cookies.set("volume",params); // #DCE from UPV Paella 6.3 commit 877805282b0
				this._audioPlayer.setVolume(params)
					.then(() => {
						paella.events.trigger(paella.events.setVolume, { master:params });
						resolve(params);
					})
					.catch((err) => {
						reject(err);
					});
			});
		}
	}

	volume() {
		return this._audioPlayer.volume();
	}

	duration(ignoreTrimming = false) {
		return new Promise((resolve) => {
			let trimmingData = null;
			let p = ignoreTrimming ? Promise.resolve({ enabled:false }) : this.trimming();

			p.then((t) => {
				trimmingData = t;
				return this.masterVideo().duration();
			})
			
			.then((duration) => {
				if (trimmingData.enabled) {
					duration = trimmingData.end - trimmingData.start;
				}
				resolve(duration);
			});
		})
	}

	paused() {
		return this.masterVideo().isPaused();
	}

	// Video quality functions
	getQualities() {
		return this.masterVideo().getQualities();
	}

	setQuality(index) {
		let qualities = [];
		let promises = [];
		this.streamProvider.videoPlayers.forEach((player) => {
			let playerData = {
				player:player,
				promise:player.getQualities()
			};
			qualities.push(playerData);
			promises.push(playerData.promise);
		});

		return new Promise((resolve) => {
			let resultPromises = [];
			Promise.all(promises)
				.then(() => {
					qualities.forEach((data) => {
						data.promise.then((videoQualities) => {						
							let videoQuality = videoQualities.length>index ? index:videoQualities.length - 1;
							resultPromises.push(data.player.setQuality(videoQuality));
						});
					});

					return Promise.all(resultPromises);
				})

				.then(() => {
					//setTimeout(() => {
						paella.events.trigger(paella.events.qualityChanged);
						resolve();
					//},10);
				});
		});
	}
	getCurrentQuality() {
		return this.masterVideo().getCurrentQuality();
	}

	// Current audio functions
	get audioTag() {
		return this._audioTag;
	}

	get audioPlayer() {
		return this._audioPlayer;
	}

	getAudioTags() {
		return new Promise((resolve) => {
			let lang = [];
			let p = this.streamProvider.players;
			p.forEach((player) => {
				if (player.stream.audioTag) {
					lang.push(player.stream.audioTag);
				}
			})
			resolve(lang);
		})
	}

	setAudioTag(lang) {
		return new Promise((resolve) => {
			let audioSet = false;
			let promises = [];
			let This = this;
			let firstAudioPlayer = this.streamProvider.players.find((player) => {
			  return player.stream.audioTag==lang;
			});
			if (firstAudioPlayer) {
					audioSet = true;
					this._audioPlayer = firstAudioPlayer;
			} else {
			  this.streamProvider.players.forEach((player) => {
				  if (!firstAudioPlayer) {
					  firstAudioPlayer = player;
				  }
				  if (!audioSet && player.stream.audioTag==lang) {
					  audioSet = true;
					  this._audioPlayer = player;
				  }
				  promises.push(player.setVolume(0));
			  });
			}

			// NOTE: The audio only streams must define a valid audio tag
			if (!audioSet && this.streamProvider.mainVideoPlayer) {
				this._audioPlayer = this.streamProvider.mainVideoPlayer;
			}
			else if (!audioSet && firstAudioPlayer) {
				this._audioPlayer = firstAudioPlayer;
			}

			Promise.all(promises).then(() => {
				return this._audioPlayer.setVolume(this._volume);
			})

			.then(() => {
				this._audioTag = this._audioPlayer.stream.audioTag;
				paella.events.trigger(paella.events.audioTagChanged);
				resolve();
			});
		})
	}

	setProfileFrameStrategy(strategy) {
		this._profileFrameStrategy = strategy;
	}

	setVideoQualityStrategy(strategy) {
		this.streamProvider.qualityStrategy = strategy;
	}

	autoplay() { return this.streamProvider.autoplay; }
	supportAutoplay() { return this.streamProvider.supportAutoplay; }
	setAutoplay(ap=true) {
		this.streamProvider.autoplay = ap;
		return this.streamProvider.supportAutoplay;
	}

	masterVideo() {
		return this.streamProvider.mainVideoPlayer || this.audioPlayer;
	}

	getVideoRect(videoIndex) {
		if (this.videoWrappers.length>videoIndex) {
			return this.videoWrappers[videoIndex].getRect();
		}
		else {
			throw new Error(`Video wrapper with index ${ videoIndex } not found`);
		}
	}

	setStreamData(videoData) {
		var urlParamTime = base.parameters.get("time");
		var hashParamTime = base.hashParams.get("time");
		var timeString = hashParamTime ? hashParamTime:urlParamTime ? urlParamTime:"0s";
		var startTime = paella.utils.timeParse.timeToSeconds(timeString);
		var self = this; // #DCE OPC-242
		if (startTime) {
			this._startTime = startTime;
		}
		
		videoData.forEach((stream) => {
			for (var type in stream.sources) {
				let source = stream.sources[type];
				source.forEach((item) => {
					if (item.res) {
						item.res.w = Number(item.res.w);
						item.res.h = Number(item.res.h);
					}
				});
			}
		});
		this._sourceData = videoData;
		return new Promise((resolve,reject) => {
			this.streamProvider.init(videoData);

			let streamDataAudioTag = null;
			videoData.forEach((video) => {
				if (video.audioTag && streamDataAudioTag==null) {
					streamDataAudioTag = video.audioTag;
				}

				if (video.audioTag==this._audioTag) {
					streamDataAudioTag = this._audioTag;
				}
			});

			if (streamDataAudioTag!=this._audioTag && streamDataAudioTag!=null) {
				this._audioTag = streamDataAudioTag;
			}

			this.streamProvider.videoPlayers.forEach((player,index) => {
				addVideoWrapper.apply(this,['videoPlayerWrapper_' + index,player]);
				player.setAutoplay(this.autoplay());
			});

			this.streamProvider.loadVideos()
				.catch((err) => {
					reject(err)
				})

				.then(() => {
					return this.setAudioTag(this.audioTag);
				})

				.then(() => {
					let endedTimer = null;
					let setupEndEventTimer = () => {
						// #DCE end video fix UPV-develop https://github.com/polimediaupv/paella/commit/17aade8657966b8572c921d14dcb2233294a1962
						this.stopTimeupdate();
						if (endedTimer) {
							clearTimeout(endedTimer);
							endedTimer = null;
						}
						endedTimer = setTimeout(() => {
							paella.events.trigger(paella.events.ended);
						}, 1000);
					}
					let eventBindingObject = this.masterVideo().video || this.masterVideo().audio;
					$(eventBindingObject).bind('timeupdate', (evt) => {
						this.trimming().then((trimmingData) => {
							let current = evt.currentTarget.currentTime;
							let duration = evt.currentTarget.duration;
							if (trimmingData.enabled) {
								current -= trimmingData.start;
								duration = trimmingData.end - trimmingData.start;
							}
							if (current>=duration) {
								this.streamProvider.callPlayerFunction('pause');
								setupEndEventTimer();
							}
						})
					});

					paella.events.bind(paella.events.endVideo,(event) => {
						// #DCE end video fix UPV-develop https://github.com/polimediaupv/paella/commit/17aade8657966b8572c921d14dcb2233294a1962
						setupEndEventTimer();
					});

					this._ready = true;
					paella.events.trigger(paella.events.videoReady);
					let profileToUse = base.parameters.get('profile') ||
										base.cookies.get('profile') ||
										paella.profiles.getDefaultProfile();

					if (paella.profiles.setProfile(profileToUse, false)) {
						resolve();
					}
					else if (!paella.profiles.setProfile(paella.profiles.getDefaultProfile(), false)) {
						resolve();
					}
				});
		});
	}

	resizePortrait() {
		var width = (paella.player.isFullScreen() == true) ? $(window).width() : $(this.domElement).width();
		var relativeSize = new paella.RelativeVideoSize();
		var height = relativeSize.proportionalHeight(width);
		this.container.domElement.style.width = width + 'px';
		this.container.domElement.style.height = height + 'px';

		var containerHeight = (paella.player.isFullScreen() == true) ? $(window).height() : $(this.domElement).height();
		var newTop = containerHeight / 2 - height / 2;
		this.container.domElement.style.top = newTop + "px";
	}

	resizeLandscape() {
		var height = (paella.player.isFullScreen() == true) ? $(window).height() : $(this.domElement).height();
		if (base.userAgent.system.iPhone && window) { // #DCE OPC-425 iPhone in landscape with tabs
			height = window.innerHeight;
		}
		var relativeSize = new paella.RelativeVideoSize();
		var width = relativeSize.proportionalWidth(height);
		this.container.domElement.style.width = width + 'px';
		this.container.domElement.style.height = height + 'px';
		this.container.domElement.style.top = '0px';
	}

	onresize() {
		super.onresize();
		var relativeSize = new paella.RelativeVideoSize();
		var aspectRatio = relativeSize.aspectRatio();
		var width = (paella.player.isFullScreen() == true) ? $(window).width() : $(this.domElement).width();
		var height = (paella.player.isFullScreen() == true) ? $(window).height() : $(this.domElement).height();

		if (base.userAgent.system.iPhone && window) { // #DCE OPC-425 iPhone in landscape with tabs
			width = window.innerWidth;
			height = window.innerHeight;
		}

		var containerAspectRatio = width/height;

		if (containerAspectRatio>aspectRatio) {
			this.resizeLandscape();
		}
		else {
			this.resizePortrait();
		}
		//paella.profiles.setProfile(paella.player.selectedProfile,false)
	}
}

paella.VideoContainer = VideoContainer;

})();
