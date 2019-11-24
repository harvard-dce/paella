// #DCE OPC-374 trigger a player resize at setComposition when video is live.
// For RTMP, paella.player.onresize is never called to fix the view dimension.
paella.addPlugin(function () {
  return class ResizeLiveStream extends paella.EventDrivenPlugin {
    getName() {
      return "edu.harvard.dce.paella.resizeLiveStream";
    }
    checkEnabled(onSuccess) {
      if (paella.player.isLiveStream()) {
        onSuccess(true);
      } else {
        onSuccess(false);
      }
    }
    getEvents() {
      return[paella.events.setComposition];
    }
    onEvent(eventType, params) {
      let timer = new paella.Timer(function (timer) {
        paella.player.onresize();
      },
      1000);
      timer.repeat = false;
    }
  }
});
