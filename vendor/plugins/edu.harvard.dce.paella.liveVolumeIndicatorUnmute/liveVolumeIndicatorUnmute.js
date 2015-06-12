Class ("paella.plugins.LiveVolumeIndicatorUnmute",paella.EventDrivenPlugin,{
  setup: function() {
    if (paella.player.isLiveStream()){
      var thisClass = this;
      window.setTimeout( function() {
        $('.buttonPlugin.volumeRangeButton').removeClass('mute').addClass('max');
        $('.videoRangeContainer .range input[type="range"]').val(1);
      }, 500);
    }
  }
});

paella.plugins.liveVolumeIndicatorUnmute = new paella.plugins.LiveVolumeIndicatorUnmute();
