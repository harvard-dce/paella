Class ("paella.plugins.SimpleBufferingIndicator", paella.EventDrivenPlugin, {
  overlayContainer: function() {
    return paella.player.videoContainer.overlayContainer;
  },
  overlayLoader: {},
  overlayTimers: [],
  loaderPosition: 0,
  getEvents: function() {
    // return [paella.events.singleVideoReady, paella.events.videoUnloaded, paella.events.loadPlugins, paella.events.play];
    return [paella.events.videoUnloaded, paella.events.loadPlugins, paella.events.play];
  },

  showBufferingIndicator: function(event){
    var thisClass = event.data.thisClass;
    thisClass.overlayLoader = new paella.DomNode('div','',{position:'fixed',width:'128px',height:'128px',top:'50%',left:'50%',marginLeft:'-64px',marginTop:'-64px',backgroundImage:'url(resources/images/loader.png)'});

    thisClass.overlayContainer().addElement(thisClass.overlayLoader.domElement, {left:'50%',top:'50%'});
    thisClass.overlayContainer().enableBackgroundMode();
    if (thisClass.overlayTimers.length == 0) {
      thisClass.overlayTimers.push(
          window.setInterval(function(timer) {
            thisClass.loaderPosition -= 128;
            thisClass.overlayLoader.domElement.style.backgroundPosition = thisClass.loaderPosition + 'px';
          },500)
          );
    }
  },

  hideBufferingIndicator: function(event) {
    var thisClass = event.data.thisClass;
    $.each(thisClass.overlayTimers, function(index, timer){
      window.clearInterval(timer);
      thisClass.overlayTimers.splice(index, 1);
    });
    thisClass.overlayContainer().clear();
    thisClass.overlayContainer().disableBackgroundMode();
  },

  bindEventsToMasterVideo: function(){
    var thisClass = this;
    var masterVideo = $('video.masterVideo').first();
    // This catches buffering events when seeking
    masterVideo.on('waiting', { thisClass: thisClass }, thisClass.showBufferingIndicator);
    // This detects that a video is playing
    masterVideo.on('timeupdate', { thisClass: thisClass }, thisClass.hideBufferingIndicator);
    // masterVideo.on('timeupdate', {}, function(event) { console.log(event); });
  },

  onEvent: function(event, params) {
    var thisClass = this;

    // console.log('event: ', event);
    // This catches events exclusively due to interactions with the paella UI
    if (event == 'paella:play' || event == 'paella:videoUnloaded' || event == 'paella:loadPlugins') {
      thisClass.showBufferingIndicator({ data: { thisClass: thisClass}} );
    }

    window.setTimeout(function() {
      // Not a fan, but there are no useful events fired internally (that I can find)
      // that run when a video is loaded or reloaded.
      var masterVideo = $('video.masterVideo');
      if (masterVideo.length > 0) {
        if (masterVideo.data('eventsBound') != true) {
          thisClass.bindEventsToMasterVideo();
        }
        masterVideo.data('eventsBound', true);
      }
    }, 500);
  },

  checkEnabled:function(onSuccess) {
    onSuccess(
        !paella.player.isLiveStream() &&
        dynamic_cast("paella.Html5Video",paella.player.videoContainer.masterVideo()) != null
        );
  }
});

paella.plugins.simpleBufferingIndicator = new paella.plugins.SimpleBufferingIndicator();
