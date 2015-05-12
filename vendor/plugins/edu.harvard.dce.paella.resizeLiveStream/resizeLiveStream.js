Class ("paella.plugins.ResizeLiveStream",paella.EventDrivenPlugin,{

  setup: function() {
    if (paella.player.isLiveStream()){
      var thisClass = this;
      window.setTimeout( function() {
        thisClass.resizeStreamingContainer();
      }, 200);
    }
  },

  getEvents: function() {
    return [paella.events.resize];
  },

  resizeStreamingContainer: function() {
    var optimalWidth;
    var optimalHeight;
    var videoContainer = $('#playerContainer_videoContainer_container');

    var containerWidth = videoContainer.width();
    var containerHeight = videoContainer.height();
    var streamHeight = paella.player.videoContainer.masterVideo().resHeight;
    var streamWidth = paella.player.videoContainer.masterVideo().resWidth;

    var newMaxHeight = (containerWidth * streamHeight) / streamWidth;
    var newMaxWidth = (streamWidth * containerHeight) / streamHeight;

    if(newMaxWidth > containerWidth) {
      optimalWidth = containerWidth;
      optimalHeight = newMaxHeight;
    } else {
      optimalWidth = newMaxWidth;
      optimalHeight = containerHeight;
    }
    var marginOffset = (containerHeight - optimalHeight) / 2;

    $('object[data="player_streaming.swf"]').attr({
      height: optimalHeight,
      width: optimalWidth,
    }).css({marginTop: marginOffset + 'px'});
  },

  onEvent: function(event, params){
    this.resizeStreamingContainer();
  },

  checkEnabled:function(onSuccess) {
    onSuccess( paella.player.isLiveStream());
  }
});

paella.plugins.resizeLiveStream = new paella.plugins.ResizeLiveStream();
