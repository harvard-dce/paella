/** #DCE SingleVideoTogglePlugin
 * Purpose: reduce bandwidth on mobile by toggling between presentation & presenter video.
 * Uses audio from the visible track (no enabled if special HUDCE tag: multiaudio is not set)
 *
 * Updated for Paella 6x
 * Adapted for Paella 6.1.2
 * For Paella 6.2.0, the viewModeToggleProfilesPlugin module is required.
 */
paella.addPlugin(function () {
  return class SingleVideoTogglePlugin extends paella.ButtonPlugin {
    constructor () {
      super ();
      this._iOSProfile = 'one_big';
      this._masterVideo = null;
      this._toggleIndex = 1; //toggle to presentation when button pressed first time
    }
    getDefaultToolTip () {
      return base.dictionary.translate("Switch videos");
    }
    getAlignment() {
      return 'right';
    }
    getSubclass() {
      return "showViewModeButton";
    }
    getIconClass() {
      return 'icon-presentation-mode';
    }
    getDefaultToolTip() {
      return base.dictionary.translate("Change video layout");
    }
    getIndex() {
      return 450;
    }
    getInstanceName() {
      return "singleVideoTogglePlugin";
    }
    getName () {
      return "edu.harvard.dce.paella.singleVideoTogglePlugin";
    }
    _currentPlayerProfile () {
      return paella.player.selectedProfile;
    }
    checkEnabled (onSuccess) {
      // Only enable for iOS (not Android) TODO: test with Safari on Android?
      onSuccess (base.userAgent.system.iOS && paella.dce && paella.dce.sources && paella.dce.sources.length > 1 && ! paella.dce.blankAudio);
    }
    getCurrentMasterVideo () {
      return paella.dce.videoPlayers.find(player => {
        return player === paella.player.videoContainer.masterVideo();
      });
    }
    action(button) {
      let This = this;
      paella.player.videoContainer.masterVideo().getVideoData().then(function (videoData) {
        paella.dce.videoDataSingle = videoData;
        paella.dce.videoDataSingle.playbackRate = paella.player.videoContainer.masterVideo().video.playbackRate;
        // pause videos to temporarily stop update timers
        paella.player.videoContainer.pause().then(function () {
          paella.pluginManager.doResize = false;
          // Remove the existing video nodes
          This._resetVideoNodes();
          paella.player.videoLoader._data.metadata.preview = null;
          // toggle each source sequentially
          let index = This._toggleIndex++ % paella.dce.sources.length;
          paella.player.videoLoader._data.streams = [paella.dce.sources[index]];
          // Load with the updated loader data
          paella.player.loadVideo();
          // reset state
          This._resetPlayerState();
        });
      });
    }
    _resetPlayerState () {
      paella.player.videoContainer.seekToTime(paella.dce.videoDataSingle.currentTime);
      paella.player.videoContainer.setVolume(paella.dce.videoDataSingle.volume);
      paella.player.videoContainer.setPlaybackRate(paella.dce.videoDataSingle.playbackRate);
      // User is required to click play to restart toggled video
    }

    // in Paella5 & 6, must manually remove nodes before reseting video source data
    _resetVideoNodes () {
      for (let i = 0; i < paella.player.videoContainer.videoWrappers.length; i++) {
        let wrapper = paella.player.videoContainer.videoWrappers[i];
        let wrapperNodes = [].concat(wrapper.nodeList);
        for (let j = 0; j < wrapperNodes.length; j++){
          wrapper.removeNode(wrapperNodes[j]);
        }
        paella.player.videoContainer.removeNode(wrapper);
        $("#videoPlayerWrapper_0").remove(); // because removeNode doesn't remove wrappers
      }
      // clear existing stream provider data
      paella.player.videoContainer._streamProvider._mainStream = null;
      paella.player.videoContainer._streamProvider._videoStreams = [];
      paella.player.videoContainer._streamProvider._audioStreams = [];
      paella.player.videoContainer._streamProvider._mainPlayer = null;
      paella.player.videoContainer._streamProvider._audioPlayer = null;
      paella.player.videoContainer._streamProvider._videoPlayers = [];
      paella.player.videoContainer._streamProvider._audioPlayers = [];
      paella.player.videoContainer._streamProvider._players = [];
      base.log.debug("PO: removed all video nodes");
    }
  }
});