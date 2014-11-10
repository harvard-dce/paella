Class ("paella.plugins.DisableAutoHidePlugin",paella.EventDrivenPlugin,{
  getEvents: function() {
    return [paella.events.loadPlugins];
  },

  onEvent: function(event, params){
    var self = this;
    var hours = 24;
    var milliseconds = hours * 3600 * 1000;
    paella.player.controls.hideControlsTimeMillis = milliseconds;
  }
});

paella.plugins.disableAutoHidePlugin = new paella.plugins.DisableAutoHidePlugin();
