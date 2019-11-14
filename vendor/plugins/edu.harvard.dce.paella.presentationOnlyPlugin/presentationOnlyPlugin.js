// PresentationOnlyPlugin toggle purpose: Turn off presenter source to reduce bandwidth when presentation only view.
// One activation on qualities change (called directly).
// The crux: must set videoContainer sources and reload videos when changing from single to multi or multi to single
// The quirks:
//   - if last saved profile was presenterOnly, reload switches back to multi view default profile
//   - assumes 1:1 on res/quality numbers between source & master
//   - assumes a single slave (not multiple slaves)
//
// Update for Paella 6.1.2
// TODO: does Paella now shut off the undisplayed stream so that this plugin is no longer needed?
// TODO: all the masterVideo NEEDS to be refactored for 6.1.2

paella.addPlugin(function () {
  return class PresentationOnlyPlugin extends paella.EventDrivenPlugin {
    constructor () {
      super();
      this.isCurrentlySingleStream = false;
      this._master = null;
      this._slave = null;
      this._preferredMethodMaster = null;
      this._preferredMethodSlave = null;
      // This profile must exist in the profile.json
      this._presentationOnlyProfile = 'monostream';
      this._currentQuality = '';
      this._currentProfile = '';
      this._currentPlaybackRate = 1;
      this._lastMultiProfile = null;
      this._currentState =[];
      this._isEnabled = false;
    }
    
    getName () {
      return "edu.harvard.dce.paella.presentationOnlyPlugin";
    }
    
    getEvents () {
      // init DCE event that is thrown from here
      paella.events.donePresenterOnlyToggle = "dce:donePresenterOnlyToggle";
      // listen to set profile and load events
      return[paella.events.setProfile, paella.events.loadPlugins];
    }
    
    onEvent(eventType, params) {
      switch (eventType) {
        case paella.events.setProfile:
        case paella.events.loadPlugins:
        this._firstLoadAction(params);
        break;
      }
    }
    
    checkEnabled (onSuccess) {
      // As long as multivideo loads as multi video this is true the first time around
      if (! this._isEnabled && ! paella.player.isLiveStream() && ! paella.player.videoContainer.isMonostream) {
        this._isEnabled = true;
      }
      onSuccess(this._isEnabled);
    }
    
    
    /**
     * Called directly by qualitiesPresentationPlugin
     * 1. if on single and mutli coming across, change to multi of passed res
     * 2. if on multi and single coming accross, change to single and passed res
     * 3. if on same data.type and different res change, change res
     * 4. if on same data.type and same res, don't do anything
     *
     */
    toggleResolution (data) {
      var thisClass = this;
      var isSingle = paella.player.videoContainer.isMonostream;
      if (! isSingle && data.type === paella.plugins.singleMultipleQualitiesPlugin.singleStreamLabel) {
        thisClass._toggleMultiToSingleProfile(data);
      } else if (isSingle && data.type === paella.plugins.singleMultipleQualitiesPlugin.multiStreamLabel) {
        thisClass._toggleSingleToMultiProfile(data);
      } else if (data.label === thisClass._currentQuality) {
        base.log.debug("PO: no work needed, same quality " + data.label + ", reso:" + data.reso + ", reso2: " + data.reso2);
        paella.events.trigger(paella.events.donePresenterOnlyToggle);
      } else {
        base.log.debug("PO: no source swap needed, toggling res quality to " + data.index);
        paella.player.videoContainer.masterVideo().getVideoData().then(function (videoData) {
          // "paella.pluginManager.doResize" is a custom #DCE param
          //  used to prevent getMasterVideo timer collisions during source swap
          //  see DCE opencast-paella vendor override src/05_plugin_base.js
          paella.pluginManager.doResize = false;
          thisClass._saveCurrentState(videoData, data.index);
          thisClass._addMasterReloadListener(videoData);
          paella.player.videoContainer.setQuality(data.index).then(function () {
            thisClass._restoreState(videoData)
            paella.pluginManager.doResize = true;
            paella.events.trigger(paella.events.donePresenterOnlyToggle);
          });
        });
      }
      thisClass._currentQuality = data.label;
    }
    
    _getSources () {
      if (this._slave === null) {
        base.log.debug("PO: Getting  original stream sources");
        this._getStreamSources();
      }
    }
    
    _firstLoadAction (params) {
      if (this._currentProfile !== '') {
        base.log.debug("PO: not first time load, saving state " + params.profileName);
        this._currentProfile = params.profileName;
        return false;
      }
      base.log.debug("PO: first time load: correcting monostream load on mutlivideo pub.");
      this._currentProfile = base.cookies. get ('lastProfile');
      if ((this._presentationOnlyProfile === this._currentProfile) && ! paella.player.videoContainer.isMonostream) {
        this.isCurrentlySingleStream = paella.player.videoContainer.isMonostream;
        if (paella.player.config.defaultProfile) {
          base.log.debug("PO: saved profile is " + this._currentProfile + ", but changing to " + paella.player.config.defaultProfile);
          this._currentProfile = paella.player.config.defaultProfile;
          paella.player.setProfile(this._currentProfile);
        } else {
          base.log.debug("PO: Cannot change to multivideo profile because cannot find paella.player.config.defaultProfile");
        }
      }
      this.isCurrentlySingleStream = paella.player.videoContainer.isMonostream;
      this._lastMultiProfile = this._currentProfile;
      return true;
    }
    
    _toggleMultiToSingleProfile (data) {
      base.log.debug("PO: toggle from Multi to Single with resolution " + data.reso);
      var sources = null;
      this._getSources();
      base.log.debug("PO: getting slave (presentation ) " + JSON.stringify(this._slave));
      // unset previously set roles  (v5.2+)
      this._slave.role = undefined;
      sources =[ this._slave];
      this._toggleSources(sources, true, data.index);
      paella.plugins.viewModeTogglePlugin.turnOffVisibility();
    }
    
    _toggleSingleToMultiProfile (data) {
      base.log.debug("PO: toggle from Single to Multi with master " + data.reso + " and slave " + data.reso2);
      var sources = null;
      this._getSources();
      base.log.debug("PO: getting slave (presentation) " + JSON.stringify(this._slave) + ", and master (presenter) " + JSON.stringify(this._master));
      // unset previously set roles (v5.2+)
      this._slave.role = undefined;
      this._master.role = undefined;
      sources =[ this._master, this._slave];
      this._toggleSources(sources, false, data.index);
      paella.plugins.viewModeTogglePlugin.turnOnVisibility();
    }
    
    _saveCurrentState (data, index) {
      this._currentState = data;
      this._currentPlaybackRate = paella.player.videoContainer.masterVideo()._playbackRate;
      // currentQuality used by DCE requestedOrBestFitVideoQualityStrategy during reload
      paella.dce.currentQuality = index;
      // save current volume to player config to be used during video recreate
      if (paella.player.config.player.audio) {
        paella.player.config.player.audio.master = data.volume;
      }
    }
    
    _restoreState (videoData) {
      var self = this;
      paella.player.videoContainer.seekToTime(videoData.currentTime);
      // #DCE, Un-pause the plugin manager's timer from looking to master video duration
      // "paella.pluginManager.doResize" is a custom #DCE param,
      // see DCE opencast-paella vendor override: src/05_plugin_base.js
      paella.pluginManager.doResize = true;
      paella.player.videoContainer.setVolume({
        'master': videoData.volume,
        'slave': 0
      }).then(function () {
        base.log.debug("PO: after set volume to " + videoData.volume);
        // Reset playback rate via playback button (ensure correct UI) if playback rate is not the default of 1.
        var playbackRateButton = $('#' + self._currentPlaybackRate.toString().replace(".", "\\.") + 'x_button');
        if (self.currentPlaybackRate != 1 && $(playbackRateButton).length) {
          $(playbackRateButton).click();
        }
        //start 'em up if needed
        if (! videoData.paused) {
          paella.player.paused().then(function (stillPaused) {
            if (stillPaused) {
              paella.player.play();
            }
          });
        }
        // completely swapping out sources requires res selection update
        paella.events.trigger(paella.events.donePresenterOnlyToggle);
      });
    }
    
    _getStreamSources () {
      var self = this;
      var loader = paella.player.videoLoader;
      self._master = loader.streams[0];
      self._slave = loader.streams[1];
    }
    
    // in Paella5 setStreamData() loads master & slave videos, to they need to be unloaded first.
    _toggleSources (sources, isPresOnly, resIndex) {
      var self = this;
      if (self._slave === null) {
        base.log.error("PO: Stream resources were not properly retrieved at set up");
        return;
      }
      var wasSingle = paella.player.videoContainer.isMonostream;
      paella.player.videoContainer.masterVideo().getVideoData().then(function (videoData) {
        self._saveCurrentState(videoData, resIndex);
        // pause videos to temporarily stop update timers
        paella.player.videoContainer.pause().then(function () {
          // Pause the plugin manager's timer from looking for master video duration
          // "paella.pluginManager.doResize" is a custom #DCE param,
          //  see DCE opencast-paella vendor override src/05_plugin_base.js
          paella.pluginManager.doResize = false;
          base.log.debug("PO: Turned off doResize and paused videos, about to remove nodes");
          self._removeVideoNodes();
          if (! wasSingle) {
            // set the cookie to monostream so setStreamData correctly sets single stream initialization
            base.cookies. set ("lastProfile", self._presentationOnlyProfile);
            self._lastMultiProfile = paella.player.videoContainer.getCurrentProfileName();
          } else {
            // set the to the default profile
            base.cookies. set ("lastProfile", self._lastMultiProfile);
          }
          if (sources !== null) {
            base.log.debug("PO: Before videoContainer.setStreamData's sources to reload video container(s) " + sources);
            paella.player.videoContainer.setStreamData(sources).then(function () {
              base.log.debug("PO: Successfully changed stream sources");
              if (isPresOnly && ! wasSingle) {
                base.log.debug("PO: Changed source multi to single, monostream " + paella.player.videoContainer.isMonostream);
              } else if (! isPresOnly && wasSingle) {
                base.log.debug("PO: Changed source single to multi, monostream " + paella.player.videoContainer.isMonostream);
              } else {
                base.log.debug("PO: WARN Unexpected toggle state.");
              }
              self._restoreState(videoData)
            });
          }
        })
      })
    }
    
    // in Paella5, need to manually remove nodes before reseting video source data
    _removeVideoNodes () {
      var video1node = paella.player.videoContainer.masterVideo();
      var video2node = paella.player.videoContainer.slaveVideo();
      // ensure swf object is removed
      if (typeof swfobject !== "undefined") {
        swfobject.removeSWF("playerContainer_videoContainer_1Movie");
      }
      paella.player.videoContainer.videoWrappers[0].removeNode(video1node);
      if (video2node && paella.player.videoContainer.videoWrappers.length > 1) {
        paella.player.videoContainer.videoWrappers[1].removeNode(video2node);
      }
      // empty the set of video wrappers
      paella.player.videoContainer.videoWrappers =[];
      // remove video container wrapper nodes
      var masterWrapper = paella.player.videoContainer.container.getNode("masterVideoWrapper");
      paella.player.videoContainer.container.removeNode(masterWrapper);
      var slaveWrapper = paella.player.videoContainer.container.getNode("slaveVideoWrapper");
      if (slaveWrapper) {
        paella.player.videoContainer.container.removeNode(slaveWrapper);
      }
      // clear existing stream provider data
      paella.player.videoContainer._streamProvider.constructor();
      base.log.debug("PO: removed video1 and video2 nodes");
    }
    
    // Video load listener to unfreeze a frozen moster video with a seek event
    _addMasterReloadListener (state) {
      base.log.debug("PO: about to bind master reload 'emptied' event");
      var video1node = paella.player.videoContainer.masterVideo();
      $(video1node.video).bind('emptied', function (evt) {
        base.log.debug("PO: on event 'emptied', doing seekToTime to unfreeze master " + JSON.stringify(state));
        paella.player.videoContainer.seekToTime(state.currentTime);
        $(this).unbind('emptied');
      });
      // needed for Safari
      $(video1node.video).bind('canplay canplaythrough', function (evt) {
        if (! paella.pluginManager.doResize) {
          base.log.debug("PO: on event " + evt.type + ", doing seekToTime to unfreeze master");
          paella.player.videoContainer.seekToTime(state.currentTime);
        }
        $(this).unbind('canplay canplaythrough');
      });
    }
  }
});
