Class ("paella.plugins.AdjustPlaybackBarPlugin",paella.EventDrivenPlugin,{
  getEvents: function() {
    return [paella.events.loadPlugins];
  },

  onEvent: function(event, params){
    var leftPx = (jQuery('.buttonPlugin.left:visible').length * 40) + 'px';
    var rightPx = (jQuery('.buttonPlugin.right:visible').length * 40) + 'px';
    jQuery('div#playerContainer_controls_playback_playbackBar').css({
      left: leftPx,
      right: rightPx
    });
  }
});

paella.plugins.adjustPlaybackBarPlugin = new paella.plugins.AdjustPlaybackBarPlugin();
