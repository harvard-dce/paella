Class ("paella.plugins.LiveVolumeIndicatorUnmute",paella.EventDrivenPlugin,{
  // This is necessary because the paella.FlashVideo object never calls its
  // callReadyEvent() This has been reported upstream
  // https://github.com/polimediaupv/paella/issues/143

  setup: function() {
    if (paella.player.isLiveStream()){
      var thisClass = this;
      window.setTimeout( function() {
        $('.buttonPlugin.volumeRangeButton').removeClass('mute').addClass('max');
        $('.videoRangeContainer .range input[type="range"]').val(1);
      }, 1000);
    }
  },

  checkEnabled:function(onSuccess) {
    onSuccess( paella.player.isLiveStream());
  }
});

paella.plugins.liveVolumeIndicatorUnmute = new paella.plugins.LiveVolumeIndicatorUnmute();
