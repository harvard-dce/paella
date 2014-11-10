Class ("paella.plugins.ShowTotalTimePlugin",paella.EventDrivenPlugin,{
  _updatedDuration: false,

  getEvents: function() {
    return [paella.events.timeupdate];
  },

  _formattedMilliseconds:function(seconds) {
    var date = new Date(null);
    date.setSeconds(seconds || 0);
    return ' / ' + date.toISOString().substr(11,8);
  },

  onEvent: function(event, params){
    if(! paella.player.isLiveStream()){
      if (! this._updatedDuration){
        var duration = paella.player.videoContainer.duration();
        if (duration > 0){
          var formattedDuration = $("<div id='totalDuration' class='timeControl' />").text(
              this._formattedMilliseconds(duration)
              );
          $('div#playerContainer_controls_playback_playbackBar_timeControl').after(
              formattedDuration
              );
          this._updatedDuration = true;
        }
      }
    }
  }
});

paella.plugins.showTotalTimePlugin = new paella.plugins.ShowTotalTimePlugin();
