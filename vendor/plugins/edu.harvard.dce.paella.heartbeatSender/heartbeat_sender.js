// A version of the deprecated es.upv.paella.UserTrackingCollectorPlugIn,
// shaved down to just send the heartbeat.

// Update for Paella 6.1.2
// NOTE: This plugin sends a constant usage ping, where as the
// es.upv.paella.opencast.userTrackingSaverPlugIn sends change events
// Keeping as FastLoadPlugin because FastLoadPlugin are loaded after loadcompleted

paella.addPlugin(function () {
  return class HeartbeatSender extends paella.EarlyLoadPlugin {
    constructor() {
      super();
      this.heartbeatTimer = null;
    }
    getName() {
      return "edu.harvard.dce.paella.heartbeatSender";
    }

    load(eventType, params) {
      base.log.debug(`HUDCE HeartBeat timer loading with heartbeat interval: ${this.config.heartBeatTime}ms`);
      var thisClass = this;
      if (this.config.heartBeatTime > 0) {
        thisClass.heartbeatTimer = new base.Timer(
        (thisClass.registerHeartbeat).bind(thisClass),
        thisClass.config.heartBeatTime);
        thisClass.heartbeatTimer.repeat = true;
      }
    }

    registerHeartbeat(timer) {
      var thisClass = this;
      paella.player.videoContainer.masterVideo().getVideoData().then(function (videoData) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', thisClass.getHeartbeatURL(videoData));
        xhr.send();
      });
    }

    getHeartbeatURL(videoData) {
      var videoCurrentTime = parseInt(videoData.currentTime + paella.player.videoContainer.trimStart(), 10);
      
      // In the case of a live stream and a config setting that says to not
      // play on load, paella.player.videoContainer.paused() will always
      // return true, so it's not reliable then.
      // However, our live stream player does not allow pausing. If you are
      // watching live stream, you are playing. So, we can count on that to
      // determine play state.
      var isPlaying = paella.player.isLiveStream() ? "live": (! videoData.paused).toString();
      
      var url = '/usertracking/?';
      url += this.queryStringFromDict({
        _method: 'PUT',
        id: paella.player.videoIdentifier,
        type: 'HEARTBEAT',
        'in': videoCurrentTime,
        'out': videoCurrentTime,
        playing: isPlaying,
        resource: paella.opencast.resourceId,
        _: (new Date()).getTime()
      });
      // Example heartbeat URL:
      // https://localhost:3000/_method=PUT&id=74b6c02f-afbb-42bc-8145-344153a1792e&type=HEARTBEAT&in=0&out=0&playing=false&resource=%2F2015%2F03%2F33383%2FL10&_=1441381319430'
      return url;
    }
    queryStringFromDict(dict) {
      var qs = '';
      for (var key in dict) {
        if (qs.length > 0) {
          qs += '&';
        }
        qs += key + '=' + encodeURIComponent(dict[key]);
      }
      return qs;
    }
  }
});
