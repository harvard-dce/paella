Class ("paella.plugins.Add2xPlaybackChoice",paella.EventDrivenPlugin,{
  getEvents: function() {
    return [paella.events.loadPlugins];
  },

  onEvent: function(event, params){
    var playbackPlugin = paella.plugins.playbackRate;
    var newPlaybackChoice = playbackPlugin.getItemButton('2x', 2.0);
    $('.' + playbackPlugin.getSubclass() + '.buttonPluginPopUp').append(
        newPlaybackChoice
        );
  },

  checkEnabled: function(onSuccess) {
    onSuccess(dynamic_cast("paella.Html5Video",paella.player.videoContainer.masterVideo())!=null);
  }
});

paella.plugins.add2xPlaybackChoice = new paella.plugins.Add2xPlaybackChoice();
